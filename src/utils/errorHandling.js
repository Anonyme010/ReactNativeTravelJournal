/**
 * Utility function to convert Firebase error codes into user-friendly messages
 * @param {Error} error - The error object from Firebase
 * @returns {string} - A user-friendly error message
 */
export const getFirebaseErrorMessage = (error) => {
  const errorCode = error.code;
  console.log('Firebase error code:', errorCode);
  
  // Network errors
  if (error.message && error.message.includes('network')) {
    return 'Impossible de se connecter. Veuillez vérifier votre connexion Internet.';
  }

  // Authentication errors
  switch (errorCode) {
    // Email errors
    case 'auth/invalid-email':
      return 'L\'adresse e-mail n\'est pas valide.';
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé. Veuillez contacter le support.';
    case 'auth/user-not-found':
      return 'Email ou mot de passe incorrect.';
    
    // Password errors
    case 'auth/wrong-password':
      return 'Email ou mot de passe incorrect.';
    case 'auth/weak-password':
      return 'Le mot de passe est trop faible. Utilisez au moins 6 caractères.';
    
    // Registration errors
    case 'auth/email-already-in-use':
      return 'Cette adresse e-mail est déjà utilisée par un autre compte.';
    case 'auth/operation-not-allowed':
      return 'Cette opération n\'est pas autorisée.';
    
    // Reset password errors
    case 'auth/expired-action-code':
      return 'Le lien a expiré. Veuillez demander un nouveau lien.';
    case 'auth/invalid-action-code':
      return 'Le lien est invalide. Il a peut-être déjà été utilisé.';
    
    // General errors
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Veuillez réessayer plus tard.';
    case 'auth/internal-error':
      return 'Une erreur interne s\'est produite. Veuillez réessayer plus tard.';
    
    // Default fallback - Try to identify common login issues
    default:
      // For login issues, assume it's credentials related
      if (error.message && (
          error.message.includes('password') || 
          error.message.includes('email') || 
          error.message.includes('identifier') ||
          error.message.includes('auth/invalid-credential') ||
          error.message.includes('auth/invalid-login-credentials')
        )) {
        return 'Email ou mot de passe incorrect.';
      }
      
      return 'Une erreur s\'est produite. Veuillez réessayer plus tard.';
  }
};

/**
 * Check if the device is connected to the internet
 * @returns {Promise<boolean>} - Whether the device is connected
 */
export const isNetworkConnected = async () => {
  try {
    // We use a fetch request to a reliable endpoint to check connectivity
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD',
      timeout: 5000
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
};