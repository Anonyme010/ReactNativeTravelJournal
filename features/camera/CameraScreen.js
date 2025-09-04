import React, { useRef, useState } from "react";
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
import * as Location from "expo-location"; // 📍 localisation
import CameraPreview from "../../components/CameraComponents/CameraPreview";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import { usePhotos } from "../../context/PhotoContext";

export default function CameraScreen() {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] =
    MediaLibrary.usePermissions();
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const { addPhoto } = usePhotos();

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

  const takePicture = async () => {
    try {
      if (!cameraRef.current) return;
      const data = await cameraRef.current.takePictureAsync({ quality: 0.7 });

      // 📍 Obtenir la localisation
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("⚠️", "Permission localisation refusée");
        setPhoto({ ...data, address: null });
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // 📌 Reverse geocoding → transforme coord en adresse
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
      });

      console.log("✅ Adresse trouvée:", address);
    } catch (e) {
      console.error("takePicture error:", e);
    }
  };

  const saveToAlbum = async (uri) => {
    try {
      const asset = await MediaLibrary.createAssetAsync(uri);
      let album = await MediaLibrary.getAlbumAsync("Journal");

      if (!album) {
        album = await MediaLibrary.createAlbumAsync("Journal", asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album.id, false);
      }
    } catch (e) {
      console.error("❌ Erreur sauvegarde album:", e);
    }
  };

  const handleUpload = async () => {
    try {
      if (!photo?.uri) return;
      setLoading(true);

      await saveToAlbum(photo.uri);

      const url = await uploadToCloudinary(photo.uri);

      addPhoto({
        id: Date.now().toString(),
        uri: { uri: url },
        date: photo.date,
        address: photo.address,
      });

      Alert.alert("✅ Upload réussi 🚀");
      setPhoto(null);
    } catch (e) {
      console.error("Upload error:", e);
      Alert.alert("❌ Erreur", e.message || JSON.stringify(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {photo ? (
        <CameraPreview
          photo={photo}
          onRetake={() => setPhoto(null)}
          onUpload={handleUpload}
        />
      ) : (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          mode="picture"
        >
          <TouchableOpacity
            style={styles.shutter}
            onPress={takePicture}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.shutterText}>📸</Text>
            )}
          </TouchableOpacity>
        </CameraView>
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
  },
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
});
