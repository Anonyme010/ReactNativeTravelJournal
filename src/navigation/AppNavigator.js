import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/shared/LoadingScreen';
import { Linking } from 'react-native';

import ProfileScreen from '../features/profile/ProfileScreen';
import PhotosScreen from '../features/placeholder/PhotosPlaceholder';

import CameraPlaceholder from '../features/placeholder/CameraPlaceholder';
import CalendarPlaceholder from '../features/placeholder/CalendarPlaceholder';

import MapScreen from '../features/placeholder/MapPlaceholder';

// Auth screens
import LoginScreen from '../features/auth/LoginScreen';
import RegisterScreen from '../features/auth/RegisterScreen';
import EmailVerificationHandler from '../features/auth/EmailVerificationHandler';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const MainStack = createStackNavigator();

const linking = {
  prefixes: [
    'piscine://', // Custom URL scheme
    'https://piscine-2fb9d.firebaseapp.com', // Firebase Dynamic Links domain
    'https://*.piscine-2fb9d.firebaseapp.com', // Subdomain matching
  ],
  config: {
    screens: {
      TabNavigator: {
        screens: {
          Profil: 'profile',
        },
      },
      EmailVerification: {
        path: 'emailVerification/:mode/:oobCode',
        parse: {
          mode: (mode) => mode,
          oobCode: (oobCode) => oobCode,
        },
      },
    },
  },
  // Custom function to handle links that don't match the configuration
  async getInitialURL() {
    // First, check if app was opened from a deep link
    const url = await Linking.getInitialURL();
    
    if (url != null) {
      // Check if the URL contains email verification parameters
      if (url.includes('mode=verifyEmail') && url.includes('oobCode=')) {
        // Extract the oobCode parameter
        const oobCode = url.match(/oobCode=([^&]+)/)?.[1];
        
        if (oobCode) {
          return `emailVerification/verifyEmail/${oobCode}`;
        }
      }
    }
    
    return url;
  },
  // Custom function to subscribe to incoming links
  subscribe(listener) {
    const onReceiveURL = ({ url }) => {
      // Check if the URL contains email verification parameters
      if (url.includes('mode=verifyEmail') && url.includes('oobCode=')) {
        // Extract the oobCode parameter
        const oobCode = url.match(/oobCode=([^&]+)/)?.[1];
        
        if (oobCode) {
          listener(`emailVerification/verifyEmail/${oobCode}`);
          return;
        }
      }
      
      listener(url);
    };

    // Listen to incoming links from deep linking
    const subscription = Linking.addEventListener('url', onReceiveURL);

    return () => {
      subscription.remove();
    };
  },
};

// Auth navigator component
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Main tab navigator component
const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Appareil') {
          iconName = focused ? 'camera' : 'camera-outline';
        } else if (route.name === 'Carte') {
          iconName = focused ? 'map' : 'map-outline';
        } else if (route.name === 'Calendrier') {
          iconName = focused ? 'calendar' : 'calendar-outline';
        } else if (route.name === 'Photos') {
          iconName = focused ? 'images' : 'images-outline';
        } else if (route.name === 'Profil') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007bff',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Appareil" component={CameraPlaceholder} options={{ title: 'Appareil' }} />
    <Tab.Screen name="Carte" component={MapScreen} options={{ title: 'Carte' }} />
    <Tab.Screen name="Calendrier" component={CalendarPlaceholder} options={{ title: 'Calendrier' }} />
    <Tab.Screen name="Photos" component={PhotosScreen} options={{ title: 'Photos' }} />
    <Tab.Screen name="Profil" component={ProfileScreen} options={{ title: 'Profil' }} />
  </Tab.Navigator>
);

// Main stack navigator that includes both tabs and other screens
const MainNavigator = () => (
  <MainStack.Navigator>
    <MainStack.Screen 
      name="TabNavigator" 
      component={TabNavigator} 
      options={{ headerShown: false }} 
    />
    <MainStack.Screen 
      name="EmailVerification" 
      component={EmailVerificationHandler} 
      options={{ title: 'Vérification Email' }} 
    />
  </MainStack.Navigator>
);

// Main navigation component
const AppNavigator = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Démarrage..." />;
  }

  return (
    <NavigationContainer linking={linking}>
      {currentUser ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;