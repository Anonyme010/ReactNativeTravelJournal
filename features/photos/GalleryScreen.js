import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TextInput,
} from "react-native";
import { usePhotos } from "../../context/PhotoContext";

export default function GalleryScreen() {
  const { photos } = usePhotos();
  const [search, setSearch] = useState("");

  const filteredPhotos = photos.filter((p) =>
    p.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📸 Ma Galerie</Text>

      <TextInput
        style={styles.input}
        placeholder="🔍 Rechercher par adresse"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filteredPhotos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.photoCard}>
            <Image source={item.uri} style={styles.image} />
            <Text style={styles.dateText}>📅 {item.date}</Text>
            {item.address ? (
              <Text style={styles.addressText}>📍 {item.address}</Text>
            ) : (
              <Text style={styles.addressText}>📍 Adresse inconnue</Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>😕 Aucune photo trouvée</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  photoCard: {
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
    padding: 8,
    borderRadius: 10,
    elevation: 2,
  },
  image: { width: "100%", height: 200, borderRadius: 10 },
  dateText: { marginTop: 6, fontWeight: "600" },
  addressText: { marginTop: 2, color: "#555" },
  empty: { textAlign: "center", marginTop: 20, color: "#999" },
});
