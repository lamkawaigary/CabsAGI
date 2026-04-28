// Cabs Carpool - Trip Service (Simplified)
// Version: 3.0
// 核心理念：Trip/Request 只是聊天話題的起點

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
  arrayUnion
} from 'firebase/firestore'
import { db } from '../firebaseConfig'
import type { Trip, TripStatus, PassengerRequest, RequestStatus } from '../types/trip'

export const TRIPS_COLLECTION = 'trips'
const REQUESTS_COLLECTION = 'passengerRequests'

// ==================== Trip Service (司機行程) ====================

export const tripService = {

  /**
   * 司機發佈行程 (作為聊天話題)
   */
  async create(tripData: {
    driverId: string
    driverName: string
    driverPhone: string
    pickup: { placeName: string; latitude: number; longitude: number }
    dropoff: { placeName: string; latitude: number; longitude: number }
    departureTime: string
    totalSeats: number
    notes?: string
  }): Promise<string> {
    const trip = {
      driverId: tripData.driverId,
      driverName: tripData.driverName,
      driverPhone: tripData.driverPhone,
      route: {
        pickup: tripData.pickup,
        dropoff: tripData.dropoff,
      },
      departureTime: tripData.departureTime,
      totalSeats: tripData.totalSeats,
      passengers: [],
      status: 'OPEN' as TripStatus,
      confirmedByDriver: false,
      confirmedByPassengers: [],
      notes: tripData.notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    const docRef = await addDoc(collection(db, TRIPS_COLLECTION), trip)
    return docRef.id
  },

  /**
   * 獲取所有公開行程 (乘客瀏覽)
   */
  async getPublicTrips(): Promise<Trip[]> {
    let q = query(
      collection(db, TRIPS_COLLECTION),
      where('status', '==', 'OPEN')
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Trip[]
  },

  /**
   * 獲取司機的行程
   */
  async getByDriver(driverId: string): Promise<Trip[]> {
    const q = query(
      collection(db, TRIPS_COLLECTION),
      where('driverId', '==', driverId)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Trip[]
  },

  /**
   * 獲取乘客參與的行程（所有狀態）
   */
  async getByPassenger(passengerId: string): Promise<Trip[]> {
    try {
      // Get all trips and filter client-side
      // This works because Firestore allows reading own trips
      const allDocs = await getDocs(collection(db, TRIPS_COLLECTION))
      
      if (allDocs.docs.length === 0) {
        return []
      }
      
      const trips: Trip[] = []
      allDocs.forEach(doc => {
        const data = doc.data()
        const isPassenger = data.passengers?.some((p: any) => p.oderId === passengerId)
        const isPending = data.pendingPassengers?.some((p: any) => p.oderId === passengerId)
        
        if (isPassenger || isPending) {
          trips.push({ id: doc.id, ...data } as Trip)
        }
      })
      
      return trips
    } catch (error: any) {
      console.error('Error getting passenger trips:', error)
      return []
    }
  },

  /**
   * 獲取單個行程
   */
  async getById(id: string): Promise<Trip | null> {
    const docRef = doc(db, TRIPS_COLLECTION, id)
    const snapshot = await getDoc(docRef)
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Trip : null
  },

  /**
   * 更新行程
   */
  async update(id: string, data: Partial<{
    pickup: { placeName: string; latitude: number; longitude: number }
    dropoff: { placeName: string; latitude: number; longitude: number }
    departureTime: string
    totalSeats: number
    pricePerSeat: number
    notes: string
  }>): Promise<void> {
    const docRef = doc(db, TRIPS_COLLECTION, id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 乘客申請加入行程 (加入待批准名單)
   */
  async requestJoin(tripId: string, passenger: {
    oderId: string
    name: string
    phone: string
  }): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    const userRef = doc(db, 'users', passenger.oderId)
    
    // Add to trip's pendingPassengers
    await updateDoc(tripRef, {
      pendingPassengers: arrayUnion({
        ...passenger,
        joinedAt: new Date().toISOString()
      }),
      updatedAt: new Date().toISOString(),
    })
    
    // Also add tripId to user's trips array for easier lookup
    await updateDoc(userRef, {
      joinedTrips: arrayUnion(tripId),
      updatedAt: new Date().toISOString(),
    }).catch(() => {
      // User document might not exist yet, ignore error
    })
  },

  /**
   * 司機批准乘客加入
   */
  async approvePassenger(tripId: string, oderId: string): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    // Get the pending passenger data
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    
    const pending = trip.pendingPassengers?.find(p => p.oderId === oderId)
    if (!pending) throw new Error('Passenger not found in pending list')
    
    // Move from pending to passengers, decrease availableSeats
    await updateDoc(tripRef, {
      pendingPassengers: trip.pendingPassengers?.filter(p => p.oderId !== oderId) || [],
      passengers: arrayUnion({
        oderId: pending.oderId,
        name: pending.name,
        phone: pending.phone,
        confirmed: false,
        onboarded: false,
      }),
      availableSeats: (trip.availableSeats || trip.totalSeats) - 1,
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 司機拒絕乘客加入
   */
  async rejectPassenger(tripId: string, oderId: string): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    
    await updateDoc(tripRef, {
      pendingPassengers: trip.pendingPassengers?.filter(p => p.oderId !== oderId) || [],
      rejectedPassengers: arrayUnion(oderId),
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 確認共乘
   */
  async confirm(tripId: string, oderId: string): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    await updateDoc(tripRef, {
      confirmedByPassengers: arrayUnion(oderId),
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 更新狀態 (包括 IN_PROGRESS)
   */
  async updateStatus(tripId: string, status: TripStatus): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    await updateDoc(tripRef, { status, updatedAt: new Date().toISOString() })
  },

  /**
   * 乘客主動離開行程（行程開始前）
   */
  async passengerLeave(tripId: string, oderId: string): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    
    // Only allow leaving if trip hasn't started
    if (trip.status === 'IN_PROGRESS' || trip.status === 'COMPLETED') {
      throw new Error('Cannot leave during or after trip')
    }
    
    // Remove from passengers list
    const updatedPassengers = trip.passengers?.filter(p => p.oderId !== oderId) || []
    
    await updateDoc(tripRef, {
      passengers: updatedPassengers,
      availableSeats: (trip.availableSeats || trip.totalSeats) + 1,
      // Add to leftPassengers record for history
      leftPassengers: arrayUnion({
        oderId,
        leftAt: new Date().toISOString(),
        reason: 'passenger_left'
      }),
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 司機標記乘客未到
   */
  async markPassengerNoShow(tripId: string, oderId: string): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    
    // Only allow after trip starts
    if (trip.status !== 'IN_PROGRESS' && trip.status !== 'COMPLETED') {
      throw new Error('Can only mark no-show after trip starts')
    }
    
    // Update passenger's onboarded status to false
    const updatedPassengers = trip.passengers?.map(p => 
      p.oderId === oderId ? { ...p, onboarded: false } : p
    ) || []
    
    await updateDoc(tripRef, {
      passengers: updatedPassengers,
      noShowPassengers: arrayUnion({
        oderId,
        markedAt: new Date().toISOString(),
        markedBy: trip.driverId
      }),
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 司機標記乘客已上車
   */
  async markPassengerOnboarded(tripId: string, oderId: string): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    
    // Only allow during trip
    if (trip.status !== 'IN_PROGRESS') {
      throw new Error('Can only mark onboarded during trip')
    }
    
    // Update passenger's onboarded status to true
    const updatedPassengers = trip.passengers?.map(p => 
      p.oderId === oderId ? { ...p, onboarded: true } : p
    ) || []
    
    await updateDoc(tripRef, {
      passengers: updatedPassengers,
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 生成乘客 QR 驗證碼
   */
  async generateQRCode(tripId: string, oderId: string, oderName: string): Promise<string> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    
    // Generate 4-digit code
    const code = Math.random().toString().slice(2, 6)
    const expiry = new Date()
    expiry.setHours(expiry.getHours() + 24) // 24小時過期
    
    // Update passenger's qrCode
    const updatedPassengers = trip.passengers?.map(p => {
      if (p.oderId !== oderId) return p
      return {
        ...p,
        qrCode: code,
        qrCodeExpiry: expiry.toISOString()
      }
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
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    const trip = await this.getById(tripId)
    if (!trip) throw new Error('Trip not found')
    
    if (trip.status !== 'IN_PROGRESS') {
      throw new Error('行程尚未開始，無法驗證上車')
    }
    
    // Find passenger with this QR code
    const passenger = trip.passengers?.find(p => (p as any).qrCode === code)
    if (!passenger) {
      throw new Error('驗證碼無效')
    }
    
    // Check if already onboarded
    if ((passenger as any).onboarded) {
      throw new Error('乘客已標記上車')
    }
    
    // Check expiry
    if ((passenger as any).qrCodeExpiry && new Date((passenger as any).qrCodeExpiry) < new Date()) {
      throw new Error('驗證碼已過期')
    }
    
    // Mark as onboarded
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
   * 取消行程
   */
  async cancel(tripId: string): Promise<void> {
    return this.updateStatus(tripId, 'CANCELLED')
  },

  /**
   * 刪除行程（管理員用）
   */
  async delete(tripId: string): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    await deleteDoc(tripRef)
  },

  /**
   * 獲取所有行程（管理員用）
   */
  async getAll(): Promise<Trip[]> {
    try {
      const snapshot = await getDocs(collection(db, TRIPS_COLLECTION))
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip))
    } catch (e) {
      console.error('Error getting all trips:', e)
      return []
    }
  },

  /**
   * 監聽行程更新
   */
  subscribe(tripId: string, callback: (trip: Trip | null) => void): () => void {
    const docRef = doc(db, TRIPS_COLLECTION, tripId)
    return onSnapshot(docRef, (snapshot) => {
      callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Trip : null)
    })
  }
}

// ==================== Request Service (乘客需求) ====================

export const requestService = {

  /**
   * 乘客發佈需求 (作為聊天話題)
   */
  async create(data: {
    passengerId: string
    passengerName: string
    passengerPhone: string
    pickup: { placeName: string; latitude: number; longitude: number }
    dropoff: { placeName: string; latitude: number; longitude: number }
    departureDate: string
    passengerCount: number
    vehicleType?: 'sedan' | '7seater'
    isCarpool?: boolean
    notes?: string
  }): Promise<string> {
    const request = {
      passengerId: data.passengerId,
      passengerName: data.passengerName,
      passengerPhone: data.passengerPhone,
      pickup: data.pickup,
      dropoff: data.dropoff,
      departureDate: data.departureDate,
      passengerCount: data.passengerCount,
      vehicleType: data.vehicleType || 'sedan',
      isCarpool: data.isCarpool !== undefined ? data.isCarpool : true,
      interestedDrivers: [],
      joinedPassengers: [],
      status: 'OPEN' as RequestStatus,
      notes: data.notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), request)
    return docRef.id
  },

  /**
   * 獲取所有公開需求
   */
  async getPublicRequests(): Promise<PassengerRequest[]> {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('status', '==', 'OPEN')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PassengerRequest[]
  },

  /**
   * 獲取乘客的需求
   */
  async getByPassenger(passengerId: string): Promise<PassengerRequest[]> {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('passengerId', '==', passengerId)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PassengerRequest[]
  },

  /**
   * 獲取單個需求
   */
  async getById(id: string): Promise<PassengerRequest | null> {
    const docRef = doc(db, REQUESTS_COLLECTION, id)
    const snapshot = await getDoc(docRef)
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as PassengerRequest : null
  },

  /**
   * 司機表示有興趣
   */
  async addInterestedDriver(requestId: string, driver: {
    driverId: string
    driverName: string
    driverPhone: string
  }): Promise<void> {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId)
    await updateDoc(requestRef, {
      interestedDrivers: arrayUnion(driver),
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 其他乘客加入
   */
  async joinRequest(requestId: string, passenger: {
    oderId: string
    name: string
    phone: string
  }): Promise<void> {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId)
    await updateDoc(requestRef, {
      joinedPassengers: arrayUnion(passenger),
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 取消需求
   */
  async cancel(requestId: string): Promise<void> {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId)
    await updateDoc(requestRef, {
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    })
  }
}


