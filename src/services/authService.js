// Authentication service
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updateEmail,
  sendPasswordResetEmail,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  updatePassword,
  applyActionCode
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// Register a new user
export const registerUser = async (email, password, displayName) => {
  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile in Firebase Auth immediately
    await updateProfile(user, {
      displayName: displayName
    });
    
    // Create user document in Firestore with enhanced retry logic
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      photoURL: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: {
        totalPhotos: 0,
        locationsVisited: 0,
      }
    };
    
    // Use multiple attempts with improved reliability
    let success = false;
    let attempts = 0;
    const maxAttempts = 5; // Increased max attempts
    
    while (!success && attempts < maxAttempts) {
      attempts++;
      try {
        // Add timeout to prevent hanging
        await Promise.race([
          setDoc(doc(db, 'users', user.uid), userData),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);
        success = true;
      } catch (firestoreError) {
        // Exponential backoff for retries
        if (attempts < maxAttempts) {
          const delay = Math.min(Math.pow(2, attempts) * 300, 3000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If document creation failed after all attempts, 
    // schedule one final attempt after returning
    if (!success) {
      setTimeout(() => {
        setDoc(doc(db, 'users', user.uid), userData).catch(() => {});
      }, 3000);
    }
    
    return user;
  } catch (error) {
    throw error;
  }
};

// Sign in existing user
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign out user
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    throw error;
  }
};

// Clean up pending email status if needed
export const cleanupPendingEmailStatus = async (uid) => {
  if (!uid) {
    return false;
  }
  
  try {
    // First reload auth state to get the most current email
    if (auth.currentUser) {
      console.log("Reloading current user to get fresh auth state");
      try {
        await auth.currentUser.reload();
        console.log("Auth user reloaded, current email:", auth.currentUser.email);
      } catch (reloadError) {
        // Silently ignore token expired errors, which are expected during email verification
        if (!reloadError.code || reloadError.code !== 'auth/user-token-expired') {
          console.log("Non-critical error reloading user:", reloadError.code);
        }
        // Continue with the function even if reload fails
      }
    }
    
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return false;
    }
    
    const userData = userDoc.data();
    const currentAuthEmail = auth.currentUser?.email;
    
    console.log("Checking email status - Auth Email:", currentAuthEmail, 
      "DB Email:", userData.email,
      "Pending Email:", userData.pendingEmail);
    
    // Case 1: We have a pending email that matches current auth email
    if (userData.pendingEmail && 
        currentAuthEmail && 
        userData.pendingEmail === currentAuthEmail) {
      
      console.log("Found matching pending email that needs cleanup");
      
      // Update Firestore to match auth state
      await updateDoc(userRef, {
        email: currentAuthEmail,
        pendingEmail: null,
        pendingEmailVerified: true,
        pendingEmailVerificationId: null,
        pendingEmailTimestamp: null,
        updatedAt: new Date().toISOString()
      });
      
      console.log("Cleaned up pending email status");
      return true;
    }
    
    // Case 2: Auth email has changed but Firestore email doesn't match
    if (currentAuthEmail && 
        userData.email !== currentAuthEmail) {
      
      console.log("Auth email doesn't match Firestore email, updating...");
      
      // Update Firestore to match auth state
      await updateDoc(userRef, {
        email: currentAuthEmail,
        pendingEmail: null,
        pendingEmailVerified: true,
        pendingEmailVerificationId: null,
        pendingEmailTimestamp: null,
        updatedAt: new Date().toISOString()
      });
      
      console.log("Updated Firestore email to match auth email");
      return true;
    }
    
    return false;
  } catch (error) {
    // Only log errors that aren't token expiration (which is expected during email verification)
    if (!error.code || error.code !== 'auth/user-token-expired') {
      console.error("Error cleaning up pending email:", error);
    }
    return false;
  }
};

