import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'
// import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
export const firebaseConfig = {
  // CabsAGI Firebase project
  apiKey: 'AIzaSyDMc-X5_gq9Z42t4rjSY9D8HiK4t4t_3d4',
  authDomain: 'cabs-agi-a779f.firebaseapp.com',
  projectId: 'cabs-agi-a779f',
  storageBucket: 'cabs-agi-a779f.firebasestorage.app',
  messagingSenderId: '1053090697035',
  appId: '1:1053090697035:web:fe85b1b3b87985dc6f22ce',
  measurementId: 'G-Q8ETG35J7H',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Services
export const auth = getAuth(app)

// Use initializeFirestore with experimentalForceLongPolling to prevent connection timeouts
// This is critical for environments where WebSockets are blocked or unstable
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
})

export const storage = getStorage(app)
export const functions = getFunctions(app)
export { sendPasswordResetEmail }
export const googleProvider = new GoogleAuthProvider()

// Analytics
// Disabled to prevent "403 PERMISSION_DENIED" errors related to firebaseinstallations.googleapis.com
// because the API Key restrictions likely block this API.
export const analytics = null

export default app
