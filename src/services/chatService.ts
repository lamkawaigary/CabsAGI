// Cabs Carpool - Chat Service (Unified)
// Version: 3.0
// 統一處理 Trip 和 Request 的聊天室

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit,
  arrayUnion
} from 'firebase/firestore'
import { db } from '../firebaseConfig'
import type { ChatRoom, ChatMessage } from '../types/trip'

const CHAT_ROOMS_COLLECTION = 'chatRooms'
const MESSAGES_COLLECTION = 'chatMessages'

// ==================== Chat Room Service ====================

export const chatService = {

  /**
   * 為 Trip 創建聊天室
   */
  async createTripChatRoom(trip: {
    tripId: string
    driverId: string
    driverName: string
    driverPhone: string
    pickup: string
    dropoff: string
    departureTime: string
  }): Promise<string> {
    const room = {
      roomType: 'trip' as const,
      roomTypeId: trip.tripId,
      participants: [{
        oderId: trip.driverId,
        name: trip.driverName,
        role: 'driver' as const,
        phone: trip.driverPhone
      }],
      participantIds: [trip.driverId], // For easy querying
      topicPickup: trip.pickup,
      topicDropoff: trip.dropoff,
      topicTime: trip.departureTime,
      status: 'active' as const,
      confirmedBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    const docRef = await addDoc(collection(db, CHAT_ROOMS_COLLECTION), room)
    return docRef.id
  },

  /**
   * 為 Request 創建聊天室
   */
  async createRequestChatRoom(request: {
    requestId: string
    passengerId: string
    passengerName: string
    passengerPhone: string
    pickup: string
    dropoff: string
    departureDate: string
  }): Promise<string> {
    const room = {
      roomType: 'request' as const,
      roomTypeId: request.requestId,
      participants: [{
        oderId: request.passengerId,
        name: request.passengerName,
        role: 'passenger' as const,
        phone: request.passengerPhone
      }],
      participantIds: [request.passengerId], // For easy querying
      topicPickup: request.pickup,
      topicDropoff: request.dropoff,
      topicTime: request.departureDate,
      status: 'active' as const,
      confirmedBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    const docRef = await addDoc(collection(db, CHAT_ROOMS_COLLECTION), room)
    return docRef.id
  },

  /**
   * 加入聊天室
   */
  async joinChatRoom(roomId: string, participant: {
    oderId: string
    name: string
    role: 'driver' | 'passenger'
    phone: string
  }): Promise<void> {
    const roomRef = doc(db, CHAT_ROOMS_COLLECTION, roomId)
    await updateDoc(roomRef, {
      participants: arrayUnion(participant),
      participantIds: arrayUnion(participant.oderId), // For easy querying
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 獲取用戶的聊天室列表
   */
  subscribeToUserRooms(
    oderId: string,
    callback: (rooms: ChatRoom[]) => void
  ): () => void {
    const q = query(
      collection(db, CHAT_ROOMS_COLLECTION),
      where('participantIds', 'array-contains', oderId)
    )
    
    return onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
        lastMessageAt: doc.data().lastMessageAt?.toDate?.()?.toISOString() || doc.data().updatedAt
      })) as ChatRoom[]
      callback(rooms)
    })
  },

  /**
   * 獲取單個聊天室
   */
  async getRoom(roomId: string): Promise<ChatRoom | null> {
    const docRef = doc(db, CHAT_ROOMS_COLLECTION, roomId)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    
    const data = snapshot.data()
    return {
      id: snapshot.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    } as ChatRoom
  },

  /**
   * 更新最後訊息
   */
  async updateLastMessage(
    roomId: string,
    message: string,
    senderId: string
  ): Promise<void> {
    const roomRef = doc(db, CHAT_ROOMS_COLLECTION, roomId)
    await updateDoc(roomRef, {
      lastMessage: message,
      lastMessageAt: new Date().toISOString(),
      lastMessageBy: senderId,
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 確認共乘
   */
  async confirmRide(roomId: string, oderId: string): Promise<void> {
    const roomRef = doc(db, CHAT_ROOMS_COLLECTION, roomId)
    await updateDoc(roomRef, {
      confirmedBy: arrayUnion(oderId),
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 關閉聊天室
   */
  async closeRoom(roomId: string): Promise<void> {
    const roomRef = doc(db, CHAT_ROOMS_COLLECTION, roomId)
    await updateDoc(roomRef, {
      status: 'closed',
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * 獲取 Trip 相關的聊天室
   */
  async getTripRoom(tripId: string): Promise<string | null> {
    const q = query(
      collection(db, CHAT_ROOMS_COLLECTION),
      where('roomType', '==', 'trip'),
      where('roomTypeId', '==', tripId)
    )
    const snapshot = await getDocs(q)
    return snapshot.empty ? null : snapshot.docs[0].id
  },

  /**
   * 獲取 Request 相關的聊天室
   */
  async getRequestRoom(requestId: string): Promise<string | null> {
    const q = query(
      collection(db, CHAT_ROOMS_COLLECTION),
      where('roomType', '==', 'request'),
      where('roomTypeId', '==', requestId)
    )
    const snapshot = await getDocs(q)
    return snapshot.empty ? null : snapshot.docs[0].id
  }
}

// ==================== Message Service ====================

export const messageService = {

  /**
   * 發送訊息
   */
  async send(data: {
    conversationId: string
    senderId: string
    senderName: string
    senderRole: 'driver' | 'passenger'
    content: string
    messageType?: 'text' | 'image' | 'location' | 'system'
  }): Promise<string> {
    const message = {
      conversationId: data.conversationId,
      senderId: data.senderId,
      senderName: data.senderName,
      senderRole: data.senderRole,
      content: data.content,
      messageType: data.messageType || 'text',
      readBy: [data.senderId],
      createdAt: new Date().toISOString(),
    }
    
    const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), message)
    
    // 更新聊天室最後訊息
    await chatService.updateLastMessage(data.conversationId, data.content, data.senderId)
    
    return docRef.id
  },

  /**
   * 監聽訊息
   */
  subscribeToMessages(
    conversationId: string,
    callback: (messages: ChatMessage[]) => void
  ): () => void {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc'),
      limit(100)
    )
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      })) as ChatMessage[]
      callback(messages)
    })
  },

  /**
   * 標記已讀
   */
  async markAsRead(messageId: string, oderId: string): Promise<void> {
    const docRef = doc(db, MESSAGES_COLLECTION, messageId)
    await updateDoc(docRef, {
      readBy: arrayUnion(oderId)
    })
  },

  /**
   * 刪除訊息 (改為系統訊息)
   */
  async deleteMessage(messageId: string): Promise<void> {
    const docRef = doc(db, MESSAGES_COLLECTION, messageId)
    await updateDoc(docRef, {
      content: '[訊息已被刪除]',
      messageType: 'system'
    })
  }
}
