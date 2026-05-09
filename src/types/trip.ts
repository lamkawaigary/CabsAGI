// Cabs Carpool - Trip Types (Unified)
// Version: 4.0
// 統一的 Trip 模型：支援 FIXED 和 NEGOTIATED 兩種定價模式

// ==================== Location ====================

export interface Location {
  placeName: string
  address?: string
  latitude: number
  longitude: number
}

// ==================== Trip Status ====================

export type TripStatus = 
  | 'OPEN'           // 🟢 開放中（等待參與者）
  | 'CONFIRMED'      // 🟡 已確認（價格已鎖定，可出發）
  | 'IN_PROGRESS'    // 🔵 行程中
  | 'COMPLETED'      // ✅ 已完成
  | 'CANCELLED'      // ❌ 已取消
  | 'EXPIRED'        // ⏰ 已過期

// ==================== Pricing Mode（核心區分）====================

export type PricingMode = 
  | 'FIXED'          // 司機發車：固定價格，司機在創建時已填寫
  | 'NEGOTIATED'     // 乘客搵車：協商價格，等待司機報價

// ==================== Initiator Role ====================

export type InitiatorRole = 'driver' | 'passenger'

// ==================== Quote（報價記錄）====================

export interface TripQuote {
  id: string
  oderId: string          // 報價者 ID（司機）
  oderName: string
  oderPhone: string
  pricePerSeat: number    // 每位價格 (HK$)
  tunnelFee: number       // 隧道費 (HK$)
  freeWaitingMinutes: number  // 免費等候分鐘
  extraChargePer10Min: number // 超時每10分鐘收費
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  createdAt: string
  respondedAt?: string
  respondedBy?: string
  respondedByName?: string
}

// ==================== Participant ====================

export interface TripParticipant {
  id: string
  name: string
  phone: string
  role: InitiatorRole
  joinedAt: string
  confirmed: boolean
  onboarded: boolean
  qrCode?: string
  qrCodeExpiry?: string
  // Legacy alias for backward compatibility
  passengerId?: string
  driverId?: string
  driverName?: string
  driverPhone?: string
}

// ==================== Unified Trip（統一行程）====================

// Extended Trip interface with backward compatibility
export interface Trip {
  id: string
  
  // === 核心區分 ===
  pricingMode: PricingMode
  initiatorRole: InitiatorRole
  initiatorId: string
  initiatorName: string
  initiatorPhone: string
  
  // === 路線 ===
  route: {
    pickup: Location
    dropoff: Location
  }
  
  // === 時間 ===
  departureTime: string
  
  // === 車輛 ===
  vehicleType: 'sedan' | '7seater'
  totalSeats: number
  availableSeats: number
  
  // === 定價 ===
  pricePerSeat?: number
  confirmedPrice?: number
  tunnelFee?: number
  
  // === 參與者 ===
  driver: TripParticipant | null
  passengers: TripParticipant[]
  
  // === 申請加入的乘客 ===
  pendingPassengers: TripPendingPassenger[]
  
  // === 報價記錄（NEGOTIATED 模式）===
  quotes: TripQuote[]
  
  // === 狀態 ===
  status: TripStatus
  
  // === 備註 & 標籤 ===
  notes?: string
  tags?: string[]
  
  // === 向後兼容欄位 ===
  chatRoomId?: string
  rejectedPassengers?: string[]
  leftPassengers?: TripLeftPassenger[]
  noShowPassengers?: TripNoShowPassenger[]
  confirmedByDriver?: boolean
  confirmedByPassengers?: string[]
  
  // === 舊欄位（直接訪問）===
  driverId?: string
  driverName?: string
  driverPhone?: string
  confirmedBy?: string[]
  
  // === 時間戳 ===
  createdAt: string
  updatedAt: string
}

// Additional types for backward compatibility
export interface TripPendingPassenger {
  id: string
  name: string
  phone: string
  joinedAt: string
  passengerId?: string  // Legacy support
}

export interface TripLeftPassenger {
  id: string
  leftAt: string
  reason?: string
  passengerId?: string  // Legacy support
}

export interface TripNoShowPassenger {
  id: string
  markedAt: string
  markedBy: string
  passengerId?: string  // Legacy support
}

// ==================== Legacy Types（向後兼容）====================

// 舊的 Trip 結構（保留以便過渡期參考）
export interface LegacyTrip {
  driverId: string
  driverName: string
  driverPhone: string
  route: { pickup: Location; dropoff: Location }
  departureTime: string
  totalSeats: number
  availableSeats: number
  pricePerSeat?: number
  vehicleType: 'sedan' | '7seater'
  passengers: any[]
  pendingPassengers: any[]
  rejectedPassengers: string[]
  leftPassengers: any[]
  noShowPassengers: any[]
  status: TripStatus
  confirmedByDriver: boolean
  confirmedByPassengers: string[]
  notes?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
}

// ==================== Create Trip Data ====================

export interface CreateTripData {
  // 必填
  pricingMode: PricingMode
  initiatorRole: InitiatorRole
  initiatorId: string
  initiatorName: string
  initiatorPhone: string
  pickup: Location
  dropoff: Location
  departureTime: string
  vehicleType: 'sedan' | '7seater'
  totalSeats: number
  
  // FIXED 模式必填
  pricePerSeat?: number
  tunnelFee?: number
  
  // 舊欄位（向後兼容）
  driverId?: string
  driverName?: string
  driverPhone?: string
  driver?: TripParticipant | null
  
  // 可選
  notes?: string
  tags?: string[]
}

// ==================== Request Service Types（向後兼容）====================

export interface PassengerRequest {
  id: string
  passengerId: string
  passengerName: string
  passengerPhone: string
  pickup: Location
  dropoff: Location
  departureDate: string
  passengerCount: number
  vehicleType: 'sedan' | '7seater'
  isCarpool: boolean
  notes: string | null
  interestedDrivers: {
    driverId: string
    driverName: string
    driverPhone: string
    confirmed: boolean
  }[]
  joinedPassengers: {
    passengerId: string
    name: string
    phone: string
    confirmed: boolean
  }[]
  tags?: string[]
  status: 'OPEN' | 'CONFIRMED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
}

// ==================== Helper Types ====================

// Backward compatibility getter functions
export const tripHelpers = {
  getDriverId: (trip: Trip) => trip.driver?.id || (trip as any).driverId,
  getDriverName: (trip: Trip) => trip.driver?.name || (trip as any).driverName,
  getDriverPhone: (trip: Trip) => trip.driver?.phone || (trip as any).driverPhone,
  getPassengerId: (p: any) => p.id || p.passengerId,
  getPassengerName: (p: any) => p.name,
  getPassengerPhone: (p: any) => p.phone,
}

// 狀態顯示文字
export const TRIP_STATUS_TEXT: Record<TripStatus, string> = {
  'OPEN': '等待加入',
  'CONFIRMED': '已確認',
  'IN_PROGRESS': '行程中',
  'COMPLETED': '已完成',
  'CANCELLED': '已取消',
  'EXPIRED': '已過期'
}

// 定價模式顯示文字
export const PRICING_MODE_TEXT: Record<PricingMode, string> = {
  'FIXED': '固定價格',
  'NEGOTIATED': '協商價格'
}
