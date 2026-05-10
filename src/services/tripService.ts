// Cabs Carpool - Trip Service (Unified)
// Version: 4.0
// 統一的 Trip CRUD，支援 FIXED 和 NEGOTIATED 模式

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
  increment
} from 'firebase/firestore'
import { db } from '../firebaseConfig'
import type { 
  Trip, 
  TripStatus, 
  PricingMode,
  CreateTripData,
  TripQuote,
  TripParticipant,
  PassengerRequest
} from '../types/trip'

export const TRIPS_COLLECTION = 'trips'
export const CHAT_ROOMS_COLLECTION = 'chatRooms'
export const CHAT_MESSAGES_COLLECTION = 'chatMessages'

// ==================== Trip Service ====================

export const tripService = {

  /**
   * 創建統一的 Trip
   */
  async create(data: CreateTripData): Promise<string> {
    const isDriverInitiator = data.initiatorRole === 'driver'
    
    const trip: Omit<Trip, 'id'> = {
      // 核心區分
      pricingMode: data.pricingMode,
      initiatorRole: data.initiatorRole,
      initiatorId: data.initiatorId,
      initiatorName: data.initiatorName,
      initiatorPhone: data.initiatorPhone,
      
      // 路線
      route: {
        pickup: data.pickup,
        dropoff: data.dropoff,
      },
      
      // 時間
      departureTime: data.departureTime,
      
      // 車輛
      vehicleType: data.vehicleType,
      totalSeats: data.totalSeats,
      availableSeats: data.totalSeats,
      
      // 定價
      pricePerSeat: data.pricingMode === 'FIXED' ? data.pricePerSeat : undefined,
      tunnelFee: data.tunnelFee,
      
      // 參與者
      driver: isDriverInitiator ? {
        id: data.initiatorId,
        name: data.initiatorName,
        phone: data.initiatorPhone,
        role: 'driver',
        joinedAt: new Date().toISOString(),
        confirmed: true,
        onboarded: false,
      } : null,
      passengers: [],
      
      // 申請加入
      pendingPassengers: [],
      
      // 報價記錄（NEGOTIATED 模式）
      quotes: [],
      
      // 狀態
      status: 'OPEN',
      
      // 備註 & 標籤
      notes: data.notes,
      tags: data.tags || [],
      
      // 時間戳
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    const docRef = await addDoc(collection(db, TRIPS_COLLECTION), trip)
    console.log('[tripService.create] ✅ SUCCESS - Trip created in Firestore:', docRef.id)
    console.log('[tripService.create] Trip data:', JSON.stringify(trip, null, 2))
    
    // 自動創建聊天室
    const chatRoomId = await chatService.createTripChatRoom({
      tripId: docRef.id,
      driverId: data.initiatorId,
      driverName: data.initiatorName,
      driverPhone: data.initiatorPhone,
      pickup: data.pickup.placeName,
      dropoff: data.dropoff.placeName,
      departureTime: data.departureTime,
    })
    
    return docRef.id
  },

  /**
   * 獲取所有公開 Trip（乘客瀏覽）
   */
  async getPublicTrips(): Promise<Trip[]> {
    console.log("[tripService] getPublicTrips called, collection:", TRIPS_COLLECTION)
    
    // First, try to get ALL docs without any filters
    // This bypasses composite index requirements
    try {
      console.log('[tripService] Fetching all docs from trips collection...')
      const allDocs = await getDocs(collection(db, TRIPS_COLLECTION))
      console.log('[tripService] getDocs returned', allDocs.size, 'documents')
      
      // Filter client-side for OPEN or CONFIRMED status
      const trips: Trip[] = []
      allDocs.forEach(doc => {
        const data = doc.data() as Trip
        console.log('[tripService] Doc', doc.id, 'status:', data.status, 'mode:', data.pricingMode)
        if (data.status === 'OPEN' || data.status === 'CONFIRMED') {
          // Backwards compatibility: always set driverId from driver.id or initiatorId
          const driverId = data.driver?.id || data.initiatorId
          const driverName = data.driver?.name || data.initiatorName
          ;(data as any).driverId = driverId
          ;(data as any).driverName = driverName
          trips.push({ id: doc.id, ...data })
        }
      })
      console.log('[tripService] Total trips with OPEN/CONFIRMED:', trips.length)
      
      // Sort by createdAt desc
      trips.sort((a, b) => {
        const aTime = (a as any).createdAt || ''
        const bTime = (b as any).createdAt || ''
        return bTime.localeCompare(aTime)
      })
      
      return trips
    } catch (e: any) {
      console.error('[tripService] Error fetching trips:', e.code, e.message)
      return []
    }
  },

  /**
   * 獲取司機的 Trip
   */
  async getByDriver(driverId: string): Promise<Trip[]> {
    try {
      const q = query(
        collection(db, TRIPS_COLLECTION),
        where('driver.id', '==', driverId)
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip))
    } catch (e) {
      console.warn('[tripService] getByDriver query failed, using fallback:', e.message)
      // Fallback: get all and filter locally
      const allDocs = await getDocs(collection(db, TRIPS_COLLECTION))
      return allDocs.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Trip))
        .filter(t => t.driver?.id === driverId)
    }
  },

  /**
   * 獲取乘客參與的 Trip
   */
  async getByPassenger(passengerId: string): Promise<Trip[]> {
    try {
      // Find trips where this passenger is in passengers array OR is the initiator
      const allDocs = await getDocs(collection(db, TRIPS_COLLECTION))
      const trips: Trip[] = []
      allDocs.forEach(doc => {
        const data = doc.data() as Trip
        // Check if passenger is in passengers array
        const isPassenger = data.passengers?.some(p => p.id === passengerId)
        // Check if passenger is pending
        const isPending = data.pendingPassengers?.some(p => p.id === passengerId)
        // Check if passenger is the initiator (they created this trip/request)
        const isInitiator = data.initiatorId === passengerId && data.initiatorRole === 'passenger'
        if (isPassenger || isPending || isInitiator) {
          trips.push({ id: doc.id, ...data })
        }
      })
      return trips
    } catch (e) {
      console.error('[tripService] Error getting passenger trips:', e)
      return []
    }
  },

  /**
   * 獲取 Trip 按 ID
   */
  async getById(id: string): Promise<Trip | null> {
    const docRef = doc(db, TRIPS_COLLECTION, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    
    const data = snapshot.data() as Trip
    
    // Backwards compatibility: if driverId exists but driver doesn't, migrate
    if ((data as any).driverId && !data.driver) {
      data.driver = {
        id: (data as any).driverId,
        name: (data as any).driverName || '司機',
        phone: (data as any).driverPhone || '',
        role: 'driver',
        joinedAt: data.createdAt,
        confirmed: true,
        onboarded: false,
      }
    }
    
    // Backwards compatibility: migrate passengers from old format
    if (data.passengers?.length && (data.passengers[0] as any).passengerId) {
      data.passengers = data.passengers.map((p: any) => ({
        id: p.passengerId,
        name: p.name,
        phone: p.phone,
        role: 'passenger',
        joinedAt: p.joinedAt || data.createdAt,
        confirmed: p.confirmed || false,
        onboarded: p.onboarded || false,
        qrCode: p.qrCode,
        qrCodeExpiry: p.qrCodeExpiry,
      }))
    }
    
    // Backwards compatibility: migrate pendingPassengers from old format
    if (data.pendingPassengers?.length && (data.pendingPassengers[0] as any).passengerId) {
      data.pendingPassengers = data.pendingPassengers.map((p: any) => ({
        id: p.passengerId,
        name: p.name,
        phone: p.phone,
        joinedAt: p.joinedAt,
      }))
    }
    
    return { id: snapshot.id, ...data }
  },

  /**
   * 更新 Trip 基本資訊
   */
  async update(id: string, data: Partial<Trip>): Promise<void> {
    const docRef = doc(db, TRIPS_COLLECTION, id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 乘客申請加入 Trip（FIXED 模式）
   */
  async requestJoin(tripId: string, passenger: {
    id: string
    name: string
    phone: string
  }): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    await updateDoc(tripRef, {
      pendingPassengers: arrayUnion({
        id: passenger.id,
        name: passenger.name,
        phone: passenger.phone,
        joinedAt: new Date().toISOString(),
      })
    })
  },

  /**
   * 司機批准乘客加入
   */
  async approvePassenger(tripId: string, passengerId: string): Promise<void> {
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    
    const pending = trip.pendingPassengers?.find(p => p.id === passengerId)
    if (!pending) throw new Error('Passenger not found in pending list')
    
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    await updateDoc(tripRef, {
      pendingPassengers: trip.pendingPassengers?.filter(p => p.id !== passengerId) || [],
      passengers: arrayUnion({
        id: pending.id,
        name: pending.name,
        phone: pending.phone,
        role: 'passenger',
        joinedAt: new Date().toISOString(),
        confirmed: false,
        onboarded: false,
      } as TripParticipant),
      availableSeats: increment(-1),
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 司機拒絕乘客加入
   */
  async rejectPassenger(tripId: string, passengerId: string): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    await updateDoc(tripRef, {
      pendingPassengers: (await this.getById(tripId))?.pendingPassengers?.filter(p => p.id !== passengerId) || [],
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 司機加入 Trip（NEGOTIATED 模式 - 作為司機）
   */
  async joinAsDriver(tripId: string, driver: {
    id: string
    name: string
    phone: string
  }): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    await updateDoc(tripRef, {
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        role: 'driver',
        joinedAt: new Date().toISOString(),
        confirmed: true,
        onboarded: false,
      } as TripParticipant,
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 司機提交報價（NEGOTIATED 模式）
   */
  async submitQuote(tripId: string, quote: Omit<TripQuote, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    
    const newQuote: TripQuote = {
      id: `quote_${Date.now()}`,
      oderId: quote.oderId,
      oderName: quote.oderName,
      oderPhone: quote.oderPhone,
      pricePerSeat: quote.pricePerSeat,
      tunnelFee: quote.tunnelFee,
      freeWaitingMinutes: quote.freeWaitingMinutes,
      extraChargePer10Min: quote.extraChargePer10Min,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    
    await updateDoc(tripRef, {
      quotes: arrayUnion(newQuote),
      updatedAt: new Date().toISOString(),
    })
    
    return newQuote.id
  },

  /**
   * 乘客接受報價（NEGOTIATED 模式）
   */
  async acceptQuote(tripId: string, quoteId: string, acceptedBy: string, acceptedByName: string): Promise<void> {
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    const now = new Date().toISOString()
    
    // Update quotes: mark this as accepted, others as expired
    const updatedQuotes = trip.quotes?.map(q => {
      if (q.id === quoteId) {
        return { ...q, status: 'accepted' as const, respondedAt: now, respondedBy: acceptedBy, respondedByName: acceptedByName }
      } else if (q.status === 'pending') {
        return { ...q, status: 'expired' as const, respondedAt: now }
      }
      return q
    }) || []
    
    // Find the accepted quote
    const acceptedQuote = updatedQuotes.find(q => q.id === quoteId)
    
    await updateDoc(tripRef, {
      quotes: updatedQuotes,
      status: 'CONFIRMED',
      confirmedPrice: acceptedQuote?.pricePerSeat,
      tunnelFee: acceptedQuote?.tunnelFee,
      updatedAt: now,
    })
  },

  /**
   * 乘客拒絕報價
   */
  async rejectQuote(tripId: string, quoteId: string, rejectedBy: string): Promise<void> {
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    const updatedQuotes = trip.quotes?.map(q => {
      if (q.id === quoteId) {
        return { ...q, status: 'rejected' as const, respondedAt: new Date().toISOString(), respondedBy: rejectedBy }
      }
      return q
    }) || []
    
    await updateDoc(tripRef, {
      quotes: updatedQuotes,
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 更新 Trip 狀態
   */
  async updateStatus(tripId: string, status: TripStatus): Promise<void> {
    const docRef = doc(db, TRIPS_COLLECTION, tripId)
    await updateDoc(docRef, { status, updatedAt: new Date().toISOString() })
  },

  /**
   * 確認共乘（乘客確認）
   */
  async confirmByPassenger(tripId: string, passengerId: string): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    
    const updatedPassengers = trip.passengers?.map(p => 
      p.id === passengerId ? { ...p, confirmed: true } : p
    ) || []
    
    await updateDoc(tripRef, {
      passengers: updatedPassengers,
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * Legacy confirm (for backwards compatibility)
   */
  async confirm(tripId: string, passengerId: string): Promise<void> {
    return this.confirmByPassenger(tripId, passengerId)
  },

  /**
   * 標記乘客上車
   */
  async markOnboarded(tripId: string, passengerId: string, onboarded: boolean): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    
    const updatedPassengers = trip.passengers?.map(p => 
      p.id === passengerId ? { ...p, onboarded } : p
    ) || []
    
    await updateDoc(tripRef, {
      passengers: updatedPassengers,
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * Legacy markPassengerOnboarded
   */
  async markPassengerOnboarded(tripId: string, passengerId: string): Promise<void> {
    return this.markOnboarded(tripId, passengerId, true)
  },

  /**
   * 乘客主動離開行程
   */
  async passengerLeave(tripId: string, passengerId: string): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    
    if (trip.status === 'IN_PROGRESS' || trip.status === 'COMPLETED') {
      throw new Error('Cannot leave during or after trip')
    }
    
    const updatedPassengers = trip.passengers?.filter(p => p.id !== passengerId) || []
    
    await updateDoc(tripRef, {
      passengers: updatedPassengers,
      availableSeats: increment(1),
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 司機標記乘客未到
   */
  async markPassengerNoShow(tripId: string, passengerId: string): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    
    const updatedPassengers = trip.passengers?.map(p => 
      p.id === passengerId ? { ...p, onboarded: false } : p
    ) || []
    
    await updateDoc(tripRef, {
      passengers: updatedPassengers,
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 生成乘客 QR 驗證碼
   */
  async generateQRCode(tripId: string, passengerId: string, oderName: string): Promise<string> {
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    
    const code = Math.random().toString().slice(2, 6)
    const expiry = new Date()
    expiry.setHours(expiry.getHours() + 24)
    
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    const updatedPassengers = trip.passengers?.map(p => {
      if (p.id !== passengerId) return p
      return { ...p, qrCode: code, qrCodeExpiry: expiry.toISOString() }
    }) || []
    
    await updateDoc(tripRef, {
      passengers: updatedPassengers,
      updatedAt: new Date().toISOString(),
    })
    
    return code
  },

  /**
   * 驗證 QR 碼並標記上車
   */
  async verifyAndMarkOnboard(tripId: string, code: string): Promise<boolean> {
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    if (trip.status !== 'IN_PROGRESS') {
      throw new Error('行程尚未開始，無法驗證上車')
    }
    
    const passenger = trip.passengers?.find(p => (p as any).qrCode === code)
    if (!passenger) throw new Error('驗證碼無效')
    if ((passenger as any).onboarded) throw new Error('乘客已標記上車')
    if ((passenger as any).qrCodeExpiry && new Date((passenger as any).qrCodeExpiry) < new Date()) {
      throw new Error('驗證碼已過期')
    }
    
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    const updatedPassengers: any[] = (trip.passengers || []).map(p => {
      if ((p as any).qrCode !== code) return p
      return { ...p, onboarded: true }
    })
    
    await updateDoc(tripRef, {
      passengers: updatedPassengers,
      updatedAt: new Date().toISOString(),
    })
    
    return true
  },

  /**
   * Update trip with chat room ID
   */
  async updateTripChatRoom(tripId: string, chatRoomId: string): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    await updateDoc(tripRef, { chatRoomId, updatedAt: new Date().toISOString() })
  },

  /**
   * 取消 Trip
   */
  async cancel(tripId: string): Promise<void> {
    return this.updateStatus(tripId, 'CANCELLED')
  },

  /**
   * 刪除 Trip（管理員）
   */
  async delete(tripId: string): Promise<void> {
    await deleteDoc(doc(db, TRIPS_COLLECTION, tripId))
  },

  /**
   * 獲取所有 Trip（管理員）
   */
  async getAll(): Promise<Trip[]> {
    const snapshot = await getDocs(collection(db, TRIPS_COLLECTION))
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip))
  },

  /**
   * 監聽 Trip 更新
   */
  subscribe(tripId: string, callback: (trip: Trip | null) => void): () => void {
    const docRef = doc(db, TRIPS_COLLECTION, tripId)
    return onSnapshot(docRef, (snapshot) => {
      callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Trip : null)
    })
  }
}

// ==================== Chat Room Service ====================

export const chatService = {

  /**
   * 為 Trip 創建聊天室
   */
  async createForTrip(data: {
    tripId: string
    initiatorId: string
    initiatorName: string
    initiatorPhone: string
    initiatorRole: 'driver' | 'passenger'
    topicPickup: string
    topicDropoff: string
    topicTime: string
    topicVehicleType?: 'sedan' | '7seater'
  }): Promise<string> {
    const room = {
      tripId: data.tripId,
      roomType: 'trip' as const,
      participants: [{
        id: data.initiatorId,
        name: data.initiatorName,
        role: data.initiatorRole,
        phone: data.initiatorPhone,
      }],
      topicPickup: data.topicPickup,
      topicDropoff: data.topicDropoff,
      topicTime: data.topicTime,
      topicVehicleType: data.topicVehicleType,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    const docRef = await addDoc(collection(db, CHAT_ROOMS_COLLECTION), room)
    return docRef.id
  },

  /**
   * 加入聊天室
   */
  async join(chatRoomId: string, participant: {
    id: string
    name: string
    role: 'driver' | 'passenger'
    phone: string
  }): Promise<void> {
    const roomRef = doc(db, CHAT_ROOMS_COLLECTION, chatRoomId)
    await updateDoc(roomRef, {
      participants: arrayUnion(participant),
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 獲取聊天室
   */
  async getRoom(chatRoomId: string) {
    const docRef = doc(db, CHAT_ROOMS_COLLECTION, chatRoomId)
    const snapshot = await getDoc(docRef)
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
  },

  /**
   * 獲取 Trip 的聊天室
   */
  async getRoomByTripId(tripId: string) {
    try {
      const q = query(
        collection(db, CHAT_ROOMS_COLLECTION),
        where('tripId', '==', tripId)
      )
      const snapshot = await getDocs(q)
      return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
    } catch (e) {
      console.warn('getRoomByTripId fallback:', e)
      const allDocs = await getDocs(collection(db, CHAT_ROOMS_COLLECTION))
      const room = allDocs.docs.find(d => d.data().tripId === tripId)
      return room ? { id: room.id, ...room.data() } : null
    }
  },

  /**
   * 獲取用戶的所有聊天室
   */
  async getUserRooms(userId: string) {
    try {
      const allDocs = await getDocs(collection(db, CHAT_ROOMS_COLLECTION))
      const rooms: any[] = []
      allDocs.forEach(doc => {
        const data = doc.data()
        if (data.participants?.some((p: any) => p.id === userId)) {
          rooms.push({ id: doc.id, ...data })
        }
      })
      return rooms
    } catch (e) {
      console.error('getUserRooms error:', e)
      return []
    }
  },

  /**
   * 發送訊息
   */
  async sendMessage(data: {
    conversationId: string
    senderId: string
    senderName: string
    senderRole: 'driver' | 'passenger'
    content: string
    messageType?: 'text' | 'image' | 'location' | 'system' | 'price_offer' | 'price_confirmed'
    quoteData?: any
  }): Promise<string> {
    const message: any = {
      conversationId: data.conversationId,
      senderId: data.senderId,
      senderName: data.senderName,
      senderRole: data.senderRole,
      content: data.content,
      messageType: data.messageType || 'text',
      readBy: [data.senderId],
      createdAt: new Date().toISOString(),
    }
    
    if (data.quoteData) {
      message.quoteData = data.quoteData
    }
    
    const docRef = await addDoc(collection(db, CHAT_MESSAGES_COLLECTION), message)
    
    // 更新聊天室最後訊息
    const roomRef = doc(db, CHAT_ROOMS_COLLECTION, data.conversationId)
    await updateDoc(roomRef, {
      lastMessage: data.content,
      lastMessageAt: new Date().toISOString(),
      lastMessageBy: data.senderId,
      updatedAt: new Date().toISOString(),
    })
    
    return docRef.id
  },

  /**
   * 獲取聊天室訊息
   */
  async getMessages(chatRoomId: string) {
    try {
      const q = query(
        collection(db, CHAT_MESSAGES_COLLECTION),
        where('conversationId', '==', chatRoomId),
        orderBy('createdAt', 'asc')
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (e) {
      console.warn('getMessages fallback:', e)
      const allDocs = await getDocs(collection(db, CHAT_MESSAGES_COLLECTION))
      return allDocs.docs
        .filter(d => d.data().conversationId === chatRoomId)
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }
  },

  /**
   * 監聽訊息更新
   */
  subscribeToMessages(chatRoomId: string, callback: (messages: any[]) => void): () => void {
    const q = query(
      collection(db, CHAT_MESSAGES_COLLECTION),
      where('conversationId', '==', chatRoomId),
      orderBy('createdAt', 'asc')
    )
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      callback(messages)
    })
  },

  /**
   * 關閉聊天室
   */
  async closeRoom(chatRoomId: string): Promise<void> {
    const roomRef = doc(db, CHAT_ROOMS_COLLECTION, chatRoomId)
    await updateDoc(roomRef, {
      status: 'closed',
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * Legacy: createTripChatRoom (for backwards compatibility)
   */
  async createTripChatRoom(trip: {
    tripId: string
    driverId: string
    driverName: string
    driverPhone: string
    pickup: string
    dropoff: string
    departureTime: string
  }): Promise<string> {
    return this.createForTrip({
      tripId: trip.tripId,
      initiatorId: trip.driverId,
      initiatorName: trip.driverName,
      initiatorPhone: trip.driverPhone,
      initiatorRole: 'driver',
      topicPickup: trip.pickup,
      topicDropoff: trip.dropoff,
      topicTime: trip.departureTime,
    })
  },

  /**
   * Legacy: getTripRoom (for backwards compatibility)
   */
  async getTripRoom(tripId: string): Promise<string | null> {
    const room = await this.getRoomByTripId(tripId)
    return room?.id || null
  },

  /**
   * Legacy: confirmRide (for backwards compatibility)
   */
  async confirmRide(roomId: string, oderId: string): Promise<void> {
    const roomRef = doc(db, CHAT_ROOMS_COLLECTION, roomId)
    await updateDoc(roomRef, {
      confirmedBy: arrayUnion(oderId),
      updatedAt: new Date().toISOString(),
    })
  },
}

// ==================== Request Service（向後兼容）====================

export const requestService = {
  async create(data: any): Promise<string> {
    // Simple pass-through for backwards compatibility
    const docRef = await addDoc(collection(db, 'passengerRequests'), {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return docRef.id
  },
  async getPublicRequests(): Promise<any[]> { return [] },
  async getByPassenger(passengerId: string): Promise<any[]> { return [] },
  async getById(id: string): Promise<any | null> {
    const snap = await getDoc(doc(db, 'passengerRequests', id))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  },
  async addInterestedDriver(requestId: string, driver: any): Promise<void> {},
  async joinRequest(requestId: string, passenger: any): Promise<void> {},
  async cancel(requestId: string): Promise<void> {},
}
