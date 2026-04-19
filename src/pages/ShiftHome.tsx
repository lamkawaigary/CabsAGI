import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { routeService, shiftService } from '../services/shiftService'
import LoginModal from '../components/LoginModal'
import type { Route, RouteType, Shift } from '../types/shift'

// Icons as SVG components
const Icons = {
  Airport: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
    </svg>
  ),
  CrossBorder: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      <path d="M3 15v4h4v-4H3zm14 0v4h4v-4h-4z"/>
    </svg>
  ),
  ThemePark: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
      <path d="M15 7.5V2H9v5.5l3 3 3-3zM7.5 9H2v6h5.5l3-3-3-3zM9 16.5V22h6v-5.5l-3-3-3 3zM16.5 9l-3 3 3 3H22V9h-5.5z"/>
    </svg>
  ),
  Event: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
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
  ),
  Home: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  ),
  Ticket: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M22 10V6c0-1.11-.9-2-2-2H4c-1.1 0-1.99.89-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-2-1.46c-1.19.69-2 1.99-2 3.46s.81 2.77 2 3.46V18H4v-2.54c1.19-.69 2-1.99 2-3.46 0-1.48-.8-2.77-1.99-3.46L4 6h16v2.54z"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  )
}

const serviceTypes: { type: RouteType; label: string; icon: keyof typeof Icons; color: string }[] = [
  { type: 'AIRPORT', label: '機場接送', icon: 'Airport', color: '#1976D2' },
  { type: 'CROSS_BORDER', label: '跨境直通', icon: 'CrossBorder', color: '#388E3C' },
  { type: 'THEME_PARK', label: '主題公園', icon: 'ThemePark', color: '#F57C00' },
  { type: 'EVENT', label: '演唱會直通', icon: 'Event', color: '#7B1FA2' }
]

const formatPrice = (price: number) => `$${price}`

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}分鐘`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}小時${mins}分` : `${hours}小時`
}

