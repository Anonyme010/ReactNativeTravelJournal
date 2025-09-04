import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  deleteDoc,
  doc,
  Timestamp,
  limit 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { deletePhoto as deletePhotoService, updateUserStats } from '../services/firestoreService';

const PhotoContext = createContext();

export function PhotoProvider({ children }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // Fonction pour charger les photos depuis Firestore
  const fetchPhotos = async () => {
    if (!currentUser) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      console.log("Fetching photos for user:", currentUser.uid);
      
      // Requête Firestore pour obtenir les photos de l'utilisateur sans utiliser orderBy
      // pour éviter d'avoir besoin d'un index composite
      const photosRef = collection(db, 'photos');
      const q = query(
        photosRef,
        where("userId", "==", currentUser.uid),
        limit(50) // Limiter à 50 photos pour éviter des problèmes de performance
        // Ne pas utiliser orderBy ici pour éviter l'erreur d'index
      );
      
      // Debug: Vérifier les photos existantes dans Firestore
      const debugQuery = query(photosRef, limit(5));
      const debugSnapshot = await getDocs(debugQuery);
      console.log(`Debug - Total photos in collection: ${debugSnapshot.size}`);
      debugSnapshot.forEach(doc => {
        console.log(`Debug - Photo in Firestore:`, 
          { id: doc.id, userId: doc.data().userId, date: doc.data().date, imageUrl: doc.data().imageUrl }
        );
      });
      
      const querySnapshot = await getDocs(q);
      
      const photosList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Log individual photo for debugging with address information
        console.log(`Processing photo ${doc.id}:`, { 
          imageUrl: data.imageUrl, 
          uri: data.uri,
          address: data.address,
          location: data.location
        });
        
        // Format the URI correctly for React Native Image component
        let formattedUri;
        if (data.imageUrl) {
          formattedUri = { uri: data.imageUrl };
        } else if (data.uri && typeof data.uri === 'object' && data.uri.uri) {
          formattedUri = data.uri;
        } else if (data.uri && typeof data.uri === 'string') {
          formattedUri = { uri: data.uri };
        } else {
          console.warn(`Photo ${doc.id} has no valid image URL`);
          formattedUri = { uri: 'https://via.placeholder.com/300?text=Image+Non+Disponible' };
        }
        
        console.log(`Photo ${doc.id} formatted URI:`, formattedUri);
        
        return {
          id: doc.id,
          ...data,
          // Set the formatted URI
          uri: formattedUri
        };
      });
      
      // Trier les photos côté client pour éviter l'index composite
      photosList.sort((a, b) => {
        // Convertir en objets Date pour comparaison
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // Ordre décroissant
      });
      
      console.log(`Récupéré ${photosList.length} photos pour l'utilisateur ${currentUser.uid}`);
      setPhotos(photosList);
      
      // Update user statistics after fetching photos
      try {
        await updateUserStats(currentUser.uid);
      } catch (statsErr) {
        console.error("❌ Erreur mise à jour statistiques:", statsErr);
      }
    } catch (err) {
      console.error("❌ Erreur récupération photos:", err);
    } finally {
      setLoading(false);
    }
  };

  // Charger les photos au montage ou quand l'utilisateur change
  useEffect(() => {
    if (currentUser) {
      fetchPhotos();
      
      // Force update user stats on mount
      updateUserStats(currentUser.uid)
        .then(() => console.log("User stats updated on mount"))
        .catch(err => console.error("Error updating user stats on mount:", err));
    }
  }, [currentUser]);

  // Ajout d'une photo (après upload Cloudinary)
  const addPhoto = async (photoData) => {
    if (!currentUser) return;
    
    try {
      console.log("Adding photo to Firestore:", JSON.stringify(photoData));
      
      // Préparer les données pour Firestore
      const newPhotoData = {
        userId: currentUser.uid,
        imageUrl: photoData.imageUrl || (photoData.uri && typeof photoData.uri === 'object' ? photoData.uri.uri : photoData.uri),
        cloudinaryPublicId: photoData.cloudinaryPublicId,
        date: photoData.date,
        address: photoData.address || null,
        location: photoData.location || null,
        createdAt: Timestamp.now()
      };
      
      console.log("Formatted data for Firestore:", JSON.stringify(newPhotoData));
      
      // Ajouter à Firestore
      const docRef = await addDoc(collection(db, 'photos'), newPhotoData);
      
      // Ajouter à l'état local avec le bon format
      const newPhoto = {
        id: docRef.id,
        ...newPhotoData,
        uri: { uri: newPhotoData.imageUrl } // Format compatible avec Image RN
      };
      
      console.log("Added photo with ID:", docRef.id);
      console.log("URI format for display:", newPhoto.uri);
      
      setPhotos(prev => [newPhoto, ...prev]);
      
      // Update user statistics after adding a new photo
      try {
        await updateUserStats(currentUser.uid);
      } catch (statsErr) {
        console.error("❌ Erreur mise à jour statistiques:", statsErr);
      }
      
      return newPhoto;
    } catch (err) {
      console.error("❌ Erreur ajout photo:", err);
      throw err;
    }
  };

  // Upload vers Cloudinary
  const uploadPhoto = async (uri) => {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri,
        type: "image/jpeg",
        name: "upload.jpg",
      });
      formData.append("upload_preset", "travel_journal");
      formData.append("folder", "journal/mes-photos");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dxoduxgvw/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      const newPhoto = {
        id: `temp-${Date.now()}`,
        uri: { uri: data.secure_url },
        date: new Date().toISOString().split("T")[0],
      };

      return newPhoto;
    } catch (err) {
      console.error("❌ Erreur upload:", err);
      throw err;
    }
  };

  // Supprimer une photo
  const deletePhoto = async (photoId) => {
    try {
      console.log(`Starting deletion process for photo ${photoId}`);
      
      // Trouver la photo à supprimer dans l'état local
      const photoToDelete = photos.find(p => p.id === photoId);
      if (!photoToDelete) {
        console.error(`Photo ${photoId} not found in local state`);
        return false;
      }
      
      console.log(`Found photo to delete:`, {
        id: photoToDelete.id,
        imageUrl: photoToDelete.imageUrl,
        cloudinaryId: photoToDelete.cloudinaryPublicId
      });
      
      // Supprimer de Firestore
      const result = await deletePhotoService(photoId);
      
      if (result) {
        console.log(`Photo ${photoId} successfully deleted from Firestore`);
        
        // Mettre à jour l'état local en supprimant la photo
        setPhotos(prev => prev.filter(photo => photo.id !== photoId));
        console.log(`Photo ${photoId} removed from local state`);
        
        // Update user statistics after deleting a photo
        try {
          await updateUserStats(currentUser.uid);
        } catch (statsErr) {
          console.error("❌ Erreur mise à jour statistiques:", statsErr);
        }
        
        return true;
      } else {
        console.error(`Failed to delete photo ${photoId} from Firestore`);
        return false;
      }
    } catch (err) {
      console.error(`❌ Error deleting photo ${photoId}:`, err);
      throw err;
    }
  };
  
  return (
    <PhotoContext.Provider value={{ 
      photos, 
      loading, 
      addPhoto, 
      uploadPhoto,
      deletePhoto,
      refreshPhotos: fetchPhotos
    }}>
      {children}
    </PhotoContext.Provider>
  );
}

export const usePhotos = () => useContext(PhotoContext);