import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useMessage } from '../context/MessageContext'
import type { OrderRecord } from '../services/orderService'
import { UI_TEXT } from '../constants/uiText'

interface MessagesProps {
  orders?: OrderRecord[]
}

type ConversationItem = {
  key: string
  partnerId: string
  orderId: string | null
  title: string
  subtitle: string
  time: string
  unread: number
}

const SUPPORT_ID = 'SYSTEM_ADMIN'

const alertClass = 'ui-notice ui-notice-error'

export default function Messages({ orders = [] }: MessagesProps) {
  const { currentUser } = useAuth()
  const {
    messages,
    loading,
    error,
    activePartnerId,
    activeOrderId,
    openConversation,
    closeConversation,
    sendMessage,
    sendImage,
  } = useMessage()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const toConversationSubtitle = (type: 'TEXT' | 'IMAGE' | 'SYSTEM', content: string) => {
    if (type === 'IMAGE') return '📷 圖片'
    return content || '(無內容)'
  }

  const conversations = useMemo<ConversationItem[]>(() => {
    if (!currentUser?.id) return []

    const map = new Map<string, ConversationItem>()

    messages.forEach((m) => {
      const isRelated =
        m.senderId === currentUser.id ||
        m.receiverId === currentUser.id ||
        (m.receiverId === 'ALL' && m.type === 'SYSTEM')

      if (!isRelated) return

      const partnerId = m.receiverId === currentUser.id ? m.senderId : m.receiverId === 'ALL' ? 'SYSTEM' : m.receiverId
      if (!partnerId || partnerId === currentUser.id) return

      const orderId = m.orderId || null
      const key = `${partnerId}::${orderId || 'general'}`
      const existing = map.get(key)
      const isUnread = m.receiverId === currentUser.id && !m.isRead

      // Build order info: time + route
      let orderInfo = ''
      if (orderId) {
        const order = orders.find((o) => o.id === orderId)
        if (order) {
          const time = order.bookingDateTime 
            ? new Date(order.bookingDateTime).toLocaleString('zh-HK', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : ''
          const route = order.pickup && order.dropoff 
            ? `${order.pickup} → ${order.dropoff}` 
            : order.pickup || order.dropoff || ''
          orderInfo = time ? `${time} · ${route}` : route
        } else {
          orderInfo = `訂單 ${orderId.slice(0, 8)}`
        }
      }
      const title = partnerId === SUPPORT_ID || partnerId === 'SYSTEM' ? '客服中心' : (orderInfo || `對話 ${partnerId.slice(0, 8)}`)
      const preview = toConversationSubtitle(m.type, m.content)
      // Only show message preview in subtitle (order info is already in title)
      const subtitle = preview
      const time = m.timestamp

      if (!existing) {
        map.set(key, {
          key,
          partnerId,
          orderId,
          title,
          subtitle,
          time,
          unread: isUnread ? 1 : 0,
        })
        return
      }

      if (new Date(time).getTime() > new Date(existing.time).getTime()) {
        existing.subtitle = subtitle
        existing.time = time
      }
      if (isUnread) existing.unread += 1
    })

    return Array.from(map.values()).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  }, [messages, currentUser?.id, orders])

  const activeMessages = useMemo(() => {
    if (!currentUser?.id || !activePartnerId) return []

    return messages
      .filter((m) => {
        const related =
          (m.senderId === currentUser.id && m.receiverId === activePartnerId) ||
          (m.senderId === activePartnerId && m.receiverId === currentUser.id)

        if (!related) return false
        if (activeOrderId) return m.orderId === activeOrderId
        return !m.orderId
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [messages, currentUser?.id, activePartnerId, activeOrderId])

  const handleSend = async () => {
    if (!activePartnerId || !input.trim()) return
    setSending(true)
    try {
      await sendMessage(activePartnerId, input, activeOrderId || undefined)
      setInput('')
    } finally {
      setSending(false)
    }
  }

  const handlePickImage = () => {
    setUploadError(null)
    imageInputRef.current?.click()
  }

  const handleImageSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !activePartnerId) return

    setUploadError(null)
    setUploadingImage(true)
    try {
      await sendImage(activePartnerId, file, activeOrderId || undefined)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '圖片發送失敗'
      setUploadError(message)
    } finally {
      setUploadingImage(false)
    }
  }

  const activeConversationTitle = useMemo(() => {
    if (!activePartnerId) return '訊息內容'
    const match = conversations.find(
      (item) => item.partnerId === activePartnerId && (item.orderId || null) === (activeOrderId || null),
    )
    
    // If there's an order ID, show order details in title
    if (activeOrderId) {
      const order = orders.find(o => o.id === activeOrderId)
      if (order) {
        const route = order.pickup && order.dropoff 
          ? `${order.pickup} → ${order.dropoff}` 
          : '路線'
        const time = order.bookingDateTime 
          ? new Date(order.bookingDateTime).toLocaleString('zh-HK', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : ''
        return time ? `${time} · ${route}` : route
      }
    }
    
    return match?.title || (activePartnerId === SUPPORT_ID ? '客服中心' : `對話 ${activePartnerId.slice(0, 8)}`)
  }, [activePartnerId, activeOrderId, conversations, orders])

  return (
    <div className="ui-page" style={{ gap: 10 }}>
      <h2 className="ui-title">訊息中心</h2>

      {error && (
        <div className={alertClass}>
          {UI_TEXT.error.readMessages}: {error}
        </div>
      )}
      {uploadError && (
        <div className={alertClass}>
          {UI_TEXT.error.uploadImage}: {uploadError}
        </div>
      )}

      {!activePartnerId ? (
        <section className="ui-card" style={{ padding: 12 }}>
          <button
            onClick={() => void openConversation(SUPPORT_ID, null)}
            className="ui-btn ui-btn-secondary"
            style={{ width: '100%', textAlign: 'left' }}
          >
            + 聯絡客服
          </button>

          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {loading ? (
              <div className="ui-empty-state" style={{ fontSize: 13, padding: 16 }}>{UI_TEXT.loading.messages}</div>
            ) : conversations.length === 0 ? (
              <div className="ui-empty-state" style={{ fontSize: 13, padding: 16 }}>{UI_TEXT.empty.messages}</div>
            ) : (
              conversations.map((conv) => {
                return (
                  <button
                    key={conv.key}
                    onClick={() => void openConversation(conv.partnerId, conv.orderId)}
                    className="ui-card-muted ui-clickable-surface"
                    style={{ textAlign: 'left', cursor: 'pointer', padding: 10 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <strong style={{ color: '#214239', fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{conv.title}</strong>
                      {conv.unread > 0 && (
                        <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: '#1f4f43', color: '#fff', fontSize: 11, display: 'grid', placeItems: 'center', padding: '0 4px', flexShrink: 0 }}>
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 4, color: '#5f746d', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.subtitle}</div>
                    <div style={{ marginTop: 4, color: '#8a9a94', fontSize: 11 }}>{new Date(conv.time).toLocaleString('zh-HK', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </button>
                )
              })
            )}
          </div>
        </section>
      ) : (
        <section
          className="ui-card"
          style={{
            padding: 12,
            minHeight: 420,
            display: 'grid',
            gridTemplateRows: 'auto 1fr auto',
            gap: 10,
          }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => {
                  closeConversation()
                  setInput('')
                }}
                className="ui-btn ui-btn-outline"
                style={{ padding: '6px 10px' }}
              >
                返回
              </button>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#27483f' }}>{activeConversationTitle}</div>
            </div>

          <div style={{ overflow: 'auto', display: 'grid', gap: 8 }}>
            {activeMessages.length === 0 ? (
              <div className="ui-empty-state" style={{ fontSize: 13, padding: 16 }}>
                目前尚無訊息，開始發送第一句吧。
              </div>
            ) : (
              activeMessages.map((m) => {
                const mine = m.senderId === currentUser?.id
                const fileName =
                  m.metadata && typeof m.metadata.fileName === 'string' ? m.metadata.fileName : '圖片'
                return (
                  <div
                    key={m.id}
                    style={{
                      justifySelf: mine ? 'end' : 'start',
                      maxWidth: '78%',
                      background: mine ? '#1f4f43' : '#f3f6f4',
                      color: mine ? '#effff7' : '#2f4e46',
                      borderRadius: 12,
                      padding: '8px 10px',
                      fontSize: 13,
                    }}
                  >
                    {m.type === 'IMAGE' ? (
                      <a href={m.content} target="_blank" rel="noreferrer" style={{ display: 'grid', gap: 6, color: 'inherit', textDecoration: 'none' }}>
                        <img
                          src={m.content}
                          alt={fileName}
                          loading="lazy"
                          style={{
                            width: '100%',
                            maxWidth: 230,
                            borderRadius: 10,
                            border: mine ? '1px solid rgba(239,255,247,0.35)' : '1px solid #dbe5e0',
                            objectFit: 'cover',
                          }}
                        />
                        <span style={{ fontSize: 11, opacity: 0.8 }}>{fileName}</span>
                      </a>
                    ) : (
                      <div>{m.content || '(空訊息)'}</div>
                    )}
                    <div style={{ marginTop: 4, opacity: 0.7, fontSize: 11 }}>{new Date(m.timestamp).toLocaleString()}</div>
                  </div>
                )
              })
            )}
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => void handleImageSelected(event)}
            style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handlePickImage}
              disabled={uploadingImage || sending}
              className="ui-btn ui-btn-outline"
              style={{ whiteSpace: 'nowrap' }}
            >
              {uploadingImage ? '上傳中...' : '圖片'}
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending || uploadingImage}
              placeholder="輸入訊息..."
              className="ui-input"
              style={{ flex: 1, fontSize: 13 }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || sending || uploadingImage}
              className="ui-btn ui-btn-primary"
              style={{ padding: '10px 14px' }}
            >
              發送
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
