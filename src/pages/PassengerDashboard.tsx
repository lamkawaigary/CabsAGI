import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { routeService, shiftService, bookingService } from '../services/shiftService'
import type { Route, Booking, RouteType, Shift } from '../types/shift'

// Icons
const Icons = {
  Home: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  ),
  Ticket: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M22 10V6c0-1.11-.9-2-2-2H4c-1.1 0-1.99.89-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-2-1.46c-1.19.69-2 1.99-2 3.46s.81 2.77 2 3.46V18H4v-2.54c1.19-.69 2-1.99 2-3.46 0-1.48-.8-2.77-1.99-3.46L4 6h16v2.54z"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
    </svg>
  ),
  Location: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  )
}

type Tab = 'home' | 'bookings' | 'profile'

const serviceTypes: { type: RouteType; label: string; color: string }[] = [
  { type: 'AIRPORT', label: '機場接送', color: '#1976D2' },
  { type: 'CROSS_BORDER', label: '跨境直通', color: '#388E3C' },
  { type: 'THEME_PARK', label: '主題公園', color: '#F57C00' },
  { type: 'EVENT', label: '演唱會直通', color: '#7B1FA2' }
]

const formatDate = (timestamp: string) => {
  const date = new Date(parseInt(timestamp))
  return date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })
}

