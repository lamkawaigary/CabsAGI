// Add passenger to chat room
const { initializeApp } = require('firebase/app')
const { getFirestore, doc, updateDoc, arrayUnion } = require('firebase/firestore')

const firebaseConfig = {
  apiKey: 'AIzaSyDMc-X5_gq9Z42t4rjSY9D8HiK4t4t_3d4',
  authDomain: 'cabs-agi-a779f.firebaseapp.com',
  projectId: 'cabs-agi-a779f'
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function addPassengerToRoom() {
  const roomId = 'nMHnL1fV2WUKnCLlE2qK'
  const passengerId = '4BWnfEIS94Tfbv0rFQr9DAyNmXl2' // lamkawaigary@gmail.com
  
  try {
    const roomRef = doc(db, 'chatRooms', roomId)
    await updateDoc(roomRef, {
      participantIds: arrayUnion(passengerId)
    })
    console.log('✅ Passenger added to chat room!')
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

addPassengerToRoom()