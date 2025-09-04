import React from "react";
import { View, Image, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function CameraPreview({ photo, onRetake, onUpload }) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: photo.uri }} style={styles.image} />
      <View style={styles.actions}>
        <TouchableOpacity onPress={onRetake} style={styles.btn}>
          <Text style={styles.text}>↩️ Reprendre</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onUpload} style={styles.btn}>
          <Text style={styles.text}>☁️ Uploader</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  image: { width: "100%", height: "80%" },
  actions: { flexDirection: "row", marginTop: 20 },
  btn: { backgroundColor: "#4a90e2", padding: 10, borderRadius: 8, margin: 5 },
  text: { color: "white", fontWeight: "bold" },
});