export default function PassengerDashboard() {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [routes, setRoutes] = useState<Route[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

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
      // Show all shifts for now
      setShifts(shiftsData)
      setBookings(bookingsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const tabs = [
    { id: 'home' as Tab, label: '首頁', icon: Icons.Home },
    { id: 'bookings' as Tab, label: '我的預訂', icon: Icons.Ticket },
    { id: 'profile' as Tab, label: '個人', icon: Icons.User }
  ]

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <span style={styles.logoText}>CabsAGI</span>
          <span style={styles.welcomeText}>，{currentUser?.name || '乘客'}</span>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <Icons.Logout />
        </button>
      </header>

      {/* Content */}
      <main style={styles.content}>
        {activeTab === 'home' && (
          <div>
            {/* Service Type Selection */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>選擇服務</h2>
              <div style={styles.serviceGrid}>
                {serviceTypes.map(service => (
                  <button
                    key={service.type}
                    style={{
                      ...styles.serviceCard,
                      borderColor: service.color
                    }}
                    onClick={() => navigate('/')}
                  >
                    <span style={{ ...styles.serviceLabel, color: service.color }}>
                      {service.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Available Shifts */}
            {shifts.length > 0 && (
              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>即將出發班次</h2>
                <div style={styles.routesList}>
                  {shifts.slice(0, 5).map(shift => (
                    <button key={shift.id} style={styles.routeCard} onClick={() => navigate('/')}>
                      <div style={styles.routeInfo}>
                        <span style={styles.routePath}>
                          {shift.routeName || '班次'} • {new Date(shift.departureTime).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={styles.routeMeta}>{shift.availableSeats}/{shift.totalSeats} 位</span>
                      </div>
                      <span style={styles.routePrice}>${shift.price}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Available Routes */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>精選路線</h2>
              {loading ? (
                <div style={styles.loading}>載入中...</div>
              ) : routes.length === 0 ? (
                <div style={styles.empty}>暫無路線</div>
              ) : (
                <div style={styles.routesList}>
                  {routes.slice(0, 5).map(route => (
                    <button
                      key={route.id}
                      style={styles.routeCard}
                      onClick={() => navigate('/')}
                    >
                      <div style={styles.routeInfo}>
                        <span style={styles.routePath}>
                          {route.origin.name} → {route.destination.name}
                        </span>
                        <span style={styles.routeMeta}>
                          {route.duration}分鐘 • {route.distance}km
                        </span>
                      </div>
                      <span style={styles.routePrice}>${route.price}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'bookings' && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>我的預訂</h2>
            {loading ? (
              <div style={styles.loading}>載入中...</div>
            ) : bookings.length === 0 ? (
              <div style={styles.empty}>
                <p>暫無預訂</p>
                <button 
                  style={styles.bookBtn} 
                  onClick={() => navigate('/')}
                >
                  立即預訂
                </button>
              </div>
            ) : (
              <div style={styles.bookingsList}>
                {bookings.map(booking => (
                  <div key={booking.id} style={styles.bookingCard}>
                    <div style={styles.bookingHeader}>
                      <span style={styles.bookingStatus}>
                        {booking.status === 'CONFIRMED' ? '✅ 已確認' : 
                         booking.status === 'PENDING' ? '⏳ 處理中' :
                         booking.status === 'COMPLETED' ? '✅ 已完成' : '❌ 已取消'}
                      </span>
                      <span style={styles.bookingId}>#{booking.id.slice(0, 8)}</span>
                    </div>
                    <div style={styles.bookingInfo}>
                      <div style={styles.bookingRow}>
                        <Icons.Ticket />
                        <span>{booking.seatCount} 位乘客</span>
                      </div>
                      <div style={styles.bookingRow}>
                        <Icons.Clock />
                        <span>{formatDate(booking.createdAt)}</span>
                      </div>
                    </div>
                    <div style={styles.bookingTotal}>
                      總價：<strong>${booking.totalPrice}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>個人資料</h2>
            <div style={styles.profileCard}>
              <div style={styles.avatar}>
                {(currentUser?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={styles.profileInfo}>
                <h3 style={styles.profileName}>{currentUser?.name || '未設定姓名'}</h3>
                <p style={styles.profileEmail}>{currentUser?.email || '未綁定電郵'}</p>
                <p style={styles.profilePhone}>{currentUser?.phone || '未綁定手機'}</p>
              </div>
            </div>
            <button 
              style={styles.editProfileBtn}
              onClick={() => navigate('/profile')}
            >
              編輯資料
            </button>
          </section>
        )}
      </main>

      {/* Bottom Nav */}
      <nav style={styles.nav}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.navItem,
              ...(activeTab === tab.id ? styles.navItemActive : {})
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif',
    paddingBottom: '80px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: '#143b34',
    color: '#fff'
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 700
  },
  welcomeText: {
    fontSize: '14px',
    opacity: 0.8
  },
  logoutBtn: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    padding: '8px'
  },
  content: {
    padding: '16px'
  },
  section: {
    background: '#fff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px'
  },
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a'
  },
  serviceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px'
  },
  serviceCard: {
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid',
    background: '#fff',
    cursor: 'pointer'
  },
  serviceLabel: {
    fontSize: '14px',
    fontWeight: 600,
    textAlign: 'center',
    display: 'block'
  },
  routesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  routeCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: '#f8f9fa',
    cursor: 'pointer',
    textAlign: 'left'
  },
  routeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  routePath: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1a1a1a'
  },
  routeMeta: {
    fontSize: '12px',
    color: '#888'
  },
  routePrice: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1976D2'
  },
  bookingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  bookingCard: {
    background: '#f8f9fa',
    borderRadius: '12px',
    padding: '16px'
  },
  bookingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px'
  },
  bookingStatus: {
    fontWeight: 600,
    fontSize: '14px'
  },
  bookingId: {
    fontSize: '12px',
    color: '#888'
  },
  bookingInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px'
  },
  bookingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#666'
  },
  bookingTotal: {
    fontSize: '16px',
    color: '#1a1a1a',
    textAlign: 'right'
  },
  profileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '12px',
    marginBottom: '16px'
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: '#143b34',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 600
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    margin: '0 0 4px',
    fontSize: '18px',
    fontWeight: 600
  },
  profileEmail: {
    margin: 0,
    fontSize: '14px',
    color: '#666'
  },
  profilePhone: {
    margin: '4px 0 0',
    fontSize: '14px',
    color: '#666'
  },
  editProfileBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid #ddd',
    background: '#fff',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#888'
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: '#888'
  },
  bookBtn: {
    marginTop: '16px',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    background: '#1976D2',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    background: '#fff',
    borderTop: '1px solid #eee',
    padding: '8px 0'
  },
  navItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '8px',
    border: 'none',
    background: 'transparent',
    color: '#888',
    fontSize: '12px',
    cursor: 'pointer'
  },
  navItemActive: {
    color: '#143b34'
  }
}
