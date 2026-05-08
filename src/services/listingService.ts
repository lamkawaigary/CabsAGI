// Cabs Carpool - Listing Service v2.0 (Carousell Model)
// Simplified - no price quotes, negotiation happens in chat

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { db } from '../firebaseConfig'
import type { Location } from '../types/listing'

const LISTINGS_COLLECTION = 'listings'

export interface Listing {
  id: string
  type: 'driver_offer' | 'passenger_request'
  status: 'OPEN' | 'SOLD' | 'CANCELLED'
  
  // Creator info
  initiatorId: string
  initiatorName: string
  initiatorPhone: string
  
  // Route
  route: {
    pickup: Location
    dropoff: Location
  }
  departureTime: string
  
  // Requirements
  passengerCount: number
  vehicleType: 'sedan' | '7seater'
  isCarpool: boolean
  notes?: string
  
  // Price (filled when sold)
  price?: number
  tunnelFee?: number
  
  // When sold - the other party info
  buyerId?: string
  buyerName?: string
  sellerId?: string
  sellerName?: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  soldAt?: string
}

export const listingService = {

  /**
   * Create a new listing
   */
  async create(data: {
    type: 'driver_offer' | 'passenger_request'
    initiatorId: string
    initiatorName: string
    initiatorPhone: string
    pickup: Location
    dropoff: Location
    departureTime: string
    passengerCount: number
    vehicleType: 'sedan' | '7seater'
    isCarpool: boolean
    notes?: string
  }): Promise<string> {
    const listing = {
      type: data.type,
      status: 'OPEN' as const,
      initiatorId: data.initiatorId,
      initiatorName: data.initiatorName,
      initiatorPhone: data.initiatorPhone,
      route: {
        pickup: data.pickup,
        dropoff: data.dropoff,
      },
      departureTime: data.departureTime,
      passengerCount: data.passengerCount,
      vehicleType: data.vehicleType,
      isCarpool: data.isCarpool,
      notes: data.notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const docRef = await addDoc(collection(db, LISTINGS_COLLECTION), listing)
    return docRef.id
  },

  /**
   * Get all OPEN listings (for browsing)
   */
  async getOpenListings(): Promise<Listing[]> {
    try {
      const snapshot = await getDocs(collection(db, LISTINGS_COLLECTION))
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Listing))
        .filter(l => l.status === 'OPEN')
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    } catch (e) {
      console.error('Error getting listings:', e)
      return []
    }
  },

  /**
   * Get listings by user (my listings)
   */
  async getByUser(userId: string): Promise<Listing[]> {
    const q = query(
      collection(db, LISTINGS_COLLECTION),
      where('initiatorId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Listing[]
  },

  /**
   * Get sold/completed listings for user
   */
  async getSoldListings(userId: string): Promise<Listing[]> {
    // Get listings where user is either buyer or seller
    const [asBuyer, asSeller] = await Promise.all([
      getDocs(query(collection(db, LISTINGS_COLLECTION), where('buyerId', '==', userId))),
      getDocs(query(collection(db, LISTINGS_COLLECTION), where('sellerId', '==', userId))),
    ])
    
    const all: Listing[] = []
    asBuyer.forEach(doc => all.push({ id: doc.id, ...doc.data() } as Listing))
    asSeller.forEach(doc => {
      if (!all.find(l => l.id === doc.id)) {
        all.push({ id: doc.id, ...doc.data() } as Listing)
      }
    })
    
    return all.sort((a, b) => new Date(b.soldAt || b.updatedAt).getTime() - new Date(a.soldAt || a.updatedAt).getTime())
  },

  /**
   * Get single listing
   */
  async getById(id: string): Promise<Listing | null> {
    const docRef = doc(db, LISTINGS_COLLECTION, id)
    const snapshot = await getDoc(docRef)
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Listing : null
  },

  /**
   * Mark listing as sold (agreement reached in chat)
   */
  async markAsSold(listingId: string, buyerId: string, buyerName: string, price: number, tunnelFee?: number): Promise<void> {
    const listingRef = doc(db, LISTINGS_COLLECTION, listingId)
    const listing = await this.getById(listingId)
    
    if (!listing) throw new Error('Listing not found')
    if (listing.status !== 'OPEN') throw new Error('Listing is not open')
    
    await updateDoc(listingRef, {
      status: 'SOLD',
      buyerId,
      buyerName,
      sellerId: listing.initiatorId,
      sellerName: listing.initiatorName,
      price,
      tunnelFee: tunnelFee || 0,
      soldAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * Cancel a listing
   */
  async cancel(listingId: string, userId: string): Promise<void> {
    const listingRef = doc(db, LISTINGS_COLLECTION, listingId)
    const listing = await this.getById(listingId)
    
    if (!listing) throw new Error('Listing not found')
    if (listing.initiatorId !== userId) throw new Error('Not authorized')
    if (listing.status !== 'OPEN') throw new Error('Cannot cancel')
    
    await updateDoc(listingRef, {
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * Subscribe to open listings (real-time)
   */
  subscribeToOpenListings(callback: (listings: Listing[]) => void): () => void {
    const q = query(
      collection(db, LISTINGS_COLLECTION),
      where('status', '==', 'OPEN'),
      orderBy('createdAt', 'desc')
    )
    
    return onSnapshot(q, (snapshot) => {
      const listings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Listing[]
      callback(listings)
    })
  },

  /**
   * Subscribe to single listing
   */
  subscribeToListing(listingId: string, callback: (listing: Listing | null) => void): () => void {
    const listingRef = doc(db, LISTINGS_COLLECTION, listingId)
    
    return onSnapshot(listingRef, (snapshot) => {
      callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Listing : null)
    })
  },

  /**
   * Delete a listing
   */
  async delete(listingId: string, userId: string): Promise<void> {
    const listing = await this.getById(listingId)
    if (!listing) throw new Error('Listing not found')
    if (listing.initiatorId !== userId) throw new Error('Not authorized')
    if (listing.status !== 'OPEN') throw new Error('Cannot delete non-open listing')
    
    await deleteDoc(doc(db, LISTINGS_COLLECTION, listingId))
  },
}