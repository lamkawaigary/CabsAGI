import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { routeService } from '../services/shiftService'
import LoginModal from '../components/LoginModal'
import type { Route, RouteType } from '../types/shift'

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
  const [selectedType, setSelectedType] = useState<RouteType | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    loadRoutes()
  }, [])

  const loadRoutes = async () => {
    try {
      setLoading(true)
      const allRoutes = await routeService.getAll()
      setRoutes(allRoutes)
    } catch (error) {
      console.error('Failed to load routes:', error)
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

      {/* Footer */}
      <footer style={styles.footer}>
        <p>© 2026 CabsAGI 跨境商務出行平台</p>
      </footer>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => navigate('/dashboard')}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #f8f9fa 0%, #fff 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: '#fff',
    borderBottom: '1px solid #f0f0f0'
  },
  logo: {
    display: 'flex',
    alignItems: 'center'
  },
  logoText: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#143b34'
  },
  headerBtn: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #143b34',
    background: '#fff',
    color: '#143b34',
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
