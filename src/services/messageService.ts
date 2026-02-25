import {
  addDoc,
  collection,
  type DocumentData,
  getDocs,
  limit,
  onSnapshot,
  query,
  type QueryDocumentSnapshot,
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
  metadata?: Record<string, unknown>
}

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null

const isTimestampLike = (val: unknown): val is { toDate: () => Date } =>
  isRecord(val) && typeof val.toDate === 'function'

const sanitizeValue = (val: unknown): unknown => {
  if (val === null || val === undefined) return val
  if (isTimestampLike(val)) return val.toDate().toISOString()
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

const sanitizeDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): MessageRecord => {
  const data = docSnap.data() || {}
  const clean: Record<string, unknown> = { id: docSnap.id }
  Object.keys(data).forEach((k) => {
    clean[k] = sanitizeValue(data[k])
  })

  const type: MessageType =
    clean.type === 'IMAGE' || clean.type === 'SYSTEM' || clean.type === 'TEXT' ? clean.type : 'TEXT'
  const timestamp = typeof clean.timestamp === 'string' ? clean.timestamp : new Date(0).toISOString()
  const orderId = typeof clean.orderId === 'string' && clean.orderId.trim() ? clean.orderId : null

  return {
    id: docSnap.id,
    senderId: typeof clean.senderId === 'string' ? clean.senderId : '',
    receiverId: typeof clean.receiverId === 'string' ? clean.receiverId : '',
    realSenderId: typeof clean.realSenderId === 'string' ? clean.realSenderId : undefined,
    senderName: typeof clean.senderName === 'string' ? clean.senderName : undefined,
    content: typeof clean.content === 'string' ? clean.content : '',
    type,
    orderId,
    timestamp,
    isRead: Boolean(clean.isRead),
    metadata: isRecord(clean.metadata) ? clean.metadata : undefined,
  }
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
