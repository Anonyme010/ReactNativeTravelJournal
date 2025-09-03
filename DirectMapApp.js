import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = React.useRef(null);
  
  // Location data for France
  const locationData = [
    {
      id: 1,
      title: 'Tour Eiffel, Paris',
      latitude: 48.8584,
      longitude: 2.2945
    },
    {
      id: 2,
      title: 'Basilique Notre-Dame de Marseille',
      latitude: 43.2843,
      longitude: 5.3715
    },
    {
      id: 3,
      title: 'Place de la Bourse, Bordeaux',
      latitude: 44.8412,
      longitude: -0.5699
    }
  ];

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
    // Create markers for all locations
    const locationMarkers = locationData.map(loc => 
      `L.marker([${loc.latitude}, ${loc.longitude}])
        .addTo(map)
        .bindPopup("<div style='text-align:center'><h3>${loc.title}</h3><p>Latitude: ${loc.latitude.toFixed(4)}, Longitude: ${loc.longitude.toFixed(4)}</p></div>");`
    ).join('\n        ');
    
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
        .info-box {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          background-color: rgba(255, 255, 255, 0.8);
          border-radius: 4px;
          padding: 8px;
          z-index: 1000;
          font-size: 12px;
          text-align: center;
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
      </style>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    </head>
    <body>
      <div id="map"></div>
      <div class="info-box">
        <div id="coords">Latitude: ${lat.toFixed(6)}, Longitude: ${lon.toFixed(6)}</div>
      </div>
      
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        // Initialize the map - center on France
        const map = L.map('map').setView([46.603354, 1.888334], 6);
        
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
        marker.bindPopup("Your location").openPopup();
        
        // Add accuracy circle
        L.circle([${lat}, ${lon}], {
          radius: 100,
          color: '#136AEC',
          fillColor: '#136AEC',
          fillOpacity: 0.15
        }).addTo(map);
        
        // Add location markers in France with red color
        ${locationMarkers}
        
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

  const lat = location?.coords?.latitude || 48.8566;
  const lon = location?.coords?.longitude || 2.3522;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Application PiscineMAP</Text>
        <Text style={styles.subHeaderText}>Spécialiste Carte & Localisation</Text>
      </View>
      
      <View style={styles.mapContainer}>
        {isLoading ? (
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
          Alert.alert(
            'Locations en France',
            'Choisissez une location:',
            locationData.map(loc => ({
              text: loc.title,
              onPress: () => {
                if (webViewRef.current) {
                  const script = `
                    map.setView([${loc.latitude}, ${loc.longitude}], 15);
                    // Find the marker at this location and open its popup
                    Object.values(map._layers).forEach(layer => {
                      if (layer._latlng && 
                          Math.abs(layer._latlng.lat - ${loc.latitude}) < 0.0001 && 
                          Math.abs(layer._latlng.lng - ${loc.longitude}) < 0.0001) {
                        layer.openPopup();
                      }
                    });
                  `;
                  webViewRef.current.injectJavaScript(script);
                }
              }
            })).concat([
              { text: 'Annuler', style: 'cancel' }
            ])
          );
        }}>
          <Text style={styles.footerButtonText}>Voir locations</Text>
        </TouchableOpacity>
        
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007bff',
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subHeaderText: {
    color: 'white',
    fontSize: 16,
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
    justifyContent: 'space-around',
    paddingVertical: 15,
    paddingBottom: 30, 
    marginBottom: 15, 
  },
  footerButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    minWidth: 150,
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
    bottom: 100, 
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
});