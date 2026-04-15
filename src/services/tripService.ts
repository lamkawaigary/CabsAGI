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
  arrayUnion
} from 'firebase/firestore'
import { db } from '../firebaseConfig'
import type { Trip, TripStatus, PassengerRequest, RequestStatus } from '../types/trip'

const TRIPS_COLLECTION = 'trips'
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
      where('driverId', '==', driverId),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Trip[]
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
   * 乘客加入行程 (進入聊天室)
   */
  async join(tripId: string, passenger: {
    oderId: string
    name: string
    phone: string
  }): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    await updateDoc(tripRef, {
      passengers: arrayUnion(passenger),
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
   * 更新狀態
   */
  async updateStatus(tripId: string, status: TripStatus): Promise<void> {
    const tripRef = doc(db, TRIPS_COLLECTION, tripId)
    await updateDoc(tripRef, { status, updatedAt: new Date().toISOString() })
  },

  /**
   * 取消行程
   */
  async cancel(tripId: string): Promise<void> {
    return this.updateStatus(tripId, 'CANCELLED')
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


