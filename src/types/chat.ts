// Cabs Carpool - Chat Types (Simplified)
// Version: 4.0
// 統一聊天室：只關聯 Trip，roomType 只有 'trip'

export type ChatParticipantRole = 'driver' | 'passenger'

export interface ChatParticipant {
  id: string
  name: string
  role: ChatParticipantRole
  phone?: string
}

// ==================== Chat Room（統一）====================

export interface ChatRoom {
  id: string
  
  // 統一只關聯 Trip
  tripId: string              // 唯一的行程關聯
  roomType: 'trip'           // 固定為 'trip'
  
  // 向後兼容欄位
  roomTypeId?: string         // 舊欄位（現在用 tripId）
  
  // 參與者
  participants: ChatParticipant[]
  
  // 話題摘要（冗餘存儲，方便顯示）
  topicPickup?: string
  topicDropoff?: string
  topicTime?: string
  topicVehicleType?: 'sedan' | '7seater'
  
  // 最後訊息
  lastMessage?: string
  lastMessageAt?: string
  lastMessageBy?: string
  
  // 狀態
  status: 'active' | 'closed'
  
  // Metadata
  createdAt: string
  updatedAt: string
}

// ==================== Chat Message ====================

export type MessageType = 
  | 'text' 
  | 'image' 
  | 'location' 
  | 'system'
  | 'price_offer'      // 報價訊息
  | 'price_confirmed'   // 價格已確認
  | 'price_update'      // 價格更新（FIXED 模式）

export interface ChatMessage {
  id: string
  conversationId: string   // ChatRoom.id
  
  senderId: string
  senderName: string
  senderRole: ChatParticipantRole
  
  content: string
  messageType: MessageType
  
  // 報價資料（可選）
  quoteData?: {
    pricePerSeat: number
    tunnelFee?: number
    freeWaitingMinutes?: number
    extraChargePer10Min?: number
    status: 'pending' | 'accepted' | 'rejected'
  }
  
  // 媒體（如果 image）
  mediaUrl?: string
  
  // 位置（如果 location share）
  location?: {
    latitude: number
    longitude: number
    address?: string
    placeName?: string
  }
  
  // 已讀
  readBy: string[]
  
  createdAt: string
}

// ==================== Create Chat Room Data ====================

export interface CreateChatRoomData {
  tripId: string
  initiatorId: string
  initiatorName: string
  initiatorPhone: string
  initiatorRole: ChatParticipantRole
  topicPickup: string
  topicDropoff: string
  topicTime: string
  topicVehicleType?: 'sedan' | '7seater'
}

// ==================== Join Chat Room Data ====================

export interface JoinChatRoomData {
  oderId: string
  oderName: string
  oderPhone: string
  oderRole: ChatParticipantRole
}
