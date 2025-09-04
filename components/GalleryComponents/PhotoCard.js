import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

export default function PhotoCard({ photo }) {
  return (
    <View style={styles.card}>
      <Image source={photo.uri} style={styles.image} />
      <Text style={styles.meta}>{photo.date}</Text>
      <Text style={styles.meta}>{photo.location}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 6, alignItems: "center" },
  image: { width: 150, height: 150, borderRadius: 10 },
  meta: { fontSize: 12, marginTop: 2 },
});
