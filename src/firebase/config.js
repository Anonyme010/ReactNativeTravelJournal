// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyAC_IoJSKuzYIZyUK3TeWIyTBydjbhoscs",
  authDomain: "piscine-2fb9d.firebaseapp.com",
  projectId: "piscine-2fb9d",
  storageBucket: "piscine-2fb9d.firebasestorage.app",
  messagingSenderId: "156489991359",
  appId: "1:156489991359:web:d9c19c70c81ff0a271b20a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };