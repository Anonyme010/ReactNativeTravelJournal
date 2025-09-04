// Firestore service for database operations
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Generic function to add a document to a collection
export const addDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.log('Error in addDocument:', error);
    throw error;
  }
};

// Add a photo document to Firestore
export const addPhoto = async (photoData) => {
  try {
    const photoToAdd = {
      userId: photoData.userId,
      imageUrl: photoData.imageUrl,
      date: photoData.date,
      address: photoData.address || null,
      location: photoData.location || null,
      description: photoData.description || '',
      tags: photoData.tags || [],
      timestamp: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'photos'), photoToAdd);
    return docRef.id;
  } catch (error) {
    console.log('Error in addPhoto:', error);
    throw error;
  }
};

// Get photos by user ID 
export const getPhotosByUser = async (userId) => {
  try {
    const photosRef = collection(db, 'photos');
    const q = query(
      photosRef, 
      where("userId", "==", userId),
      orderBy("timestamp", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    const photos = [];
    querySnapshot.forEach((doc) => {
      photos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return photos;
  } catch (error) {
    console.log('Error in getPhotosByUser:', error);
    return [];
  }
};

// Get photos by date
export const getPhotosByDate = async (userId, date) => {
  try {
    const photosRef = collection(db, 'photos');
    const q = query(
      photosRef,
      where("userId", "==", userId),
      where("date", "==", date),
      orderBy("timestamp", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    const photos = [];
    querySnapshot.forEach((doc) => {
      photos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return photos;
  } catch (error) {
    console.log('Error in getPhotosByDate:', error);
    return [];
  }
};

// Get unique dates with photos for calendar
export const getPhotoDates = async (userId) => {
  try {
    const photos = await getPhotosByUser(userId);
    
    // Extract unique dates
    const uniqueDates = [...new Set(photos.map(photo => photo.date))];
    
    return uniqueDates;
  } catch (error) {
    console.log('Error in getPhotoDates:', error);
    return [];
  }
};

// Update user statistics after adding photos
export const updateUserStats = async (userId) => {
  try {
    console.log("Starting updateUserStats for user:", userId);
    
    // Récupérer toutes les photos de l'utilisateur
    const photos = await getPhotosByUser(userId);
    console.log(`Found ${photos.length} photos for user ${userId}`);
    
    // Compter le nombre total de photos
    const totalPhotos = photos.length;
    
    // Utilisez un Set pour stocker des adresses uniques (complètes)
    const uniqueAddresses = new Set();
    
    // Créer un objet pour compter les occurrences de chaque lieu
    const locationCounts = {};
    
    // Extract city/locality from address (the second part after country)
    const extractCity = (address) => {
      const parts = address.split(',');
      // If we have at least country, city
      if (parts.length >= 2) {
        return parts[1].trim(); // Return the city/locality
      }
      return address.trim();
    };
    
    // Parcourir toutes les photos et compter les adresses uniques
    photos.forEach(photo => {
      console.log("Processing photo with address:", photo.address);
      
      if (photo.address && photo.address.trim() !== '') {
        const fullAddress = photo.address.trim();
        const displayName = extractCity(photo.address);
        uniqueAddresses.add(fullAddress);
        
        // Store both count and display name
        if (!locationCounts[fullAddress]) {
          locationCounts[fullAddress] = {
            count: 0,
            displayName: displayName
          };
        }
        
        locationCounts[fullAddress].count += 1;
      }
    });
    
    // Nombre de lieux uniques
    const locationsVisited = uniqueAddresses.size;
    console.log(`Counted ${locationsVisited} unique locations`);
    
    // Trouver le lieu le plus fréquent
    let topLocationAddress = null;
    let topLocationDisplayName = null;
    let maxCount = 0;
    
    Object.entries(locationCounts).forEach(([address, data]) => {
      console.log(`Location: ${address}, Display Name: ${data.displayName}, Count: ${data.count}`);
      if (data.count > maxCount) {
        maxCount = data.count;
        topLocationAddress = address;
        topLocationDisplayName = data.displayName;
      }
    });
    
    // Préparer les données pour le lieu top
    const topLocation = topLocationAddress ? {
      name: topLocationDisplayName,
      fullAddress: topLocationAddress,
      count: maxCount
    } : null;
    
    console.log('Stats calculées:', { totalPhotos, locationsVisited, topLocation });
    
    // Mettre à jour le document de l'utilisateur avec ces statistiques
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      stats: {
        totalPhotos,
        locationsVisited,
        topLocation,
        lastUpdated: Timestamp.now()
      }
    });
    
    return {
      totalPhotos,
      locationsVisited,
      topLocation
    };
  } catch (error) {
    console.error('Error in updateUserStats:', error);
    return { totalPhotos: 0, locationsVisited: 0, topLocation: null };
  }
};

// Get photo by ID
export const getPhoto = async (photoId) => {
  try {
    const photoDoc = await getDoc(doc(db, 'photos', photoId));
    if (photoDoc.exists()) {
      return {
        id: photoDoc.id,
        ...photoDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting photo:', error);
    throw error;
  }
};

// Delete a photo
export const deletePhoto = async (photoId) => {
  try {
    // First get the photo document to retrieve any Cloudinary info
    const photoDoc = await getDoc(doc(db, 'photos', photoId));
    if (!photoDoc.exists()) {
      console.log(`Photo ${photoId} does not exist`);
      return false;
    }
    
    // Delete from Firestore
    await deleteDoc(doc(db, 'photos', photoId));
    console.log(`Photo ${photoId} deleted successfully from Firestore`);
    
    return true;
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
};

// Get user statistics
export const getUserStats = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      // Return existing stats if any, otherwise default to zeros
      return userData.stats || {
        totalPhotos: 0,
        locationsVisited: 0,
        topLocation: null
      };
    } else {
      console.log('User not found in getUserStats');
      return {
        totalPhotos: 0,
        locationsVisited: 0,
        topLocation: null
      };
    }
  } catch (error) {
    console.log('Error in getUserStats:', error);
    return {
      totalPhotos: 0,
      locationsVisited: 0,
      topLocation: null
    };
  }
};