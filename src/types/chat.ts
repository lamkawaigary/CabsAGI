// Cabs Carpool - Chat Types
// Version: 2.0

export type ChatParticipantRole = 'driver' | 'passenger' | 'admin'

export interface ChatParticipant {
  id: string
  name: string
  role: ChatParticipantRole
  phone?: string
  lastSeen?: string
}

export interface ChatConversation {
  id: string
  // Trip relation (replaces shift)
  tripId?: string
  
  // Participants
  participants: string[]  // user IDs
  participantInfo: Record<string, {
    name: string
    role: ChatParticipantRole
    phone?: string
  }>
  
  // Trip summary (for display)
  tripPickup?: string
  tripDropoff?: string
  tripTime?: string
  
  // Last message preview
  lastMessage?: string
  lastMessageAt?: string
  lastMessageBy?: string
  
  // Status
  status: 'active' | 'closed'
  
  // Metadata
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  
  // Sender
  senderId: string
  senderName: string
  senderRole: ChatParticipantRole
  
  // Message content
  content: string
  messageType: 'text' | 'image' | 'location' | 'system'
  
  // Media (if image)
  mediaUrl?: string
  mediaType?: string
  
  // Location (if location share)
  location?: {
    latitude: number
    longitude: number
    address?: string
    placeName?: string
  }
  
  // Read status
  readBy: string[]  // user IDs who have read
  
  // Metadata
  createdAt: string
}

export interface NewConversationData {
  tripId: string
  participants: string[]
  participantInfo: Record<string, { name: string; role: ChatParticipantRole; phone?: string }>
  tripPickup: string
  tripDropoff: string
  tripTime: string
}
