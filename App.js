import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import our screens
import MapScreen from './src/features/map/MapScreen';
import PoolMapScreen from './src/features/map/PoolMapScreen';
import LocationComponent from './src/components/MapComponents/LocationComponent';
import MapDiagnostic from './src/components/MapComponents/MapDiagnostic';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Map">
          <Stack.Screen 
            name="Map" 
            component={MapScreen} 
            options={{ title: 'PiscineMAP' }} 
          />
          <Stack.Screen 
            name="PoolMap" 
            component={PoolMapScreen} 
            options={{ title: 'Carte des Piscines' }} 
          />
          <Stack.Screen 
            name="Location" 
            component={LocationComponent} 
            options={{ title: 'Ma Position' }} 
          />
          <Stack.Screen 
            name="Diagnostic" 
            component={MapDiagnostic} 
            options={{ title: 'Diagnostic de Carte' }} 
          />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
