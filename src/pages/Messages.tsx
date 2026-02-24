import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useMessage } from '../context/MessageContext'
import type { OrderRecord } from '../services/orderService'

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

export default function Messages({ orders = [] }: MessagesProps) {
  const { currentUser } = useAuth()
  const { messages, loading, error, activePartnerId, activeOrderId, openConversation, sendMessage } = useMessage()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

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

      const orderTitle = orderId ? orders.find((o) => o.id === orderId)?.id || `訂單 ${orderId.slice(0, 8)}` : ''
      const title = partnerId === SUPPORT_ID || partnerId === 'SYSTEM' ? '客服中心' : `對話 ${partnerId.slice(0, 8)}`
      const subtitle = orderTitle ? `${orderTitle} · ${m.content || '(無內容)'}` : m.content || '(無內容)'
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

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 10 }}>
      <h2 style={{ margin: 0, color: '#1e4038' }}>訊息中心</h2>

      {error && (
        <div style={{ background: '#fff2ef', border: '1px solid #edc2bb', borderRadius: 12, padding: 12, color: '#9c3d31' }}>
          Firebase 訊息讀取失敗: {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 10 }}>
        <section style={{ background: '#fff', border: '1px solid #dce6dd', borderRadius: 14, padding: 12, minHeight: 420 }}>
          <button
            onClick={() => void openConversation(SUPPORT_ID, null)}
            style={{ width: '100%', border: '1px solid #d4e2d8', background: '#f3faf6', borderRadius: 10, padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#244a3f', cursor: 'pointer' }}
          >
            + 聯絡客服
          </button>

          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {loading ? (
              <div style={{ color: '#6f847d', fontSize: 13 }}>載入訊息中...</div>
            ) : conversations.length === 0 ? (
              <div style={{ color: '#6f847d', fontSize: 13 }}>暫時無對話</div>
            ) : (
              conversations.map((conv) => {
                const active = conv.partnerId === activePartnerId && (conv.orderId || null) === (activeOrderId || null)
                return (
                  <button
                    key={conv.key}
                    onClick={() => void openConversation(conv.partnerId, conv.orderId)}
                    style={{ border: '1px solid #dce6dd', background: active ? '#eaf4ef' : '#fff', borderRadius: 10, padding: 10, textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#214239', fontSize: 13 }}>{conv.title}</strong>
                      {conv.unread > 0 && (
                        <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: '#1f4f43', color: '#fff', fontSize: 11, display: 'grid', placeItems: 'center', padding: '0 4px' }}>
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 4, color: '#5f746d', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.subtitle}</div>
                    <div style={{ marginTop: 4, color: '#8a9a94', fontSize: 11 }}>{new Date(conv.time).toLocaleString()}</div>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section style={{ background: '#fff', border: '1px solid #dce6dd', borderRadius: 14, padding: 12, minHeight: 420, display: 'grid', gridTemplateRows: '1fr auto', gap: 10 }}>
          <div style={{ overflow: 'auto', display: 'grid', gap: 8 }}>
            {!activePartnerId ? (
              <div style={{ color: '#6f847d', fontSize: 13 }}>選擇左側對話，或直接「聯絡客服」。</div>
            ) : activeMessages.length === 0 ? (
              <div style={{ color: '#6f847d', fontSize: 13 }}>尚未有訊息，開始發送第一句。</div>
            ) : (
              activeMessages.map((m) => {
                const mine = m.senderId === currentUser?.id
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
                    <div>{m.content || '(空訊息)'}</div>
                    <div style={{ marginTop: 4, opacity: 0.7, fontSize: 11 }}>{new Date(m.timestamp).toLocaleString()}</div>
                  </div>
                )
              })
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!activePartnerId || sending}
              placeholder={activePartnerId ? '輸入訊息...' : '先選擇對話'}
              style={{ flex: 1, border: '1px solid #d6dfd6', borderRadius: 10, padding: '10px 12px', outline: 'none', fontSize: 13 }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!activePartnerId || !input.trim() || sending}
              style={{ border: 0, borderRadius: 10, padding: '10px 14px', background: !activePartnerId || !input.trim() || sending ? '#e8e8e4' : '#1f4f43', color: !activePartnerId || !input.trim() || sending ? '#8d8a80' : '#effff7', fontWeight: 700, cursor: !activePartnerId || !input.trim() || sending ? 'not-allowed' : 'pointer' }}
            >
              發送
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
