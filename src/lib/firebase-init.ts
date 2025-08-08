// Dynamic Firebase initialization for client-side only
let firebaseApp: any = null;
let firebaseAuth: any = null;
let firebaseDb: any = null;

export async function initializeFirebase() {
  if (typeof window === 'undefined') {
    return { app: null, auth: null, db: null };
  }

  if (firebaseApp) {
    return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
  }

  try {
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    const { getFirestore } = await import('firebase/firestore');

    const firebaseConfig = {
      apiKey: "AIzaSyD3G2Dkn0s611TUM9zGM_1CqjW1RFkUm1Q",
      authDomain: "hapy-474ab.firebaseapp.com",
      projectId: "hapy-474ab",
      storageBucket: "hapy-474ab.firebasestorage.app",
      messagingSenderId: "374678558234",
      appId: "1:374678558234:web:9929e563b5dd33459fa3a3",
      measurementId: "G-ZMF627YT28"
    };

    firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);

    return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return { app: null, auth: null, db: null };
  }
}

export function getFirebase() {
  return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
} 