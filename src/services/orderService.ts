import {
  addDoc,
  collection,
  type DocumentData,
  limit,
  onSnapshot,
  query,
  type QueryDocumentSnapshot,
  serverTimestamp,
  where,
} from 'firebase/firestore'
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

const ORDER_STATUS_VALUES: OrderStatus[] = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled']

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

const isTimestampLike = (val: unknown): val is { toDate: () => Date } =>
  isRecord(val) && typeof val.toDate === 'function'

const isDocumentRefLike = (val: unknown): val is { path: string; firestore: unknown } =>
  isRecord(val) && typeof val.path === 'string' && 'firestore' in val

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const pickNumber = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = toFiniteNumber(value)
    if (parsed !== null) return parsed
  }
  return 0
}

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

const sanitizeValue = (val: unknown): unknown => {
  if (val === null || val === undefined) return val
  if (isTimestampLike(val)) return val.toDate().toISOString()
  if (isDocumentRefLike(val)) return val.path
  if (Array.isArray(val)) return val.map(sanitizeValue)
  if (isRecord(val)) {
    const cleaned: Record<string, unknown> = {}
    Object.keys(val).forEach((key) => {
      cleaned[key] = sanitizeValue(val[key])
    })
    return cleaned
  }
  return val
}

const sanitizeDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): OrderRecord => {
  const data = docSnap.data() || {}
  const clean: Record<string, unknown> = { id: docSnap.id }
  Object.keys(data).forEach((key) => {
    clean[key] = sanitizeValue(data[key])
  })

  const toLocationText = (value: unknown): string => {
    if (typeof value === 'string') return value
    if (!isRecord(value)) return ''
    return firstString(value.placeName, value.address, value.name)
  }

  const rawPickup = clean.pickup
  const rawDropoff = clean.dropoff
  const pickupObj = isRecord(rawPickup) ? rawPickup : undefined
  const dropoffObj = isRecord(rawDropoff) ? rawDropoff : undefined

  clean.pickup = toLocationText(rawPickup)
  clean.dropoff = toLocationText(rawDropoff)
  clean.pickupLat = pickNumber(clean.pickupLat, pickupObj?.latitude, pickupObj?.lat)
  clean.pickupLng = pickNumber(clean.pickupLng, pickupObj?.longitude, pickupObj?.lng)
  clean.dropoffLat = pickNumber(clean.dropoffLat, dropoffObj?.latitude, dropoffObj?.lat)
  clean.dropoffLng = pickNumber(clean.dropoffLng, dropoffObj?.longitude, dropoffObj?.lng)
  clean.price = pickNumber(clean.price)
  clean.distance = pickNumber(clean.distance)
  clean.duration = pickNumber(clean.duration)
  clean.tollFee = pickNumber(clean.tollFee)

  const status = ORDER_STATUS_VALUES.includes(clean.status as OrderStatus)
    ? (clean.status as OrderStatus)
    : 'pending'
  const createdAt =
    typeof clean.createdAt === 'string'
      ? clean.createdAt
      : typeof clean.createdAtISO === 'string'
        ? clean.createdAtISO
        : new Date(0).toISOString()
  const createdAtISO = typeof clean.createdAtISO === 'string' ? clean.createdAtISO : createdAt
  const updatedAt = typeof clean.updatedAt === 'string' ? clean.updatedAt : undefined

  return {
    id: docSnap.id,
    pickup: typeof clean.pickup === 'string' ? clean.pickup : '',
    pickupLat: pickNumber(clean.pickupLat),
    pickupLng: pickNumber(clean.pickupLng),
    dropoff: typeof clean.dropoff === 'string' ? clean.dropoff : '',
    dropoffLat: pickNumber(clean.dropoffLat),
    dropoffLng: pickNumber(clean.dropoffLng),
    price: pickNumber(clean.price),
    distance: pickNumber(clean.distance),
    duration: pickNumber(clean.duration),
    tollFee: pickNumber(clean.tollFee),
    status,
    passengerId: typeof clean.passengerId === 'string' ? clean.passengerId : '',
    passengerName: typeof clean.passengerName === 'string' ? clean.passengerName : '',
    createdAt,
    createdAtISO,
    updatedAt,
  }
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
