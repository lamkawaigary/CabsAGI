// Firebase Clean Room Tool
// Run this in browser console on Firebase Console page

const PROJECT_ID = 'cabs-agi-a779f';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function deleteAllChatRooms() {
  if (!confirm('⚠️ 即將刪除 ALL chatRooms！確定嗎？')) return;
  
  console.log('🚀 開始刪除 chatRooms...\n');
  
  // First, get all chat room IDs
  const response = await fetch(`${BASE_URL}/chatRooms?pageSize=500`);
  const data = await response.json();
  
  if (!data.documents || data.documents.length === 0) {
    console.log('✅ 沒有 chatRooms 需要刪除');
    return;
  }
  
  const docs = data.documents;
  console.log(`📊 找到 ${docs.length} 個聊天室\n`);
  
  let deleted = 0;
  let failed = 0;
  
  for (const doc of docs) {
    const docId = doc.name.split('/').pop();
    try {
      const deleteResponse = await fetch(`${BASE_URL}/chatRooms/${docId}`, {
        method: 'DELETE'
      });
      
      if (deleteResponse.ok) {
        console.log(`✅ 刪除: ${docId}`);
        deleted++;
      } else {
        console.log(`❌ 失敗: ${docId} - ${deleteResponse.status}`);
        failed++;
      }
    } catch (e) {
      console.log(`❌ 錯誤: ${docId} - ${e.message}`);
      failed++;
    }
  }
  
  console.log(`\n========================================`);
  console.log(`📊 統計`);
  console.log(`   總數: ${docs.length}`);
  console.log(`   成功: ${deleted}`);
  console.log(`   失敗: ${failed}`);
  console.log(`========================================`);
  
  if (deleted > 0) {
    alert(`✅ 刪除完成！成功: ${deleted}, 失敗: ${failed}`);
  }
}

// Run
deleteAllChatRooms();