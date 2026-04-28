// Cabs Carpool - Notification Banner
// 登入後有新聊天或報價時顯示彈出提示

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatService } from '../services/chatService'
import { priceQuoteService } from '../services/priceQuoteService'
import type { AuthUser } from '../context/AuthContext'

interface NotificationItem {
  id: string
  type: 'new_message' | 'new_quote' | 'quote_accepted'
  roomId: string
  roomName: string
  message?: string
  quoteAmount?: number
  timestamp: string
}

interface NotificationBannerProps {
  currentUser: AuthUser | null
}

export default function NotificationBanner({ currentUser }: NotificationBannerProps) {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [visible, setVisible] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const lastCheckedRef = useRef<string>(new Date().toISOString())
  
  useEffect(() => {
    if (!currentUser) return
    
    // Poll for new notifications every 10 seconds
    const interval = setInterval(() => {
      checkForNewNotifications()
    }, 10000)
    
    // Initial check
    checkForNewNotifications()
    
    return () => clearInterval(interval)
  }, [currentUser])
  
  const checkForNewNotifications = async () => {
    if (!currentUser) return
    
    try {
      // Get user's chat rooms
      const rooms = await chatService.getUserRooms(currentUser.id)
      
      for (const room of rooms || []) {
        // Check for new messages since last check
        const messages = await chatService.getRoomMessages(room.id)
        const newMessages = messages.filter(m => 
          m.createdAt > lastCheckedRef.current &&
          m.senderId !== currentUser.id // Don't notify for own messages
        )
        
        if (newMessages.length > 0) {
          const latest = newMessages[newMessages.length - 1]
          addNotification({
            id: `msg_${latest.id || Date.now()}`,
            type: 'new_message',
            roomId: room.id,
            roomName: room.topicPickup && room.topicDropoff 
              ? `${room.topicPickup} → ${room.topicDropoff}` 
              : '新聊天',
            message: latest.content?.substring(0, 50) || '有新消息',
            timestamp: latest.createdAt || new Date().toISOString(),
          })
        }
        
        // Check for new quotes
        try {
          const quotes = await priceQuoteService.getRoomQuotes(room.id)
          const newQuotes = quotes.filter(q => 
            q.createdAt > lastCheckedRef.current &&
            q.oderId !== currentUser.id // Don't notify for own quotes
          )
          
          for (const quote of newQuotes) {
            addNotification({
              id: `quote_${quote.id || Date.now()}`,
              type: 'new_quote',
              roomId: room.id,
              roomName: room.topicPickup && room.topicDropoff 
                ? `${room.topicPickup} → ${room.topicDropoff}` 
                : '新報價',
              message: `司機提出 HK$ ${quote.pricePerSeat}/位`,
              quoteAmount: quote.pricePerSeat,
              timestamp: quote.createdAt || new Date().toISOString(),
            })
          }
        } catch (e) {
          // Ignore quote errors
        }
      }
      
      lastCheckedRef.current = new Date().toISOString()
    } catch (error) {
      console.warn('Error checking notifications:', error)
    }
  }
  
  const addNotification = (notification: NotificationItem) => {
    // Avoid duplicates
    if (notifications.some(n => n.id === notification.id)) return
    
    setNotifications(prev => [notification, ...prev])
    if (!visible) {
      setVisible(true)
      setCurrentIndex(0)
    }
  }
  
  const handleClick = () => {
    if (notifications.length === 0) return
    
    const current = notifications[currentIndex]
    if (current) {
      navigate(`/chat/${current.roomId}`)
    }
    setVisible(false)
    setNotifications([])
    setCurrentIndex(0)
  }
  
  const handleDismiss = () => {
    setVisible(false)
  }
  
  if (!visible || notifications.length === 0 || !currentUser) return null
  
  const current = notifications[currentIndex]
  const isQuote = current?.type === 'new_quote'
  
  return (
    <div style={styles.banner} onClick={handleClick}>
      <div style={styles.content}>
        <div style={styles.icon}>
          {isQuote ? '💰' : '💬'}
        </div>
        <div style={styles.text}>
          <div style={styles.title}>
            {isQuote ? '新報價' : '新消息'}
          </div>
          <div style={styles.subtitle}>
            {current?.roomName}
          </div>
          <div style={styles.message}>
            {current?.message}
          </div>
        </div>
        <div style={styles.actions}>
          <button style={styles.viewBtn} onClick={handleClick}>
            查看
          </button>
          <button style={styles.dismissBtn} onClick={(e) => { e.stopPropagation(); handleDismiss(); }}>
            ✕
          </button>
        </div>
      </div>
      {notifications.length > 1 && (
        <div style={styles.pagination}>
          {currentIndex + 1} / {notifications.length}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    position: 'fixed',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    padding: '12px 16px',
    zIndex: 9999,
    maxWidth: '90vw',
    width: 360,
    cursor: 'pointer',
    border: '2px solid #e07b4c',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 28,
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: '#fff9f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e07b4c',
  },
  subtitle: {
    fontSize: 12,
    color: '#4a3728',
    marginTop: 2,
    fontWeight: 500,
  },
  message: {
    fontSize: 11,
    color: '#8b7355',
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: 180,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  viewBtn: {
    padding: '6px 12px',
    background: '#e07b4c',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
  dismissBtn: {
    padding: '4px 8px',
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: 14,
    cursor: 'pointer',
  },
  pagination: {
    textAlign: 'center' as const,
    fontSize: 10,
    color: '#999',
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid #f0e0d6',
  },
}