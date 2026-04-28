// Cabs Carpool - Trips Page v1.3
// 暖色珊瑚主題 + 司機視圖

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tripService, requestService } from '../services/tripService'
import { useAuth } from '../context/AuthContext'

export default function TripsPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [trips, setTrips] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentUser) {
      loadUserTrips()
    } else {
      setLoading(false)
    }
  }, [currentUser])

  const loadUserTrips = async () => {
    try {
      setLoading(true)
      
      if (currentUser?.role === 'driver') {
        // 司機：載入行程
        const myTrips = await tripService.getByDriver(currentUser.id)
        setTrips(myTrips || [])
        setRequests([])
      } else {
        // 乘客：載入需求
        const myRequests = await requestService.getByPassenger(currentUser?.id || '')
        setRequests(myRequests || [])
        setTrips([])
      }
    } catch (error) {
      console.error('Error loading trips:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChat = () => {
    if (!currentUser) {
      navigate('/profile')
      return
    }
    navigate('/chat/demo')
  }

  // Helper to extract pickup/dropoff from different data formats
  const getPickup = (item: any) => {
    if (item.route?.pickup?.placeName) return item.route.pickup.placeName
    if (item.route?.pickup) return item.route.pickup
    if (item.pickup?.placeName) return item.pickup.placeName
    if (item.pickup) return item.pickup
    return '未知'
  }

  const getDropoff = (item: any) => {
    if (item.route?.dropoff?.placeName) return item.route.dropoff.placeName
    if (item.route?.dropoff) return item.route.dropoff
    if (item.dropoff?.placeName) return item.dropoff.placeName
    if (item.dropoff) return item.dropoff
    return '未知'
  }

  const isDriver = currentUser?.role === 'driver'

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>←</button>
        <div style={styles.title}>
          {isDriver ? '🚗 我的行程' : '📋 我的需求'}
        </div>
        <div style={{width: 40}} />
      </header>

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.empty}>載入中...</div>
        ) : isDriver ? (
          // === 司機視圖 ===
          trips.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>🚗</div>
              <div>暫時沒有行程</div>
              <div style={styles.emptySubtext}>去發布你的第一個行程吧！</div>
              <button 
                style={styles.createBtn}
                onClick={() => navigate('/create-trip')}
              >
                + 發布行程
              </button>
            </div>
          ) : (
            trips.map(trip => (
              <div key={trip.id} style={styles.tripCard}>
                <div style={styles.tripHeader}>
                  <div style={styles.tripRoute}>
                    📍 {getPickup(trip)} → {getDropoff(trip)}
                  </div>
                  <span style={trip.status === 'OPEN' ? styles.badgeOpen : styles.badgeDone}>
                    {trip.status === 'OPEN' ? '🟢 進行中' : '✓ 已完成'}
                  </span>
                </div>
                <div style={styles.tripDetails}>
                  <div>🕐 <strong>{trip.departureTime || '時間待定'}</strong></div>
                  <div>💺 {trip.totalSeats || 0} 位 · 已加入 {trip.passengers?.length || 0} 位</div>
                </div>
                <div style={styles.tripActions}>
                  <button style={styles.chatBtn} onClick={handleChat}>
                    💬 進入聊天
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          // === 乘客視圖 ===
          requests.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>📋</div>
              <div>暫時沒有需求</div>
              <div style={styles.emptySubtext}>你可以發布乘車需求</div>
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} style={styles.tripCard}>
                <div style={styles.tripHeader}>
                  <div style={styles.tripRoute}>
                    📍 {getPickup(req)} → {getDropoff(req)}
                  </div>
                  <span style={req.status === 'OPEN' ? styles.badgeOpen : styles.badgeDone}>
                    {req.status === 'OPEN' ? '🟢 開放中' : '✓ 已關閉'}
                  </span>
                </div>
                <div style={styles.tripDetails}>
                  <div>🕐 <strong>{req.departureDate || '時間待定'}</strong></div>
                  <div>👥 {req.passengerCount || 1} 位</div>
                </div>
                <div style={styles.tripActions}>
                  <button style={styles.chatBtn} onClick={handleChat}>
                    💬 進入聊天
                  </button>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Bottom Navigation */}
      <nav style={styles.bottomNav}>
        <button style={styles.navItem} onClick={() => navigate('/')}>
          首頁
        </button>
        <button style={styles.navItem} onClick={() => navigate('/browse')}>
          📍 瀏覽
        </button>
        <button style={styles.navItemActive} onClick={() => navigate('/trips')}>
          🚗 行程
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
    padding: 16,
  },
  tripCard: {
    background: '#fff',
    border: '2px solid #f0e0d6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  tripHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripRoute: {
    fontSize: 16,
    fontWeight: 600,
    color: '#4a3728',
    flex: 1,
  },
  badgeOpen: {
    background: '#e8f5e8',
    color: '#e07b4c',
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
  },
  badgeDone: {
    background: '#eceff1',
    color: '#546e7a',
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
  },
  tripDetails: {
    fontSize: 13,
    color: '#8b7355',
    lineHeight: 1.8,
    marginBottom: 12,
  },
  tripActions: {
    display: 'flex',
    gap: 8,
  },
  chatBtn: {
    flex: 1,
    padding: '10px 16px',
    background: '#e07b4c',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
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
    marginBottom: 20,
    color: '#8b7355',
  },
  createBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #e07b4c, #c4623a)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
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
