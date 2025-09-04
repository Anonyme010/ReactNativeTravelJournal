import React from "react";
import { View, Image, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePhotos } from "../../contexts/PhotoContext";

export default function PhotoCard({ photo, onPress }) {
  const { deletePhoto } = usePhotos();
  
  const handleDelete = async () => {
    Alert.alert(
      "Supprimer la photo",
      "Êtes-vous sûr de vouloir supprimer cette photo ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: async () => {
            try {
              await deletePhoto(photo.id);
              Alert.alert("Succès", "Photo supprimée avec succès");
            } catch (error) {
              Alert.alert("Erreur", "Impossible de supprimer la photo");
            }
          }
        }
      ]
    );
  };
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.photoCard} 
        onPress={() => onPress && onPress(photo)}
      >
        <Image 
          source={photo.uri || { uri: photo.imageUrl }} 
          style={styles.image} 
          onError={(e) => console.error(`Image loading error for photo ${photo.id}:`, e.nativeEvent.error)}
        />
        <Text style={styles.dateText}>📅 {photo.date}</Text>
        {photo.address ? (
          <Text style={styles.addressText} numberOfLines={2}>
            📍 {photo.address}
          </Text>
        ) : (
          <Text style={styles.addressText}>📍 Adresse inconnue</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={handleDelete}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Ionicons name="close-circle" size={30} color="#e74c3c" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 16,
    marginHorizontal: 4, // Add margins to prevent button from getting cut off
    marginTop: 8, // Add more space at top for delete button
  },
  photoCard: {
    backgroundColor: "#f9f9f9",
    padding: 8,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  image: { 
    width: "100%", 
    height: 200, 
    borderRadius: 10 
  },
  dateText: { 
    marginTop: 6, 
    fontWeight: "600" 
  },
  addressText: { 
    marginTop: 2, 
    color: "#555",
    fontSize: 13,
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 2,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 10,
  },
});