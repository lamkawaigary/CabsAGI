import { useEffect } from 'react'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function TestFirestoreWrite() {
  useEffect(() => {
    const run = async () => {
      try {
        console.log('[Test] Testing Firestore with simpler approach...')
        
        // Test 1: Direct setDoc with known ID
        const testId = 'test-trip-' + Date.now()
        const testDoc = {
          pricingMode: 'FIXED',
          initiatorRole: 'driver',
          initiatorName: 'Test Driver',
          status: 'OPEN',
          createdAt: new Date().toISOString(),
        }
        
        console.log('[Test] Writing doc with ID:', testId)
        await setDoc(doc(db, 'trips', testId), testDoc)
        console.log('[Test] setDoc completed!')
        
        // Test 2: Read it back
        const readDoc = await getDoc(doc(db, 'trips', testId))
        console.log('[Test] getDoc completed! exists:', readDoc.exists())
        
        if (readDoc.exists()) {
          console.log('[Test] ✅ SUCCESS! Doc data:', JSON.stringify(readDoc.data()))
          alert('Firestore write/read SUCCESS! ID: ' + testId)
        } else {
          console.log('[Test] ❌ Doc written but not readable!')
          alert('Written but not readable!')
        }
        
      } catch (e: any) {
        console.error('[Test] ❌ Error:', e.code, e.message)
        alert('Error: ' + e.code + ' - ' + e.message)
      }
    }
    run()
  }, [])

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h1>Firestore Simple Test</h1>
      <p>Testing setDoc with known ID...</p>
    </div>
  )
}