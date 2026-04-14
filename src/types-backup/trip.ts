// Cabs Carpool - Trip Types
// Version: 2.0 (Carpool Mode)

// ==================== Location Types ====================

export interface Location {
  placeName: string
  address?: string
  latitude: number
  longitude: number
  placeId?: string  // Google Places ID
}

export interface TripRoute {
  pickup: Location
  dropoff: Location
  waypoints?: Location[]  // Optional stops
}

// ==================== Trip Types ====================

export type TripStatus = 
  | 'DRAFT'      // 草稿，司機編輯中
  | 'OPEN'       // 公開，接受乘客
  | 'FULL'       // 已滿座
  | 'IN_PROGRESS' // 進行中
  | 'COMPLETED'  // 已完成
  | 'CANCELLED'  // 已取消

export type TripVisibility = 'PUBLIC' | 'PRIVATE'

export interface Trip {
  id: string
  // Driver info
  driverId: string
  driverName: string
  driverPhone: string
  
  // Route info
  route: TripRoute
  
  // Time
  departureTime: string       // ISO timestamp
  arrivalTime?: string        // ISO timestamp
  
  // Capacity
  availableSeats: number      // 目前空位
  totalSeats: number         // 總座位
  
  // Pricing (司機自定)
  pricePerSeat: number       // 每位價格
  
  // Status
  status: TripStatus
  visibility: TripVisibility
  
  // Optional notes
  notes?: string             // 備註 (行李、寵物等)
  
  // Metadata
  createdAt: string
  updatedAt: string
}

// ==================== Passenger Types ====================

export type PassengerStatus = 'PENDING' | 'CONFIRMED' | 'ON_TRIP' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export interface TripPassenger {
  id: string
  tripId: string
  userId: string
  
  // Passenger info
  passengerName: string
  passengerPhone: string
  passengerEmail?: string
  
  // Booking details
  seatCount: number
  pickupLocation: Location
  dropoffLocation: Location
  
  // Status
  status: PassengerStatus
  
  // Payment (司機直接收取現金，平台不介入)
  totalPrice: number
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED'
  paymentNotes?: string
  
  // Metadata
  createdAt: string
  updatedAt: string
}

// ==================== Intelligence Types ====================

export type IntelligenceType = 'TRAFFIC' | 'BORDER' | 'WEATHER' | 'EVENT' | 'OTHER'
export type IntelligenceStatus = 'ACTIVE' | 'EXPIRED' | 'RESOLVED'

export interface IntelligenceReport {
  id: string
  
  // Content
  type: IntelligenceType
  title: string
  content: string
  location?: Location
  
  // Source
  reportedBy: string           // user ID
  reportedByName: string
  source: 'USER' | 'ADMIN' | 'GOVERNMENT_API'
  
  // Verification
  upvotes: number
  downvotes: number
  verifiedBy?: string[]        // user IDs who verified
  
  // Status
  status: IntelligenceStatus
  expiresAt?: string           // ISO timestamp
  
  // Metadata
  createdAt: string
  updatedAt: string
}

export interface IntelligenceVote {
  id: string
  reportId: string
  oderId: string
  vote: 'up' | 'down'
  createdAt: string
}

// ==================== Subscription Types ====================

export type SubscriptionType = 'NONE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED'

export interface Subscription {
  id: string
  oderId: string
  
  type: SubscriptionType
  status: SubscriptionStatus
  
  startDate: string
  endDate: string
  
  price: number               // 訂閱費用
  autoRenew: boolean
  
  createdAt: string
  updatedAt: string
}

// ==================== Helper Types ====================

export interface TripWithPassengers extends Trip {
  passengers: TripPassenger[]
  bookedSeats: number
}

// ==================== Passenger Request Types ====================

export type RequestStatus = 'PENDING' | 'MATCHED' | 'CANCELLED' | 'EXPIRED'

export interface PassengerRequest {
  id: string
  
  // Request details
  passengerId: string
  passengerName: string
  passengerPhone: string
  passengerEmail?: string
  
  // Route request
  pickup: Location
  dropoff: Location
  
  // Time
  departureDate: string  // YYYY-MM-DD
  departureTimeMin?: string  // HH:MM
  departureTimeMax?: string  // HH:MM
  
  // Capacity
  passengerCount: number
  
  // Price range passenger is willing to pay
  priceRangeMin?: number
  priceRangeMax?: number
  
  // Notes
  notes?: string
  
  // Status
  status: RequestStatus
  
  // If matched with a driver/trip
  matchedTripId?: string
  matchedDriverId?: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  expiresAt: string
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
