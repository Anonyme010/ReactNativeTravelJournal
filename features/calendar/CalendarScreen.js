import React, { useState } from "react";
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
import { PHOTOS } from "../photos/photos";

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [visible, setVisible] = useState(false);

  // Marquage des dates avec photos
  const markedDates = PHOTOS.reduce((acc, photo) => {
    acc[photo.date] = { marked: true, dotColor: "#4a90e2" };
    return acc;
  }, {});

  const photosOfDay = PHOTOS.filter((p) => p.date === selectedDate);

  return (
    <View style={styles.container}>
      <Calendar
        markedDates={{
          ...markedDates,
          ...(selectedDate && {
            [selectedDate]: {
              selected: true,
              selectedColor: "#4a90e2",
              marked: true,
              dotColor: "white",
            },
          }),
        }}
        onDayPress={(day) => {
          setSelectedDate(day.dateString);
          setVisible(true);
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

      {/* Popup modal */}
      <Modal visible={visible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>📅 Photos du {selectedDate}</Text>

            {photosOfDay.length > 0 ? (
              <FlatList
                data={photosOfDay}
                keyExtractor={(item) => item.id}
                numColumns={2} // ✅ affichage en grille
                columnWrapperStyle={styles.row}
                renderItem={({ item }) => (
                  <Image source={item.uri} style={styles.image} />
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
  container: { flex: 1, backgroundColor: "#f9f9f9" },
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
  image: {
    width: 150,
    height: 120,
    marginBottom: 10,
    borderRadius: 10,
  },
  closeBtn: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#e74c3c",
    borderRadius: 25,
    alignSelf: "center",
    width: 120,
  },
  closeText: { color: "white", textAlign: "center", fontWeight: "600" },
  emptyText: { textAlign: "center", marginTop: 20, fontSize: 16, color: "#888" },
});