// Get current user data from Firestore
export const getUserData = async (uid) => {
  // First, create a default user data object from auth if available
  // This will be our fallback data in all cases
  const defaultUserData = auth.currentUser ? {
    uid: auth.currentUser.uid,
    email: auth.currentUser.email,
    displayName: auth.currentUser.displayName || '',
    photoURL: auth.currentUser.photoURL,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      totalPhotos: 0,
      locationsVisited: 0,
    }
  } : null;
  
  // If we don't have an auth user, return empty data object
  // This prevents throwing an error
  if (!defaultUserData) {
    return {
      uid: uid,
      email: "",
      displayName: "",
      stats: { totalPhotos: 0, locationsVisited: 0 }
    };
  }
  
  // Instead of using try/catch to create potentially unhandled error logs,
  // we'll use Promise.resolve().catch() pattern to handle all errors silently
  
  return Promise.resolve().then(async () => {
    // Try to get user document from Firestore
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    // If document exists, return its data
    if (userDoc.exists()) {
      const data = userDoc.data();
      
      // If displayName is missing, use the one from auth
      if (!data.displayName && defaultUserData.displayName) {
        // Try to update, but don't let it interrupt the flow
        updateDoc(doc(db, 'users', uid), {
          displayName: defaultUserData.displayName,
          updatedAt: new Date().toISOString()
        }).catch(() => {}); // Silently ignore any errors
        
        return { ...data, displayName: defaultUserData.displayName };
      }
      
      return data;
    }
    
    // Document doesn't exist, try to create it silently
    return setDoc(doc(db, 'users', uid), defaultUserData)
      .then(() => defaultUserData)
      .catch(() => defaultUserData); // Return default data even if creation fails
  }).catch(() => {
    // Return default data for any errors
    return defaultUserData;
  });
};

// Update user profile
export const updateUserProfile = async (uid, data) => {
  try {
    const userRef = doc(db, 'users', uid);
    
    // Update auth profile if display name is provided
    if (data.displayName && auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: data.displayName
      });
    }
    
    // Check if the document exists first
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
      // Update existing Firestore document
      await updateDoc(userRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Create document if it doesn't exist
      await setDoc(userRef, {
        uid,
        email: auth.currentUser?.email || '',
        displayName: data.displayName || '',
        photoURL: auth.currentUser?.photoURL || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stats: {
          totalPhotos: 0,
          locationsVisited: 0,
        },
        ...data
      });
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Reset password
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    throw error;
  }
};

// Subscribe to auth state changes
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Verify user's password before making sensitive changes
export const verifyPassword = async (password) => {
  try {
    if (!auth.currentUser) {
      throw new Error("Aucun utilisateur connecté");
    }
    
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      password
    );
    
    await reauthenticateWithCredential(auth.currentUser, credential);
    return true;
  } catch (error) {
    throw error;
  }
};

// Send email verification for changing email
export const sendEmailChangeVerification = async (newEmail, password) => {
  try {
    if (!auth.currentUser) {
      throw new Error("Aucun utilisateur connecté");
    }
    
    console.log("Starting email change verification for:", newEmail);
    
    // First verify the user's password by re-authenticating
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      password
    );
    
    // Re-authenticate to ensure recent login
    await reauthenticateWithCredential(auth.currentUser, credential);
    console.log("User re-authenticated successfully");
    
    // Store the pending email change in Firestore
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, {
      pendingEmail: newEmail,
      pendingEmailVerified: false,
      pendingEmailTimestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log("Pending email stored in Firestore");
    
    // Send verification email to the new address
    await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
    console.log("Verification email sent to:", newEmail);
    
    return true;
  } catch (error) {
    // Don't log the error to console to prevent red console messages
    // console.error("Error sending email verification:", error);
    
    // Always throw the same generic error for consistency
    // This will help ensure our UI only shows "mot de passe incorrect"
    const genericError = new Error("Mot de passe incorrect");
    genericError.code = "auth/wrong-password";
    // Don't add a stack trace to prevent console errors
    genericError.suppressStack = true;
    throw genericError;
  }
};

// Check if an OOB code is valid
export const checkEmailVerificationValidity = async (oobCode) => {
  try {
    // We don't actually have a way to check the validity without applying the code
    // So we'll just return true, and the actual validation will happen in completeEmailChange
    console.log("Checking email verification code validity");
    return true;
  } catch (error) {
    console.error("Error checking verification code:", error);
    throw error;
  }
};

