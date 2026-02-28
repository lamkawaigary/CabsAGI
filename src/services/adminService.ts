import {
  addDoc,
  collection,
  doc,
  type DocumentData,
  limit,
  onSnapshot,
  query,
  type QueryDocumentSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth, db } from '../firebaseConfig'
import {
  acceptOrderAsDriver,
  canTransitionOrderStatus,
} from './orderService'
import type {
  OfficialRouteRecord,
  OfficialRouteStatus,
  OrderRecord,
  OrderStatus,
  OrderType,
} from './orderService'

export type AdminUserRole = 'passenger' | 'driver' | 'admin'

export interface AdminUserRecord {
  id: string
  name: string
  phone: string
  email: string
  role: AdminUserRole
  points: number
  createdAt: string
  updatedAt?: string
  status?: string
}

export interface PricingConfigRecord {
  activeSystem: 'matrix' | 'distance' | 'fixed-point'
  minSpend: number
  tier1Rate: number
  tier2Rate: number
  tier3Rate: number
  midnightSurcharge: number
  driverFeePercentage: number
  updatedAt: string
}

export interface UpsertOfficialRouteInput {
  id?: string
  pickup: string
  pickupLat: number
  pickupLng: number
  dropoff: string
  dropoffLat: number
  dropoffLng: number
  date: string
  totalSeats: number
  pricePerSeat: number
  charterPrice: number
  status?: OfficialRouteStatus
}

const ORDER_STATUS_VALUES: OrderStatus[] = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled']
const ORDER_TYPE_VALUES: OrderType[] = ['charter', 'official_route']
const USER_ROLE_VALUES: AdminUserRole[] = ['passenger', 'driver', 'admin']
const OFFICIAL_ROUTE_STATUS_VALUES: OfficialRouteStatus[] = [
  'collecting',
  'confirmed',
  'dispatching',
  'active',
  'completed',
  'cancelled',
]

const DEFAULT_PRICING_CONFIG: PricingConfigRecord = {
  activeSystem: 'distance',
  minSpend: 80,
  tier1Rate: 10,
  tier2Rate: 8,
  tier3Rate: 6,
  midnightSurcharge: 0,
  driverFeePercentage: 0.08,
  updatedAt: new Date(0).toISOString(),
}

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

const toCleanRecord = (docSnap: QueryDocumentSnapshot<DocumentData>) => {
  const data = docSnap.data() || {}
  const clean: Record<string, unknown> = { id: docSnap.id }
  Object.keys(data).forEach((key) => {
    clean[key] = sanitizeValue(data[key])
  })
  return clean
}

const sanitizeOrderDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): OrderRecord => {
  const clean = toCleanRecord(docSnap)
  const rawPickup = clean.pickup
  const rawDropoff = clean.dropoff
  const pickupObj = isRecord(rawPickup) ? rawPickup : undefined
  const dropoffObj = isRecord(rawDropoff) ? rawDropoff : undefined
  const isOfficial = Boolean(clean.isOfficial) || typeof clean.officialRouteId === 'string'

  const rawOrderType =
    typeof clean.orderType === 'string'
      ? clean.orderType.toLowerCase()
      : typeof clean.type === 'string'
        ? clean.type.toLowerCase()
        : ''
  const orderType: OrderType =
    rawOrderType === 'carpool'
      ? 'official_route'
      : ORDER_TYPE_VALUES.includes(rawOrderType as OrderType)
        ? (rawOrderType as OrderType)
        : isOfficial
          ? 'official_route'
          : 'charter'

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

  return {
    id: docSnap.id,
    pickup: toLocationText(rawPickup),
    pickupLat: pickNumber(clean.pickupLat, pickupObj?.latitude, pickupObj?.lat),
    pickupLng: pickNumber(clean.pickupLng, pickupObj?.longitude, pickupObj?.lng),
    dropoff: toLocationText(rawDropoff),
    dropoffLat: pickNumber(clean.dropoffLat, dropoffObj?.latitude, dropoffObj?.lat),
    dropoffLng: pickNumber(clean.dropoffLng, dropoffObj?.longitude, dropoffObj?.lng),
    price: pickNumber(clean.price),
    distance: pickNumber(clean.distance),
    duration: pickNumber(clean.duration),
    tollFee: pickNumber(clean.tollFee),
    status,
    passengerId: typeof clean.passengerId === 'string' ? clean.passengerId : '',
    passengerName: typeof clean.passengerName === 'string' ? clean.passengerName : '',
    driverId: typeof clean.driverId === 'string' ? clean.driverId : undefined,
    driverName: typeof clean.driverName === 'string' ? clean.driverName : undefined,
    orderType,
    passengersCount: Math.max(1, Math.round(pickNumber(clean.passengersCount, clean.passengers))),
    vehicleType: firstString(clean.vehicleType, clean.carType) || undefined,
    bookingDateTime: firstString(clean.bookingDateTime, clean.date) || undefined,
    officialRouteId: typeof clean.officialRouteId === 'string' ? clean.officialRouteId : undefined,
    isOfficial: isOfficial || orderType === 'official_route',
    createdAt,
    createdAtISO,
    acceptedAt: typeof clean.acceptedAt === 'string' ? clean.acceptedAt : undefined,
    completedAt: typeof clean.completedAt === 'string' ? clean.completedAt : undefined,
    cancelledAt: typeof clean.cancelledAt === 'string' ? clean.cancelledAt : undefined,
    updatedAt: typeof clean.updatedAt === 'string' ? clean.updatedAt : undefined,
  }
}

const sanitizeUserDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): AdminUserRecord => {
  const clean = toCleanRecord(docSnap)
  const rawRole = typeof clean.role === 'string' ? clean.role.toLowerCase() : ''
  const role = USER_ROLE_VALUES.includes(rawRole as AdminUserRole)
    ? (rawRole as AdminUserRole)
    : 'passenger'
  return {
    id: docSnap.id,
    name: firstString(clean.name, '未命名用戶'),
    phone: firstString(clean.phone),
    email: firstString(clean.email),
    role,
    points: pickNumber(clean.points),
    createdAt: firstString(clean.createdAt, new Date(0).toISOString()),
    updatedAt: firstString(clean.updatedAt) || undefined,
    status: firstString(clean.status) || undefined,
  }
}

const sanitizeOfficialRouteDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): OfficialRouteRecord => {
  const clean = toCleanRecord(docSnap)
  const pickupObj = isRecord(clean.pickup) ? clean.pickup : undefined
  const dropoffObj = isRecord(clean.dropoff) ? clean.dropoff : undefined
  const rawStatus = typeof clean.status === 'string' ? clean.status.toLowerCase() : ''
  const status = OFFICIAL_ROUTE_STATUS_VALUES.includes(rawStatus as OfficialRouteStatus)
    ? (rawStatus as OfficialRouteStatus)
    : 'collecting'

  return {
    id: docSnap.id,
    pickup: toLocationText(clean.pickup),
    pickupLat: pickNumber(clean.pickupLat, pickupObj?.latitude, pickupObj?.lat),
    pickupLng: pickNumber(clean.pickupLng, pickupObj?.longitude, pickupObj?.lng),
    dropoff: toLocationText(clean.dropoff),
    dropoffLat: pickNumber(clean.dropoffLat, dropoffObj?.latitude, dropoffObj?.lat),
    dropoffLng: pickNumber(clean.dropoffLng, dropoffObj?.longitude, dropoffObj?.lng),
    date: firstString(clean.date, clean.bookingDateTime, new Date(0).toISOString()),
    status,
    totalSeats: Math.max(1, Math.round(pickNumber(clean.totalSeats, clean.seats, 6))),
    occupiedSeats: Math.max(0, Math.round(pickNumber(clean.occupiedSeats, clean.bookedSeats))),
    pricePerSeat: Math.max(0, pickNumber(clean.pricePerSeat, clean.price)),
    charterPrice: Math.max(0, pickNumber(clean.charterPrice, clean.price)),
    createdAt: firstString(clean.createdAt, new Date(0).toISOString()),
  }
}

const sanitizePricingConfig = (raw: unknown): PricingConfigRecord => {
  if (!isRecord(raw)) return DEFAULT_PRICING_CONFIG
  const activeSystem =
    raw.activeSystem === 'matrix' || raw.activeSystem === 'distance' || raw.activeSystem === 'fixed-point'
      ? raw.activeSystem
      : DEFAULT_PRICING_CONFIG.activeSystem
  return {
    activeSystem,
    minSpend: pickNumber(raw.minSpend, DEFAULT_PRICING_CONFIG.minSpend),
    tier1Rate: pickNumber(raw.tier1Rate, DEFAULT_PRICING_CONFIG.tier1Rate),
    tier2Rate: pickNumber(raw.tier2Rate, DEFAULT_PRICING_CONFIG.tier2Rate),
    tier3Rate: pickNumber(raw.tier3Rate, DEFAULT_PRICING_CONFIG.tier3Rate),
    midnightSurcharge: pickNumber(raw.midnightSurcharge, DEFAULT_PRICING_CONFIG.midnightSurcharge),
    driverFeePercentage: pickNumber(raw.driverFeePercentage, DEFAULT_PRICING_CONFIG.driverFeePercentage),
    updatedAt: firstString(raw.updatedAt, DEFAULT_PRICING_CONFIG.updatedAt),
  }
}

