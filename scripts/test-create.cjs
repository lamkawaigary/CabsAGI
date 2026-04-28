// Test chat room creation
const { initializeApp } = require('firebase/app')
const { getFirestore, collection, addDoc } = require('firebase/firestore')

const firebaseConfig = {
  apiKey: 'AIzaSyDMc-X5_gq9Z42t4rjSY9D8HiK4t4t_3d4',
  authDomain: 'cabs-agi-a779f.firebaseapp.com',
  projectId: 'cabs-agi-a779f'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function testCreate() {
  console.log('Testing chat room creation...')
  try {
    const docRef = await addDoc(collection(db, 'chatRooms'), {
      roomType: 'trip',
      roomTypeId: 'test-trip-123',
      test: true,
      createdAt: new Date().toISOString()
    })
    console.log('✅ Created:', docRef.id)
  } catch (error) {
    console.error('❌ Error:', error.code, error.message)
  }
}

testCreate()