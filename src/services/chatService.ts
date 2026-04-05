import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  limit
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebaseConfig'
import type { ChatConversation, ChatMessage } from '../types/shift'

// ==================== Conversations ====================

export const chatService = {
  // Create a new conversation
  async createConversation(
    participants: string[],
    participantNames: Record<string, string>,
    participantRoles: Record<string, 'driver' | 'passenger' | 'admin'>,
    shiftId?: string,
    routeName?: string
  ): Promise<string> {
    const conversation = {
      participants,
      participantNames,
      participantRoles,
      shiftId,
      routeName,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    const docRef = await addDoc(collection(db, 'conversations'), conversation)
    return docRef.id
  },

  // Get conversations for a user
  getConversationsForUser(userId: string, callback: (conversations: ChatConversation[]) => void) {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    )
    return onSnapshot(q, (snapshot) => {
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastMessageAt: doc.data().updatedAt?.toDate()?.toISOString() || doc.data().createdAt?.toDate()?.toISOString()
      })) as ChatConversation[]
      callback(conversations)
    })
  },

  // Get all conversations (for admin)
  getAllConversations(callback: (conversations: ChatConversation[]) => void) {
    const q = query(
      collection(db, 'conversations'),
      orderBy('updatedAt', 'desc'),
      limit(50)
    )
    return onSnapshot(q, (snapshot) => {
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastMessageAt: doc.data().updatedAt?.toDate()?.toISOString() || doc.data().createdAt?.toDate()?.toISOString()
      })) as ChatConversation[]
      callback(conversations)
    })
  },

  // Get or create conversation between driver and passenger for a shift
  async getOrCreateShiftConversation(
    shiftId: string,
    driverId: string,
    driverName: string,
    passengerId: string,
    passengerName: string,
    routeName: string
  ): Promise<string> {
    // Check if conversation already exists for this shift
    const q = query(
      collection(db, 'conversations'),
      where('shiftId', '==', shiftId)
    )
    const snapshot = await getDocs(q)
    
    if (!snapshot.empty) {
      return snapshot.docs[0].id
    }
    
    // Create new conversation
    return this.createConversation(
      [driverId, passengerId],
      { [driverId]: driverName, [passengerId]: passengerName },
      { [driverId]: 'driver', [passengerId]: 'passenger' },
      shiftId,
      routeName
    )
  },

  // Update conversation with last message
  async updateLastMessage(conversationId: string, lastMessage: string) {
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage,
      updatedAt: serverTimestamp()
    })
  }
}

// ==================== Messages ====================

export const messageService = {
  // Send a text message
  async sendMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    content: string
  ): Promise<void> {
    const message = {
      conversationId,
      senderId,
      senderName,
      content,
      createdAt: serverTimestamp(),
      readBy: [senderId]
    }
    
    await addDoc(collection(db, `conversations/${conversationId}/messages`), message)
    
    // Update conversation last message
    await chatService.updateLastMessage(conversationId, content)
  },

  // Send image message
  async sendImageMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    imageFile: File
  ): Promise<void> {
    // Upload image to Firebase Storage
    const storageRef = ref(storage, `chats/${conversationId}/${Date.now()}_${imageFile.name}`)
    await uploadBytes(storageRef, imageFile)
    const imageUrl = await getDownloadURL(storageRef)
    
    const message = {
      conversationId,
      senderId,
      senderName,
      content: '[圖片]',
      imageUrl,
      createdAt: serverTimestamp(),
      readBy: [senderId]
    }
    
    await addDoc(collection(db, `conversations/${conversationId}/messages`), message)
    
    // Update conversation last message
    await chatService.updateLastMessage(conversationId, '[圖片]')
  },

  // Get messages for a conversation (real-time)
  getMessages(conversationId: string, callback: (messages: ChatMessage[]) => void) {
    const q = query(
      collection(db, `conversations/${conversationId}/messages`),
      orderBy('createdAt', 'asc')
    )
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
      })) as ChatMessage[]
      callback(messages)
    })
  },

  // Mark messages as read
  async markAsRead(conversationId: string, userId: string) {
    const q = query(
      collection(db, `conversations/${conversationId}/messages`),
      where('readBy', 'not-in', [[userId]])
    )
    const snapshot = await getDocs(q)
    
    const updates = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { readBy: [...(doc.data().readBy || []), userId] })
    )
    
    await Promise.all(updates)
  }
}

// ==================== System Messages ====================

export const systemMessageService = {
  // Send a system message (e.g., when driver accepts order)
  async sendSystemMessage(
    conversationId: string,
    message: string
  ): Promise<void> {
    const systemMessage = {
      conversationId,
      senderId: 'SYSTEM',
      senderName: '系統',
      content: message,
      isSystem: true,
      createdAt: serverTimestamp(),
      readBy: []
    }
    
    await addDoc(collection(db, `conversations/${conversationId}/messages`), systemMessage)
    await chatService.updateLastMessage(conversationId, message)
  },

  // Pre-defined system messages
  async driverAcceptedShift(conversationId: string, driverName: string) {
    await this.sendSystemMessage(conversationId, `🚗 司機 ${driverName} 已接單，請留意對話`)
  },

  async driverCompletedShift(conversationId: string, driverName: string) {
    await this.sendSystemMessage(conversationId, `✅ 司機 ${driverName} 已完成行程，感謝使用 CabsAGI`)
  },

  async passengerBookedShift(conversationId: string, passengerName: string) {
    await this.sendSystemMessage(conversationId, `👤 乘客 ${passengerName} 已預訂班次`)
  }
}
