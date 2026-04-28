// Cabs Carpool - Chats List Page
// 用戶的聊天室列表

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { chatService } from '../services/chatService'

export default function ChatsListPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser?.id) return

    loadRooms()

    // Subscribe to user's rooms
    const unsub = chatService.subscribeToUserRooms(currentUser.id, (userRooms) => {
      setRooms(userRooms.sort((a, b) => 
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      ))
      setLoading(false)
    })

    return () => unsub()
  }, [currentUser?.id])

  const loadRooms = async () => {
    // Initial load handled by subscription
  }

  const getOtherParticipant = (room: any) => {
    return room.participants?.find((p: any) => p.oderId !== currentUser?.id)
  }

  const formatTime = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const hours = diff / (1000 * 60 * 60)
    
    if (hours < 1) return '剛才'
    if (hours < 24) return `${Math.floor(hours)}小時前`
    if (hours < 48) return '昨天'
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  const isDriver = currentUser?.role === 'driver'

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(isDriver ? '/driver-home' : '/passenger-home')}>←</button>
        <div style={styles.title}>💬 我的聊天室</div>
        <div style={{width: 40}} />
      </header>

      {/* Chat List */}
      <div style={styles.list}>
        {loading ? (
          <div style={styles.empty}>載入中...</div>
        ) : rooms.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>💬</div>
            <div>暫時沒有聊天室</div>
            <div style={styles.emptySubtext}>
              {isDriver 
                ? '瀏覽乘客需求並聯絡他們吧！' 
                : '瀏覽司機行程並加入聊天吧！'}
            </div>
            <button 
              style={styles.browseBtn}
              onClick={() => navigate(isDriver ? '/passenger-requests' : '/browse-trips')}
            >
              {isDriver ? '📋 查看乘客需求' : '🚗 查看司機行程'}
            </button>
          </div>
        ) : (
          rooms.map(room => {
            const other = getOtherParticipant(room)
            return (
              <div 
                key={room.id} 
                style={styles.chatItem}
                onClick={() => navigate(`/chat/${room.id}`)}
              >
                <div style={styles.avatar}>
                  {other?.name?.charAt(0) || (other?.oderId ? '用' : '?')}
                </div>
                <div style={styles.chatContent}>
                  <div style={styles.chatHeader}>
                    <div style={styles.chatName}>
                      {other?.name || (other?.oderId ? `用戶${other.oderId.slice(0, 5)}` : '未知')}
                    </div>
                    <div style={styles.chatTime}>{formatTime(room.updatedAt)}</div>
                  </div>
                  <div style={styles.chatPreview}>
                    <span style={styles.routeTag}>
                      {room.roomType === 'trip' ? '🚗' : '📋'}
                    </span>
                    {room.topicPickup} → {room.topicDropoff}
                  </div>
                  {room.lastMessage && (
                    <div style={styles.lastMessage}>
                      {room.lastMessage.length > 30 
                        ? room.lastMessage.substring(0, 30) + '...' 
                        : room.lastMessage}
                    </div>
                  )}
                  {room.confirmedBy?.length === 2 && (
                    <div style={styles.confirmedBadge}>✅ 已確認</div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#fff9f5',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    background: '#fff',
    borderBottom: '2px solid #f0e0d6',
  },
  backBtn: {
    fontSize: 22,
    background: 'none',
    border: 'none',
    color: '#e07b4c',
    cursor: 'pointer',
  },
  title: {
    fontSize: 17,
    fontWeight: 600,
    color: '#4a3728',
  },
  list: {
    padding: 8,
  },
  chatItem: {
    display: 'flex',
    background: '#fff',
    border: '2px solid #f0e0d6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    cursor: 'pointer',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #e07b4c, #c4623a)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 600,
    marginRight: 12,
  },
  chatContent: {
    flex: 1,
    minWidth: 0,
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#4a3728',
  },
  chatTime: {
    fontSize: 12,
    color: '#8b7355',
  },
  chatPreview: {
    fontSize: 13,
    color: '#8b7355',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  routeTag: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 12,
    color: '#8b7355',
    marginTop: 4,
  },
  confirmedBadge: {
    display: 'inline-block',
    fontSize: 11,
    color: '#5a9a5a',
    background: '#e8f5e8',
    padding: '2px 8px',
    borderRadius: 10,
    marginTop: 4,
  },
  empty: {
    textAlign: 'center',
    padding: 40,
    color: '#8b7355',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 20,
    color: '#8b7355',
  },
  browseBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #e07b4c, #c4623a)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
