import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { routeService, shiftService, bookingService } from '../services/shiftService'
import type { Route, Shift, Booking } from '../types/shift'

export default function PassengerDashboard() {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const [routes, setRoutes] = useState<Route[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'home' | 'bookings' | 'profile'>('home')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [routesData, shiftsData, bookingsData] = await Promise.all([
        routeService.getAll(),
        shiftService.getAll(),
        currentUser ? bookingService.getByUser(currentUser.id) : Promise.resolve([])
      ])
      setRoutes(routesData)
      setShifts(shiftsData)
      setBookings(bookingsData)
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>載入緊...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.logo}>CabsAGI</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>登出</button>
      </header>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button 
          style={{...styles.tab, ...(activeTab === 'home' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('home')}
        >
          首頁
        </button>
        <button 
          style={{...styles.tab, ...(activeTab === 'bookings' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('bookings')}
        >
          我的訂單
        </button>
        <button 
          style={{...styles.tab, ...(activeTab === 'profile' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('profile')}
        >
          個人
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'home' && (
          <div>
            {/* Shifts Section */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>🚗 即將出發班次</h2>
              {shifts.length === 0 ? (
                <div style={styles.empty}>暫無班次</div>
              ) : (
                shifts.map(shift => (
                  <div key={shift.id} style={styles.card}>
                    <div style={styles.cardHeader}>
                      <span style={styles.cardTitle}>{shift.routeName || '班次'}</span>
                      <span style={styles.price}>${shift.price}</span>
                    </div>
                    <div style={styles.cardBody}>
                      <div>🕐 {new Date(shift.departureTime).toLocaleString('zh-HK')}</div>
                      <div>💺 剩餘座位: {shift.availableSeats}/{shift.totalSeats}</div>
                      <button style={styles.bookBtn}>預訂</button>
                    </div>
                  </div>
                ))
              )}
            </section>

            {/* Routes Section */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>🛣️ 精選路線</h2>
              {routes.length === 0 ? (
                <div style={styles.empty}>暫無路線</div>
              ) : (
                routes.map(route => (
                  <div key={route.id} style={styles.card}>
                    <div style={styles.cardHeader}>
                      <span style={styles.cardTitle}>{route.name}</span>
                      <span style={styles.price}>${route.price}</span>
                    </div>
                    <div style={styles.cardBody}>
                      <div>從 {route.origin?.name || '起點'} → 到 {route.destination?.name || '終點'}</div>
                      <button style={styles.bookBtn}>查看</button>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        )}

        {activeTab === 'bookings' && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>📋 我的訂單</h2>
            {bookings.length === 0 ? (
              <div style={styles.empty}>暫無訂單</div>
            ) : (
              bookings.map(booking => (
                <div key={booking.id} style={styles.card}>
                  <div style={styles.cardBody}>
                    <div>訂單: {booking.id}</div>
                    <div>座位: {booking.seatCount}</div>
                    <div>狀態: {booking.status}</div>
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>👤 個人資料</h2>
            <div style={styles.profile}>
              <div style={styles.profileItem}>
                <span>名稱:</span> {currentUser?.name || '-'}
              </div>
              <div style={styles.profileItem}>
                <span>電郵:</span> {currentUser?.email || '-'}
              </div>
              <div style={styles.profileItem}>
                <span>電話:</span> {currentUser?.phone || '-'}
              </div>
              <div style={styles.profileItem}>
                <span>角色:</span> {currentUser?.role || '乘客'}
              </div>
              <div style={styles.profileItem}>
                <span>積分:</span> {currentUser?.points || 0}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
    fontFamily: 'Avenir Next, Noto Sans TC, sans-serif',
  },
  loading: {
    textAlign: 'center',
    padding: 40,
    fontSize: 16,
    color: '#666',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: '#284a41',
    color: '#fff',
  },
  logo: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
  },
  logoutBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    background: '#fff',
    borderBottom: '1px solid #eee',
  },
  tab: {
    flex: 1,
    padding: '14px',
    border: 'none',
    background: 'none',
    fontSize: 14,
    fontWeight: 600,
    color: '#666',
    cursor: 'pointer',
  },
  activeTab: {
    color: '#284a41',
    borderBottom: '2px solid #284a41',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: 18,
    fontWeight: 700,
    color: '#333',
  },
  empty: {
    padding: 24,
    textAlign: 'center',
    color: '#999',
    background: '#fff',
    borderRadius: 12,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#333',
  },
  price: {
    fontSize: 18,
    fontWeight: 700,
    color: '#284a41',
  },
  cardBody: {
    fontSize: 14,
    color: '#666',
    lineHeight: 1.6,
  },
  bookBtn: {
    marginTop: 12,
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: 8,
    background: '#284a41',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  profile: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  profileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #eee',
    fontSize: 14,
  },
}
