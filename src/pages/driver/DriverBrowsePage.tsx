// Cabs Carpool - Driver Browse Page (Passenger Requests) v1.1
// 司機瀏覽乘客需求

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestService } from '../../services/tripService'
import { chatService } from '../../services/chatService'
import { useAuth } from '../../context/AuthContext'
import BottomNav from '../../components/BottomNav'

export default function DriverBrowsePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingRoom, setCreatingRoom] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const allRequests = await requestService.getPublicRequests()
      setRequests(allRequests)
    } catch (error) {
      console.error('Error loading:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContact = async (request: any) => {
    if (!currentUser) {
      navigate('/profile')
      return
    }

    try {
      setCreatingRoom(request.id)
      
      // Create a chat room for this request
      const roomId = await chatService.createRequestChatRoom({
        requestId: request.id,
        passengerId: request.passengerId,
        passengerName: request.passengerName || '乘客',
        passengerPhone: request.passengerPhone || '',
        pickup: request.pickup?.placeName || request.pickup || '',
        dropoff: request.dropoff?.placeName || request.dropoff || '',
        departureDate: request.departureDate || '',
      })

      // Add driver to the chat room
      await chatService.joinChatRoom(roomId, {
        oderId: currentUser.id,
        name: currentUser.name || '司機',
        role: 'driver',
        phone: currentUser.phone || '',
      })

      // Navigate to the chat room
      navigate(`/chat/${roomId}`)
    } catch (error) {
      console.error('Error creating chat room:', error)
      alert('創建聊天室失敗')
    } finally {
      setCreatingRoom(null)
    }
  }

  const getPickup = (item: any) => item.pickup?.placeName || item.pickup || '未知'
  const getDropoff = (item: any) => item.dropoff?.placeName || item.dropoff || '未知'

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/driver-home')}>←</button>
        <div style={styles.title}>📋 乘客需求</div>
        <div style={{width: 40}} />
      </header>

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.empty}>載入中...</div>
        ) : requests.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>📋</div>
            <div>暫時沒有乘客需求</div>
            <div style={styles.emptySubtext}>成為第一位回應需求的司機！</div>
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} style={styles.card}>
              <div style={styles.cardRoute}>
                📍 {getPickup(req)} → {getDropoff(req)}
              </div>
              <div style={styles.cardInfo}>
                <span style={styles.badgeOpen}>🟢 開放中</span>
                <span>{req.departureDate || '時間待定'}</span>
                <span>{req.passengerName || '乘客'}</span>
              </div>
              <div style={styles.cardBottom}>
                <span style={styles.seats}>👥 {req.passengerCount || 1}位</span>
              </div>
              {req.notes && (
                <div style={styles.notesBox}>
                  📝 {req.notes}
                </div>
              )}
              <button 
                style={styles.contactBtn} 
                onClick={() => handleContact(req)}
                disabled={creatingRoom === req.id}
              >
                {creatingRoom === req.id ? '創建中...' : '💬 聯絡乘客'}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#fff9f5',
    paddingBottom: 80,
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
  content: {
    padding: 16,
  },
  card: {
    background: '#fff',
    border: '2px solid #f0e0d6',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardRoute: {
    fontSize: 16,
    fontWeight: 600,
    color: '#4a3728',
    marginBottom: 12,
  },
  cardInfo: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    fontSize: 13,
    color: '#8b7355',
    marginBottom: 12,
  },
  badgeOpen: {
    background: '#e8f5e8',
    color: '#e07b4c',
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
  },
  cardBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seats: {
    fontSize: 13,
    color: '#8b7355',
  },
  vehicleBadge: {
    background: '#e3f2fd',
    color: '#1976d2',
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 12,
  },
  typeBadge: {
    background: '#f3e5f5',
    color: '#7b1fa2',
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 12,
  },
  notesBox: {
    background: '#fff9f5',
    border: '1px solid #f0e0d6',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    color: '#4a3728',
    marginBottom: 12,
  },
  contactBtn: {
    width: '100%',
    padding: 14,
    background: 'linear-gradient(135deg, #e07b4c, #c4623a)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center' as const,
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
    color: '#8b7355',
  },
  bottomNav: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    background: '#fff',
    padding: '10px 0',
    borderTop: '2px solid #f0e0d6',
    zIndex: 100,
  },
  navItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
    padding: '6px 2px',
    background: 'none',
    border: 'none',
    fontSize: 12,
    color: '#8b7355',
    cursor: 'pointer',
  },
  navItemActive: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
    padding: '6px 2px',
    background: 'none',
    border: 'none',
    fontSize: 12,
    color: '#e07b4c',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
