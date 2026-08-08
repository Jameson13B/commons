import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

/**
 * Firebase configuration is read from Vite env vars (`VITE_FIREBASE_*`).
 * Copy `.env.example` to `.env.local` and paste your project's web config.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key)

export const isFirebaseConfigured = missingKeys.length === 0

if (!isFirebaseConfigured) {
  // Surface a clear message during development instead of a cryptic SDK error.
  console.warn(
    `[Commons] Firebase is not fully configured. Missing: ${missingKeys.join(
      ', ',
    )}. Copy .env.example to .env.local and fill in your Firebase web config.`,
  )
}

// Only initialize services when configured. When unconfigured, the app shows a
// setup screen (see main.tsx) and these are never accessed at runtime.
export const app = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : undefined

export const auth: Auth = isFirebaseConfigured
  ? getAuth(app!)
  : (undefined as unknown as Auth)

export const db: Firestore = isFirebaseConfigured
  ? getFirestore(app!)
  : (undefined as unknown as Firestore)
