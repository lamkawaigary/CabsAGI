import { useEffect } from 'react'
import { collection, addDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function TestFirestoreWrite() {
  useEffect(() => {
    const run = async () => {
      try {
        console.log('[Test] Starting...')
        
        // Create a REAL trip structure matching what CreateTripPage does
        const tripData = {
          pricingMode: 'FIXED',
          initiatorRole: 'driver',
          initiatorId: 'test-driver-123',
          initiatorName: 'Test Driver',
          initiatorPhone: '12345678',
          route: {
            pickup: { placeName: '測試上車點', latitude: 22.5, longitude: 114.1 },
            dropoff: { placeName: '測試下车點', latitude: 22.6, longitude: 114.2 }
          },
          departureTime: '2026-05-15 10:00',
          vehicleType: 'sedan',
          totalSeats: 4,
          availableSeats: 4,
          status: 'OPEN',
          driver: {
            id: 'test-driver-123',
            name: 'Test Driver',
            role: 'driver',
            joinedAt: new Date().toISOString(),
            confirmed: true,
            onboarded: false,
          },
          passengers: [],
          pendingPassengers: [],
          quotes: [],
          notes: 'Test trip',
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        console.log('[Test] Creating trip with data:', JSON.stringify(tripData, null, 2))
        
        const ref = await addDoc(collection(db, 'trips'), tripData)
        console.log('[Test] Trip created! ID:', ref.id)
        
        // Read it back
        const snap = await getDocs(collection(db, 'trips'))
        console.log('[Test] Total trips:', snap.size)
        
        const doc = snap.docs.find(d => d.id === ref.id)
        if (doc) {
          console.log('[Test] ✅ Trip verified! Data:', JSON.stringify(doc.data(), null, 2))
          alert('Trip created successfully! ID: ' + ref.id)
        } else {
          console.log('[Test] ❌ Trip not found!')
          alert('Trip created but not found in collection!')
        }
        
      } catch (e: any) {
        console.error('[Test] Error:', e.code, e.message, e)
        alert('Error: ' + e.code + ' - ' + e.message)
      }
    }
    run()
  }, [])

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h1>Create Real Trip Test</h1>
      <p>Check console for output...</p>
    </div>
  )
}