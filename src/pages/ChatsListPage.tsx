// Cabs Carpool - Chats List Page v2.0
// Redesigned to match PassengerHome design style

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { chatService } from '../services/chatService'
import { colors, radius } from '../styles/designSystem'
import BottomNav from '../components/BottomNav'

const Icon = ({ name, style = {} }: { name: string; style?: React.CSSProperties }) => (
  <span style={{
    fontFamily: "'Material Symbols Outlined'",
    fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
    fontSize: 20,
    ...style
  }}>{name}</span>
)

export default function ChatsListPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser?.id) return

    // Subscribe to user's rooms
    const unsub = chatService.subscribeToUserRooms(currentUser.id, (userRooms) => {
      setRooms(userRooms.sort((a, b) => 
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      ))
      setLoading(false)
    })

    return () => unsub()
  }, [currentUser?.id])

  const getOtherParticipant = (room: any) => {
    return room.participants?.find((p: any) => p.passengerId !== currentUser?.id)
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
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.headerTitle}>💬 聊天室</h1>
            <p style={styles.headerSubtitle}>
              {currentUser?.name ? `${currentUser.name}` : '用戶'}
            </p>
          </div>
          <button onClick={() => navigate('/profile')} style={styles.profileBtn}>
            👤
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div style={styles.list}>
        {loading ? (
          <div style={styles.empty}>
            <Icon name="progress_activity" style={{ fontSize: 48, color: colors.tertiary }} />
            <p>載入中...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div style={styles.empty}>
            <Icon name="chat_bubble" style={{ fontSize: 48, color: colors.tertiary }} />
            <p>暫時沒有聊天室</p>
            <p style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>
              {isDriver 
                ? '瀏覽乘客需求並聯絡他們吧！' 
                : '瀏覽司機行程並加入聊天吧！'}
            </p>
            <button 
              style={styles.browseBtn}
              onClick={() => navigate(isDriver ? '/browse-requests' : '/browse-trips')}
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
                <div style={styles.avatarWrapper}>
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(other?.name || 'U')}&background=dee8ff&color=1d4ed8&size=64`}
                    alt={other?.name || 'User'}
                    style={styles.avatar}
                  />
                  <span style={styles.roomTypeIcon}>
                    {room.roomType === 'trip' ? '🚗' : '📋'}
                  </span>
                </div>
                
                <div style={styles.chatContent}>
                  <div style={styles.chatHeader}>
                    <div style={styles.chatName}>
                      {other?.name || (other?.passengerId ? `用戶${other.passengerId.slice(0, 5)}` : '未知')}
                    </div>
                    <div style={styles.chatTime}>{formatTime(room.updatedAt)}</div>
                  </div>
                  
                  <div style={styles.routePreview}>
                    <span style={styles.routeDot}>●</span>
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
                    <div style={styles.confirmedBadge}>✅ 已確認共乘</div>
                  )}
                </div>
                
                <div style={styles.chevron}>
                  <Icon name="chevron_right" style={{ fontSize: 20, color: colors.textLight }} />
                </div>
              </div>
            )
          })
        )}
      </div>

      <BottomNav />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: colors.background,
    paddingBottom: 100,
  },
  header: {
    background: colors.white,
    padding: '16px',
    borderBottom: `1px solid ${colors.border}`,
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    margin: '4px 0 0',
    fontSize: 13,
    color: colors.textSecondary,
  },
  profileBtn: {
    padding: '8px 12px',
    background: colors.primaryLight,
    border: 'none',
    borderRadius: radius.sm,
    fontSize: 16,
    cursor: 'pointer',
  },
  list: {
    padding: 16,
  },
  chatItem: {
    display: 'flex',
    alignItems: 'center',
    background: colors.white,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    cursor: 'pointer',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: '50%',
    border: '2px solid #dee8ff',
  },
  roomTypeIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 12,
  },
  chatContent: {
    flex: 1,
    minWidth: 0,
  },
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 15,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  chatTime: {
    fontSize: 12,
    color: colors.textLight,
  },
  routePreview: {
    fontSize: 13,
    color: colors.textSecondary,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  routeDot: {
    fontSize: 8,
    color: colors.primary,
  },
  lastMessage: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  confirmedBadge: {
    display: 'inline-block',
    fontSize: 11,
    color: colors.success,
    background: colors.successBg,
    padding: '2px 8px',
    borderRadius: radius.full,
    marginTop: 6,
  },
  chevron: {
    marginLeft: 8,
  },
  empty: {
    textAlign: 'center' as const,
    padding: 60,
    color: colors.textSecondary,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  browseBtn: {
    marginTop: 16,
    padding: '12px 24px',
    background: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: radius.md,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}