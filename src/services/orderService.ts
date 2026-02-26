import {
  addDoc,
  collection,
  type DocumentData,
  doc,
  increment,
  limit,
  onSnapshot,
  query,
  type QueryDocumentSnapshot,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from '../firebaseConfig'

export type OrderStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
export type OrderType = 'charter' | 'official_route'
export type OfficialRouteStatus =
  | 'collecting'
  | 'confirmed'
  | 'dispatching'
  | 'active'
  | 'completed'
  | 'cancelled'

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
  orderType?: OrderType
  passengersCount?: number
  vehicleType?: string
  bookingDateTime?: string
  officialRouteId?: string
  isOfficial?: boolean
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
  orderType?: OrderType
  passengersCount?: number
  vehicleType?: string
  bookingDateTime?: string
  officialRouteId?: string
  isOfficial?: boolean
}

export interface OfficialRouteRecord {
  id: string
  pickup: string
  pickupLat: number
  pickupLng: number
  dropoff: string
  dropoffLat: number
  dropoffLng: number
  date: string
  status: OfficialRouteStatus
  totalSeats: number
  occupiedSeats: number
  pricePerSeat: number
  charterPrice: number
  createdAt: string
}

const ORDER_STATUS_VALUES: OrderStatus[] = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled']
const ORDER_TYPE_VALUES: OrderType[] = ['charter', 'official_route']
const OFFICIAL_ROUTE_STATUS_VALUES: OfficialRouteStatus[] = [
  'collecting',
  'confirmed',
  'dispatching',
  'active',
  'completed',
  'cancelled',
]

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

const toLocationText = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (!isRecord(value)) return ''
  return firstString(value.placeName, value.address, value.name)
}

const normalizeOrderType = (value: unknown, fallbackToOfficial = false): OrderType => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'carpool') return 'official_route'
    if (normalized === 'charter') return 'charter'
    if (ORDER_TYPE_VALUES.includes(normalized as OrderType)) return normalized as OrderType
  }
  return fallbackToOfficial ? 'official_route' : 'charter'
}

const normalizeOfficialRouteStatus = (value: unknown): OfficialRouteStatus => {
  if (typeof value !== 'string') return 'collecting'
  const normalized = value.trim().toLowerCase()
  if (OFFICIAL_ROUTE_STATUS_VALUES.includes(normalized as OfficialRouteStatus)) {
    return normalized as OfficialRouteStatus
  }
  return 'collecting'
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
  const isOfficial = Boolean(clean.isOfficial) || typeof clean.officialRouteId === 'string'
  const orderType = normalizeOrderType(clean.orderType ?? clean.type, isOfficial)
  const passengersCount = Math.max(1, Math.round(pickNumber(clean.passengersCount, clean.passengers)))
  const vehicleType = firstString(clean.vehicleType, clean.carType)
  const bookingDateTime = firstString(clean.bookingDateTime, clean.date, clean.bookingTime)
  const officialRouteId = typeof clean.officialRouteId === 'string' ? clean.officialRouteId : undefined
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
    orderType,
    passengersCount,
    vehicleType: vehicleType || undefined,
    bookingDateTime: bookingDateTime || undefined,
    officialRouteId,
    isOfficial: isOfficial || orderType === 'official_route',
    createdAt,
    createdAtISO,
    updatedAt,
  }
}

const sanitizeOfficialRouteDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): OfficialRouteRecord => {
  const data = docSnap.data() || {}
  const clean: Record<string, unknown> = { id: docSnap.id }
  Object.keys(data).forEach((key) => {
    clean[key] = sanitizeValue(data[key])
  })

  const pickupObj = isRecord(clean.pickup) ? clean.pickup : undefined
  const dropoffObj = isRecord(clean.dropoff) ? clean.dropoff : undefined

  return {
    id: docSnap.id,
    pickup: toLocationText(clean.pickup),
    pickupLat: pickNumber(clean.pickupLat, pickupObj?.latitude, pickupObj?.lat),
    pickupLng: pickNumber(clean.pickupLng, pickupObj?.longitude, pickupObj?.lng),
    dropoff: toLocationText(clean.dropoff),
    dropoffLat: pickNumber(clean.dropoffLat, dropoffObj?.latitude, dropoffObj?.lat),
    dropoffLng: pickNumber(clean.dropoffLng, dropoffObj?.longitude, dropoffObj?.lng),
    date: firstString(clean.date, clean.bookingDateTime, clean.createdAt, new Date().toISOString()),
    status: normalizeOfficialRouteStatus(clean.status),
    totalSeats: Math.max(1, Math.round(pickNumber(clean.totalSeats, clean.seats, 6))),
    occupiedSeats: Math.max(0, Math.round(pickNumber(clean.occupiedSeats, clean.bookedSeats))),
    pricePerSeat: Math.max(0, pickNumber(clean.pricePerSeat, clean.price)),
    charterPrice: Math.max(0, pickNumber(clean.charterPrice, clean.price)),
    createdAt: firstString(clean.createdAt, clean.date, new Date().toISOString()),
  }
}

