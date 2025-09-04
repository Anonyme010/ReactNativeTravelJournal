import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { subscribeToAuthChanges, getUserData, cleanupPendingEmailStatus } from '../services/authService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) return null;
  
  const forceRefresh = async () => {
    if (context.currentUser) {
      try {
        await context.currentUser.reload();
        return context.refreshUserData();
      } catch (error) {
        if (!error.code || error.code !== 'auth/user-token-expired') {
          console.error("Error in forceRefresh:", error);
        }
      }
    }
  };
  
  return {
    ...context,
    forceRefresh
  };
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshUserData = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      
      const fallbackData = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || '',
        pendingEmail: null,
        pendingEmailVerified: false,
        stats: { totalPhotos: 0, locationsVisited: 0 }
      };
      
      try {
        await cleanupPendingEmailStatus(currentUser.uid);
      } catch (cleanupError) {
        if (!cleanupError.code || cleanupError.code !== 'auth/user-token-expired') {
          console.log("Non-critical cleanup error in refreshUserData:", cleanupError.code);
        }
      }
      
      const data = await getUserData(currentUser.uid);
      
      if (data && data.uid) {
        setUserData({
          ...fallbackData,
          ...data,
          displayName: data.displayName || fallbackData.displayName,
          email: currentUser.email,
        });
      } else {
        setUserData(fallbackData);
      }
      
      return data; 
    } catch (err) {
      if (err.code && err.code === 'auth/user-token-expired') {
        console.log("Auth token expired in refreshUserData");
      }
      
      setUserData({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || '',
        stats: { totalPhotos: 0, locationsVisited: 0 }
      });
      return fallbackData;
    }
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      setCurrentUser(user);
      setLoading(true);
      setError(null); 
      
      if (user) {
        const fallbackData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          pendingEmail: null,
          pendingEmailVerified: false,
          stats: { totalPhotos: 0, locationsVisited: 0 }
        };
        
        try {
         
          await cleanupPendingEmailStatus(user.uid);
          
          
          const data = await getUserData(user.uid);
          
          if (data && data.uid) {
            const updatedData = {
              ...fallbackData,
              ...data,
              email: user.email,
              displayName: data.displayName || fallbackData.displayName,
            };
            
            if (data.pendingEmail && data.pendingEmail === user.email) {
              console.log("Auth email matches pending email, clearing pending status");
              updatedData.pendingEmail = null;
              updatedData.pendingEmailVerified = false;
              
              const userRef = doc(db, 'users', user.uid);
              updateDoc(userRef, {
                email: user.email,
                pendingEmail: null,
                pendingEmailVerified: null,
                pendingEmailVerificationId: null,
                pendingEmailTimestamp: null,
                updatedAt: new Date().toISOString()
              }).catch(err => console.error("Error updating Firestore:", err));
            }
            
            setUserData(updatedData);
          } else {
            setUserData(fallbackData);
          }
        } catch (err) {
          console.error("Error in auth state change:", err);
          setUserData(fallbackData);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePasswordChange = useCallback(async () => {
    try {
      if (currentUser) {
        await currentUser.reload();
        
        await refreshUserData();
      }
      return true;
    } catch (error) {
      return false;
    }
  }, [currentUser, refreshUserData]);

  const value = {
    currentUser,
    userData,
    loading,
    error,
    refreshUserData,
    handlePasswordChange,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : null}
    </AuthContext.Provider>
  );
};