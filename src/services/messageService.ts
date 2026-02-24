import {
  addDoc,
  collection,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebaseConfig'

export type MessageType = 'TEXT' | 'IMAGE' | 'SYSTEM'

export interface MessageRecord {
  id: string
  senderId: string
  receiverId: string
  realSenderId?: string
  senderName?: string
  content: string
  type: MessageType
  orderId?: string | null
  timestamp: string
  isRead: boolean
  metadata?: Record<string, any>
}

const sanitizeValue = (val: any): any => {
  if (val === null || val === undefined) return val
  if (val && typeof val.toDate === 'function') return val.toDate().toISOString()
  if (Array.isArray(val)) return val.map(sanitizeValue)
  if (typeof val === 'object') {
    const cleaned: Record<string, any> = {}
    Object.keys(val).forEach((key) => {
      cleaned[key] = sanitizeValue(val[key])
    })
    return cleaned
  }
  return val
}

const sanitizeDoc = (docSnap: any): MessageRecord => {
  const data = docSnap.data() || {}
  const clean: any = { id: docSnap.id }
  Object.keys(data).forEach((k) => {
    clean[k] = sanitizeValue(data[k])
  })

  clean.senderId = String(clean.senderId || '')
  clean.receiverId = String(clean.receiverId || '')
  clean.content = String(clean.content || '')
  clean.type = (clean.type || 'TEXT') as MessageType
  clean.timestamp = clean.timestamp || new Date(0).toISOString()
  clean.isRead = Boolean(clean.isRead)
  clean.orderId = clean.orderId || null

  return clean as MessageRecord
}

export const subscribeMessagesBySender = (
  uid: string,
  callback: (messages: MessageRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(collection(db, 'messages'), where('senderId', '==', uid), limit(200))
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((d) => sanitizeDoc(d))),
    (error) => onError?.(error as Error),
  )
}

export const subscribeMessagesByReceiver = (
  receiverId: string,
  callback: (messages: MessageRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(collection(db, 'messages'), where('receiverId', '==', receiverId), limit(200))
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((d) => sanitizeDoc(d))),
    (error) => onError?.(error as Error),
  )
}

export const sendTextMessage = async (params: {
  senderId: string
  senderName?: string
  receiverId: string
  content: string
  orderId?: string
}) => {
  const nowISO = new Date().toISOString()
  return addDoc(collection(db, 'messages'), {
    senderId: params.senderId,
    realSenderId: params.senderId,
    senderName: params.senderName || '',
    receiverId: params.receiverId,
    content: params.content,
    orderId: params.orderId || null,
    type: 'TEXT',
    isRead: false,
    timestamp: nowISO,
    createdAtServer: serverTimestamp(),
    metadata: {
      status: 'sent',
    },
  })
}

export const markConversationAsRead = async (params: {
  currentUserId: string
  partnerId: string
  orderId?: string | null
}) => {
  const base = [
    where('senderId', '==', params.partnerId),
    where('receiverId', '==', params.currentUserId),
    where('isRead', '==', false),
  ]

  const q =
    params.orderId === undefined
      ? query(collection(db, 'messages'), ...base, limit(100))
      : query(collection(db, 'messages'), ...base, where('orderId', '==', params.orderId), limit(100))

  const snap = await getDocs(q)
  if (snap.empty) return

  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.update(d.ref, { isRead: true, readAtServer: serverTimestamp() }))
  await batch.commit()
}
