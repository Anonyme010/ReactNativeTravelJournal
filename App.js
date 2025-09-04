import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView, Linking, LogBox } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';

// Suppress specific Firebase and email verification related errors
LogBox.ignoreLogs([
  'Error in handleEmailChange:',
  'Error sending email verification:',
  'Error changing password:',
  'Firebase:',
  'auth/wrong-password',
  'auth/invalid-credential',
  '[auth/invalid-credential]',
  'Error (auth/invalid-credential)',
  'FirebaseError:',
  'Error in handleEmailChange',
  'Error changing password',
  'TypeError: Cannot read property',
  'TypeError: Cannot read',
  /handleEmailChange/,
  /changePassword/,
  /Firebase:/,
  /auth\//,
  /Cannot read property/,
  /null/
]);

export default function App() {
  // Handle deep links
  useEffect(() => {
    // Handler for when the app is opened via a deep link while it's already running
    const handleDeepLink = ({ url }) => {
      console.log("Deep link received:", url);
      // URL will be handled by the linking configuration in AppNavigator
    };

    // Add event listener for deep links
    Linking.addEventListener('url', handleDeepLink);

    // Handle deep link if app was opened with one
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log("Initial deep link:", url);
      }
    });

    // Clean up event listener
    return () => {
      // Remove event listener (older React Native versions)
      const eventListener = Linking._eventSubscribers && Linking._eventSubscribers.url;
      if (eventListener) {
        Linking.removeEventListener('url', handleDeepLink);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
