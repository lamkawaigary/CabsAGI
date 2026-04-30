// Cabs Carpool - Passenger Home Page v2.0
// 乘客專屬首頁 - 整合行程管理

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { tripService } from '../../services/tripService'
import BottomNav from '../../components/BottomNav'
import QRPassenger from '../../components/QRPassenger'

export default function PassengerHomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser } = useAuth()
  const [myTrips, setMyTrips] = useState<any[]>([])
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<any>(null)

  // Auto-scroll to trips section if navigated from /passenger-trips
  const isTripsView = location.pathname === '/passenger-trips' || 
                       location.search.includes('view=trips')

  useEffect(() => {
    if (currentUser?.id) {
      loadMyTrips()
    }
  }, [currentUser?.id])

  const loadMyTrips = async () => {
    try {
      const trips = await tripService.getByPassenger(currentUser!.id)
      setMyTrips(trips || [])
    } catch (error) {
      console.error('Error loading trips:', error)
    }
  }

  const formatDate = (iso: string) => {
    if (!iso) return '未知'
    return new Date(iso).toLocaleDateString('zh-HK', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPassengerStatus = (trip: any) => {
    const passengerId = currentUser?.id
    if (trip.pendingPassengers?.some((p: any) => p.passengerId === passengerId)) {
      return { label: '⏳ 待批准', color: '#ff9800', bg: '#fff3e0' }
    }
    if (trip.passengers?.some((p: any) => p.passengerId === passengerId)) {
      const passenger = trip.passengers?.find((p: any) => p.passengerId === passengerId)
      if (passenger?.onboarded) {
        return { label: '🔵 已上車', color: '#2196f3', bg: '#e3f2fd' }
      }
      if (trip.confirmedByPassengers?.includes(passengerId)) {
        return { label: '🟡 已確認', color: '#4caf50', bg: '#e8f5e9' }
      }
      return { label: '🟢 已批准', color: '#4caf50', bg: '#e8f5e9' }
    }
    return { label: '❓ 未知', color: '#666', bg: '#f5f5f5' }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>🔍 找車</div>
        <button style={styles.profileBtn} onClick={() => navigate('/passenger-settings')}>
          👤
        </button>
      </header>

      {/* Welcome */}
      <div style={styles.welcome}>
        <div style={styles.welcomeIcon}>👤</div>
        <h1 style={styles.welcomeTitle}>你好，{currentUser?.name || '乘客'}</h1>
        <p style={styles.welcomeSubtitle}>找車或發布乘車需求</p>
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>快捷操作</div>
        
        <button style={styles.actionCard} onClick={() => navigate('/create-request')}>
          <div style={styles.actionIcon}>📋</div>
          <div style={styles.actionContent}>
            <div style={styles.actionTitle}>發布需求</div>
            <div style={styles.actionSubtitle}>讓司機主動聯絡你</div>
          </div>
          <span style={styles.arrow}>›</span>
        </button>

        <button style={styles.actionCard} onClick={() => navigate('/browse-trips')}>
          <div style={styles.actionIcon}>🚗</div>
          <div style={styles.actionContent}>
            <div style={styles.actionTitle}>瀏覽行程</div>
            <div style={styles.actionSubtitle}>找尋合適的司機行程</div>
          </div>
          <span style={styles.arrow}>›</span>
        </button>

        <button style={styles.actionCard} onClick={() => navigate('/my-requests')}>
          <div style={styles.actionIcon}>📋</div>
          <div style={styles.actionContent}>
            <div style={styles.actionTitle}>我的需求</div>
            <div style={styles.actionSubtitle}>查看已發布的需求</div>
          </div>
          <span style={styles.arrow}>›</span>
        </button>
      </div>

      {/* My Trips Section */}
      {myTrips.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>🚗 我的參與</div>
          {myTrips.map(trip => {
            const status = getPassengerStatus(trip)
            return (
              <div key={trip.id} style={styles.tripCard}>
                <div style={styles.tripHeader}>
                  <span style={{...styles.badge, background: status.bg, color: status.color}}>
                    {status.label}
                  </span>
                  <span style={styles.tripTime}>{formatDate(trip.departureTime)}</span>
                </div>
                <div style={styles.tripRoute}>
                  📍 {trip.route?.pickup?.placeName || '未知'} → {trip.route?.dropoff?.placeName || '未知'}
                </div>
                <div style={styles.tripInfo}>
                  👤 司機：{trip.driverName || '未知'} | 💺 座位：{trip.availableSeats || 0}/{trip.totalSeats || 0}
                </div>
                <div style={styles.tripActions}>
                  <button
                    onClick={() => navigate(`/chat/${trip.id}`)}
                    style={styles.chatBtn}
                  >
                    💬 進入聊天
                  </button>
                  {(trip.status === 'CONFIRMED' || trip.status === 'IN_PROGRESS' || trip.status === 'OPEN') && (
                    <button
                      onClick={() => {
                        setSelectedTrip(trip)
                        setShowQRModal(true)
                      }}
                      style={styles.qrBtn}
                    >
                      🎫 上車令牌
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {myTrips.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🚗</div>
          <div>還沒有參與的行程</div>
          <div style={styles.emptySubtext}>瀏覽行程或發布需求開始</div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedTrip && (
        <div style={styles.modalOverlay} onClick={() => setShowQRModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'flex-end',padding:8}}>
              <button 
                onClick={() => setShowQRModal(false)}
                style={{background:'none',border:'none',fontSize:18,cursor:'pointer'}}
              >
                ✕
              </button>
            </div>
            <QRPassenger 
              tripId={selectedTrip.id}
              passengerId={currentUser?.id || ''}
              passengerName={currentUser?.name || ''}
            />
          </div>
        </div>
      )}

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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: '#fff',
    borderBottom: '2px solid #f0e0d6',
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    color: '#e07b4c',
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'rgba(224,123,76,0.15)',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
  },
  welcome: {
    textAlign: 'center',
    padding: '40px 24px',
    background: 'linear-gradient(135deg, #e07b4c, #c4623a)',
    color: '#fff',
  },
  welcomeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#e07b4c',
    marginBottom: 12,
    letterSpacing: 1,
  },
  actionCard: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    background: '#fff',
    border: '2px solid #f0e0d6',
    borderRadius: 16,
    marginBottom: 12,
    cursor: 'pointer',
    textAlign: 'left',
  },
  actionIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#4a3728',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#8b7355',
  },
  arrow: {
    fontSize: 20,
    color: '#8b7355',
  },
  tripCard: {
    background: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  tripHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    padding: '3px 8px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
  },
  tripTime: {
    fontSize: 12,
    color: '#8b7355',
  },
  tripRoute: {
    fontSize: 13,
    color: '#4a3728',
    marginBottom: 6,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tripInfo: {
    fontSize: 12,
    color: '#8b7355',
    marginBottom: 10,
  },
  tripActions: {
    display: 'flex',
    gap: 8,
  },
  chatBtn: {
    flex: 1,
    padding: '10px 12px',
    background: '#e07b4c',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  qrBtn: {
    flex: 1,
    padding: '10px 12px',
    background: '#9c27b0',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#8b7355',
    marginTop: 4,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modalContent: {
    background: '#fff',
    borderRadius: 16,
    maxWidth: 360,
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  bottomNav: {
    position: 'fixed',
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
    flexDirection: 'column',
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
    flexDirection: 'column',
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
