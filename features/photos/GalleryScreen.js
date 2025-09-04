import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { PHOTOS } from "../photos/photos";
import { Ionicons } from "@expo/vector-icons"; // Icônes Expo

export default function GalleryScreen() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [allPhotos, setAllPhotos] = useState(true);

  const selectedDate = date.toISOString().split("T")[0];
  const filteredPhotos = allPhotos
    ? PHOTOS
    : PHOTOS.filter((p) => p.date === selectedDate);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {!allPhotos && (
          <TouchableOpacity
            onPress={() => setAllPhotos(true)}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>
          {allPhotos ? "📸 Toutes les photos" : `📅 Photos du ${selectedDate}`}
        </Text>
      </View>

      {/* Bouton filtre */}
      {allPhotos && (
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowPicker(true)}
        >
          <Ionicons name="calendar" size={18} color="white" />
          <Text style={styles.filterText}>Filtrer par date</Text>
        </TouchableOpacity>
      )}

      {/* Date Picker */}
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selected) => {
            setShowPicker(false);
            if (selected) {
              setDate(selected);
              setAllPhotos(false);
            }
          }}
        />
      )}

      {/* Galerie */}
      <FlatList
        data={filteredPhotos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Image source={item.uri} style={styles.image} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>😕 Aucune photo pour cette date</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#f9f9f9" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  backBtn: {
    backgroundColor: "#4a90e2",
    padding: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  title: { fontSize: 18, fontWeight: "bold" },

  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#27ae60",
    padding: 12,
    borderRadius: 10,
    justifyContent: "center",
    marginBottom: 15,
  },
  filterText: { color: "white", fontWeight: "600", marginLeft: 6 },

  image: {
    width: "100%", // prend toute la largeur
    height: 250, // plus grand
    borderRadius: 12,
    marginBottom: 15,
  },
  empty: { textAlign: "center", marginTop: 20, fontSize: 16, color: "#888" },
});
