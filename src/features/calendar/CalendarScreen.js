import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Image,
  FlatList,
  Text,
  TouchableOpacity,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { usePhotos } from "../../contexts/PhotoContext";
import { formatDate } from "../../utils/dateUtils";

export default function CalendarScreen() {
  const { photos, loading } = usePhotos();
  const [selectedDate, setSelectedDate] = useState(null);
  const [visible, setVisible] = useState(false);
  const [markedDates, setMarkedDates] = useState({});

  // Générer les dates marquées à partir des photos
  useEffect(() => {
    if (photos.length > 0) {
      const marks = photos.reduce((acc, photo) => {
        // Si la date existe déjà, incrémenter le compteur
        if (acc[photo.date]) {
          acc[photo.date].count = (acc[photo.date].count || 1) + 1;
          acc[photo.date].dots = [
            { key: 'count', color: '#4a90e2', selectedDotColor: 'white' }
          ];
        } else {
          // Sinon créer une nouvelle entrée
          acc[photo.date] = { 
            marked: true, 
            dotColor: "#4a90e2",
            count: 1,
            dots: [
              { key: 'count', color: '#4a90e2', selectedDotColor: 'white' }
            ]
          };
        }
        
        // Si c'est la date sélectionnée, ajouter les propriétés de sélection
        if (selectedDate === photo.date) {
          acc[photo.date].selected = true;
          acc[photo.date].selectedColor = "#4a90e2";
        }
        
        return acc;
      }, {});
      
      setMarkedDates(marks);
    }
  }, [photos, selectedDate]);

  // Filtrer les photos par date
  const photosOfDay = selectedDate 
    ? photos.filter(p => p.date === selectedDate)
    : [];

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Chargement du calendrier...</Text>
        </View>
      ) : (
        <>
          <Calendar
            markedDates={markedDates}
            onDayPress={(day) => {
              const dateString = day.dateString;
              setSelectedDate(dateString);
              
              // Ouvrir la modal seulement s'il y a des photos pour cette date
              if (markedDates[dateString]) {
                setVisible(true);
              } else {
                // Informer l'utilisateur qu'il n'y a pas de photos ce jour
                setVisible(false);
              }
            }}
            theme={{
              backgroundColor: "#ffffff",
              calendarBackground: "#ffffff",
              textSectionTitleColor: "#4a90e2",
              selectedDayBackgroundColor: "#4a90e2",
              selectedDayTextColor: "#ffffff",
              todayTextColor: "#e74c3c",
              dayTextColor: "#2d4150",
              textDisabledColor: "#d9e1e8",
              arrowColor: "#4a90e2",
              monthTextColor: "#333",
              textMonthFontSize: 18,
              textMonthFontWeight: "bold",
              textDayFontSize: 16,
              textDayHeaderFontSize: 14,
            }}
          />
          
          {/* Message explicatif */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              📅 Les jours marqués contiennent des photos
            </Text>
            {selectedDate && !markedDates[selectedDate] && (
              <Text style={styles.noPhotosText}>
                😕 Aucune photo prise le {formatDate(selectedDate)}
              </Text>
            )}
          </View>
        </>
      )}

      {/* Popup modal */}
      <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>📅 Photos du {selectedDate && formatDate(selectedDate)}</Text>

            {photosOfDay.length > 0 ? (
              <FlatList
                data={photosOfDay}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.row}
                renderItem={({ item }) => (
                  <View style={styles.photoContainer}>
                    <Image source={item.uri} style={styles.image} />
                    {item.address && (
                      <Text style={styles.addressText} numberOfLines={2}>
                        📍 {item.address}
                      </Text>
                    )}
                  </View>
                )}
              />
            ) : (
              <Text style={styles.emptyText}>😕 Aucune photo pour cette date</Text>
            )}

            <TouchableOpacity
              onPress={() => setVisible(false)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f9f9f9" 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  infoContainer: {
    padding: 15,
    alignItems: 'center'
  },
  infoText: {
    color: '#4a90e2',
    fontStyle: 'italic',
    marginBottom: 5
  },
  noPhotosText: {
    color: '#e74c3c',
    marginTop: 10
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 15,
    maxHeight: "80%",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  row: {
    justifyContent: "space-between",
  },
  photoContainer: {
    width: '48%',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 120,
    borderRadius: 10,
  },
  addressText: {
    fontSize: 10,
    color: '#666',
    marginTop: 2
  },
  closeBtn: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#e74c3c",
    borderRadius: 25,
    alignSelf: "center",
    width: 120,
  },
  closeText: { 
    color: "white", 
    textAlign: "center", 
    fontWeight: "600" 
  },
  emptyText: { 
    textAlign: "center", 
    marginTop: 20, 
    fontSize: 16, 
    color: "#888" 
  },
});