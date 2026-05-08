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
  const [drawerOpen, setDrawerOpen] = useState(false)

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
      {/* Top App Bar */}
      <header style={styles.appBar}>
        <button style={styles.menuBtn} onClick={() => setDrawerOpen(true)}>
          <Icon name="menu" style={{ color: colors.primary }} />
        </button>
        <h1 style={styles.logo}>OpenCabs</h1>
        <div style={styles.headerAvatar} onClick={() => navigate('/profile')}>
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'U')}&background=ffddb8&color=855300`}
            alt="User"
          />
        </div>
      </header>

      {/* Side Drawer */}
      {drawerOpen && (
        <div style={styles.drawerWrapper}>
          <div style={styles.drawerOverlay} onClick={() => setDrawerOpen(false)} />
          <div style={styles.drawer}>
            <div style={styles.drawerHeader}>
              <h2 style={styles.drawerLogo}>OpenCabs</h2>
              <button style={styles.drawerClose} onClick={() => setDrawerOpen(false)}>
                <Icon name="close" style={{ fontSize: 24 }} />
              </button>
            </div>
            <nav style={styles.drawerNav}>
              <button style={styles.drawerItem} onClick={() => { setDrawerOpen(false); navigate('/passenger-home') }}>
                <Icon name="home" style={{ fontSize: 20 }} />
                <span>首頁</span>
              </button>
              <button style={styles.drawerItem} onClick={() => { setDrawerOpen(false); navigate('/browse-trips') }}>
                <Icon name="search" style={{ fontSize: 20 }} />
                <span>瀏覽行程</span>
              </button>
              <button style={styles.drawerItem} onClick={() => { setDrawerOpen(false); navigate('/my-requests') }}>
                <Icon name="assignment" style={{ fontSize: 20 }} />
                <span>我的需求</span>
              </button>
              <button style={styles.drawerItem} onClick={() => { setDrawerOpen(false); navigate('/my-trips') }}>
                <Icon name="directions_car" style={{ fontSize: 20 }} />
                <span>我的行程</span>
              </button>
              <button style={styles.drawerItem} onClick={() => { setDrawerOpen(false); navigate('/chats') }}>
                <Icon name="chat" style={{ fontSize: 20 }} />
                <span>收件箱</span>
              </button>
              <button style={styles.drawerItem} onClick={() => { setDrawerOpen(false); navigate('/profile') }}>
                <Icon name="person" style={{ fontSize: 20 }} />
                <span>個人資料</span>
              </button>
            </nav>
          </div>
        </div>
      )}

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
    paddingBottom: 140,
  },
  appBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    padding: '0 20px',
    height: 64,
    background: 'rgba(255,251,249,0.9)',
    backdropFilter: 'blur(12px)',
    borderBottom: `1px solid ${colors.outlineVariant}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuBtn: {
    padding: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '50%',
  },
  logo: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 20,
    fontWeight: 800,
    color: colors.primary,
    fontStyle: 'italic',
    letterSpacing: '-0.02em',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    overflow: 'hidden',
    border: `2px solid ${colors.outlineVariant}`,
  },
  drawerWrapper: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 280,
    height: '100%',
    background: colors.surface,
    boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
    padding: '20px 0',
  },
  drawerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px 20px',
    borderBottom: `1px solid ${colors.outlineVariant}`,
  },
  drawerLogo: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 20,
    fontWeight: 800,
    color: colors.primary,
    fontStyle: 'italic',
    letterSpacing: '-0.02em',
  },
  drawerClose: {
    padding: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '50%',
  },
  drawerNav: {
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  drawerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 16px',
    borderRadius: radius.lg,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 500,
    color: colors.textPrimary,
    transition: 'background 0.2s',
  },
  list: {
    padding: 16,
    paddingTop: 80,
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