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
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../firebaseConfig'

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

const sanitizeFileName = (fileName: string) =>
  fileName
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 60) || 'image'

const getFileExt = (fileName: string, mimeType: string) => {
  const matched = fileName.match(/\.([a-zA-Z0-9]+)$/)
  if (matched) return matched[1].toLowerCase()
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  return 'img'
}

export const sendImageMessage = async (params: {
  senderId: string
  senderName?: string
  receiverId: string
  file: File
  orderId?: string
}) => {
  const { file } = params
  if (!file.type.startsWith('image/')) {
    throw new Error('僅支援圖片檔案格式')
  }
  const maxSizeBytes = 10 * 1024 * 1024
  if (file.size > maxSizeBytes) {
    throw new Error('圖片大小不可超過 10MB')
  }

  const nowISO = new Date().toISOString()
  const ext = getFileExt(file.name, file.type)
  const safeName = sanitizeFileName(file.name)
  const objectPath = `messages/${params.senderId}/${Date.now()}-${safeName}.${ext}`
  const storageRef = ref(storage, objectPath)

  await uploadBytes(storageRef, file, {
    contentType: file.type || 'application/octet-stream',
  })
  const downloadURL = await getDownloadURL(storageRef)

  return addDoc(collection(db, 'messages'), {
    senderId: params.senderId,
    realSenderId: params.senderId,
    senderName: params.senderName || '',
    receiverId: params.receiverId,
    content: downloadURL,
    orderId: params.orderId || null,
    type: 'IMAGE',
    isRead: false,
    timestamp: nowISO,
    createdAtServer: serverTimestamp(),
    metadata: {
      status: 'sent',
      fileName: file.name || safeName,
      fileType: file.type || 'image/*',
      fileSize: file.size,
      storagePath: objectPath,
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
