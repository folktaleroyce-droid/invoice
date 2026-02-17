
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Note: In a production environment, these values should be retrieved from environment variables.
// For this implementation, placeholders are provided which you should replace with your 
// actual Firebase Project settings from the Firebase Console.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