export const createOrder = async (order: CreateOrderInput) => {
  const nowISO = new Date().toISOString()
  const orderType = order.orderType || 'charter'
  const passengersCount = Math.max(1, Math.round(order.passengersCount || 1))
  const bookingDateTime = firstString(order.bookingDateTime, nowISO)

  return addDoc(collection(db, 'orders'), {
    ...order,
    status: 'pending',
    orderType,
    passengersCount,
    vehicleType: firstString(order.vehicleType, 'standard'),
    bookingDateTime,
    isOfficial: orderType === 'official_route' || Boolean(order.isOfficial),
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

export const subscribeOfficialRoutes = (
  callback: (routes: OfficialRouteRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(collection(db, 'official_routes'), limit(200))
  return onSnapshot(
    q,
    (snapshot) => {
      const routes = snapshot.docs
        .map((docSnap) => sanitizeOfficialRouteDoc(docSnap))
        .filter((route) => route.status !== 'completed' && route.status !== 'cancelled')
        .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
      callback(routes)
    },
    (error) => {
      if (onError) onError(error as Error)
    },
  )
}

export const joinOfficialRoute = async (params: {
  routeId: string
  seats: number
  passengerId: string
  passengerName: string
}) => {
  const seats = Math.max(1, Math.round(params.seats || 1))
  const nowISO = new Date().toISOString()

  await runTransaction(db, async (tx) => {
    const routeRef = doc(db, 'official_routes', params.routeId)
    const routeSnap = await tx.get(routeRef)
    if (!routeSnap.exists()) {
      throw new Error('官方班次不存在')
    }

    const routeData = routeSnap.data() || {}
    const routeStatus = normalizeOfficialRouteStatus(routeData.status)
    if (routeStatus === 'completed' || routeStatus === 'cancelled') {
      throw new Error('該班次已不可預訂')
    }

    const totalSeats = Math.max(1, Math.round(pickNumber(routeData.totalSeats, routeData.seats, 6)))
    const occupiedSeats = Math.max(0, Math.round(pickNumber(routeData.occupiedSeats, routeData.bookedSeats)))
    const availableSeats = Math.max(0, totalSeats - occupiedSeats)
    if (seats > availableSeats) {
      throw new Error(`可用座位不足，剩餘 ${availableSeats} 位`)
    }

    const pickupObj = isRecord(routeData.pickup) ? routeData.pickup : undefined
    const dropoffObj = isRecord(routeData.dropoff) ? routeData.dropoff : undefined
    const pricePerSeat = Math.max(0, pickNumber(routeData.pricePerSeat, routeData.price))
    const orderRef = doc(collection(db, 'orders'))

    tx.update(routeRef, {
      occupiedSeats: increment(seats),
      updatedAt: nowISO,
      updatedAtServer: serverTimestamp(),
    })

    tx.set(orderRef, {
      pickup: toLocationText(routeData.pickup),
      pickupLat: pickNumber(routeData.pickupLat, pickupObj?.latitude, pickupObj?.lat),
      pickupLng: pickNumber(routeData.pickupLng, pickupObj?.longitude, pickupObj?.lng),
      dropoff: toLocationText(routeData.dropoff),
      dropoffLat: pickNumber(routeData.dropoffLat, dropoffObj?.latitude, dropoffObj?.lat),
      dropoffLng: pickNumber(routeData.dropoffLng, dropoffObj?.longitude, dropoffObj?.lng),
      price: Math.max(0, Math.round(pricePerSeat * seats)),
      distance: pickNumber(routeData.distance),
      duration: pickNumber(routeData.duration),
      tollFee: pickNumber(routeData.tollFee),
      passengerId: params.passengerId,
      passengerName: params.passengerName,
      status: 'pending',
      orderType: 'official_route',
      passengersCount: seats,
      vehicleType: 'official_shared',
      bookingDateTime: firstString(routeData.date, nowISO),
      officialRouteId: params.routeId,
      isOfficial: true,
      createdAt: nowISO,
      createdAtISO: nowISO,
      updatedAt: nowISO,
      createdAtServer: serverTimestamp(),
      updatedAtServer: serverTimestamp(),
    })
  })
}
