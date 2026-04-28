// Debug: Check what operations actually work
const { initializeApp } = require('firebase/app')
const { getFirestore, collection, addDoc, getDocs, doc, updateDoc } = require('firebase/firestore')

const firebaseConfig = {
  apiKey: 'AIzaSyDMc-X5_gq9Z42t4rjSY9D8HiK4t4t_3d4',
  authDomain: 'cabs-agi-a779f.firebaseapp.com',
  projectId: 'cabs-agi-a779f'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function testOperations() {
  console.log('=== Testing Firestore Operations ===\n')
  
  // Test 1: Read chatRooms
  console.log('1. Testing READ chatRooms...')
  try {
    const snapshot = await getDocs(collection(db, 'chatRooms'))
    console.log(`   ✅ Read succeeded. Count: ${snapshot.size}`)
    snapshot.forEach(doc => console.log(`   - ${doc.id}`))
  } catch (error) {
    console.log(`   ❌ Read failed: ${error.code} - ${error.message}`)
  }
  
  // Test 2: Create chatRooms
  console.log('\n2. Testing CREATE chatRooms...')
  try {
    const docRef = await addDoc(collection(db, 'chatRooms'), {
      test: 'write test',
      timestamp: new Date().toISOString()
    })
    console.log(`   ✅ Create succeeded. ID: ${docRef.id}`)
  } catch (error) {
    console.log(`   ❌ Create failed: ${error.code} - ${error.message}`)
  }
  
  console.log('\n=== Done ===')
}

testOperations()