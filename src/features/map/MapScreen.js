import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Alert, Image, Modal, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { usePhotos } from '../../contexts/PhotoContext';

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photosAtLocation, setPhotosAtLocation] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const webViewRef = React.useRef(null);
  
  // Get photos from context
  const { photos, loading: photosLoading } = usePhotos();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setIsLoading(false);
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({
          accuracy: 4
        });
        console.log("Location found:", location);
        setLocation(location);
        setIsLoading(false);
      } catch (error) {
        console.error("Location error:", error);
        setErrorMsg('Error getting location: ' + error.message);
        setIsLoading(false);
      }
    })();
  }, []);

  // Create the HTML content with the map
  const getMapHtml = (lat, lon) => {
    // Group photos by location (with small tolerance for coordinates)
    const photosByLocation = {};
    
    photos
      .filter(photo => photo.location && photo.location.latitude && photo.location.longitude)
      .forEach(photo => {
        const { latitude, longitude } = photo.location;
        // Create a key with rounded coordinates to group nearby photos
        const locationKey = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
        
        if (!photosByLocation[locationKey]) {
          photosByLocation[locationKey] = {
            latitude,
            longitude,
            photos: []
          };
        }
        
        photosByLocation[locationKey].photos.push(photo);
      });
    
    // Create markers for photo locations
    const photoMarkers = Object.entries(photosByLocation).map(([locationKey, locationData], index) => {
      const { latitude, longitude, photos: photosHere } = locationData;
      const photoCount = photosHere.length;
      const firstPhoto = photosHere[0];
      const title = firstPhoto.address ? firstPhoto.address : `Photos (${photoCount})`;
      
      return `
        var photoIcon${index} = L.divIcon({
          className: 'photo-marker',
          html: '<div style="background-color: #ff6b6b; width: ${12 + Math.min(photoCount * 2, 8)}px; height: ${12 + Math.min(photoCount * 2, 8)}px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center; font-weight: bold; color: white; font-size: 10px;">${photoCount > 1 ? photoCount : ''}</div>',
          iconSize: [${20 + Math.min(photoCount * 2, 8)}, ${20 + Math.min(photoCount * 2, 8)}],
          iconAnchor: [${10 + Math.min(photoCount * 2, 8)/2}, ${10 + Math.min(photoCount * 2, 8)/2}]
        });
        
        L.marker([${latitude}, ${longitude}], {icon: photoIcon${index}})
          .addTo(map)
          .bindPopup("<div style='text-align:center'><h3>${title}</h3><p>${photoCount} photo${photoCount > 1 ? 's' : ''}</p><p>Latitude: ${latitude.toFixed(4)}, Longitude: ${longitude.toFixed(4)}</p></div>")
          .on('click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              event: 'locationClicked',
              latitude: ${latitude},
              longitude: ${longitude},
              photoCount: ${photoCount}
            }));
          });
      `;
    }).join('\n        ');
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body, html {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          overflow: hidden;
          font-family: Arial, sans-serif;
        }
        #map {
          width: 100%;
          height: 100%;
          background-color: #f1f1f1;
        }
        .button {
          background-color: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          margin-top: 8px;
          cursor: pointer;
        }
        .photo-marker {
          border-radius: 50%;
        }
      </style>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    </head>
    <body>
      <div id="map"></div>
      
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        // Initialize the map - center on France
        const map = L.map('map').setView([${lat}, ${lon}], 15);
        
        // Use only OpenStreetMap
        const mapUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        
        // Add the tile layer
        let currentLayer = L.tileLayer(mapUrl, {
          maxZoom: 19,
          attribution: attribution
        }).addTo(map);
        
        // Add user location marker with blue color
        const userIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        
        const marker = L.marker([${lat}, ${lon}], {icon: userIcon}).addTo(map);
        marker.bindPopup("Votre position").openPopup();
        
        // Add accuracy circle
        L.circle([${lat}, ${lon}], {
          radius: 100,
          color: '#136AEC',
          fillColor: '#136AEC',
          fillOpacity: 0.15
        }).addTo(map);
        
        // Add photo markers
        ${photoMarkers}
        
        // Report errors to console
        map.on('error', function(e) {
          console.error('Leaflet error:', e.error);
        });
        
        // Report when map is loaded
        map.on('load', function() {
          console.log('Map loaded successfully');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            event: 'mapLoaded',
            provider: 'OpenStreetMap'
          }));
        });
        
        // Report when tiles are loaded
        map.on('tileloadend', function(e) {
          console.log('Tile loaded');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            event: 'tileLoaded'
          }));
        });
        
        // Report when tiles fail to load
        map.on('tileerror', function(e) {
          console.error('Tile error');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            event: 'tileError'
          }));
        });
      </script>
    </body>
    </html>
  `;
  };

  // Handle WebView messages
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Message from WebView:', data);
      
      if (data.event === 'tileError') {
        console.warn('Tile loading error detected');
      } else if (data.event === 'locationClicked' && data.latitude && data.longitude) {
        console.log('Location clicked:', data.latitude, data.longitude);
        
        // Find all photos at this location (with a small tolerance)
        const tolerance = 0.0001; // About 10 meters tolerance
        const photosAtThisLocation = photos.filter(p => 
          p.location && 
          Math.abs(p.location.latitude - data.latitude) < tolerance && 
          Math.abs(p.location.longitude - data.longitude) < tolerance
        );
        
        if (photosAtThisLocation.length > 0) {
          setPhotosAtLocation(photosAtThisLocation);
          setCurrentPhotoIndex(0);
          setModalVisible(true);
        }
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  const retryLocation = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    
    try {
      let location = await Location.getCurrentPositionAsync({
        accuracy: 4
      });
      setLocation(location);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setErrorMsg('Error getting location: ' + error.message);
      setIsLoading(false);
    }
  };

  const showDebugInfo = () => {
    let debugInfo = 'Debug Info:\n';
    
    if (location) {
      debugInfo += `Location: ${JSON.stringify(location.coords)}\n`;
    } else {
      debugInfo += 'Location: Not available\n';
    }
    
    if (errorMsg) {
      debugInfo += `Error: ${errorMsg}\n`;
    }
    
    Alert.alert('Debug Information', debugInfo);
  };

  // Navigate to the next photo in the current location
  const showNextPhoto = () => {
    if (photosAtLocation.length > 1) {
      setCurrentPhotoIndex((prevIndex) => 
        prevIndex === photosAtLocation.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  // Navigate to the previous photo in the current location
  const showPreviousPhoto = () => {
    if (photosAtLocation.length > 1) {
      setCurrentPhotoIndex((prevIndex) => 
        prevIndex === 0 ? photosAtLocation.length - 1 : prevIndex - 1
      );
    }
  };

  const lat = location?.coords?.latitude || 48.8566;
  const lon = location?.coords?.longitude || 2.3522;

  return (
    <View style={styles.container}>      
      <View style={styles.mapContainer}>
        {isLoading || photosLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loadingText}>Chargement de la carte...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.button} onPress={retryLocation}>
              <Text style={styles.buttonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            style={styles.map}
            source={{ 
              html: getMapHtml(lat, lon) 
            }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={handleWebViewMessage}
            onError={(e) => {
              console.error('WebView error:', e.nativeEvent);
              setErrorMsg('Erreur WebView: ' + e.nativeEvent.description);
            }}
          />
        )}
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={() => {
          if (location) {
            Alert.alert('Position', `Latitude: ${lat.toFixed(6)}, Longitude: ${lon.toFixed(6)}`);
          } else {
            Alert.alert('Position', 'Localisation non disponible');
          }
        }}>
          <Text style={styles.footerButtonText}>Détails de position</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.locationButton}
        onPress={retryLocation}>
        <Text style={styles.locationButtonText}>⊕</Text>
      </TouchableOpacity>

      {/* Photo Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            
            {photosAtLocation.length > 0 && (
              <>
                <View style={styles.photoCounter}>
                  <Text style={styles.photoCounterText}>
                    {currentPhotoIndex + 1} / {photosAtLocation.length}
                  </Text>
                </View>
                
                <ScrollView contentContainerStyle={styles.modalScrollContent}>
                  <Text style={styles.photoTitle}>
                    {photosAtLocation[currentPhotoIndex].address || 'Photo sans adresse'}
                  </Text>
                  
                  <Image
                    source={photosAtLocation[currentPhotoIndex].uri}
                    style={styles.photoImage}
                    resizeMode="contain"
                  />
                  
                  <View style={styles.photoDetails}>
                    <Text style={styles.photoDate}>
                      Date: {photosAtLocation[currentPhotoIndex].date 
                        ? new Date(photosAtLocation[currentPhotoIndex].date).toLocaleDateString() 
                        : 'Date inconnue'}
                    </Text>
                    
                    {photosAtLocation[currentPhotoIndex].location && (
                      <Text style={styles.photoLocation}>
                        Localisation: {photosAtLocation[currentPhotoIndex].location.latitude.toFixed(6)}, 
                        {photosAtLocation[currentPhotoIndex].location.longitude.toFixed(6)}
                      </Text>
                    )}
                  </View>
                </ScrollView>
                
                {photosAtLocation.length > 1 && (
                  <View style={styles.navigationControls}>
                    <TouchableOpacity 
                      style={styles.navButton}
                      onPress={showPreviousPhoto}
                    >
                      <Text style={styles.navButtonText}>◀</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.navButton}
                      onPress={showNextPhoto}
                    >
                      <Text style={styles.navButtonText}>▶</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mapContainer: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  map: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingBottom: 10,
    marginBottom: 0,
  },
  footerButton: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
    minWidth: 140,
    alignItems: 'center',
  },
  footerButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  locationButton: {
    position: 'absolute',
    bottom: 80, 
    right: 16,
    backgroundColor: 'white',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  locationButtonText: {
    fontSize: 24,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    backgroundColor: '#f0f0f0',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalScrollContent: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 60, // Leave space for navigation controls
  },
  photoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  photoImage: {
    width: '100%',
    height: 300,
    marginBottom: 15,
  },
  photoDetails: {
    width: '100%',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  photoDate: {
    fontSize: 14,
    marginBottom: 5,
  },
  photoLocation: {
    fontSize: 14,
  },
  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  navButton: {
    backgroundColor: '#007bff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  navButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  photoCounter: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  photoCounterText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});