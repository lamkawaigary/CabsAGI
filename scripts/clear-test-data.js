const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyDMc-X5_gq9Z42t4rjSY9D8HiK4t4t_3d4',
  authDomain: 'cabs-agi-a779f.firebaseapp.com',
  projectId: 'cabs-agi-a779f',
  storageBucket: 'cabs-agi-a779f.firebasestorage.app',
  messagingSenderId: '1053090697035',
  appId: '1:1053090697035:web:fe85b1b3b87985dc6f22ce'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearTestData() {
  console.log('🗑️ 開始清除測試數據...\n');
  
  const collections = ['trips', 'passengerRequests', 'priceQuotes', 'chatRooms', 'chatMessages'];
  
  for (const collName of collections) {
    try {
      const coll = collection(db, collName);
      const snapshot = await getDocs(coll);
      
      console.log(`📦 ${collName}: ${snapshot.size} 筆資料`);
      
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, collName, docSnap.id));
      }
      
      console.log(`   ✅ 已刪除 ${snapshot.size} 筆\n`);
    } catch (error) {
      console.log(`   ⚠️ ${collName}: ${error.message}\n`);
    }
  }
  
  console.log('✨ 完成！');
}

clearTestData().catch(console.error);
