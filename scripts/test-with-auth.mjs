// Test with actual Firebase authentication (v12+ modular)
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyDMc-X5_gq9Z42t4rjSY9D8HiK4t4t_3d4',
  authDomain: 'cabs-agi-a779f.firebaseapp.com',
  projectId: 'cabs-agi-a779f'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

async function testWithAuth() {
  console.log('=== Testing Firestore with Authentication ===\n')
  
  // First sign in
  console.log('1. Signing in as lamkawaigary@gmail.com...')
  try {
    const userCred = await signInWithEmailAndPassword(auth, 'lamkawaigary@gmail.com', 'lamka123')
    console.log(`   ✅ Signed in as: ${userCred.user.email}`)
    console.log(`   UID: ${userCred.user.uid}`)
  } catch (error) {
    console.log(`   ❌ Sign in failed: ${error.code} - ${error.message}`)
    return
  }
  
  // Now try to read chatRooms
  console.log('\n2. Reading chatRooms...')
  try {
    const snapshot = await getDocs(collection(db, 'chatRooms'))
    console.log(`   ✅ Read succeeded. Count: ${snapshot.size}`)
    snapshot.forEach(doc => console.log(`   - ${doc.id}`))
  } catch (error) {
    console.log(`   ❌ Read failed: ${error.code} - ${error.message}`)
  }
  
  // Try to create a chat room
  console.log('\n3. Creating a test chat room...')
  try {
    const docRef = await addDoc(collection(db, 'chatRooms'), {
      test: 'write test with auth',
      timestamp: new Date().toISOString(),
      roomType: 'trip'
    })
    console.log(`   ✅ Create succeeded. ID: ${docRef.id}`)
  } catch (error) {
    console.log(`   ❌ Create failed: ${error.code} - ${error.message}`)
  }
  
  console.log('\n=== Done ===')
}

testWithAuth()