export default function ShiftHome() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [routes, setRoutes] = useState<Route[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [selectedType, setSelectedType] = useState<RouteType | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [allRoutes, allShifts] = await Promise.all([
        routeService.getAll(),
        shiftService.getAll()
      ])
      setRoutes(allRoutes)
      // Only show OPEN or SCHEDULED shifts
      setShifts(allShifts.filter(s => s.status === 'OPEN' || s.status === 'SCHEDULED'))
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRoutes = selectedType 
    ? routes.filter(r => r.type === selectedType)
    : routes

  const handleServiceClick = (type: RouteType) => {
    setSelectedType(type === selectedType ? null : type)
  }

  const handleRouteClick = (routeId: string) => {
    navigate(`/route/${routeId}`)
  }

  return (
    <div style={styles.container}>
      {/* Header - minimal */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoText}>CabsAGI</span>
        </div>
        {currentUser ? (
          <button style={styles.headerBtn} onClick={() => navigate('/dashboard')}>
            我的
          </button>
        ) : (
          <button style={styles.headerBtn} onClick={() => setShowLoginModal(true)}>
            登入
          </button>
        )}
      </header>

      {/* Service Type Selection */}
      <section style={styles.serviceSection}>
        <h2 style={styles.sectionTitle}>選擇服務</h2>
        <div style={styles.serviceGrid}>
          {serviceTypes.map(service => {
            const Icon = Icons[service.icon]
            const isSelected = selectedType === service.type
            return (
              <button
                key={service.type}
                style={{
                  ...styles.serviceCard,
                  borderColor: isSelected ? service.color : 'transparent',
                  backgroundColor: isSelected ? `${service.color}15` : '#fff'
                }}
                onClick={() => handleServiceClick(service.type)}
              >
                <div style={{ ...styles.serviceIcon, color: service.color }}>
                  <Icon />
                </div>
                <span style={{ ...styles.serviceLabel, color: service.color }}>
                  {service.label}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Upcoming Shifts */}
      {shifts.length > 0 && (
        <section style={styles.routesSection}>
          <div style={styles.routesHeader}>
            <h2 style={styles.sectionTitle}>即將出發班次</h2>
          </div>
          <div style={styles.routesList}>
            {shifts.map(shift => (
              <div 
                key={shift.id}
                style={styles.routeCard}
                onClick={() => currentUser ? navigate(`/shift/${shift.id}`) : setShowLoginModal(true)}
              >
                <div style={styles.routeInfo}>
                  <span style={styles.routePath}>
                    {shift.routeName || '班次'} • {new Date(shift.departureTime).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={styles.routeMeta}>
                    {shift.availableSeats}/{shift.totalSeats} 位 • 狀態: {shift.status === 'OPEN' ? '可預訂' : '已滿'}
                  </span>
                </div>
                <span style={styles.routePrice}>${shift.price}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Routes */}
      <section style={styles.routesSection}>
        <div style={styles.routesHeader}>
          <h2 style={styles.sectionTitle}>
            {selectedType 
              ? serviceTypes.find(s => s.type === selectedType)?.label 
              : '精選路線'}
          </h2>
          {selectedType && (
            <button style={styles.clearFilter} onClick={() => setSelectedType(null)}>
              清除篩選
            </button>
          )}
        </div>

        {loading ? (
          <div style={styles.loading}>載入中...</div>
        ) : filteredRoutes.length === 0 ? (
          <div style={styles.empty}>
            <p>暫時未有路線</p>
            <p style={styles.emptySub}>敬請期待</p>
          </div>
        ) : (
          <div style={styles.routesList}>
            {filteredRoutes.map(route => (
              <button
                key={route.id}
                style={styles.routeCard}
                onClick={() => handleRouteClick(route.id)}
              >
                <div style={styles.routeInfo}>
                  <div style={styles.routePath}>
                    <span style={styles.routePoint}>{route.origin.name}</span>
                    <Icons.ArrowRight />
                    <span style={styles.routePoint}>{route.destination.name}</span>
                  </div>
                  <div style={styles.routeMeta}>
                    <span style={styles.routeMetaItem}>
                      <Icons.Clock />
                      {formatDuration(route.duration)}
                    </span>
                    <span style={styles.routeMetaItem}>
                      <Icons.Location />
                      {route.stops.length} 個站點
                    </span>
                  </div>
                </div>
                <div style={styles.routePrice}>
                  <span style={styles.priceLabel}>由</span>
                  <span style={styles.priceValue}>{formatPrice(route.price)}</span>
                  <span style={styles.priceUnit}>起</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Driver Section - Separate flow for drivers */}
      <section style={{ padding: '20px 16px', background: '#fff9f5', borderTop: '1px solid #f0e0d6', marginTop: '8px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#8a8478', marginBottom: 8, fontWeight: 600, letterSpacing: '0.1em' }}>
            司機專區
          </div>
          <button
            onClick={() => window.location.href = '/driver'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid #f0e0d6',
              borderRadius: 12,
              padding: '12px 24px',
              fontWeight: 700,
              background: '#fff',
              color: '#4a3728',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 17h8M8 17a2 2 0 11-4 0 2 2 0 014 0zM16 17a2 2 0 104 0 2 2 0 00-4 0zM3 9h13a2 2 0 012 2v3H3V9zm13 0V6a2 2 0 00-2-2H5a2 2 0 00-2 2v3" />
            </svg>
            司機登入 / 註冊
          </button>
          <div style={{ fontSize: 11, color: '#9a948a', marginTop: 8 }}>
            需要完成 KYC 審批才能接單
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>© 2026 CabsAGI 跨境商務出行平台</p>
      </footer>

      {/* Show bottom nav when logged in */}
      {currentUser && (
        <nav style={loggedInNavStyle}>
          <button style={loggedInNavItem} onClick={() => navigate('/dashboard')}>
            <Icons.Home />
            <span>首頁</span>
          </button>
          <button style={loggedInNavItem} onClick={() => navigate('/dashboard')}>
            <Icons.Ticket />
            <span>預訂</span>
          </button>
          <button style={loggedInNavItem} onClick={() => navigate('/profile')}>
            <Icons.User />
            <span>我的</span>
          </button>
        </nav>
      )}

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          // Refresh to ensure auth state is properly reflected
          window.location.reload()
        }}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#fff9f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: '#fff',
    borderBottom: '2px solid #f0e0d6'
  },
  logo: {
    display: 'flex',
    alignItems: 'center'
  },
  logoText: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#e07b4c'
  },
  headerBtn: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #e07b4c',
    background: '#fff',
    color: '#e07b4c',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  serviceSection: {
    padding: '20px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '16px'
  },
  serviceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px'
  },
  serviceCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '24px 16px',
    borderRadius: '16px',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.15s ease',
    minHeight: '100px'
  },
  serviceIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  serviceLabel: {
    fontSize: '14px',
    fontWeight: 600
  },
  routesSection: {
    padding: '0 20px 24px'
  },
  routesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  clearFilter: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    background: '#f5f5f5',
    color: '#666',
    fontSize: '13px',
    cursor: 'pointer'
  },
  routesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  routeCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderRadius: '12px',
    border: 'none',
    background: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'transform 0.15s ease'
  },
  routeInfo: {
    flex: 1
  },
  routePath: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    color: '#1a1a1a',
    fontSize: '15px',
    fontWeight: 500
  },
  routePoint: {
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  routeMeta: {
    display: 'flex',
    gap: '16px'
  },
  routeMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#888'
  },
  routePrice: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginLeft: '16px'
  },
  priceLabel: {
    fontSize: '11px',
    color: '#888'
  },
  priceValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1976D2'
  },
  priceUnit: {
    fontSize: '11px',
    color: '#888'
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#888'
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: '#888',
    background: '#fff',
    borderRadius: '12px'
  },
  emptySub: {
    fontSize: '13px',
    marginTop: '4px'
  },
  footer: {
    padding: '24px 20px',
    textAlign: 'center',
    color: '#aaa',
    fontSize: '12px'
  }
}

// Logged in navigation styles
const loggedInNavStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'flex',
  background: '#e07b4c',
  padding: '10px 0',
  zIndex: 100
}

const loggedInNavItem: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  padding: '8px',
  border: 'none',
  background: 'transparent',
  color: '#fff',
  fontSize: '12px',
  cursor: 'pointer',
  opacity: 0.7
}
