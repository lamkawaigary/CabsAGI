import { useEffect } from 'react'
import { collection, addDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebaseConfig'
import { tripService } from '../services/tripService'

export default function TestFirestoreWrite() {
  useEffect(() => {
    const run = async () => {
      try {
        console.log('[TestWrite] Starting trip creation test...')
        
        // Test tripService.create() - the actual function used by CreateTripPage
        const testTripId = await tripService.create({
          pricingMode: 'FIXED',
          initiatorRole: 'driver',
          initiatorId: 'test-driver-id',
          initiatorName: 'Test Driver',
          initiatorPhone: '12345678',
          pickup: { placeName: 'Test Pickup', latitude: 0, longitude: 0 },
          dropoff: { placeName: 'Test Dropoff', latitude: 0, longitude: 0 },
          departureTime: '2026-05-15 10:00',
          vehicleType: 'sedan',
          totalSeats: 4,
        })
        
        console.log('[TestWrite] tripService.create() returned:', testTripId)
        alert('Trip created! ID: ' + testTripId)
        
        // Verify it exists
        const snap = await getDocs(collection(db, 'trips'))
        console.log('[TestWrite] Total trips in collection:', snap.size)
        
        const created = snap.docs.find(d => d.id === testTripId)
        if (created) {
          console.log('[TestWrite] ✅ Trip verified:', created.data())
        } else {
          console.log('[TestWrite] ❌ Trip not found after creation!')
        }
        
      } catch (e: any) {
        console.error('[TestWrite] Error:', e.code, e.message)
        alert('Error: ' + e.code + ' - ' + e.message)
      }
    }
    run()
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h1>Firestore Trip Creation Test</h1>
      <p>Check console for output...</p>
    </div>
  )
}
