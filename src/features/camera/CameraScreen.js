import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as Location from "expo-location";
import CameraPreview from "../../components/CameraComponents/CameraPreview";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import { usePhotos } from "../../contexts/PhotoContext";
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export default function CameraScreen() {
  // All hooks must be called at the top level, before any conditionals
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] =
    MediaLibrary.usePermissions();
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [cameraType, setCameraType] = useState("back");
  const { addPhoto } = usePhotos();
  
  // Function to toggle between front and back cameras
  const toggleCameraType = useCallback(() => {
    setCameraType(current => 
      current === "back" ? "front" : "back"
    );
  }, []);

  // Handle camera cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (cameraRef.current) {
        console.log("Cleaning up camera resources");
        cameraRef.current = null;
      }
    };
  }, []);
  
  // Define camera ready handler
  const handleCameraReady = useCallback(() => {
    console.log("Camera is ready");
    setIsCameraReady(true);
  }, []);
  
  // Define these functions before the first early return
  const takePicture = useCallback(async () => {
    try {
      if (!cameraRef.current) {
        console.error("Camera ref is null");
        Alert.alert("Erreur", "La caméra n'est pas prête, veuillez réessayer");
        return;
      }
      
      if (!isCameraReady) {
        console.error("Camera is not ready yet");
        Alert.alert("Erreur", "La caméra n'est pas encore prête, veuillez patienter");
        return;
      }
      
      console.log("Taking picture...");
      const data = await cameraRef.current.takePictureAsync({ 
        quality: 0.7,
        exif: true,
        skipProcessing: false
      });
      
      console.log("Picture taken successfully:", data.uri);

      // Obtenir la localisation
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Location permission denied");
        Alert.alert("⚠️", "Permission localisation refusée");
        setPhoto({ ...data, address: null });
        return;
      }

      console.log("Getting current location...");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      console.log("Location obtained:", location);

      // Reverse geocoding → transforme coord en adresse
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      let address = null;
      if (geocode.length > 0) {
        const place = geocode[0];
        address = `${place.name || ""} ${place.street || ""}, ${place.city || ""}, ${place.region || ""}, ${place.country || ""}`;
      }

      setPhoto({
        uri: data.uri,
        date: new Date().toISOString().split("T")[0],
        address,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }
      });

      console.log("✅ Adresse trouvée:", address);
    } catch (e) {
      console.error("takePicture error:", e);
      Alert.alert("Erreur", "Impossible de prendre la photo. Veuillez réessayer ou redémarrer l'application.");
      
      // Reset camera if there was an error
      setIsCameraActive(false);
      setTimeout(() => {
        setIsCameraActive(true);
      }, 500);
    }
  }, [cameraRef, isCameraReady]);
  
  const saveToAlbum = useCallback(async (uri) => {
    try {
      const asset = await MediaLibrary.createAssetAsync(uri);
      let album = await MediaLibrary.getAlbumAsync("Journal");

      if (!album) {
        album = await MediaLibrary.createAlbumAsync("Journal", asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album.id, false);
      }
      
      console.log("✅ Photo sauvegardée dans l'album Journal");
    } catch (e) {
      console.error("❌ Erreur sauvegarde album:", e);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    try {
      if (!photo?.uri) return;
      setLoading(true);

      // Sauvegarde locale
      await saveToAlbum(photo.uri);

      // Upload Cloudinary
      const cloudinaryData = await uploadToCloudinary(photo.uri);
      
      // Extraire l'URL sécurisée et l'ID public de Cloudinary
      const { secure_url, public_id } = cloudinaryData;

      // Ajouter au contexte global (qui sauve dans Firestore)
      await addPhoto({
        id: Date.now().toString(),
        uri: { uri: secure_url },
        imageUrl: secure_url,
        cloudinaryPublicId: public_id, // Stocker l'ID public pour suppression ultérieure
        date: photo.date,
        address: photo.address,
        location: photo.location
      });

      Alert.alert("✅ Upload réussi 🚀");
      setPhoto(null);
    } catch (e) {
      console.error("Upload error:", e);
      Alert.alert("❌ Erreur", e.message || JSON.stringify(e));
    } finally {
      setLoading(false);
    }
  }, [photo, setLoading, addPhoto, saveToAlbum]);
  
  // Reset camera when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Camera screen focused");
      setIsCameraActive(true);
      
      return () => {
        console.log("Camera screen blurred");
        setIsCameraActive(false);
      };
    }, [])
  );
  
  // Only after all hooks are defined, we can have conditional returns
  if (!permission || !mediaPermission) return <View style={styles.center} />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>La caméra est désactivée.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!mediaPermission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>La galerie est désactivée.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestMediaPermission}>
          <Text style={styles.permBtnText}>Autoriser la galerie</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {photo ? (
        <CameraPreview
          photo={photo}
          onRetake={() => setPhoto(null)}
          onUpload={handleUpload}
        />
      ) : (
        <>
          {isCameraActive ? (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraType}
              mode="picture"
              onCameraReady={handleCameraReady}
              onMountError={(error) => {
                console.error("Camera mount error:", error);
                Alert.alert(
                  "Erreur de caméra", 
                  "Impossible d'initialiser la caméra. Veuillez réessayer."
                );
              }}
            >
              <TouchableOpacity
                style={styles.shutter}
                onPress={takePicture}
                disabled={loading || !isCameraReady}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <Text style={styles.shutterText}>📸</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.flipCamera}
                onPress={toggleCameraType}
                disabled={loading || !isCameraReady}
              >
                <Text style={styles.flipCameraText}>🔄</Text>
              </TouchableOpacity>
              
              {!isCameraReady && (
                <View style={styles.cameraLoadingContainer}>
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={styles.cameraLoadingText}>Initialisation de la caméra...</Text>
                </View>
              )}
            </CameraView>
          ) : (
            <View style={styles.cameraLoadingContainer}>
              <ActivityIndicator size="large" color="#4a90e2" />
              <Text style={styles.cameraLoadingText}>Préparation de la caméra...</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  shutter: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "white",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 40,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  flipCamera: {
    position: "absolute",
    top: 30,
    right: 30,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 30,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  flipCameraText: { fontSize: 18 },
  shutterText: { fontSize: 22 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  msg: { fontSize: 16, marginBottom: 12, color: "#333" },
  permBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#4a90e2",
  },
  permBtnText: { color: "white", fontWeight: "600" },
  cameraLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 10,
  },
  cameraLoadingText: {
    color: "white",
    marginTop: 10,
    fontSize: 16,
    textAlign: "center",
  },
});