export const subscribeAdminOrders = (
  callback: (orders: OrderRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(collection(db, 'orders'), limit(500))
  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs
        .map((docSnap) => sanitizeOrderDoc(docSnap))
        .sort(
          (a, b) =>
            new Date(b.createdAtISO || b.createdAt || 0).getTime() -
            new Date(a.createdAtISO || a.createdAt || 0).getTime(),
        )
      callback(orders)
    },
    (error) => onError?.(error as Error),
  )
}

export const subscribeAdminUsers = (
  callback: (users: AdminUserRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(collection(db, 'users'), limit(500))
  return onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs
        .map((docSnap) => sanitizeUserDoc(docSnap))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      callback(users)
    },
    (error) => onError?.(error as Error),
  )
}

export const subscribeAdminOfficialRoutes = (
  callback: (routes: OfficialRouteRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(collection(db, 'official_routes'), limit(300))
  return onSnapshot(
    q,
    (snapshot) => {
      const routes = snapshot.docs
        .map((docSnap) => sanitizeOfficialRouteDoc(docSnap))
        .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
      callback(routes)
    },
    (error) => onError?.(error as Error),
  )
}

export const subscribePricingConfig = (
  callback: (config: PricingConfigRecord) => void,
  onError?: (error: Error) => void,
) =>
  onSnapshot(
    doc(db, 'config', 'pricing'),
    (snap) => {
      callback(sanitizePricingConfig(snap.exists() ? snap.data() : null))
    },
    (error) => onError?.(error as Error),
  )

export const updateAdminOrderStatus = async (params: {
  orderId: string
  status: OrderStatus
  fromStatus?: OrderStatus
  force?: boolean
}) => {
  if (
    !params.force &&
    params.fromStatus &&
    params.fromStatus !== params.status &&
    !canTransitionOrderStatus(params.fromStatus, params.status)
  ) {
    throw new Error(`狀態不可由 ${params.fromStatus} 轉為 ${params.status}`)
  }

  const nowISO = new Date().toISOString()
  const payload: Record<string, unknown> = {
    status: params.status,
    updatedAt: nowISO,
    updatedAtServer: serverTimestamp(),
  }
  if (params.status === 'accepted') payload.acceptedAt = nowISO
  if (params.status === 'completed') payload.completedAt = nowISO
  if (params.status === 'cancelled') payload.cancelledAt = nowISO
  await updateDoc(doc(db, 'orders', params.orderId), payload)
}

export const assignOrderToDriverByAdmin = async (params: {
  orderId: string
  driverId: string
  driverName?: string
}) => {
  await acceptOrderAsDriver({
    orderId: params.orderId,
    driverId: params.driverId,
    driverName: params.driverName,
  })
}

export const updateAdminUser = async (params: {
  userId: string
  role?: AdminUserRole
  points?: number
  status?: string
}) => {
  const payload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
    updatedAtServer: serverTimestamp(),
  }
  if (params.role) payload.role = params.role
  if (typeof params.points === 'number' && Number.isFinite(params.points)) {
    payload.points = params.points
  }
  if (typeof params.status === 'string' && params.status.trim()) {
    payload.status = params.status.trim()
  }
  await updateDoc(doc(db, 'users', params.userId), payload)
}

export const resetUserPassword = async (email: string) => {
  if (!email || !email.includes('@')) {
    throw new Error('無效的 email 地址')
  }
  await sendPasswordResetEmail(auth, email)
}

export const upsertOfficialRoute = async (input: UpsertOfficialRouteInput) => {
  const nowISO = new Date().toISOString()
  const payload = {
    pickup: input.pickup.trim(),
    pickupLat: input.pickupLat,
    pickupLng: input.pickupLng,
    dropoff: input.dropoff.trim(),
    dropoffLat: input.dropoffLat,
    dropoffLng: input.dropoffLng,
    date: input.date,
    status: input.status || 'collecting',
    totalSeats: Math.max(1, Math.round(input.totalSeats)),
    pricePerSeat: Math.max(0, input.pricePerSeat),
    charterPrice: Math.max(0, input.charterPrice),
    updatedAt: nowISO,
    updatedAtServer: serverTimestamp(),
  }

  if (input.id) {
    await updateDoc(doc(db, 'official_routes', input.id), payload)
    return
  }

  await addDoc(collection(db, 'official_routes'), {
    ...payload,
    occupiedSeats: 0,
    createdAt: nowISO,
    createdAtServer: serverTimestamp(),
  })
}

export const updateOfficialRouteStatus = async (params: {
  routeId: string
  status: OfficialRouteStatus
}) => {
  await updateDoc(doc(db, 'official_routes', params.routeId), {
    status: params.status,
    updatedAt: new Date().toISOString(),
    updatedAtServer: serverTimestamp(),
  })
}

export const savePricingConfig = async (config: Partial<PricingConfigRecord>) => {
  await setDoc(
    doc(db, 'config', 'pricing'),
    {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    },
    { merge: true },
  )
}