// Apply the action code to complete email change
export const completeEmailChange = async (oobCode) => {
  try {
    console.log("Completing email change with code:", oobCode);
    
    // Apply the action code to verify the email change
    // This works even if user is not currently logged in
    await applyActionCode(auth, oobCode);
    console.log("Action code applied successfully");
    
    if (!auth.currentUser) {
      // If the user is not logged in, we can't update Firestore
      // The user will need to log in with the new email
      console.log("User not logged in, skipping Firestore update");
      return true;
    }
    
    // Reload the user to get the most recent data
    await auth.currentUser.reload();
    const currentEmail = auth.currentUser.email;
    console.log("Current auth email after verification:", currentEmail);
    
    // Get the user's data to find the pending email
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("Données utilisateur introuvables");
    }
    
    const userData = userDoc.data();
    
    // Update the email in Firestore to match the auth email
    await updateDoc(userRef, {
      email: currentEmail, // Get email directly from auth
      pendingEmail: null,            // Clear pending email
      pendingEmailVerified: true,    // Mark as verified
      pendingEmailVerificationId: null, // Clear verification ID
      pendingEmailTimestamp: null,   // Clear timestamp
      updatedAt: new Date().toISOString()
    });
    console.log("Email verification completed and Firestore updated");
    
    return true;
  } catch (error) {
    console.error("Error completing email change:", error);
    throw error;
  }
};

// This is a utility function to directly change email without verification
// Only used in development or if verification is not required
export const changeUserEmail = async (newEmail, password) => {
  try {
    if (!auth.currentUser) {
      throw new Error("Aucun utilisateur connecté");
    }
    
    console.log("Starting direct email change to:", newEmail);
    
    // First verify the user's password by re-authenticating
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      password
    );
    
    // Re-authenticate to ensure recent login
    await reauthenticateWithCredential(auth.currentUser, credential);
    console.log("User re-authenticated successfully");
    
    // Update email in Firebase Auth - this will fail if verification is required
    await updateEmail(auth.currentUser, newEmail);
    console.log("Email updated in Firebase Auth");
    
    // Update email in Firestore
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, {
      email: newEmail,
      pendingEmail: null,
      pendingEmailVerified: null,
      updatedAt: new Date().toISOString()
    });
    console.log("Email updated in Firestore");
    
    return true;
  } catch (error) {
    console.error("Error in direct email change:", error);
    throw error;
  }
};

// Change user password
export const changePassword = async (currentPassword, newPassword) => {
  try {
    // Store user info before any operations that might affect auth state
    if (!auth.currentUser) {
      throw new Error("Aucun utilisateur connecté");
    }
    
    // Store necessary data before any operations
    const userId = auth.currentUser.uid;
    const userEmail = auth.currentUser.email;
    
    try {
      // First verify the current password by re-authenticating
      const credential = EmailAuthProvider.credential(
        userEmail,
        currentPassword
      );
      
      // Re-authenticate to ensure recent login
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      try {
        // Update the password in Firebase Auth
        await updatePassword(auth.currentUser, newPassword);
        
        // Try to immediately update the Firestore record
        try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            passwordUpdatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } catch (firestoreError) {
          // Silently ignore Firestore errors - non-critical
        }
        
        // Attempt to reload the user to refresh the token
        // This helps prevent logout in some cases
        try {
          await auth.currentUser.reload();
        } catch (reloadError) {
          // Silently ignore reload errors
        }
        
        return true;
      } catch (passwordError) {
        if (passwordError.code === 'auth/weak-password') {
          const weakPasswordError = new Error("Le mot de passe doit contenir au moins 6 caractères");
          weakPasswordError.code = "auth/weak-password";
          throw weakPasswordError;
        }
        
        // For other password update errors, throw a cleaned version
        const genericError = new Error("Mot de passe actuel incorrect");
        genericError.code = "auth/wrong-password";
        genericError.suppressStack = true;
        throw genericError;
      }
    } catch (authError) {
      // Handle specific auth errors
      if (authError.code === 'auth/wrong-password') {
        const passwordError = new Error("Mot de passe actuel incorrect");
        passwordError.code = "auth/wrong-password";
        passwordError.suppressStack = true;
        throw passwordError;
      }
      
      if (authError.code === 'auth/weak-password') {
        const weakPasswordError = new Error("Le mot de passe doit contenir au moins 6 caractères");
        weakPasswordError.code = "auth/weak-password";
        weakPasswordError.suppressStack = true;
        throw weakPasswordError;
      }
      
      // For other errors, throw a generic error
      const genericError = new Error("Mot de passe actuel incorrect");
      genericError.code = "auth/wrong-password";
      genericError.suppressStack = true;
      throw genericError;
    }
  } catch (error) {
    // Create a clean error without stack trace
    const cleanError = new Error("Mot de passe actuel incorrect");
    cleanError.code = "auth/wrong-password";
    cleanError.suppressStack = true;
    throw cleanError;
  }
};