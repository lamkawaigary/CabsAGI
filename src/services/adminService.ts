import {
  addDoc,
  collection,
  doc,
  type DocumentData,
  limit,
  onSnapshot,
  query,
  type QueryDocumentSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebaseConfig'
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

export type PointOperationType = 'distribute' | 'reclaim' | 'mint' | 'burn'

export interface PointLedgerRecord {
  id: string
  type: PointOperationType
  amount: number
  operatorId: string
  operatorName: string
  targetUserId?: string
  targetUserName?: string
  orderId?: string
  note?: string
  platformBefore: number
  platformAfter: number
  userBefore?: number
  userAfter?: number
  createdAt: string
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
const POINT_OPERATION_VALUES: PointOperationType[] = ['distribute', 'reclaim', 'mint', 'burn']

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

const sanitizePointOperationType = (value: unknown): PointOperationType => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (POINT_OPERATION_VALUES.includes(normalized as PointOperationType)) {
      return normalized as PointOperationType
    }
  }
  return 'distribute'
}

const sanitizePointLedgerDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): PointLedgerRecord => {
  const clean = toCleanRecord(docSnap)
  return {
    id: docSnap.id,
    type: sanitizePointOperationType(clean.type),
    amount: Math.max(0, pickNumber(clean.amount)),
    operatorId: firstString(clean.operatorId),
    operatorName: firstString(clean.operatorName, clean.operatorId, 'SYSTEM_ADMIN'),
    targetUserId: firstString(clean.targetUserId) || undefined,
    targetUserName: firstString(clean.targetUserName) || undefined,
    orderId: firstString(clean.orderId) || undefined,
    note: firstString(clean.note) || undefined,
    platformBefore: pickNumber(clean.platformBefore),
    platformAfter: pickNumber(clean.platformAfter),
    userBefore: clean.userBefore === null || clean.userBefore === undefined ? undefined : pickNumber(clean.userBefore),
    userAfter: clean.userAfter === null || clean.userAfter === undefined ? undefined : pickNumber(clean.userAfter),
    createdAt: firstString(clean.createdAt, new Date(0).toISOString()),
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

const getPlatformPointBalanceFromRaw = (raw: unknown) => {
  if (!isRecord(raw)) return 0
  return pickNumber(raw.balancePoints, raw.points, raw.totalPoints)
}

export const subscribePlatformPointBalance = (
  callback: (points: number) => void,
  onError?: (error: Error) => void,
) =>
  onSnapshot(
    doc(db, 'config', 'platform_wallet'),
    (snap) => {
      callback(getPlatformPointBalanceFromRaw(snap.exists() ? snap.data() : null))
    },
    (error) => onError?.(error as Error),
  )

export const subscribePointLedger = (
  callback: (rows: PointLedgerRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(collection(db, 'wallet_logs'), limit(400))
  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs
        .map((docSnap) => sanitizePointLedgerDoc(docSnap))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      callback(logs)
    },
    (error) => onError?.(error as Error),
  )
}

export const executeAdminPointOperation = async (params: {
  type: PointOperationType
  amount: number
  operatorId: string
  operatorName: string
  targetUserId?: string
  orderId?: string
  note?: string
}) => {
  const amount = Math.max(0, Math.round(params.amount))
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('點數數量必須為正整數')
  }

  const nowISO = new Date().toISOString()
  const targetUserId = firstString(params.targetUserId)
  const orderId = firstString(params.orderId)
  const note = firstString(params.note)

  await runTransaction(db, async (tx) => {
    const walletRef = doc(db, 'config', 'platform_wallet')
    const walletSnap = await tx.get(walletRef)
    const walletData = walletSnap.exists() ? walletSnap.data() : {}
    const platformBefore = getPlatformPointBalanceFromRaw(walletData)
    let platformAfter = platformBefore
    let userBefore: number | undefined
    let userAfter: number | undefined
    let targetUserName = ''

    if (params.type === 'distribute' || params.type === 'reclaim') {
      if (!targetUserId) {
        throw new Error('請先選擇要操作點數的用戶')
      }
      const userRef = doc(db, 'users', targetUserId)
      const userSnap = await tx.get(userRef)
      if (!userSnap.exists()) {
        throw new Error('目標用戶不存在')
      }
      const userData = userSnap.data() || {}
      targetUserName = firstString(userData.name, targetUserId)
      userBefore = pickNumber(userData.points)

      if (params.type === 'distribute') {
        if (platformBefore < amount) {
          throw new Error('平台點數不足，請先增發平台點數')
        }
        platformAfter = platformBefore - amount
        userAfter = userBefore + amount
      } else {
        if (userBefore < amount) {
          throw new Error('用戶點數不足，無法回收超過餘額的點數')
        }
        platformAfter = platformBefore + amount
        userAfter = userBefore - amount
      }

      tx.update(userRef, {
        points: userAfter,
        updatedAt: nowISO,
        updatedAtServer: serverTimestamp(),
      })
    } else if (params.type === 'mint') {
      platformAfter = platformBefore + amount
    } else {
      if (platformBefore < amount) {
        throw new Error('平台點數不足，無法銷毀超過餘額的點數')
      }
      platformAfter = platformBefore - amount
    }

    tx.set(
      walletRef,
      {
        balancePoints: platformAfter,
        updatedAt: nowISO,
        updatedAtServer: serverTimestamp(),
      },
      { merge: true },
    )

    const logRef = doc(collection(db, 'wallet_logs'))
    tx.set(logRef, {
      type: params.type,
      amount,
      operatorId: params.operatorId,
      operatorName: params.operatorName,
      targetUserId: targetUserId || null,
      targetUserName: targetUserName || null,
      orderId: orderId || null,
      note: note || null,
      platformBefore,
      platformAfter,
      userBefore: userBefore ?? null,
      userAfter: userAfter ?? null,
      createdAt: nowISO,
      createdAtServer: serverTimestamp(),
    })
  })
}

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
