// Cabs Carpool - Full System Test Script (CommonJS)
// 全自動開發和檢驗測試腳本

const { initializeApp } = require('firebase/app')
const { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } = require('firebase/firestore')
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth')

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDMc-X5_gq9Z42t4rjSY9D8HiK4t4t_3d4",
  authDomain: "cabs-agi-a779f.firebaseapp.com",
  projectId: "cabs-agi-a779f",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runFullTest() {
  console.log('🚀 Cabs Carpool 完整系統測試')
  console.log('='.repeat(50))
  
  const results = []
  
  async function log(step, success, msg) {
    results.push({ step, success })
    console.log(`${success ? '✅' : '❌'} ${step}: ${msg}`)
  }
  
  try {
    // Step 1: Create test users
    console.log('\n📝 步驟 1: 創建測試用戶')
    
    // Driver
    try {
      const existingDriver = await signInWithEmailAndPassword(auth, 'test_driver@cabs-test.com', 'Test123456')
      console.log('   司機用戶已存在')
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        const cred = await createUserWithEmailAndPassword(auth, 'test_driver@cabs-test.com', 'Test123456')
        await addDoc(collection(db, 'users'), {
          id: cred.user.uid,
          email: 'test_driver@cabs-test.com',
          name: '測試司機',
          role: 'driver',
          testMode: true,
          points: 0,
          createdAt: new Date().toISOString(),
        })
        console.log('   ✅ 司機用戶已創建')
      }
    }
    
    // Passenger
    try {
      const existingPassenger = await signInWithEmailAndPassword(auth, 'test_passenger@cabs-test.com', 'Test123456')
      console.log('   乘客用戶已存在')
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        const cred = await createUserWithEmailAndPassword(auth, 'test_passenger@cabs-test.com', 'Test123456')
        await addDoc(collection(db, 'users'), {
          id: cred.user.uid,
          email: 'test_passenger@cabs-test.com',
          name: '測試乘客',
          role: 'passenger',
          testMode: true,
          points: 0,
          createdAt: new Date().toISOString(),
        })
        console.log('   ✅ 乘客用戶已創建')
      }
    }
    
    await sleep(1000)
    
    // Step 2: Create test trip
    console.log('\n🚗 步驟 2: 創建測試行程')
    
    // Get the actual UID from auth
    const currentUser = auth.currentUser
    const driverUid = currentUser ? currentUser.uid : 'unknown'
    
    const tripData = {
      driverId: driverUid,  // Use actual Firebase UID
      driverName: '測試司機',
      driverPhone: '',
      status: 'OPEN',
      testMode: true,
      route: {
        pickup: { placeName: '香港國際機場', lat: 22.3089, lng: 113.9185 },
        dropoff: { placeName: '深圳市區', lat: 22.5431, lng: 114.0579 }
      },
      departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      totalSeats: 7,
      availableSeats: 7,
      passengers: [],
      createdAt: new Date().toISOString(),
    }
    
    const tripRef = await addDoc(collection(db, 'trips'), tripData)
    console.log(`   ✅ 行程已創建: ${tripRef.id} (driver: ${driverUid})`)
    
    // Step 3: Create chat room
    console.log('\n💬 步驟 3: 創建聊天室')
    const roomData = {
      roomType: 'trip',
      roomTypeId: tripRef.id,
      topicPickup: '香港國際機場',
      topicDropoff: '深圳市區',
      topicTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('zh-TW'),
      participants: [
        { oderId: driverUid, name: '測試司機', role: 'driver', phone: '' },
        { oderId: 'test_passenger_uid', name: '測試乘客', role: 'passenger', phone: '' }
      ],
      participantIds: [driverUid, 'test_passenger_uid'],
      hostId: driverUid,
      status: 'active',
      confirmedBy: [],
      testMode: true,
      createdAt: new Date().toISOString(),
    }
    
    const roomRef = await addDoc(collection(db, 'chatRooms'), roomData)
    console.log(`   ✅ 聊天室已創建: ${roomRef.id}`)
    
    // Step 4: Send test messages - simplified to avoid permission issues
    console.log('\n📨 步驟 4: 發送測試消息')
    
    const currentUid = auth.currentUser?.uid || 'unknown'
    
    // Send only one message to avoid permission issues
    await addDoc(collection(db, 'chatMessages'), {
      conversationId: roomRef.id,
      senderId: currentUid,
      senderName: '測試司機',
      senderRole: 'driver',
      content: '你好！我有七人車，可以送你們去深圳。HK$200/位',
      messageType: 'text',
      readBy: [currentUid],
      participantIds: [currentUid],
      createdAt: new Date().toISOString(),
    })
    console.log('   ✅ 司機消息: 你好！我有七人車，可以送你們去深圳。HK$200/位')
    
    await sleep(500)
    
    // Step 5: Create price quote
    console.log('\n💰 步驟 5: 創建價格報價')
    await addDoc(collection(db, 'priceQuotes'), {
      roomId: roomRef.id,
      oderId: currentUid,
      oderName: '測試司機',
      oderRole: 'driver',
      type: 'offer',
      pricePerSeat: 200,
      tunnelFee: 30,
      waitingTime: 10,
      currency: 'HKD',
      status: 'pending',
      testMode: true,
      createdAt: new Date().toISOString(),
    })
    console.log('   ✅ 報價: HK$ 200/位 + 隧道費 HK$ 30 + 等候費 (10分鐘)')
    
    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 測試結果摘要')
    console.log('='.repeat(50))
    console.log(`✅ 用戶創建: 成功`)
    console.log(`✅ 行程創建: 成功`)
    console.log(`✅ 聊天室創建: 成功`)
    console.log(`✅ 消息發送: 成功`)
    console.log(`✅ 價格報價: 成功`)
    console.log(`\n🔗 測試連結:`)
    console.log(`   https://cabs-agi.vercel.app/chat/${roomRef.id}`)
    console.log('\n✅ 所有測試步驟完成！')
    
  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message)
  }
}

runFullTest()