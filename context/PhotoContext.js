import React, { createContext, useContext, useState, useEffect } from "react";
 
const PhotoContext = createContext();
 
export function PhotoProvider({ children }) {
  const [photos, setPhotos] = useState([]);
 
  // ✅ Charger les photos depuis Cloudinary au montage
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await fetch(
          `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/list/travel_journal.json`
        );
        const data = await response.json();
 
        const mapped = data.resources.map((img) => ({
          id: `cloud-${img.asset_id}`,
          uri: { uri: img.secure_url },
          date: img.created_at.split("T")[0], // format YYYY-MM-DD
        }));
 
        setPhotos(mapped);
      } catch (err) {
        console.error("❌ Erreur récupération Cloudinary:", err);
      }
    };
 
    fetchPhotos();
  }, []);
 
  // ✅ Ajout manuel (local ou Cloudinary déjà uploadé)
  const addPhoto = (photo) => {
    setPhotos((prev) => [...prev, photo]);
  };
 
  // ✅ Upload vers Cloudinary
  const uploadPhoto = async (uri) => {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri,
        type: "image/jpeg",
        name: "upload.jpg",
      });
      formData.append("upload_preset", "travel_journal"); // ton preset
 
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );
 
      const data = await response.json();
 
      const newPhoto = {
        id: `cloud-${data.asset_id}`,
        uri: { uri: data.secure_url },
        date: new Date().toISOString().split("T")[0],
      };
 
      setPhotos((prev) => [...prev, newPhoto]);
      return newPhoto;
    } catch (err) {
      console.error("❌ Erreur upload:", err);
      throw err;
    }
  };
 
  return (
    <PhotoContext.Provider value={{ photos, setPhotos, addPhoto, uploadPhoto }}>
      {children}
    </PhotoContext.Provider>
  );
}
 
export const usePhotos = () => useContext(PhotoContext);