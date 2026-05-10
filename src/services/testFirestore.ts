// Quick test to verify Firestore connectivity
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebaseConfig'

const TEST_COLLECTION = 'test_connectivity'

export async function testFirestore(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('[Firestore Test] Starting...')
    console.log('[Firestore Test] DB:', db?.app?.name || 'no db')
    
    // Try to add a test document
    const testDoc = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Firestore connectivity test'
    }
    
    const docRef = await addDoc(collection(db, TEST_COLLECTION), testDoc)
    console.log('[Firestore Test] ✅ Write successful, ID:', docRef.id)
    
    // Try to read it back
    const q = query(collection(db, TEST_COLLECTION), where('test', '==', true))
    const snapshot = await getDocs(q)
    console.log('[Firestore Test] ✅ Read successful, docs found:', snapshot.size)
    
    // Clean up test document
    const { deleteDoc, doc } = await import('firebase/firestore')
    await deleteDoc(doc(db, TEST_COLLECTION, docRef.id))
    
    return { success: true, message: `Write and read successful! ID: ${docRef.id}` }
  } catch (error: any) {
    console.error('[Firestore Test] ❌ Error:', error.code, error.message)
    return { success: false, message: `${error.code}: ${error.message}` }
  }
}
