// Quick script to delete all chatRooms - Run ONCE then delete

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDMc-X5_gq9Z42t4rjSY9D8HiK4t4t_3d4",
  authDomain: "cabs-agi-a779f.firebaseapp.com",
  projectId: "cabs-agi-a779f",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function deleteAllChatRooms() {
  const ref = collection(db, 'chatRooms')
  const snapshot = await getDocs(ref)
  
  console.log(`找到 ${snapshot.size} 個聊天室`)
  console.log('開始刪除...\n')
  
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, 'chatRooms', docSnap.id))
    console.log(`✅ 刪除: ${docSnap.id}`)
  }
  
  console.log('\n✅ 全部刪除完成！')
}

deleteAllChatRooms()