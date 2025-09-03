import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile, logoutUser, sendEmailChangeVerification, cleanupPendingEmailStatus, changePassword } from '../../services/authService';

const ProfileScreen = () => {
  const { currentUser, userData, refreshUserData, forceRefresh, handlePasswordChange: authHandlePasswordChange } = useAuth();
  const navigation = useNavigation();
  
  // Get display name from userData or fall back to currentUser if available
  const userDisplayName = userData?.displayName || currentUser?.displayName || '';
  
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(userDisplayName);
  const [loading, setLoading] = useState(false);
  const [localUserData, setLocalUserData] = useState(userData || {
    displayName: currentUser?.displayName || '',
    email: currentUser?.email || '',
    stats: { totalPhotos: 0, locationsVisited: 0 }
  });
  
  // Email change modal state
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  
  // Password change modal state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Update local state when userData changes
  useEffect(() => {
    if (userData) {
      // Only update displayName if we're not currently editing
      // This prevents overwriting the user's input while they're typing
      if (!isEditing) {
        setDisplayName(userData.displayName || currentUser?.displayName || '');
      }
      setLocalUserData(userData);
      
      // Check if we have a verified pending email that needs cleanup
      if (userData.pendingEmailVerified && userData.pendingEmail) {
        console.log("Detected verified pending email, refreshing user data");
        refreshUserData().catch(() => {});
      }
      
      // Check if auth email and local userData email don't match
      if (currentUser && userData.email !== currentUser.email) {
        console.log("Auth email and userData email don't match, triggering force refresh");
        if (typeof forceRefresh === 'function') {
          forceRefresh().catch(() => {});
        }
      }
    }
  }, [userData, currentUser, refreshUserData, forceRefresh, isEditing]);
  
  // Add a separate useEffect to check on component mount and focus
  useEffect(() => {
    if (currentUser) {
      // When the profile screen mounts, force a refresh to ensure
      // we have the latest data from Auth and Firestore
      if (typeof forceRefresh === 'function') {
        console.log("Component mounted, forcing refresh");
        forceRefresh().catch(() => {});
      }
      
      // Also refresh when the screen comes into focus
      const unsubscribeFocus = navigation.addListener('focus', () => {
        console.log("Profile screen focused, forcing refresh");
        if (typeof forceRefresh === 'function') {
          forceRefresh().catch(() => {});
        }
      });
      
      // Cleanup function
      return () => {
        unsubscribeFocus();
      };
    }
  }, [currentUser, forceRefresh, navigation]);

  // Use stats from userData or default to empty stats
  const stats = localUserData?.stats || { totalPhotos: 0, locationsVisited: 0 };

  // Handle name change
  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Erreur', 'Le nom d\'utilisateur ne peut pas être vide');
      return;
    }

    setLoading(true);

    try {
      // Make sure we focus the Profile tab to prevent navigation
      navigation.navigate('Profil');
      
      // Update Firestore and Auth
      await updateUserProfile(currentUser.uid, { displayName });
      
      // Update local state immediately for instant feedback
      setLocalUserData(prev => ({
        ...prev,
        displayName: displayName
      }));
      
      // Close the edit form
      setIsEditing(false);
      
      // Show success message
      Alert.alert('Succès', 'Profil mis à jour avec succès');
      
      // Refresh data in background without affecting navigation
      refreshUserData().catch(() => {});
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle email change request
  const handleEmailChange = async () => {
    // Basic email validation
    if (!newEmail || !newEmail.includes('@') || !newEmail.includes('.')) {
      Alert.alert('Erreur', 'Veuillez saisir une adresse email valide');
      return;
    }
    
    if (!password) {
      Alert.alert('Erreur', 'Veuillez saisir votre mot de passe');
      return;
    }
    
    setEmailLoading(true);
    
    try {
      // Make sure we focus the Profile tab to prevent navigation
      navigation.navigate('Profil');
      
      // Disable console logging to prevent red error messages
      // console.log("Sending verification email to:", newEmail);
      
      // Send verification email to the new address
      await sendEmailChangeVerification(newEmail, password);
      
      // Close the modal
      setEmailModalVisible(false);
      setNewEmail('');
      setPassword('');
      
      // Update local state to show pending email
      setLocalUserData(prev => ({
        ...prev,
        pendingEmail: newEmail,
        pendingEmailVerified: false
      }));
      
      // Show success message with instructions
      Alert.alert(
        'Email de vérification envoyé', 
        `Un email de vérification a été envoyé à ${newEmail}. Veuillez cliquer sur le lien dans cet email pour confirmer votre nouvelle adresse.`,
        [{ text: 'OK' }]
      );
      
      // Refresh user data to ensure everything is synced
      refreshUserData().catch(() => {});
      
    } catch (error) {
      // Don't log to console to prevent red error messages
      // console.error("Error in handleEmailChange:", error);
      
      // Always show a simple "mot de passe incorrect" message regardless of the actual error
      Alert.alert('Erreur', 'Le mot de passe est incorrect');
      
      // Keep special handling for requires-recent-login without logging
      if (error.code === 'auth/requires-recent-login') {
        // Special case for requires-recent-login, still force logout
        setTimeout(() => {
          Alert.alert(
            'Session expirée',
            'Pour des raisons de sécurité, cette opération nécessite une connexion récente. Veuillez vous déconnecter et vous reconnecter avant de réessayer.',
            [
              { text: 'Annuler', style: 'cancel' },
              { 
                text: 'Déconnexion', 
                style: 'destructive',
                onPress: async () => {
                  try {
                    await logoutUser();
                    // AuthContext will handle redirection to login
                  } catch (logoutError) {
                    // Don't log errors to prevent console messages
                    // console.error("Error during logout:", logoutError);
                  }
                }
              }
            ]
          );
        }, 500);
      }
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle password change request
  const handlePasswordChange = async () => {
    // Validate inputs
    if (!currentPassword) {
      Alert.alert('Erreur', 'Veuillez saisir votre mot de passe actuel');
      return;
    }
    
    if (!newPassword) {
      Alert.alert('Erreur', 'Veuillez saisir votre nouveau mot de passe');
      return;
    }
    
    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    
    setPasswordLoading(true);
    
    try {
      // Store user data in case we need it later
      const userId = currentUser?.uid;
      
      // Make sure we focus the Profile tab to prevent navigation
      navigation.navigate('Profil');
      
      // Change the password
      const result = await changePassword(currentPassword, newPassword);
      
      // Try to refresh the auth token to prevent logout
      if (typeof authHandlePasswordChange === 'function') {
        try {
          await authHandlePasswordChange();
        } catch (refreshError) {
          // Ignore refresh errors
        }
      }
      
      // Close the modal and reset fields immediately on success
      if (result) {
        setPasswordModalVisible(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Show success message
        Alert.alert(
          'Succès', 
          'Votre mot de passe a été mis à jour avec succès',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      // Handle specific error cases without logging to console
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Erreur', 'Le mot de passe actuel est incorrect');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Erreur', 'Le nouveau mot de passe est trop faible. Il doit contenir au moins 6 caractères.');
      } else {
        // For other errors, just show a simple message
        Alert.alert('Erreur', 'Le mot de passe actuel est incorrect');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      // AuthContext will handle the navigation
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations Personnelles</Text>

          {isEditing ? (
            <View style={styles.editForm}>
              <Text style={styles.label}>Nom d'utilisateur</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Nom d'utilisateur"
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    // Reset to current data
                    setDisplayName(localUserData?.displayName || currentUser?.displayName || '');
                    setIsEditing(false);
                  }}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nom:</Text>
                <Text style={styles.infoValue}>
                  {localUserData?.displayName || currentUser?.displayName || 'Non défini'}
                </Text>
                <TouchableOpacity onPress={() => setIsEditing(true)}>
                  <Text style={styles.editButton}>Modifier</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>
                  {localUserData?.email || currentUser?.email || ''}
                </Text>
                <TouchableOpacity onPress={() => setEmailModalVisible(true)}>
                  <Text style={styles.editButton}>Modifier</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mot de passe:</Text>
                <Text style={styles.infoValue}>••••••••</Text>
                <TouchableOpacity onPress={() => setPasswordModalVisible(true)}>
                  <Text style={styles.editButton}>Modifier</Text>
                </TouchableOpacity>
              </View>
              
              {localUserData?.pendingEmail && 
               // Only show pending notification if current auth email doesn't match pending email
               localUserData.pendingEmail !== currentUser?.email && (
                <View style={styles.pendingEmailContainer}>
                  <Text style={styles.pendingEmailText}>
                    Changement en attente: {localUserData.pendingEmail}
                  </Text>
                  <Text style={styles.pendingEmailSubtext}>
                    Veuillez vérifier votre nouvelle adresse email pour confirmer le changement
                  </Text>
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={async () => {
                      try {
                        // Show loading indicator
                        Alert.alert(
                          "Mise à jour", 
                          "Rafraîchissement des données du profil...",
                          [{ text: "OK" }]
                        );
                        
                        // First, force refresh the auth state
                        if (typeof forceRefresh === 'function') {
                          try {
                            await forceRefresh();
                          } catch (refreshError) {
                            // Silently ignore token expired errors
                            console.log("Non-critical refresh error:", refreshError.code);
                          }
                        }
                        
                        // Try to clean up pending email status
                        if (currentUser) {
                          try {
                            await cleanupPendingEmailStatus(currentUser.uid);
                          } catch (cleanupError) {
                            // Silently ignore token expired errors
                            console.log("Non-critical cleanup error:", cleanupError.code);
                          }
                        }
                        
                        // Then refresh user data again
                        try {
                          await refreshUserData();
                        } catch (dataError) {
                          // Silently ignore token expired errors
                          console.log("Non-critical data refresh error:", dataError.code);
                        }
                        
                        // One final refresh with delay to ensure everything is updated
                        setTimeout(async () => {
                          try {
                            if (typeof forceRefresh === 'function') {
                              await forceRefresh();
                            }
                            refreshUserData();
                          } catch (finalError) {
                            // Silently ignore all errors in background refresh
                          }
                        }, 1000);
                      } catch (error) {
                        console.error("Error refreshing profile:", error);
                      }
                    }}
                  >
                    <Text style={styles.refreshButtonText}>Rafraîchir</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Statistiques</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalPhotos}</Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.locationsVisited}</Text>
              <Text style={styles.statLabel}>Lieux</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* Email Change Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={emailModalVisible}
        onRequestClose={() => {
          setEmailModalVisible(false);
          setNewEmail('');
          setPassword('');
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Changer d'email</Text>
            
            <Text style={styles.infoText}>
              Un email de vérification sera envoyé à votre nouvelle adresse.
              Vous devrez cliquer sur le lien dans cet email pour confirmer le changement.
            </Text>
            
            <Text style={styles.label}>Nouvel email d'affichage</Text>
            <TextInput
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Entrez votre nouvel email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Text style={styles.label}>Mot de passe actuel</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Entrez votre mot de passe actuel"
              secureTextEntry={true}
            />
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setEmailModalVisible(false);
                  setNewEmail('');
                  setPassword('');
                }}
                disabled={emailLoading}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]}
                onPress={handleEmailChange}
                disabled={emailLoading}
              >
                {emailLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Confirmer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={passwordModalVisible}
        onRequestClose={() => {
          setPasswordModalVisible(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Changer de mot de passe</Text>
            
            <Text style={styles.label}>Mot de passe actuel</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Entrez votre mot de passe actuel"
              secureTextEntry={true}
            />
            
            <Text style={styles.label}>Nouveau mot de passe</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Entrez votre nouveau mot de passe"
              secureTextEntry={true}
            />
            
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirmez votre nouveau mot de passe"
              secureTextEntry={true}
            />
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={passwordLoading}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]}
                onPress={handlePasswordChange}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Confirmer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoSection: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 16,
    color: '#555',
    width: 80,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  editButton: {
    color: '#007bff',
    fontSize: 16,
    paddingHorizontal: 10,
  },
  editForm: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#555',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
    padding: 15,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
  logoutButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  pendingEmailContainer: {
    backgroundColor: '#fff9c4',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    marginTop: -5,
  },
  pendingEmailText: {
    fontSize: 14,
    color: '#ff9800',
    fontWeight: 'bold',
  },
  pendingEmailSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  refreshButton: {
    backgroundColor: '#007bff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;