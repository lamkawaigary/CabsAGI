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

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_INLINE_IMAGE_BYTES = 700 * 1024
const MAX_IMAGE_DIMENSION = 1440

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

const stripFileExt = (fileName: string) => fileName.replace(/\.[^.]+$/, '')

const getFileExt = (fileName: string, mimeType: string) => {
  const matched = fileName.match(/\.([a-zA-Z0-9]+)$/)
  if (matched) return matched[1].toLowerCase()
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  return 'img'
}

const getErrorCode = (err: unknown) =>
  err && typeof err === 'object' && 'code' in err && typeof err.code === 'string' ? err.code : ''

const estimateDataUrlBytes = (dataUrl: string) => {
  const commaIdx = dataUrl.indexOf(',')
  if (commaIdx < 0) return 0
  const base64 = dataUrl.slice(commaIdx + 1)
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - padding
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('圖片讀取失敗'))
    }
    reader.onerror = () => reject(new Error('圖片讀取失敗'))
    reader.readAsDataURL(file)
  })

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('圖片載入失敗'))
    img.src = src
  })

const buildInlineImageDataUrl = async (file: File) => {
  const originalDataUrl = await readFileAsDataUrl(file)
  if (estimateDataUrlBytes(originalDataUrl) <= MAX_INLINE_IMAGE_BYTES) {
    return { dataUrl: originalDataUrl, mimeType: file.type || 'image/*' }
  }

  if (file.type === 'image/gif') {
    throw new Error('GIF 圖片太大，請改用較小圖片')
  }

  const image = await loadImageElement(originalDataUrl)
  const maxSide = Math.max(image.width, image.height)
  const initialScale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(1, maxSide))
  const outputMimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  let scale = initialScale

  while (scale >= 0.3) {
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('圖片處理失敗')
    ctx.drawImage(image, 0, 0, width, height)

    const runCompression = (mimeType: string) => {
      let quality = mimeType === 'image/png' ? 0.92 : 0.88
      let dataUrl = canvas.toDataURL(mimeType, quality)
      while (estimateDataUrlBytes(dataUrl) > MAX_INLINE_IMAGE_BYTES && quality > 0.44) {
        quality -= 0.08
        dataUrl = canvas.toDataURL(mimeType, quality)
      }
      return dataUrl
    }

    let candidate = runCompression(outputMimeType)
    let candidateMimeType = outputMimeType

    if (estimateDataUrlBytes(candidate) > MAX_INLINE_IMAGE_BYTES && outputMimeType === 'image/png') {
      candidate = runCompression('image/jpeg')
      candidateMimeType = 'image/jpeg'
    }

    if (estimateDataUrlBytes(candidate) <= MAX_INLINE_IMAGE_BYTES) {
      return { dataUrl: candidate, mimeType: candidateMimeType }
    }

    scale *= 0.82
  }

  throw new Error('圖片過大，請選擇較小圖片（建議 3MB 以下）')
}

const createImageMessagePayload = (params: {
  senderId: string
  senderName?: string
  receiverId: string
  orderId?: string
  content: string
  timestampISO: string
  metadata: Record<string, unknown>
}) => ({
  senderId: params.senderId,
  realSenderId: params.senderId,
  senderName: params.senderName || '',
  receiverId: params.receiverId,
  content: params.content,
  orderId: params.orderId || null,
  type: 'IMAGE',
  isRead: false,
  timestamp: params.timestampISO,
  createdAtServer: serverTimestamp(),
  metadata: {
    status: 'sent',
    ...params.metadata,
  },
})

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
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('圖片大小不可超過 10MB')
  }

  const nowISO = new Date().toISOString()
  const ext = getFileExt(file.name, file.type)
  const safeName = sanitizeFileName(stripFileExt(file.name))
  const objectName = `${Date.now()}-${safeName}.${ext}`
  const fileName = file.name || `${safeName}.${ext}`
  const storageCandidates = [
    `messages/${params.senderId}/${objectName}`,
    `users/${params.senderId}/messages/${objectName}`,
  ]

  let latestStorageError: unknown = null
  for (const objectPath of storageCandidates) {
    try {
      const storageRef = ref(storage, objectPath)
      await uploadBytes(storageRef, file, {
        contentType: file.type || 'application/octet-stream',
      })
      const downloadURL = await getDownloadURL(storageRef)
      return addDoc(
        collection(db, 'messages'),
        createImageMessagePayload({
          senderId: params.senderId,
          senderName: params.senderName,
          receiverId: params.receiverId,
          orderId: params.orderId,
          content: downloadURL,
          timestampISO: nowISO,
          metadata: {
            fileName,
            fileType: file.type || 'image/*',
            fileSize: file.size,
            source: 'storage',
            storagePath: objectPath,
          },
        }),
      )
    } catch (err: unknown) {
      latestStorageError = err
      const errorCode = getErrorCode(err)
      if (errorCode !== 'storage/unauthorized' && errorCode !== 'storage/unknown') {
        throw err instanceof Error ? err : new Error('圖片發送失敗')
      }
    }
  }

  const inline = await buildInlineImageDataUrl(file)
  return addDoc(
    collection(db, 'messages'),
    createImageMessagePayload({
      senderId: params.senderId,
      senderName: params.senderName,
      receiverId: params.receiverId,
      orderId: params.orderId,
      content: inline.dataUrl,
      timestampISO: nowISO,
      metadata: {
        fileName,
        fileType: inline.mimeType,
        fileSize: file.size,
        source: 'firestore_inline',
        fallbackReason: latestStorageError ? getErrorCode(latestStorageError) || 'storage_upload_failed' : 'storage_upload_failed',
      },
    }),
  )
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
