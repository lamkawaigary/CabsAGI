// Cabs Carpool - Browse Page v1.3
// 暖色珊瑚主題 + 司機瀏覽需求

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tripService, requestService } from '../services/tripService'
import { useAuth } from '../context/AuthContext'

export default function BrowsePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [trips, setTrips] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'trips' | 'requests'>('trips')

  useEffect(() => {
    loadData()
  }, [viewMode])

  const loadData = async () => {
    try {
      setLoading(true)
      if (viewMode === 'trips') {
        console.log('[BrowsePage] Calling getPublicTrips...')
        const allTrips = await tripService.getPublicTrips()
        console.log('[BrowsePage] getPublicTrips returned:', allTrips.length, 'trips')
        console.log('[BrowsePage] Trips:', JSON.stringify(allTrips.map(t => ({id: t.id, status: t.status}))))
        setTrips(allTrips)
      } else {
        const allRequests = await requestService.getPublicRequests()
        setRequests(allRequests)
      }
    } catch (error) {
      console.error('Error loading:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinChat = () => {
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


  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>←</button>
        <div style={styles.title}>
          {viewMode === 'trips' ? '📍 公開行程' : '📋 公開需求'}
        </div>
        <div style={{width: 40}} />
      </header>

      {/* View Toggle (for drivers) */}
      <div style={styles.toggle}>
        <button 
          style={{
            ...styles.toggleBtn,
            ...(viewMode === 'trips' ? styles.toggleBtnActive : {})
          }}
          onClick={() => setViewMode('trips')}
        >
          👤 行程
        </button>
        <button 
          style={{
            ...styles.toggleBtn,
            ...(viewMode === 'requests' ? styles.toggleBtnActive : {})
          }}
          onClick={() => setViewMode('requests')}
        >
          🚗 需求
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.empty}>載入中...</div>
        ) : viewMode === 'trips' ? (
          // 行程列表
          trips.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>🚗</div>
              <div>暫時沒有行程</div>
              <div style={styles.emptySubtext}>成為第一位發布行程的司機！</div>
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
                <button style={styles.chatBtn} onClick={handleJoinChat}>
                  💬 加入聊天
                </button>
              </div>
            ))
          )
        ) : (
          // 需求列表
          requests.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>📋</div>
              <div>暫時沒有需求</div>
              <div style={styles.emptySubtext}>乘客可以發布乘車需求</div>
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
                  <span style={styles.seats}>
                    👥 {req.passengerCount || 1}位
                  </span>
                </div>
                <button style={styles.chatBtn} onClick={handleJoinChat}>
                  💬 聯絡乘客
                </button>
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
        <button style={styles.navItemActive} onClick={() => navigate('/browse')}>
          📍 瀏覽
        </button>
        <button style={styles.navItem} onClick={() => navigate('/trips')}>
          🚗 行程
        </button>
      </nav>

      {/* Create Trip FAB */}
      <button style={styles.fab} onClick={() => {
        if (!currentUser) {
          navigate('/profile')
          return
        }
        navigate('/create-trip')
      }}>
        + 發布{viewMode === 'trips' ? '行程' : '需求'}
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#fff9f5',
    paddingBottom: 100,
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
  toggle: {
    display: 'flex',
    padding: 16,
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 12,
    border: '2px solid #f0e0d6',
    background: '#fff',
    fontSize: 14,
    fontWeight: 500,
    color: '#8b7355',
    cursor: 'pointer',
  },
  toggleBtnActive: {
    background: '#e07b4c',
    color: '#fff',
    borderColor: '#e07b4c',
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
  fab: {
    position: 'fixed' as const,
    bottom: 90,
    right: 20,
    padding: '14px 20px',
    background: 'linear-gradient(135deg, #e07b4c, #c4623a)',
    color: '#fff',
    border: 'none',
    borderRadius: 24,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(224,123,76,0.4)',
    zIndex: 99,
  },
}
