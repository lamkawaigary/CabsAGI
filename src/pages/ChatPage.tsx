// Cabs Carpool - Chat Page v3.1
// 核心理念：聊天室是共乘的核心，Host/Guest 角色，確認後記錄為共乘

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { chatService, messageService } from '../services/chatService'

export default function ChatPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  
  const [room, setRoom] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [allConfirmed, setAllConfirmed] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!roomId) return
    
    loadRoom()
    
    const unsubMessages = messageService.subscribeToMessages(roomId, (msgs) => {
      setMessages(msgs)
    })
    
    return () => {
      unsubMessages()
    }
  }, [roomId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadRoom = async () => {
    if (!roomId) return
    const roomData = await chatService.getRoom(roomId)
    if (roomData) {
      setRoom(roomData)
      if (currentUser?.id && roomData.confirmedBy?.includes(currentUser.id)) {
        setConfirmed(true)
      }
      // Check if both driver and passenger confirmed
      const driverConfirmed = roomData.confirmedBy?.some((id: string) => {
        const p = roomData.participants?.find((pt: any) => pt.oderId === id)
        return p?.role === 'driver'
      })
      const passengerConfirmed = roomData.confirmedBy?.some((id: string) => {
        const p = roomData.participants?.find((pt: any) => pt.oderId === id)
        return p?.role === 'passenger'
      })
      if (driverConfirmed && passengerConfirmed) {
        setAllConfirmed(true)
      }
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !roomId || !currentUser) return
    
    setSending(true)
    try {
      await messageService.send({
        conversationId: roomId,
        senderId: currentUser.id,
        senderName: currentUser.name || 'User',
        senderRole: currentUser.role as 'driver' | 'passenger',
        content: newMessage.trim()
      })
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send:', error)
    } finally {
      setSending(false)
    }
  }

  const handleConfirm = async () => {
    if (!roomId || !currentUser) return
    
    try {
      await chatService.confirmRide(roomId, currentUser.id)
      setConfirmed(true)
      
      await messageService.send({
        conversationId: roomId,
        senderId: 'system',
        senderName: '系統',
        senderRole: 'passenger',
        content: `✅ ${currentUser.name} 確認了共乘！`,
        messageType: 'system'
      })
      
      // Reload room to check if both confirmed
      loadRoom()
    } catch (error) {
      console.error('Failed to confirm:', error)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  const isOwn = (msg: any) => msg.senderId === currentUser?.id

  if (!room) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>載入中...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>←</button>
        <div style={styles.headerCenter}>
          <div style={styles.headerTitle}>
            {room.roomType === 'trip' ? '🚗 行程' : '📝 需求'}
          </div>
          <div style={styles.headerSub}>
            {room.topicPickup} → {room.topicDropoff}
          </div>
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* Participant Info */}
      <div style={styles.infoBar}>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>👤 參與者：</span>
          {room.participants?.map((p: any) => (
            <span key={p.oderId} style={{
              ...styles.participantTag,
              background: p.oderId === room.hostId ? '#e3f2fd' : '#f5f5f5',
              border: p.oderId === room.hostId ? '1px solid #1e88e5' : '1px solid #ddd',
            }}>
              {p.name} {p.oderId === room.hostId ? '(Host)' : '(Guest)'}
            </span>
          ))}
        </div>
        {room.topicTime && (
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>🕐 時間：</span>
            {room.topicTime}
          </div>
        )}
      </div>

      {/* Confirm Status */}
      {room.status === 'active' && !allConfirmed && (
        <div style={styles.confirmBar}>
          <div style={styles.confirmInfo}>
            <span>確認狀態：</span>
            {room.participants?.map((p: any) => {
              const isConfirmed = room.confirmedBy?.includes(p.oderId)
              return (
                <span key={p.oderId} style={{
                  ...styles.confirmTag,
                  background: isConfirmed ? '#c8e6c9' : '#ffecb3',
                  color: isConfirmed ? '#2e7d32' : '#f57c00',
                }}>
                  {p.name}: {isConfirmed ? '✅' : '⏳'}
                </span>
              )
            })}
          </div>
          {confirmed ? (
            <div style={styles.confirmed}>✅ 你已確認</div>
          ) : (
            <button onClick={handleConfirm} style={styles.confirmBtn}>
              ✅ 確認共乘
            </button>
          )}
        </div>
      )}

      {allConfirmed && (
        <div style={styles.successBar}>
          🎉 雙方已確認！共乘達成！
        </div>
      )}

      {/* Messages */}
      <div style={styles.messages}>
        {messages.length === 0 ? (
          <div style={styles.empty}>
            暫時沒有訊息<br/>
            <small>開始聊天吧！</small>
          </div>
        ) : (
          messages.map((msg) => (
            msg.messageType === 'system' ? (
              <div key={msg.id} style={styles.systemMsg}>
                {msg.content}
              </div>
            ) : (
              <div
                key={msg.id}
                style={{
                  ...styles.msg,
                  ...(isOwn(msg) ? styles.myMsg : styles.otherMsg)
                }}
              >
                {!isOwn(msg) && (
                  <div style={styles.senderName}>
                    {msg.senderName}
                    {msg.senderId === room.hostId && <span style={styles.hostBadge}>Host</span>}
                  </div>
                )}
                <div style={styles.msgContent}>{msg.content}</div>
                <div style={styles.msgTime}>{formatTime(msg.createdAt)}</div>
              </div>
            )
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {room.status === 'active' && (
        <div style={styles.inputArea}>
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="輸入訊息..."
            style={styles.input}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            style={styles.sendBtn}
          >
            Send
          </button>
        </div>
      )}

      {room.status === 'closed' && (
        <div style={styles.closedBar}>
          聊天室已關閉
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#f5f5f5',
  },
  loading: {
    textAlign: 'center',
    padding: 40,
    color: '#666',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#143b34',
    color: '#fff',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: 20,
    cursor: 'pointer',
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    textAlign: 'center',
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: 16,
  },
  headerSub: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  infoBar: {
    background: '#fff',
    padding: '10px 16px',
    borderBottom: '1px solid #eee',
    fontSize: 13,
  },
  infoItem: {
    marginBottom: 4,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  infoLabel: {
    fontWeight: 500,
    color: '#666',
  },
  participantTag: {
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 12,
  },
  confirmInfo: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    flex: 1,
  },
  confirmTag: {
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 12,
  },
  confirmBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    background: '#fff8e1',
    borderBottom: '1px solid #ffe082',
    flexWrap: 'wrap',
  },
  confirmBtn: {
    padding: '8px 16px',
    background: '#143b34',
    color: '#fff',
    border: 'none',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmed: {
    fontSize: 13,
    color: '#2e7d32',
    fontWeight: 500,
  },
  successBar: {
    textAlign: 'center',
    padding: '12px 16px',
    background: '#c8e6c9',
    color: '#2e7d32',
    fontWeight: 600,
    fontSize: 14,
  },
  messages: {
    flex: 1,
    overflow: 'auto',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    marginTop: 60,
    lineHeight: 1.6,
  },
  systemMsg: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    padding: '4px 12px',
    background: '#f0f0f0',
    borderRadius: 12,
    alignSelf: 'center',
  },
  msg: {
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: 16,
  },
  myMsg: {
    alignSelf: 'flex-end',
    background: '#143b34',
    color: '#fff',
    borderBottomRightRadius: 4,
  },
  otherMsg: {
    alignSelf: 'flex-start',
    background: '#fff',
    color: '#333',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 2,
    opacity: 0.8,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  hostBadge: {
    fontSize: 10,
    background: '#1e88e5',
    color: '#fff',
    padding: '1px 4px',
    borderRadius: 4,
  },
  msgContent: {
    fontSize: 15,
    lineHeight: 1.4,
  },
  msgTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
    textAlign: 'right',
  },
  inputArea: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#fff',
    borderTop: '1px solid #eee',
    gap: 8,
  },
  input: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: 20,
    border: '1px solid #ddd',
    fontSize: 15,
    outline: 'none',
  },
  sendBtn: {
    padding: '10px 18px',
    borderRadius: 20,
    border: 'none',
    background: '#143b34',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  closedBar: {
    textAlign: 'center',
    padding: 14,
    background: '#f5f5f5',
    color: '#666',
    fontSize: 13,
  },
}
