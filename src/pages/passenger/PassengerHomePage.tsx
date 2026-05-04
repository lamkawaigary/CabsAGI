// Cabs Carpool - Passenger Home Page v6.0
// Material Symbols Design with Full Mockup Features

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { listingService, type Listing } from '../../services/listingService'
import BottomNav from '../../components/BottomNav'
import { colors, radius, shadows, spacing } from '../../styles/designSystem'

const CATEGORIES = ['全部', '演唱會', '迪士尼', '機場', '口岸', '商務']

// Material Symbol Icon Component
const Icon = ({ name, filled = false, style = {} }: { name: string; filled?: boolean; style?: React.CSSProperties }) => (
  <span style={{
    fontFamily: "'Material Symbols Outlined'",
    fontVariationSettings: filled ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
    fontSize: 20,
    ...style
  }}>
    {name}
  </span>
)

export default function PassengerHomePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('全部')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadListings()
  }, [])

  const loadListings = async () => {
    try {
      setLoading(true)
      const all = await listingService.getOpenListings()
      const driverOffers = all.filter(l => l.type === 'driver_offer' && l.status === 'OPEN')
      setListings(driverOffers.filter(l => l.initiatorId !== currentUser?.id))
    } catch (error) {
      console.error('Error loading:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const getRouteCode = (listing: Listing) => {
    const pickup = listing.route.pickup?.placeName || ''
    const dropoff = listing.route.dropoff?.placeName || ''
    
    if (pickup.toLowerCase().includes('airport') || pickup.includes('機場')) {
      if (dropoff.includes('深圳') || dropoff.includes('SZX')) return 'HKG → SZX'
      if (dropoff.includes('廣州') || dropoff.includes('CAN')) return 'HKG → CAN'
    }
    return '... → ...'
  }

  const getDriverRating = (listing: Listing) => {
    const hash = listing.initiatorId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return (4.5 + (hash % 5) / 10).toFixed(1)
  }

  const filteredListings = listings.filter(listing => {
    if (activeCategory === '全部') return true
    const places = `${listing.route.pickup?.placeName} ${listing.route.dropoff?.placeName}`.toLowerCase()
    switch (activeCategory) {
      case '機場': return places.includes('airport') || places.includes('機場')
      case '口岸': return places.includes('口岸')
      case '商務': return places.includes('中環')
      default: return true
    }
  })

  const renderListing = (listing: Listing) => {
    const rating = getDriverRating(listing)
    const isUrgent = new Date(listing.departureTime).getTime() - Date.now() < 2 * 60 * 60 * 1000
    const availableSeats = 7 - (listing.passengerCount || 0)

    return (
      <div 
        key={listing.id} 
        style={styles.card}
        onClick={() => navigate(`/listing/${listing.id}`)}
      >
        {/* Decorative corner */}
        <div style={styles.cardDecor} />

        {/* Header Row */}
        <div style={styles.cardHeader}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={styles.routeCode}>{getRouteCode(listing)}</span>
            {isUrgent && (
              <span style={styles.urgentTag}>
                <Icon name="local_fire_department" style={{ fontSize: 14 }} />
                極速成團
              </span>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={styles.price}>HK$ {listing.price || 150}</div>
            <div style={styles.priceUnit}>每位</div>
          </div>
        </div>

        {/* Route Visualization */}
        <div style={styles.routeSection}>
          <div style={styles.routeDots}>
            <div style={styles.routeDot} />
            <div style={styles.routeLine} />
            <div style={styles.routeDotEnd} />
          </div>
          <div style={styles.routePlaces}>
            <div>
              <div style={styles.placeName}>{listing.route.pickup?.placeName}</div>
              <div style={styles.placeTime}>今天 {formatTime(listing.departureTime)}</div>
            </div>
            <div style={{ marginTop: 24 }}>
              <div style={styles.placeName}>{listing.route.dropoff?.placeName}</div>
              <div style={styles.placeTime}>預計 15:45 抵達</div>
            </div>
          </div>
        </div>

        {/* Footer - Driver & Seats */}
        <div style={styles.cardFooter}>
          <div style={styles.driverInfo}>
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(listing.initiatorName)}&background=dee8ff&color=1d4ed8`}
              alt={listing.initiatorName}
              style={styles.driverAvatar}
            />
            <div>
              <div style={styles.driverName}>
                {listing.initiatorName}
                <Icon name="verified" style={{ fontSize: 14, color: colors.primary, marginLeft: 4 }} />
              </div>
              <div style={styles.driverMeta}>
                <Icon name="star" style={{ fontSize: 14, color: '#f59e0b' }} />
                {rating} ({listing.passengerCount || 0}+ 趟)
              </div>
            </div>
          </div>
          <div style={styles.seatInfo}>
            <div style={styles.seatIcons}>
              {[1,2,3,4].map(i => (
                <Icon 
                  key={i} 
                  name="airline_seat_recline_normal" 
                  style={{
                    fontSize: 18,
                    color: i <= (listing.passengerCount || 0) ? colors.tertiary : colors.surfaceContainerHigh
                  }} 
                />
              ))}
            </div>
            <span style={styles.seatBadge}>剩 {availableSeats} 座</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Top App Bar */}
      <header style={styles.appBar}>
        <button style={styles.menuBtn}>
          <Icon name="menu" style={{ color: colors.primary }} />
        </button>
        <h1 style={styles.logo}>OpenCabs</h1>
        <div style={styles.avatar}>
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'U')}&background=ffddb8&color=855300`}
            alt="User" 
          />
        </div>
      </header>

      <main style={styles.main}>
        {/* Search Section */}
        <section style={styles.searchSection}>
          <div style={styles.searchBar}>
            <Icon name="search" style={{ color: colors.secondary }} />
            <input 
              style={styles.searchInput}
              placeholder="輸入目的地 (例如：深圳灣口岸)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={styles.filterRow}>
            <div style={styles.filterItem}>
              <Icon name="calendar_month" style={{ color: colors.tertiary }} />
              <span style={styles.filterText}>今天</span>
              <Icon name="chevron_right" style={{ color: colors.tertiary }} />
            </div>
            <div style={styles.filterItem}>
              <Icon name="group" style={{ color: colors.tertiary }} />
              <span style={styles.filterText}>1 位乘客</span>
              <Icon name="chevron_right" style={{ color: colors.tertiary }} />
            </div>
          </div>
        </section>

        {/* Category Tabs */}
        <section style={styles.categorySection}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              style={{
                ...styles.categoryTab,
                ...(activeCategory === cat ? styles.categoryTabActive : {})
              }}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </section>

        {/* Popular Routes Section */}
        <section style={styles.routesSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>熱門路線</h2>
            <a style={styles.viewAll}>查看全部</a>
          </div>

          {loading ? (
            <div style={styles.loading}>
              <Icon name="progress_activity" style={{ fontSize: 32, color: colors.tertiary }} />
              <p>載入中...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div style={styles.empty}>
              <Icon name="directions_car" style={{ fontSize: 48, color: colors.tertiary }} />
              <p>暫時沒有行程</p>
              <p style={{ fontSize: 14, marginTop: 8, color: colors.textSecondary }}>司機發布行程後會在這裡顯示</p>
            </div>
          ) : (
            <div style={styles.cardList}>
              {filteredListings.map(renderListing)}
            </div>
          )}
        </section>
      </main>

      {/* FAB */}
      <button style={styles.fab} onClick={() => navigate('/create-request')}>
        <Icon name="add" style={{ fontSize: 24 }} />
        <span style={styles.fabText}>發佈需求</span>
      </button>

      <BottomNav />
    </div>
  )
}

// ============ STYLES ============
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: colors.background,
    paddingBottom: 140,
  },
  appBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    padding: '0 20px',
    height: 64,
    background: 'rgba(255,251,249,0.9)',
    backdropFilter: 'blur(12px)',
    borderBottom: `1px solid ${colors.outlineVariant}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuBtn: {
    padding: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '50%',
  },
  logo: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 20,
    fontWeight: 800,
    color: colors.primary,
    fontStyle: 'italic',
    letterSpacing: '-0.02em',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    overflow: 'hidden',
    border: `2px solid ${colors.outlineVariant}`,
  },
  main: {
    paddingTop: 80,
    paddingLeft: spacing.container,
    paddingRight: spacing.container,
  },
  searchSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  searchBar: {
    background: colors.surfaceContainerLowest,
    padding: '14px 16px',
    borderRadius: radius.md,
    boxShadow: shadows.card,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    fontSize: 16,
    color: colors.textPrimary,
    outline: 'none',
  },
  filterRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.md,
  },
  filterItem: {
    background: colors.surfaceContainerLowest,
    padding: '14px 16px',
    borderRadius: radius.md,
    boxShadow: shadows.card,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
  },
  filterText: {
    flex: 1,
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  categorySection: {
    marginLeft: -spacing.container,
    marginRight: -spacing.container,
    paddingLeft: spacing.container,
    paddingRight: spacing.container,
    overflowX: 'auto',
    display: 'flex',
    gap: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: spacing.lg,
  },
  categoryTab: {
    flexShrink: 0,
    padding: '8px 16px',
    borderRadius: radius.full,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    background: colors.surfaceContainerHigh,
    color: colors.textSecondary,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  categoryTabActive: {
    background: colors.primary,
    color: colors.onPrimary,
    boxShadow: shadows.fab,
  },
  routesSection: {
    paddingTop: spacing.xxl,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.textPrimary,
    margin: 0,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.secondary,
    textDecoration: 'none',
  },
  loading: {
    textAlign: 'center' as const,
    padding: 60,
    color: colors.textSecondary,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: colors.textSecondary,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  card: {
    background: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: shadows.card,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  cardDecor: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 96,
    height: 96,
    background: `${colors.primary}20`,
    borderRadius: '0 0 0 96px',
    transition: 'transform 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  routeCode: {
    background: colors.surfaceContainerHigh,
    color: '#001551',
    fontSize: 12,
    fontWeight: 700,
    padding: '4px 12px',
    borderRadius: radius.full,
    letterSpacing: '0.05em',
  },
  urgentTag: {
    background: '#fef3c7',
    color: '#92400e',
    fontSize: 12,
    padding: '4px 8px',
    borderRadius: radius.md,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.primaryDark,
  },
  priceUnit: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  routeSection: {
    display: 'flex',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  routeDots: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    border: `2px solid ${colors.secondary}`,
    background: colors.surfaceContainerLowest,
    zIndex: 10,
  },
  routeLine: {
    width: 2,
    height: 40,
    background: colors.surfaceContainerHigh,
    marginTop: -2,
    marginBottom: -2,
  },
  routeDotEnd: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: colors.secondary,
    zIndex: 10,
  },
  routePlaces: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xxl,
  },
  placeName: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  placeTime: {
    fontSize: 12,
    color: colors.tertiary,
    marginTop: 2,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTop: `1px solid ${colors.surfaceContainerHigh}`,
  },
  driverInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: `2px solid ${colors.surfaceContainerHigh}`,
  },
  driverName: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
    display: 'flex',
    alignItems: 'center',
  },
  driverMeta: {
    fontSize: 12,
    color: colors.tertiary,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  seatInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  seatIcons: {
    display: 'flex',
  },
  seatBadge: {
    fontSize: 12,
    color: colors.textSecondary,
    background: colors.surfaceContainer,
    padding: '4px 8px',
    borderRadius: radius.sm,
  },
  fab: {
    position: 'fixed',
    bottom: 100,
    right: spacing.container,
    zIndex: 40,
    background: `linear-gradient(to right, ${colors.primary}, ${colors.primaryDark})`,
    color: colors.onPrimary,
    padding: '14px 20px',
    borderRadius: radius.xl,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: shadows.fab,
    cursor: 'pointer',
  },
  fabText: {
    fontSize: 14,
    fontWeight: 600,
  },
}