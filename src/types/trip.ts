// Cabs Carpool - Trip Types (Chat-Centric)
// Version: 3.0
// 核心理念：行程只是聊天話題的起點

// ==================== Location ====================

export interface Location {
  placeName: string
  address?: string
  latitude: number
  longitude: number
}

// ==================== Trip (司機發佈行程 = 聊天話題) ====================

export type TripStatus = 
  | 'OPEN'        // 開放聊天
  | 'CONFIRMED'   // 已確認共乘
  | 'COMPLETED'   // 已完成
  | 'CANCELLED'   // 已取消

export interface Trip {
  id: string
  
  // 司機資料
  driverId: string
  driverName: string
  driverPhone: string
  
  // 行程資料 (聊天話題的起點)
  route: {
    pickup: Location
    dropoff: Location
  }
  
  // 時間
  departureTime: string  // ISO timestamp
  
  // 座位
  totalSeats: number
  
  // 乘客名單 (聊天參與者)
  passengers: {
    oderId: string
    name: string
    phone: string
    confirmed: boolean  // 是否已確認共乘
  }[]
  
  // 狀態
  status: TripStatus
  
  // 確認情況
  confirmedByDriver: boolean
  confirmedByPassengers: string[]  // 已確認的乘客ID列表
  
  // 備註
  notes?: string
  
  // Metadata
  createdAt: string
  updatedAt: string
}

// ==================== Request (乘客發佈需求 = 聊天話題) ====================

export type RequestStatus =
  | 'OPEN'        // 開放聊天
  | 'CONFIRMED'   // 已確認共乘
  | 'CANCELLED'  // 已取消

export interface PassengerRequest {
  id: string
  
  // 乘客資料
  passengerId: string
  passengerName: string
  passengerPhone: string
  
  // 需求資料 (聊天話題的起點)
  pickup: Location
  dropoff: Location
  departureDate: string
  passengerCount: number
  
  // 有興趣的司機
  interestedDrivers: {
    driverId: string
    driverName: string
    driverPhone: string
    confirmed: boolean
  }[]
  
  // 其他想加入的乘客
  joinedPassengers: {
    oderId: string
    name: string
    phone: string
    confirmed: boolean
  }[]
  
  // 狀態
  status: RequestStatus
  
  // 備註
  notes?: string
  
  // Metadata
  createdAt: string
  updatedAt: string
}

// ==================== Chat Types ====================

export interface ChatRoom {
  id: string
  
  // 話題類型
  roomType: 'trip' | 'request'
  roomTypeId: string  // tripId or requestId
  
  // 參與者
  participants: {
    oderId: string
    name: string
    role: 'driver' | 'passenger'
    phone: string
  }[]
  
  // 話題摘要
  topicPickup?: string
  topicDropoff?: string
  topicTime?: string
  
  // 最後訊息
  lastMessage?: string
  lastMessageAt?: string
  lastMessageBy?: string
  
  // 狀態
  status: 'active' | 'closed'
  
  // 確認共乘
  confirmedBy: string[]  // 已確認的用戶ID列表
  
  // Metadata
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  
  senderId: string
  senderName: string
  senderRole: 'driver' | 'passenger'
  
  content: string
  messageType: 'text' | 'image' | 'location' | 'system'
  
  // 已讀
  readBy: string[]
  
  createdAt: string
}

// ==================== Helper Types ====================

export interface TripWithRoom extends Trip {
  chatRoomId: string
}

export interface RequestWithRoom extends PassengerRequest {
  chatRoomId: string
}
