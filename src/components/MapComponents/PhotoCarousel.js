import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function PhotoCarousel({ photos, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (!photos || photos.length === 0) {
    return null;
  }
  
  const currentPhoto = photos[currentIndex];
  
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          Photo {currentIndex + 1} sur {photos.length}
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.photoContainer}>
        <Image 
          source={currentPhoto.uri} 
          style={styles.photo}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.navigationContainer}>
        <TouchableOpacity 
          onPress={goToPrevious} 
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          disabled={currentIndex === 0}
        >
          <Ionicons 
            name="chevron-back" 
            size={30} 
            color={currentIndex === 0 ? "#999" : "white"} 
          />
        </TouchableOpacity>
        
        <View style={styles.photoInfo}>
          <Text style={styles.photoDate}>📅 {currentPhoto.date}</Text>
          {currentPhoto.address && (
            <Text style={styles.photoAddress} numberOfLines={2}>
              📍 {currentPhoto.address}
            </Text>
          )}
        </View>
        
        <TouchableOpacity 
          onPress={goToNext}
          style={[styles.navButton, currentIndex === photos.length - 1 && styles.navButtonDisabled]}
          disabled={currentIndex === photos.length - 1}
        >
          <Ionicons 
            name="chevron-forward" 
            size={30} 
            color={currentIndex === photos.length - 1 ? "#999" : "white"} 
          />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        style={styles.thumbnailScroll} 
        contentContainerStyle={styles.thumbnailContainer}
        showsHorizontalScrollIndicator={false}
      >
        {photos.map((photo, index) => (
          <TouchableOpacity 
            key={photo.id} 
            onPress={() => setCurrentIndex(index)}
            style={[
              styles.thumbnailTouch,
              currentIndex === index && styles.thumbnailSelected
            ]}
          >
            <Image 
              source={photo.uri} 
              style={styles.thumbnail}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  headerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  photoInfo: {
    flex: 1,
    paddingHorizontal: 10,
  },
  photoDate: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  photoAddress: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  thumbnailScroll: {
    height: 80,
    backgroundColor: '#222',
  },
  thumbnailContainer: {
    padding: 10,
    alignItems: 'center',
  },
  thumbnailTouch: {
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailSelected: {
    borderColor: '#007bff',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 3,
  },
});