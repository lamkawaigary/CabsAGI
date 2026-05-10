// Migration script to move listings to trips collection
// Run once to migrate old passenger_requests from listings to trips

import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

const LISTINGS_COLLECTION = 'listings'
const TRIPS_COLLECTION = 'trips'

export async function migrateListingsToTrips(): Promise<{ migrated: number; errors: string[] }> {
  const errors: string[] = []
  let migrated = 0

  try {
    // Get all listings
    const snapshot = await getDocs(collection(db, LISTINGS_COLLECTION))
    console.log(`[Migration] Found ${snapshot.size} listings`)

    for (const docSnap of snapshot.docs) {
      const listing = docSnap.data()
      
      // Only migrate passenger_requests
      if (listing.type !== 'passenger_request') {
        console.log(`[Migration] Skipping ${docSnap.id} - not a passenger_request`)
        continue
      }

      try {
        // Convert to trip format
        const trip = {
          pricingMode: 'NEGOTIATED',
          initiatorRole: 'passenger',
          initiatorId: listing.initiatorId || '',
          initiatorName: listing.initiatorName || '乘客',
          initiatorPhone: listing.initiatorPhone || '',
          route: listing.route || { pickup: listing.pickup, dropoff: listing.dropoff },
          departureTime: listing.departureTime || listing.departureDate || '',
          vehicleType: listing.vehicleType || 'sedan',
          totalSeats: listing.passengerCount || 1,
          availableSeats: listing.passengerCount || 1,
          notes: listing.notes || '',
          tags: listing.tags || [],
          status: listing.status === 'OPEN' ? 'OPEN' : listing.status,
          driver: null,
          passengers: [],
          pendingPassengers: [],
          quotes: [],
          pricePerSeat: undefined,
          tunnelFee: listing.tunnelFee,
          createdAt: listing.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        // Add to trips collection
        await addDoc(collection(db, TRIPS_COLLECTION), trip)
        
        // Delete from listings
        await deleteDoc(doc(db, LISTINGS_COLLECTION, docSnap.id))
        
        console.log(`[Migration] Migrated ${docSnap.id} → trips`)
        migrated++
      } catch (err: any) {
        console.error(`[Migration] Error migrating ${docSnap.id}:`, err.message)
        errors.push(`${docSnap.id}: ${err.message}`)
      }
    }

    console.log(`[Migration] Complete! Migrated ${migrated} listings to trips`)
  } catch (err: any) {
    console.error('[Migration] Fatal error:', err.message)
    errors.push(err.message)
  }

  return { migrated, errors }
}