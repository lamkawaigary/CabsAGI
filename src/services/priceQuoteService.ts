// Cabs Carpool - Price Quote Service (Backward Compatibility)
// Version: 2.0
// Wraps the new Trip-based quote system with the old priceQuoteService API

import { collection, doc, addDoc, updateDoc, getDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebaseConfig'

// Re-export the new quote types for backward compatibility
export interface PriceQuote {
  id: string
  roomId: string
  oderId: string
  oderName: string
  oderRole: 'driver' | 'passenger'
  type: 'offer' | 'counter'
  pricePerSeat: number
  tunnelFee?: number
  freeWaitingMinutes?: number
  extraChargePer10Min?: number
  currency: 'HKD'
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  tripId?: string | null
  createdAt: string
  respondedAt?: string
  acceptedBy?: string
  acceptedByName?: string
}

const PRICE_QUOTES_COLLECTION = 'priceQuotes'

// Legacy collection for old quotes (read-only for migration)
export const priceQuoteService = {

  /**
   * Initialize collection
   */
  async initialize(): Promise<void> {
    // No-op for backward compatibility
  },

  /**
   * Create or update a quote (backward compatible)
   */
  async createOrUpdate(data: {
    roomId: string
    oderId: string
    oderName: string
    oderRole: 'driver' | 'passenger'
    type: 'offer' | 'counter'
    pricePerSeat: number
    tunnelFee?: number
    waitingTime?: number
    extraChargePer10Min?: number
    tripId?: string | null
  }): Promise<string> {
    // First check if there's an existing pending quote from this user
    const existing = await this.getMyPendingQuote(data.roomId, data.oderId)
    
    if (existing) {
      // Update existing quote
      const quoteRef = doc(db, PRICE_QUOTES_COLLECTION, existing.id)
      await updateDoc(quoteRef, {
        type: data.type,
        pricePerSeat: data.pricePerSeat,
        tunnelFee: data.tunnelFee || 0,
        freeWaitingMinutes: data.waitingTime || 0,
        extraChargePer10Min: data.extraChargePer10Min || 0,
        tripId: data.tripId || null,
        updatedAt: new Date().toISOString(),
      })
      return existing.id
    } else {
      // Create new quote
      const quote = {
        roomId: data.roomId,
        oderId: data.oderId,
        oderName: data.oderName,
        oderRole: data.oderRole,
        type: data.type,
        pricePerSeat: data.pricePerSeat,
        tunnelFee: data.tunnelFee || 0,
        freeWaitingMinutes: data.waitingTime || 0,
        extraChargePer10Min: data.extraChargePer10Min || 0,
        currency: 'HKD' as const,
        status: 'pending' as const,
        tripId: data.tripId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      const docRef = await addDoc(collection(db, PRICE_QUOTES_COLLECTION), quote)
      return docRef.id
    }
  },

  /**
   * Get user's pending quote
   */
  async getMyPendingQuote(roomId: string, oderId: string): Promise<PriceQuote | null> {
    try {
      const q = query(
        collection(db, PRICE_QUOTES_COLLECTION),
        where('roomId', '==', roomId),
        where('oderId', '==', oderId),
        where('status', '==', 'pending')
      )
      
      const snapshot = await getDocs(q)
      if (snapshot.empty) return null
      
      const doc = snapshot.docs[0]
      return { id: doc.id, ...doc.data() } as PriceQuote
    } catch (e) {
      console.error('Error getting my pending quote:', e)
      return null
    }
  },

  /**
   * Accept a quote (creates Trip in background)
   */
  async accept(
    quoteId: string,
    passengerId: string,
    oderName: string,
    chatRoomInfo?: {
      roomId: string
      roomType: 'trip' | 'request'
      roomTypeId: string
      participants: { passengerId: string; name: string; phone: string }[]
      topicPickup?: string
      topicDropoff?: string
      topicTime?: string
    }
  ): Promise<string | null> {
    const quoteRef = doc(db, PRICE_QUOTES_COLLECTION, quoteId)
    
    // Update quote status
    await updateDoc(quoteRef, {
      status: 'accepted',
      respondedAt: new Date().toISOString(),
      acceptedBy: passengerId,
      acceptedByName: oderName,
    })
    
    // Expire other pending quotes
    await this.expireOtherQuotes(chatRoomInfo?.roomId || '', quoteId)
    
    // Return quote ID (Trip creation is handled separately by the caller)
    return quoteId
  },

  /**
   * Reject a quote
   */
  async reject(quoteId: string): Promise<void> {
    const quoteRef = doc(db, PRICE_QUOTES_COLLECTION, quoteId)
    await updateDoc(quoteRef, {
      status: 'rejected',
      respondedAt: new Date().toISOString(),
    })
  },

  /**
   * Expire other quotes
   */
  async expireOtherQuotes(roomId: string, acceptedQuoteId: string): Promise<void> {
    try {
      const q = query(
        collection(db, PRICE_QUOTES_COLLECTION),
        where('roomId', '==', roomId),
        where('status', '==', 'pending')
      )
      
      const snapshot = await getDocs(q)
      const updates = snapshot.docs
        .filter(doc => doc.id !== acceptedQuoteId)
        .map(doc => 
          updateDoc(doc.ref, {
            status: 'expired',
            respondedAt: new Date().toISOString(),
          })
        )
      
      await Promise.all(updates)
    } catch (e) {
      console.warn('expireOtherQuotes error:', e)
    }
  },

  /**
   * Get all quotes for a room
   */
  async getRoomQuotes(roomId: string): Promise<PriceQuote[]> {
    try {
      const q = query(
        collection(db, PRICE_QUOTES_COLLECTION),
        where('roomId', '==', roomId)
      )
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PriceQuote[]
    } catch (e) {
      console.error('Error getting room quotes:', e)
      return []
    }
  },

  /**
   * Get accepted quote for a room
   */
  async getAcceptedQuote(roomId: string): Promise<PriceQuote | null> {
    try {
      const q = query(
        collection(db, PRICE_QUOTES_COLLECTION),
        where('roomId', '==', roomId),
        where('status', '==', 'accepted')
      )
      
      const snapshot = await getDocs(q)
      if (snapshot.empty) return null
      
      const doc = snapshot.docs[0]
      return { id: doc.id, ...doc.data() } as PriceQuote
    } catch (e) {
      console.error('Error getting accepted quote:', e)
      return null
    }
  },

  /**
   * Subscribe to room quotes
   */
  subscribeToRoomQuotes(
    roomId: string,
    callback: (quotes: PriceQuote[]) => void
  ): () => void {
    const q = query(
      collection(db, PRICE_QUOTES_COLLECTION),
      where('roomId', '==', roomId)
    )
    
    return onSnapshot(q, (snapshot) => {
      const quotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PriceQuote[]
      callback(quotes)
    })
  },
}