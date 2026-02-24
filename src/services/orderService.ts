import { addDoc, collection, limit, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export type OrderStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'

export interface OrderRecord {
  id?: string
  pickup: string
  pickupLat: number
  pickupLng: number
  dropoff: string
  dropoffLat: number
  dropoffLng: number
  price: number
  distance: number
  duration: number
  tollFee: number
  status: OrderStatus
  passengerId: string
  passengerName: string
  createdAt: string
  createdAtISO?: string
  updatedAt?: string
}

export interface CreateOrderInput {
  pickup: string
  pickupLat: number
  pickupLng: number
  dropoff: string
  dropoffLat: number
  dropoffLng: number
  price: number
  distance: number
  duration: number
  tollFee: number
  passengerId: string
  passengerName: string
}

const sanitizeValue = (val: any): any => {
  if (val === null || val === undefined) return val
  if (val && typeof val.toDate === 'function') return val.toDate().toISOString()
  if (val && val.path && val.firestore) return val.path
  if (Array.isArray(val)) return val.map(sanitizeValue)
  if (typeof val === 'object') {
    const cleaned: Record<string, any> = {}
    Object.keys(val).forEach((key) => {
      cleaned[key] = sanitizeValue(val[key])
    })
    return cleaned
  }
  return val
}

const sanitizeDoc = (docSnap: any): OrderRecord => {
  const data = docSnap.data() || {}
  const clean: any = { id: docSnap.id }
  Object.keys(data).forEach((key) => {
    clean[key] = sanitizeValue(data[key])
  })

  const toLocationText = (value: any): string => {
    if (typeof value === 'string') return value
    if (!value || typeof value !== 'object') return ''
    return value.placeName || value.address || value.name || ''
  }

  const toNumber = (value: any): number => {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }

  const rawPickup = clean.pickup
  const rawDropoff = clean.dropoff
  clean.pickup = toLocationText(rawPickup)
  clean.dropoff = toLocationText(rawDropoff)
  clean.pickupLat = toNumber(clean.pickupLat ?? rawPickup?.latitude ?? rawPickup?.lat)
  clean.pickupLng = toNumber(clean.pickupLng ?? rawPickup?.longitude ?? rawPickup?.lng)
  clean.dropoffLat = toNumber(clean.dropoffLat ?? rawDropoff?.latitude ?? rawDropoff?.lat)
  clean.dropoffLng = toNumber(clean.dropoffLng ?? rawDropoff?.longitude ?? rawDropoff?.lng)
  clean.price = toNumber(clean.price)
  clean.distance = toNumber(clean.distance)
  clean.duration = toNumber(clean.duration)
  clean.tollFee = toNumber(clean.tollFee)

  clean.status = clean.status || 'pending'
  clean.createdAt = clean.createdAt || clean.createdAtISO || new Date(0).toISOString()
  clean.createdAtISO = clean.createdAtISO || clean.createdAt
  return clean as OrderRecord
}

export const createOrder = async (order: CreateOrderInput) => {
  const nowISO = new Date().toISOString()
  return addDoc(collection(db, 'orders'), {
    ...order,
    status: 'pending',
    createdAt: nowISO,
    createdAtISO: nowISO,
    updatedAt: nowISO,
    createdAtServer: serverTimestamp(),
    updatedAtServer: serverTimestamp(),
  })
}

export const subscribePassengerOrders = (
  uid: string,
  callback: (orders: OrderRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(collection(db, 'orders'), where('passengerId', '==', uid), limit(200))
  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs
        .map((doc) => sanitizeDoc(doc))
        .sort((a, b) => new Date(b.createdAtISO || b.createdAt || 0).getTime() - new Date(a.createdAtISO || a.createdAt || 0).getTime())
      callback(orders)
    },
    (error) => {
      if (onError) onError(error as Error)
    },
  )
}
