import React from 'react';
import { View, Text, StyleSheet } from 'react-native';



const PhotosScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Cet écran sera entièrement implémenté par le membre de l'équipe en charge des Photos</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  text: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PhotosScreen;