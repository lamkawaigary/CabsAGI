// Temporary test page - DELETE AFTER DEBUGGING
import { useEffect, useState } from 'react'
import { collection, addDoc, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function TestFirestorePage() {
  const [log, setLog] = useState<string[]>([])
  
  const logMsg = (msg: string) => {
    console.log('[TestFirestore]', msg)
    setLog(prev => [...prev, msg])
  }
  
  useEffect(() => {
    const runTest = async () => {
      logMsg('Starting Firestore test...')
      
      // Test 1: Direct write to trips
      try {
        logMsg('Test 1: Writing directly to trips collection...')
        const docRef = await addDoc(collection(db, 'trips'), {
          test: true,
          timestamp: new Date().toISOString(),
          message: 'Direct test from browser'
        })
        logMsg(`✅ Write success! ID: ${docRef.id}`)
        
        // Test 2: Read it back
        logMsg('Test 2: Reading back from trips...')
        const snap = await getDoc(doc(db, 'trips', docRef.id))
        if (snap.exists()) {
          logMsg(`✅ Read success! Data: ${JSON.stringify(snap.data())}`)
        } else {
          logMsg('❌ Doc not found after write!')
        }
        
        // Test 3: Query all trips
        logMsg('Test 3: Querying all trips...')
        const allDocs = await getDocs(collection(db, 'trips'))
        logMsg(`Found ${allDocs.size} total docs in trips collection`)
        
      } catch (err: any) {
        logMsg(`❌ Error: ${err.code} - ${err.message}`)
      }
    }
    
    runTest()
  }, [])
  
  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h1>Firestore Test</h1>
      <button onClick={() => setLog([])}>Clear</button>
      <div style={{ marginTop: 20 }}>
        {log.map((msg, i) => (
          <div key={i} style={{ padding: 4 }}>{msg}</div>
        ))}
      </div>
    </div>
  )
}
