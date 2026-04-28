// Test with Firebase Admin SDK (bypasses rules)
const admin = require('firebase-admin')

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

async function testCreate() {
  console.log('Testing chat room creation via Admin SDK...')
  try {
    const docRef = await db.collection('chatRooms').add({
      roomType: 'trip',
      roomTypeId: 'test-trip-admin-123',
      test: true,
      createdAt: new Date().toISOString()
    })
    console.log('✅ Created:', docRef.id)
  } catch (error) {
    console.error('❌ Error:', error.code, error.message)
  }
}

testCreate()