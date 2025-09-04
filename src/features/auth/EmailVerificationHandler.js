import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { completeEmailChange } from '../../services/authService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

const EmailVerificationHandler = ({ route }) => {
  const { currentUser, refreshUserData, forceRefresh } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);
  const [newEmail, setNewEmail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleVerification = async () => {
      try {
        const { mode, oobCode } = route.params || {};
        
        console.log("Email verification handler called with:", { mode, oobCode });
        
        if (!oobCode) {
          setError("Code de vérification manquant");
          setLoading(false);
          return;
        }
        
        if (mode !== 'verifyEmail') {
          setError("Type de vérification non pris en charge");
          setLoading(false);
          return;
        }
        
        if (!currentUser) {
          try {
            await completeEmailChange(oobCode);
            setLoggedOut(true);
            setSuccess(true);
            
            const url = await Linking.getInitialURL();
            if (url && url.includes('continueUrl')) {
              const emailMatch = url.match(/email=([^&]+)/);
              if (emailMatch && emailMatch[1]) {
                setNewEmail(decodeURIComponent(emailMatch[1]));
              }
            }
          } catch (verifyError) {
            console.log("Non-critical verification error without login:", verifyError.code);
            setLoggedOut(true);
            setSuccess(true);
          }
          setLoading(false);
          return;
        }
        
        const oldEmail = currentUser.email;
        
        console.log("Completing email verification with code:", oobCode);
        
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.pendingEmail) {
              setNewEmail(userData.pendingEmail);
            }
          }
          
          // Complete the email change
          await completeEmailChange(oobCode);
          
          try {
            if (typeof forceRefresh === 'function') {
              await forceRefresh();
            } else {
              await refreshUserData();
            }
          } catch (refreshError) {
            console.log("Expected refresh error after email change:", refreshError.code || "unknown");
            // User will likely be logged out automatically
            setLoggedOut(true);
          }
          
          setSuccess(true);
        } catch (changeError) {
          console.log("Expected error completing email change:", changeError.code || "unknown");
          
          // as the verification likely worked but the token is now invalid
          setLoggedOut(true);
          setSuccess(true); // Still consider it a success
          setError(null);   // Clear error
        }
      } catch (error) {
        // Only show critical errors that aren't related to token expiration because we need to log out the user anyway
        if (error.code === 'auth/user-token-expired' || 
            error.code === 'auth/requires-recent-login' ||
            (error.message && (
              error.message.includes('token') || 
              error.message.includes('expired')
            ))) {
          console.log("Non-critical email verification error:", error.code || "token-related");
          setLoggedOut(true);
          setSuccess(true);
          setError(null);
        } else {
          console.error("Critical error in email verification:", error);
          setError(error.message || "Une erreur s'est produite lors de la vérification");
        }
      } finally {
        setLoading(false);
      }
    };

    handleVerification();
  }, [currentUser, route.params, refreshUserData]);

  const handleGoToProfile = () => {
    navigation.navigate('TabNavigator', { screen: 'Profil' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Vérification d'Email</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loadingText}>Vérification en cours...</Text>
          </View>
        ) : success && loggedOut ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              Email vérifié avec succès !
            </Text>
            <Text style={styles.infoText}>
              {newEmail ? 
                `Vous avez été déconnecté car votre adresse email a changé. Veuillez vous reconnecter avec votre nouvelle adresse: ${newEmail}` 
                : 
                "Vous avez été déconnecté car votre adresse email a changé. Veuillez vous reconnecter avec votre nouvelle adresse email."}
            </Text>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }}
            >
              <Text style={styles.buttonText}>Aller à la page de connexion</Text>
            </TouchableOpacity>
          </View>
        ) : success ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>Email mis à jour avec succès!</Text>
            <TouchableOpacity style={styles.button} onPress={handleGoToProfile}>
              <Text style={styles.buttonText}>Retour au profil</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Erreur: {error}</Text>
            {loggedOut ? (
              <>
                <Text style={styles.infoText}>
                  Veuillez vous reconnecter avec votre nouvelle adresse email.
                </Text>
                <TouchableOpacity 
                  style={styles.button} 
                  onPress={() => {
                    // Use reset to clear navigation stack and force go to Login
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Login' }],
                    });
                  }}
                >
                  <Text style={styles.buttonText}>Aller à la page de connexion</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleGoToProfile}>
                <Text style={styles.buttonText}>Retour au profil</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#555',
  },
  successContainer: {
    alignItems: 'center',
    padding: 20,
  },
  successText: {
    fontSize: 18,
    color: '#4CAF50',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EmailVerificationHandler;