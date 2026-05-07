import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/**
 * Validates connection to Firestore.
 * @returns {Promise<boolean>} True if connection is successful, false otherwise.
 */
export async function testFirestoreConnection() {
  try {
    // Attempt to fetch a non-existent doc from server to verify connectivity
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    return true;
  } catch (error: any) {
    // If we get a permission error, it means we DID reach the server, so connection is active.
    // If we get 'unavailable' or 'deadline-exceeded', it probably means network issues.
    const isPermissionError = error.code === 'permission-denied' || 
                             (error.message && error.message.includes('permissions'));
    
    if (isPermissionError) {
      return true;
    }

    console.warn("Firestore connectivity check: offline or alternate error", error);
    return false;
  }
}

export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
