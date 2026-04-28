// Debug: Check what operations actually work with authentication
const { initializeApp } = require('firebase/app')
const { getFirestore, collection, addDoc, getDocs } = require('firebase/firestore')
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth')

const firebaseConfig = {
  apiKey: 'AIzaSyDMc-X5_gq9Z42t4rjSY9D8HiK4t4t_3d4',
  authDomain: 'cabs-agi-a779f.firebaseapp.com',
  projectId: 'cabs-agi-a779f'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

async function testOperations() {
  console.log('=== Testing Firestore Operations with Auth ===\n')
  
  // First, check if there's a current user
  console.log('Current user:', auth.currentUser ? auth.currentUser.email : 'none')
  
  // Try to sign in
  console.log('\n1. Signing in as passenger (lamkawaigary@gmail.com)...')
  try {
    const result = await signInWithEmailAndPassword(auth, 'lamkawaigary@gmail.com', 'lamka123')
    console.log(`   ✅ Signed in: ${result.user.email} (UID: ${result.user.uid})`)
  } catch (error) {
    console.log(`   ❌ Sign in failed: ${error.code} - ${error.message}`)
    console.log('   Trying driver account...')
    try {
      const result2 = await signInWithEmailAndPassword(auth, 'Garylkw1842@gmail.com', '28Dec2016')
      console.log(`   ✅ Signed in: ${result2.user.email} (UID: ${result2.user.uid})`)
    } catch (error2) {
      console.log(`   ❌ Driver sign in also failed: ${error2.code}`)
      return
    }
  }
  
  console.log('\n2. Testing READ chatRooms...')
  try {
    const snapshot = await getDocs(collection(db, 'chatRooms'))
    console.log(`   ✅ Read succeeded. Count: ${snapshot.size}`)
    snapshot.forEach(doc => console.log(`   - ${doc.id}`))
  } catch (error) {
    console.log(`   ❌ Read failed: ${error.code} - ${error.message}`)
  }
  
  console.log('\n3. Testing CREATE chatRooms...')
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

testOperations()