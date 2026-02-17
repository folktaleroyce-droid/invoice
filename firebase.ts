// Modular Firebase SDK imports
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration using standard modular SDK initialization
const firebaseConfig = {
  apiKey: "AIzaSyA_wJJuBXj9Y-2EynoPmGe21oBF3RYM1M8",
  authDomain: "invoice-generator-fc18e.firebaseapp.com",
  projectId: "invoice-generator-fc18e",
  storageBucket: "invoice-generator-fc18e.firebasestorage.app",
  messagingSenderId: "664316490136",
  appId: "1:664316490136:web:cfad7a83b66bf24b05bbed"
};

/**
 * Initialize the Firebase application instance.
 * Using the modular SDK (v9+) syntax.
 */
const app = initializeApp(firebaseConfig);

/**
 * Initialize and export the Firestore database instance.
 * This is consumed by the rest of the application for cloud synchronization.
 */
export const db = getFirestore(app);
