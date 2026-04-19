// Cabs Carpool - Browse Page v1.1
// 暖色珊瑚主題

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tripService } from '../services/tripService'
import { useAuth } from '../context/AuthContext'

export default function BrowsePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  const handleJoinChat = () => {
    if (!currentUser) {
      alert('請先登入')
      navigate('/my')
      return
    }
    navigate('/chat/demo')
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>←</button>
        <div style={styles.title}>📍 公開行程</div>
        <div style={{width: 40}} />
      </header>

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.empty}>載入中...</div>
        ) : trips.length === 0 ? (
          <div style={styles.empty}>暫時沒有行程</div>
        ) : (
          trips.map(trip => (
            <div key={trip.id} style={styles.card}>
              <div style={styles.cardRoute}>📍 {trip.pickup} → {trip.dropoff}</div>
              <div style={styles.cardInfo}>
                <span style={styles.badgeOpen}>🟢 開放中</span>
                <span>{trip.departureTime}</span>
                <span>{trip.driverName}</span>
              </div>
              <div style={styles.cardBottom}>
                <span style={styles.price}>${trip.pricePerSeat}/位</span>
                <span style={styles.seats}>{trip.availableSeats}位</span>
              </div>
              <button style={styles.chatBtn} onClick={handleJoinChat}>
                💬 加入聊天
              </button>
            </div>
          ))
        )}
      </div>

      {/* Bottom Navigation */}
      <nav style={styles.bottomNav}>
        <button style={styles.navItem} onClick={() => navigate('/')}>
          首頁
        </button>
        <button style={styles.navItemActive} onClick={() => navigate('/browse')}>
          📍 瀏覽
        </button>
        <button style={styles.navItem} onClick={() => navigate('/my')}>
          👤 我的
        </button>
      </nav>
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
    padding: '16px',
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
    color: '#5a9a5a',
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
    padding: '8px',
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
    padding: '8px',
    background: 'none',
    border: 'none',
    fontSize: 12,
    color: '#e07b4c',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
