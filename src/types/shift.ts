// CabsAGI Shift-Based Service Types
// Version: 1.0

// ==================== Route Types ====================

export type RouteType = 'AIRPORT' | 'CROSS_BORDER' | 'THEME_PARK' | 'EVENT'

export interface RouteStop {
  name: string
  address: string
  latitude: number
  longitude: number
  sequence: number
}

export interface Route {
  id: string
  name: string
  description?: string
  type: RouteType
  origin: RouteStop
  destination: RouteStop
  stops: RouteStop[]
  price: number
  originalPrice?: number // For showing discounts
  duration: number // in minutes
  distance: number // in km
  imageUrl?: string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
  
  // Driver-created route fields
  isDriverRoute?: boolean
  driverId?: string
  driverName?: string
  driverPhone?: string
  validFrom?: string // ISO timestamp
  validTo?: string // ISO timestamp
}

// ==================== Shift Types ====================

export type ShiftStatus = 'SCHEDULED' | 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface Shift {
  id: string
  routeId: string
  routeName?: string // For display
  departureTime: string // ISO timestamp
  arrivalTime?: string // ISO timestamp
  vehicleId: string
  driverId?: string
  driverName?: string
  driverPhone?: string
  status: ShiftStatus
  availableSeats: number
  totalSeats: number
  price: number
  notes?: string
  createdAt: string
  updatedAt: string
}

// ==================== Booking Types ====================

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED'

export interface Booking {
  id: string
  shiftId: string
  routeId: string
  userId: string
  
  // Passenger info
  passengerName: string
  passengerPhone: string
  passengerEmail?: string
  
  // Trip details
  pickupStopIndex: number
  dropoffStopIndex: number
  seatCount: number
  
  // Status
  status: BookingStatus
  qrCode?: string
  
  // Payment
  totalPrice: number
  paymentStatus: PaymentStatus
  paymentMethod?: 'CREDIT_CARD' | 'APPLE_PAY' | 'BALANCE'
  paymentId?: string
  
  // Metadata
  notes?: string
  createdAt: string
  updatedAt: string
}

// ==================== Vehicle Types ====================

export type VehicleStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'

export interface Vehicle {
  id: string
  plateNumber: string
  model: string
  color?: string
  capacity: number
  status: VehicleStatus
  driverId?: string
  createdAt: string
  updatedAt: string
}

// ==================== Event Types ====================

export interface Event {
  id: string
  name: string
  venue: string
  date: string // ISO date
  endTime?: string
  description?: string
  imageUrl?: string
  relatedRoutes?: string[] // Route IDs that serve this event
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
}

// ==================== Subscription Types ====================

export type SubscriptionType = 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED'

export interface Subscription {
  id: string
  userId: string
  routeId?: string // Optional - if null, applies to all routes
  type: SubscriptionType
  status: SubscriptionStatus
  startDate: string
  endDate: string
  remainingTrips?: number
  price: number
  createdAt: string
  updatedAt: string
}

// ==================== User Extension Types ====================

export interface UserProfile {
  // Extended from existing AuthUser
  subscriptionStatus: SubscriptionType
  subscriptionEndDate?: string
  points: number
  balance: number // Stored value amount
  totalTrips: number
  createdAt: string
  updatedAt: string
}

// ==================== Helper Types ====================

export interface RouteWithShift extends Route {
  nextShift?: Shift
  availableShifts?: Shift[]
}

export interface BookingWithDetails extends Booking {
  route?: Route
  shift?: Shift
}

// ==================== API Response Types ====================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
