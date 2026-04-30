// Cabs Carpool - Driver Home Page v2.0
// 司機專屬首頁 - 整合行程列表

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { tripService } from '../../services/tripService'
import BottomNav from '../../components/BottomNav'
import { useState, useEffect } from 'react'

export default function DriverHomePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [myTrips, setMyTrips] = useState<any[]>([])

  useEffect(() => {
    if (currentUser?.id) {
      loadMyTrips()
    }
  }, [currentUser?.id])

  const loadMyTrips = async () => {
    try {
      const trips = await tripService.getByDriver(currentUser!.id)
      setMyTrips(trips || [])
    } catch (error) {
      console.error('Error loading driver trips:', error)
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

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>🚗 Cabs 司機</div>
        <button style={styles.profileBtn} onClick={() => navigate('/driver-settings')}>
          👤
        </button>
      </header>

      {/* Welcome */}
      <div style={styles.welcome}>
        <div style={styles.welcomeIcon}>🚗</div>
        <h1 style={styles.welcomeTitle}>你好，{currentUser?.name || '司機'}</h1>
        <p style={styles.welcomeSubtitle}>管理你的行程，尋找乘客</p>
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>快捷操作</div>
        
        <button style={styles.actionCard} onClick={() => navigate('/create-trip')}>
          <div style={styles.actionIcon}>📍</div>
          <div style={styles.actionContent}>
            <div style={styles.actionTitle}>發布行程</div>
            <div style={styles.actionSubtitle}>創建新行程讓乘客找你</div>
          </div>
          <span style={styles.arrow}>›</span>
        </button>

        <button style={styles.actionCard} onClick={() => navigate('/driver-trips')}>
          <div style={styles.actionIcon}>🚗</div>
          <div style={styles.actionContent}>
            <div style={styles.actionTitle}>行程管理</div>
            <div style={styles.actionSubtitle}>查看和管理所有行程</div>
          </div>
          <span style={styles.arrow}>›</span>
        </button>

        <button style={styles.actionCard} onClick={() => navigate('/browse-requests')}>
          <div style={styles.actionIcon}>📋</div>
          <div style={styles.actionContent}>
            <div style={styles.actionTitle}>乘客需求</div>
            <div style={styles.actionSubtitle}>查看並聯絡有乘車需求的乘客</div>
          </div>
          <span style={styles.arrow}>›</span>
        </button>
      </div>

      {/* My Trips List */}
      {myTrips.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>🚗 我的行程</div>
          {myTrips.slice(0, 5).map(trip => (
            <div key={trip.id} style={styles.tripCard}>
              <div style={styles.tripHeader}>
                <span style={{
                  ...styles.badge,
                  background: trip.status === 'OPEN' ? '#4caf50' : 
                             trip.status === 'CONFIRMED' ? '#ff9800' :
                             trip.status === 'IN_PROGRESS' ? '#2196f3' :
                             trip.status === 'COMPLETED' ? '#9e9e9e' : '#f44336'
                }}>
                  {trip.status === 'OPEN' ? '🟢 開放中' :
                   trip.status === 'CONFIRMED' ? '🟡 已確認' :
                   trip.status === 'IN_PROGRESS' ? '🔵 行程中' :
                   trip.status === 'COMPLETED' ? '✅ 已完成' : '❌ 已取消'}
                </span>
                <span style={styles.tripTime}>{formatDate(trip.departureTime)}</span>
              </div>
              <div style={styles.tripRoute}>
                📍 {trip.route?.pickup?.placeName || '未知'} → {trip.route?.dropoff?.placeName || '未知'}
              </div>
              <div style={styles.tripInfo}>
                💺 剩餘：{trip.availableSeats || 0}/{trip.totalSeats || 0}
                {trip.passengers?.length > 0 && ` | 👥 ${trip.passengers.length} 位乘客`}
              </div>
              {trip.pendingPassengers?.length > 0 && (
                <div style={styles.pendingBadge}>
                  ⏳ {trip.pendingPassengers.length} 位待批准
                </div>
              )}
              <button
                onClick={() => navigate(`/chat/${trip.id}`)}
                style={styles.chatBtn}
              >
                💬 進入聊天
              </button>
            </div>
          ))}
        </div>
      )}

      {myTrips.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🚗</div>
          <div>還沒有行程</div>
          <button 
            style={styles.createBtn}
            onClick={() => navigate('/create-trip')}
          >
            發布第一個行程
          </button>
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
    padding: '12px 16px',
    background: '#fff',
    borderBottom: '1px solid #f0e0d6',
  },
  logo: {
    fontSize: 17,
    fontWeight: 600,
    color: '#4a3728',
  },
  profileBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
  },
  welcome: {
    textAlign: 'center' as const,
    padding: '24px 16px',
  },
  welcomeIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#4a3728',
    margin: '8px 0',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#8b7355',
  },
  section: {
    padding: '0 16px 16px',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#4a3728',
    marginBottom: 12,
  },
  actionCard: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: 14,
    background: '#fff',
    border: 'none',
    borderRadius: 12,
    marginBottom: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#4a3728',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#8b7355',
  },
  arrow: {
    fontSize: 20,
    color: '#ccc',
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
    whiteSpace: 'nowrap' as const,
  },
  tripInfo: {
    fontSize: 12,
    color: '#8b7355',
    marginBottom: 10,
  },
  pendingBadge: {
    fontSize: 12,
    color: '#ff9800',
    marginBottom: 10,
  },
  chatBtn: {
    width: '100%',
    padding: '10px 16px',
    background: '#e07b4c',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 16px',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  createBtn: {
    marginTop: 16,
    padding: '12px 24px',
    background: '#e07b4c',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
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
