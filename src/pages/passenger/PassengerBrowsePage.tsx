// Cabs Carpool - Passenger Browse Page (Driver Trips) v1.1
// 乘客瀏覽司機行程

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tripService } from '../../services/tripService'
import { chatService } from '../../services/chatService'
import { useAuth } from '../../context/AuthContext'
import BottomNav from '../../components/BottomNav'

export default function PassengerBrowsePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingRoom, setCreatingRoom] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const allTrips = await tripService.getPublicTrips()
      setTrips(allTrips)
    } catch (error) {
      console.error('Error loading:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinChat = async (trip: any) => {
    if (!currentUser) {
      navigate('/profile')
      return
    }

    try {
      setCreatingRoom(trip.id)
      
      // Check if a chat room already exists
      let roomId = await chatService.getTripRoom(trip.id)
      
      if (!roomId) {
        // Create a chat room for this trip only if one doesn't exist
        roomId = await chatService.createTripChatRoom({
          tripId: trip.id,
          driverId: trip.driverId,
          driverName: trip.driverName || '司機',
          driverPhone: trip.driverPhone || '',
          pickup: trip.route?.pickup?.placeName || trip.pickup || '',
          dropoff: trip.route?.dropoff?.placeName || trip.dropoff || '',
          departureTime: trip.departureTime || '',
        })
      }
      
      // Add passenger to pending list (not directly to chat)
      await tripService.requestJoin(trip.id, {
        oderId: currentUser.id,
        name: currentUser.name || '乘客',
        phone: currentUser.phone || '',
      })
      
      // Add passenger to chat room so they can communicate while waiting
      await chatService.joinChatRoom(roomId, {
        oderId: currentUser.id,
        name: currentUser.name || '乘客',
        role: 'passenger',
        phone: currentUser.phone || '',
      })
      
      alert('已提交申請！等待司機批准。')
      
      // Navigate to the chat room
      navigate(`/chat/${roomId}`)
    } catch (error) {
      console.error('Error creating chat room:', error)
      alert('申請失敗')
    } finally {
      setCreatingRoom(null)
    }
  }

  const getPickup = (trip: any) => trip.route?.pickup?.placeName || trip.pickup || '未知'
  const getDropoff = (trip: any) => trip.route?.dropoff?.placeName || trip.dropoff || '未知'

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/passenger-home')}>←</button>
        <div style={styles.title}>🚗 司機行程</div>
        <div style={{width: 40}} />
      </header>

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.empty}>載入中...</div>
        ) : trips.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🚗</div>
            <div>暫時沒有行程</div>
            <div style={styles.emptySubtext}>成為第一位預訂的乘客！</div>
          </div>
        ) : (
          trips.map(trip => (
            <div key={trip.id} style={styles.card}>
              <div style={styles.cardRoute}>
                📍 {getPickup(trip)} → {getDropoff(trip)}
              </div>
              <div style={styles.cardInfo}>
                <span style={styles.badgeOpen}>🟢 開放中</span>
                <span>{trip.departureTime || '時間待定'}</span>
                <span>{trip.driverName || '司機'}</span>
              </div>
              <div style={styles.cardBottom}>
                <span style={styles.seats}>
                  💺 {trip.availableSeats || trip.totalSeats || 0}位
                </span>
              </div>
              <button 
                style={styles.chatBtn} 
                onClick={() => handleJoinChat(trip)}
                disabled={creatingRoom === trip.id}
              >
                {creatingRoom === trip.id ? '創建中...' : '💬 加入聊天'}
              </button>
            </div>
          ))
        )}
      </div>

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
  price: {
    fontSize: 18,
    fontWeight: 700,
    color: '#e07b4c',
  },
  seats: {
    fontSize: 13,
    color: '#8b7355',
  },
  chatBtn: {
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
