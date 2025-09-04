import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { usePhotos } from "../../contexts/PhotoContext";
import PhotoCard from "../../components/GalleryComponents/PhotoCard";
import DateTimePicker from "@react-native-community/datetimepicker";
import { formatDate } from "../../utils/dateUtils";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from '@react-navigation/native';

export default function GalleryScreen() {
  const { photos, loading, refreshPhotos, deletePhoto } = usePhotos();
  const [searchLocation, setSearchLocation] = useState("");
  const [filterDate, setFilterDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  
  // Rafraîchir les photos lorsque l'écran est affiché
  useFocusEffect(
    useCallback(() => {
      refreshPhotos();
    }, [])
  );

  // Filtrage combiné: par date ET par lieu
  const filteredPhotos = photos.filter((photo) => {
    const matchesLocation = !searchLocation || 
      (photo.address && photo.address.toLowerCase().includes(searchLocation.toLowerCase()));
    
    const matchesDate = !filterDate || 
      photo.date === filterDate.toISOString().split("T")[0];
    
    return matchesLocation && matchesDate;
  });

  // Gestion du DatePicker
  const handleDateChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    
    // Only update the date if user actually selected one and didn't cancel
    if (event.type === 'set' && selectedDate) {
      setFilterDate(selectedDate);
    } else if (event.type === 'dismissed') {
      // Do nothing if user dismissed the picker without selecting
      // This preserves the previous filterDate
    }
  };

  // Réinitialiser tous les filtres
  const resetFilters = () => {
    setSearchLocation("");
    setFilterDate(null);
  };

  // Ouvrir la vue détaillée d'une photo
  const handlePhotoPress = (photo) => {
    setSelectedPhoto(photo);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        📸 Ma Galerie {photos.length > 0 ? `(${photos.length})` : ""}
      </Text>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        {/* Filtre par lieu */}
        <TextInput
          style={styles.input}
          placeholder="🔍 Rechercher par lieu"
          value={searchLocation}
          onChangeText={setSearchLocation}
        />

        {/* Filtre par date */}
        <View style={styles.dateFilterContainer}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowPicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#4a90e2" />
            <Text style={styles.dateButtonText}>
              {filterDate ? formatDate(filterDate) : "Filtrer par date"}
            </Text>
          </TouchableOpacity>

          {filterDate && (
            <TouchableOpacity
              style={styles.resetDateButton}
              onPress={() => setFilterDate(null)}
            >
              <Ionicons name="close-circle" size={20} color="#e74c3c" />
            </TouchableOpacity>
          )}
        </View>

        {/* Bouton réinitialiser */}
        {(searchLocation || filterDate) && (
          <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
            <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
          </TouchableOpacity>
        )}

        {/* DatePicker */}
        {showPicker && (
          <DateTimePicker
            value={filterDate || new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
            maximumDate={new Date()}
            onError={(error) => console.error('Date Picker Error:', error)}
          />
        )}
      </View>

      {/* Liste de photos */}
      {loading && photos.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a90e2" />
          <Text style={styles.loadingText}>Chargement des photos...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPhotos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 4 }}
          renderItem={({ item }) => (
            <PhotoCard photo={item} onPress={handlePhotoPress} />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {searchLocation || filterDate
                ? "😕 Aucune photo ne correspond à ces critères"
                : "😕 Aucune photo dans votre galerie"}
            </Text>
          }
          refreshing={loading}
          onRefresh={refreshPhotos}
        />
      )}

      {/* Modal de détail photo */}
      <Modal
        visible={!!selectedPhoto}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        {selectedPhoto && (
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Image
                source={selectedPhoto.uri || { uri: selectedPhoto.imageUrl }}
                style={styles.modalImage}
                resizeMode="contain"
                onError={(e) => console.error(`Modal image loading error:`, e.nativeEvent.error)}
              />
              
              <View style={styles.photoDetails}>
                <Text style={styles.photoDate}>
                  📅 {formatDate(selectedPhoto.date)}
                </Text>
                
                {selectedPhoto.address && (
                  <Text style={styles.photoAddress}>
                    📍 {selectedPhoto.address}
                  </Text>
                )}
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedPhoto(null)}
                >
                  <Text style={styles.closeButtonText}>Fermer</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.deleteModalButton}
                  onPress={async () => {
                    try {
                      setSelectedPhoto(null);
                      await new Promise(resolve => setTimeout(resolve, 300)); // Wait for modal to close
                      
                      Alert.alert(
                        "Supprimer la photo",
                        "Êtes-vous sûr de vouloir supprimer cette photo ?",
                        [
                          { text: "Annuler", style: "cancel" },
                          { 
                            text: "Supprimer", 
                            style: "destructive",
                            onPress: async () => {
                              try {
                                await deletePhoto(selectedPhoto.id);
                                refreshPhotos();
                              } catch (error) {
                                Alert.alert("Erreur", "Impossible de supprimer la photo");
                              }
                            }
                          }
                        ]
                      );
                    } catch (error) {
                      console.error("Error during deletion:", error);
                    }
                  }}
                >
                  <Text style={styles.deleteButtonText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingVertical: 12,
    paddingHorizontal: 16, 
    backgroundColor: "#fff" 
  },
  title: { 
    fontSize: 22, 
    fontWeight: "bold", 
    marginBottom: 12 
  },
  filtersContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  dateFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 8,
    flex: 1,
  },
  dateButtonText: {
    marginLeft: 8,
    color: "#4a90e2",
  },
  resetDateButton: {
    marginLeft: 8,
    padding: 6,
  },
  resetButton: {
    backgroundColor: "#f8f8f8",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  resetButtonText: {
    color: "#e74c3c",
  },
  empty: { 
    textAlign: "center", 
    marginTop: 40, 
    color: "#999",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalContent: {
    backgroundColor: "white",
    width: "90%",
    maxHeight: "80%",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  modalImage: {
    width: "100%",
    height: 300,
    borderRadius: 8,
  },
  photoDetails: {
    width: "100%",
    marginTop: 16,
    marginBottom: 16,
  },
  photoDate: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  photoAddress: {
    fontSize: 14,
    color: "#666",
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeButton: {
    backgroundColor: "#4a90e2",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  deleteModalButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});