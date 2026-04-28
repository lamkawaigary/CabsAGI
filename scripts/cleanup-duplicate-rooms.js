// Cleanup Script - Remove Duplicate Chat Rooms
// Run this script to clean up duplicate chat rooms in Firestore

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore'

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDMc-X5_gq9Z42t4rjSY9D8HiK4t4t_3d4",
  authDomain: "cabs-agi-a779f.firebaseapp.com",
  projectId: "cabs-agi-a779f",
  storageBucket: "cabs-agi-a779f.firebasestorage.app",
  messagingSenderId: "1053090697035",
  appId: "1:1053090697035:web:fe85b1b3b87985dc6f22ce"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function cleanupDuplicateChatRooms() {
  console.log('🚀 開始清理重複聊天室...\n')
  
  try {
    // Get all chat rooms
    const roomsRef = collection(db, 'chatRooms')
    const snapshot = await getDocs(roomsRef)
    
    console.log(`找到 ${snapshot.size} 個聊天室\n`)
    
    // Group by roomType + roomTypeId
    const roomGroups: Record<string, any[]> = {}
    
    snapshot.forEach(doc => {
      const data = doc.data()
      const key = `${data.roomType}_${data.roomTypeId}`
      
      if (!roomGroups[key]) {
        roomGroups[key] = []
      }
      roomGroups[key].push({ id: doc.id, ...data })
    })
    
    // Find duplicates
    let totalDuplicates = 0
    const toDelete: string[] = []
    
    for (const [key, rooms] of Object.entries(roomGroups)) {
      if (rooms.length > 1) {
        console.log(`\n📋 發現重複組: ${key}`)
        console.log(`   共有 ${rooms.length} 個聊天室`)
        
        // Sort by createdAt descending (newest first)
        rooms.sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )
        
        // Keep the newest, mark others for deletion
        const toRemove = rooms.slice(1)
        toRemove.forEach(room => {
          console.log(`   ❌ 刪除: ${room.id} (created: ${room.createdAt})`)
          toDelete.push(room.id)
        })
        totalDuplicates += toRemove.length
      }
    }
    
    console.log(`\n\n========================================`)
    console.log(`📊 統計：`)
    console.log(`   總聊天室數: ${snapshot.size}`)
    console.log(`   重複組數: ${Object.keys(roomGroups).filter(k => roomGroups[k].length > 1).length}`)
    console.log(`   需刪除數: ${totalDuplicates}`)
    console.log(`========================================\n`)
    
    if (totalDuplicates === 0) {
      console.log('✅ 沒有發現重複聊天室！')
      return
    }
    
    // Confirm before deletion
    console.log('⚠️  即將刪除以上標記的聊天室...')
    console.log('   按 Ctrl+C 取消，或等待 5 秒後自動執行\n')
    
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Delete duplicates
    console.log('🗑️  開始刪除...\n')
    
    for (const roomId of toDelete) {
      try {
        await deleteDoc(doc(db, 'chatRooms', roomId))
        console.log(`   ✅ 已刪除: ${roomId}`)
      } catch (err) {
        console.log(`   ❌ 刪除失敗: ${roomId} - ${err.message}`)
      }
    }
    
    console.log('\n✅ 清理完成！')
    
  } catch (error) {
    console.error('❌ 清理失敗:', error)
  }
}

cleanupDuplicateChatRooms()