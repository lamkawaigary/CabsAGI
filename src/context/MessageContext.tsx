import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import {
  markConversationAsRead,
  sendTextMessage,
  subscribeMessagesByReceiver,
  subscribeMessagesBySender,
  type MessageRecord,
} from '../services/messageService'

interface MessageContextValue {
  messages: MessageRecord[]
  loading: boolean
  error: string | null
  activePartnerId: string | null
  activeOrderId: string | null
  openConversation: (partnerId: string, orderId?: string | null) => Promise<void>
  closeConversation: () => void
  sendMessage: (receiverId: string, content: string, orderId?: string) => Promise<void>
  markAsRead: (partnerId: string, orderId?: string | null) => Promise<void>
}

const MessageContext = createContext<MessageContextValue | undefined>(undefined)

const mergeAndSort = (...groups: MessageRecord[][]): MessageRecord[] => {
  const map = new Map<string, MessageRecord>()
  groups.flat().forEach((m) => map.set(m.id, m))
  return Array.from(map.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export function MessageProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth()
  const [sent, setSent] = useState<MessageRecord[]>([])
  const [recv, setRecv] = useState<MessageRecord[]>([])
  const [broadcast, setBroadcast] = useState<MessageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activePartnerId, setActivePartnerId] = useState<string | null>(null)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUser?.id) {
      setSent([])
      setRecv([])
      setBroadcast([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const onSubError = (e: Error) => {
      setError(e.message || '讀取訊息失敗')
      setLoading(false)
    }

    const unsubSent = subscribeMessagesBySender(currentUser.id, (rows) => {
      setSent(rows)
      setLoading(false)
    }, onSubError)

    const unsubRecv = subscribeMessagesByReceiver(currentUser.id, (rows) => {
      setRecv(rows)
      setLoading(false)
    }, onSubError)

    const unsubBroadcast = subscribeMessagesByReceiver('ALL', (rows) => {
      setBroadcast(rows)
      setLoading(false)
    }, onSubError)

    return () => {
      unsubSent()
      unsubRecv()
      unsubBroadcast()
    }
  }, [currentUser?.id])

  const messages = useMemo(() => mergeAndSort(sent, recv, broadcast), [sent, recv, broadcast])

  const markAsRead = async (partnerId: string, orderId?: string | null) => {
    if (!currentUser?.id) return
    try {
      await markConversationAsRead({ currentUserId: currentUser.id, partnerId, orderId })
    } catch {
      // non-blocking
    }
  }

  const openConversation = async (partnerId: string, orderId?: string | null) => {
    setActivePartnerId(partnerId)
    setActiveOrderId(orderId || null)
    await markAsRead(partnerId, orderId)
  }

  const closeConversation = () => {
    setActivePartnerId(null)
    setActiveOrderId(null)
  }

  const sendMessage = async (receiverId: string, content: string, orderId?: string) => {
    if (!currentUser?.id) throw new Error('尚未登入')
    const trimmed = content.trim()
    if (!trimmed) return

    await sendTextMessage({
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId,
      content: trimmed,
      orderId,
    })
  }

  const value: MessageContextValue = {
    messages,
    loading,
    error,
    activePartnerId,
    activeOrderId,
    openConversation,
    closeConversation,
    sendMessage,
    markAsRead,
  }

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
}

export const useMessage = () => {
  const ctx = useContext(MessageContext)
  if (!ctx) throw new Error('useMessage must be used within MessageProvider')
  return ctx
}
