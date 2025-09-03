import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CameraPlaceholder = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Appareil Photo</Text>
      <Text style={styles.subText}>Cet écran sera implémenté par le spécialiste de la caméra</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default CameraPlaceholder;