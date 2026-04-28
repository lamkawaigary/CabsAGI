// Cabs Carpool - Price Quote Service
// 處理共乘報價邏輯

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
  arrayUnion,
} from 'firebase/firestore'
import { db } from '../firebaseConfig'
import type { Location } from '../types/trip'
import { TRIPS_COLLECTION } from './tripService'

const PRICE_QUOTES_COLLECTION = 'priceQuotes'
const INIT_DOC_ID = '__init__'

export interface PriceQuote {
  id: string
  roomId: string           // 聊天室 ID
  oderId: string           // 報價者 ID
  oderName: string         // 報價者名稱
  oderRole: 'driver' | 'passenger'
  type: 'offer' | 'counter'  // 報價 / 還價
  pricePerSeat: number     // 每位價格 (HK$)
  tunnelFee?: number       // 隧道費 (HK$)
  freeWaitingMinutes?: number  // 免費等候分鐘
  extraChargePer10Min?: number // 超時每10分鐘收費
  currency: 'HKD'          // 固定港幣
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  tripId?: string | null  // Set when trip is created from accepted quote
  createdAt: string
  respondedAt?: string
  acceptedBy?: string      // 接受者 ID
  acceptedByName?: string  // 接受者名稱
}

export const priceQuoteService = {

  /**
   * 創建或更新報價（一人一碗：每個用戶只有一個 pending 報價）
   * 如果已存在 pending 報價，則更新它
   */
  async createOrUpdate(data: {
    roomId: string
    oderId: string
    oderName: string
    oderRole: 'driver' | 'passenger'
    type: 'offer' | 'counter'
    pricePerSeat: number
    tunnelFee?: number
    waitingTime?: number  // freeWaitingMinutes
    extraChargePer10Min?: number
    tripId?: string | null  // Set when quote is converted to trip
  }): Promise<string> {
    // Find existing pending quote from this user
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
        tripId: data.tripId || null,  // Will be set when quote is accepted and trip is created
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      const docRef = await addDoc(collection(db, PRICE_QUOTES_COLLECTION), quote)
      return docRef.id
    }
  },

  /**
   * 獲取用戶的 pending 報價
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
   * 接受報價 - 同時創建 Trip 記錄
   */
  async accept(
    quoteId: string, 
    oderId: string, 
    oderName: string,
    chatRoomInfo?: {
      roomId: string
      roomType: 'trip' | 'request'
      roomTypeId: string
      participants: { oderId: string; name: string; phone: string }[]
      topicPickup?: string
      topicDropoff?: string
      topicTime?: string
    }
  ): Promise<string | null> {
    const quoteRef = doc(db, PRICE_QUOTES_COLLECTION, quoteId)
    
    // Update the quote status
    await updateDoc(quoteRef, {
      status: 'accepted',
      respondedAt: new Date().toISOString(),
      acceptedBy: oderId,
      acceptedByName: oderName,
    })
    
    // Get the quote data
    const quoteSnap = await getDoc(quoteRef)
    if (!quoteSnap.exists()) return null
    
    const quoteData = quoteSnap.data()
    const roomId = quoteData.roomId
    
    // Expire all other pending quotes for this room
    await this.expireOtherQuotes(roomId, quoteId)
    
    // If we have chat room info, create a Trip from the accepted quote
    if (chatRoomInfo) {
      // Determine driver and passenger from participants
      const driverParticipant = chatRoomInfo.participants.find(p => p.oderId === oderId)
      const isDriverAccepting = driverParticipant !== undefined
      
      // The other participant is the one who didn't accept
      const otherParticipant = chatRoomInfo.participants.find(p => p.oderId !== oderId)
      
      if (!otherParticipant) {
        console.warn('No other participant found to create trip')
        return null
      }
      
      // Create Trip from the accepted quote
      const tripData = {
        // Driver info
        driverId: oderId,  // The acceptor is the driver
        driverName: oderName,
        driverPhone: driverParticipant?.phone || '',
        
        // Route info from chat room topic
        route: {
          pickup: {
            placeName: chatRoomInfo.topicPickup || '未知上車點',
            latitude: 0,
            longitude: 0,
          } as Location,
          dropoff: {
            placeName: chatRoomInfo.topicDropoff || '未知下车点',
            latitude: 0,
            longitude: 0,
          } as Location,
        },
        
        // Time from chat room topic
        departureTime: chatRoomInfo.topicTime || new Date().toISOString(),
        
        // Seats - default to 7 for now
        totalSeats: 7,
        availableSeats: 6,  // Driver takes 1
        
        // Passengers - the passenger who accepted
        passengers: [{
          oderId: otherParticipant.oderId,
          name: otherParticipant.name,
          phone: otherParticipant.phone,
          confirmed: true,
          onboarded: false,
        }],
        
        // Empty pending/rejected
        pendingPassengers: [],
        rejectedPassengers: [],
        leftPassengers: [],
        noShowPassengers: [],
        
        // Status - CONFIRMED since quote was accepted
        status: 'CONFIRMED' as const,
        
        // Confirmation
        confirmedByDriver: true,
        confirmedByPassengers: [otherParticipant.oderId],
        
        // Quote info for reference
        quoteId: quoteId,
        pricePerSeat: quoteData.pricePerSeat,
        tunnelFee: quoteData.tunnelFee || 0,
        
        // Metadata
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      // Create the trip document
      const tripRef = await addDoc(collection(db, TRIPS_COLLECTION), tripData)
      
      // Update the accepted quote with the tripId
      await updateDoc(quoteRef, {
        tripId: tripRef.id,
      })
      
      // Update chat room with the new trip ID
      // Update roomType to 'trip' and store tripId
      const roomRef = doc(db, 'chatRooms', roomId)
      await updateDoc(roomRef, {
        roomType: 'trip',
        roomTypeId: tripRef.id,
        updatedAt: new Date().toISOString(),
      })
      
      console.log('[priceQuoteService] Created trip:', tripRef.id, 'from accepted quote')
      return tripRef.id
    }
    
    return null
  },

  /**
   * 拒絕報價
   */
  async reject(quoteId: string): Promise<void> {
    const quoteRef = doc(db, PRICE_QUOTES_COLLECTION, quoteId)
    await updateDoc(quoteRef, {
      status: 'rejected',
      respondedAt: new Date().toISOString(),
    })
  },

  /**
   * 過期其他報價（當一個被接受時）
   */
  async expireOtherQuotes(roomId: string, acceptedQuoteId: string): Promise<void> {
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
  },

  /**
   * 獲取聊天室的所有報價
   */
  async getRoomQuotes(roomId: string): Promise<PriceQuote[]> {
    try {
      const q = query(
        collection(db, PRICE_QUOTES_COLLECTION),
        where('roomId', '==', roomId)
      )
      
      const snapshot = await getDocs(q)
      const quotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PriceQuote[]
      
      // Sort in memory (newest first)
      return quotes.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    } catch (e) {
      console.error('Error getting room quotes:', e)
      return []
    }
  },

  /**
   * 獲取最新的已接受報價
   */
  async getAcceptedQuote(roomId: string): Promise<PriceQuote | null> {
    const q = query(
      collection(db, PRICE_QUOTES_COLLECTION),
      where('roomId', '==', roomId),
      where('status', '==', 'accepted')
    )
    
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() } as PriceQuote
  },

  /**
   * 監聽聊天室報價更新
   */
  subscribeToRoomQuotes(
    roomId: string,
    callback: (quotes: PriceQuote[]) => void
  ): () => void {
    const q = query(
      collection(db, PRICE_QUOTES_COLLECTION),
      where('roomId', '==', roomId),
      orderBy('createdAt', 'desc')
    )
    
    return onSnapshot(q, (snapshot) => {
      const quotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PriceQuote[]
      callback(quotes)
    })
  },

  /**
   * 初始化 collection（確保存在）
   * 如果 collection 不存在，創建一個空白文檔
   */
  async initialize(): Promise<void> {
    try {
      const initRef = doc(db, PRICE_QUOTES_COLLECTION, INIT_DOC_ID)
      const initSnap = await getDoc(initRef)
      
      if (!initSnap.exists()) {
        // Create a placeholder document to initialize the collection
        await addDoc(collection(db, PRICE_QUOTES_COLLECTION), {
          _placeholder: true,
          createdAt: new Date().toISOString(),
        })
        console.log('priceQuotes collection initialized')
      }
    } catch (e) {
      console.warn('Failed to initialize priceQuotes collection:', e)
    }
  },
}
