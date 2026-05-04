// Cabs Carpool - Passenger Browse Page v3.0
// Material Symbols Design

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { listingService, type Listing } from '../../services/listingService'
import BottomNav from '../../components/BottomNav'

const CATEGORIES = ['全部', '演唱會', '迪士尼', '機場', '口岸', '商務']

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

export default function PassengerBrowsePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('全部')

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
      <div key={listing.id} style={styles.card} onClick={() => navigate(`/listing/${listing.id}`)}>
        <div style={styles.cardDecor} />
        
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
                <Icon name="verified" style={{ fontSize: 14, color: '#f59e0b', marginLeft: 4 }} />
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
                    color: i <= (listing.passengerCount || 0) ? '#5f5f59' : '#dee8ff'
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
      <header style={styles.appBar}>
        <button style={styles.menuBtn} onClick={() => navigate(-1)}>
          <Icon name="arrow_back" style={{ color: '#f59e0b' }} />
        </button>
        <h1 style={styles.title}>探索行程</h1>
        <div style={styles.avatar}>
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'U')}&background=ffddb8&color=855300`}
            alt="User" 
          />
        </div>
      </header>

      <main style={styles.main}>
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

        <section style={styles.listSection}>
          {loading ? (
            <div style={styles.loading}>
              <Icon name="progress_activity" style={{ fontSize: 32, color: '#5f5f59' }} />
              <p>載入中...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div style={styles.empty}>
              <Icon name="directions_car" style={{ fontSize: 48, color: '#5f5f59' }} />
              <p>暫時沒有行程</p>
              <p style={{ fontSize: 14, marginTop: 8, color: '#534434' }}>嘗試其他篩選條件</p>
            </div>
          ) : (
            <div style={styles.cardList}>
              {filteredListings.map(renderListing)}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#f9f9ff', paddingBottom: 140 },
  appBar: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
    padding: '0 20px', height: 64,
    background: 'rgba(255,251,249,0.9)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #d8c3ad',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  menuBtn: { padding: 8, background: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%' },
  title: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 700, color: '#111c2d' },
  avatar: { width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid #d8c3ad' },
  main: { paddingTop: 80, paddingLeft: 20, paddingRight: 20 },
  categorySection: {
    marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20,
    overflowX: 'auto', display: 'flex', gap: 12, paddingBottom: 8, paddingTop: 16,
  },
  categoryTab: {
    flexShrink: 0, padding: '8px 16px', borderRadius: 9999, border: 'none',
    fontSize: 14, fontWeight: 600, background: '#dee8ff', color: '#534434', cursor: 'pointer',
  },
  categoryTabActive: { background: '#f59e0b', color: '#fff', boxShadow: '0 8px 30px rgba(245,158,11,0.3)' },
  listSection: { paddingTop: 24 },
  loading: { textAlign: 'center' as const, padding: 60, color: '#534434', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  empty: { textAlign: 'center' as const, padding: '60px 20px', color: '#534434', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  cardList: { display: 'flex', flexDirection: 'column', gap: 16 },
  card: {
    background: '#ffffff', borderRadius: 16, padding: 16, position: 'relative', overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(29,78,216,0.05)', cursor: 'pointer',
  },
  cardDecor: {
    position: 'absolute', top: 0, right: 0, width: 96, height: 96,
    background: 'rgba(245,158,11,0.1)', borderRadius: '0 0 0 96px',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  routeCode: { background: '#dee8ff', color: '#001551', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 },
  urgentTag: { background: '#fef3c7', color: '#92400e', fontSize: 12, padding: '4px 8px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 4 },
  price: { fontSize: 20, fontWeight: 700, color: '#855300' },
  priceUnit: { fontSize: 12, color: '#534434' },
  routeSection: { display: 'flex', gap: 16, marginBottom: 16 },
  routeDots: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  routeDot: { width: 12, height: 12, borderRadius: '50%', border: '2px solid #1d4ed8', background: '#ffffff', zIndex: 10 },
  routeLine: { width: 2, height: 40, background: '#dee8ff', marginTop: -2, marginBottom: -2 },
  routeDotEnd: { width: 12, height: 12, borderRadius: '50%', background: '#1d4ed8', zIndex: 10 },
  routePlaces: { flex: 1, display: 'flex', flexDirection: 'column', gap: 24 },
  placeName: { fontSize: 14, fontWeight: 600, color: '#111c2d' },
  placeTime: { fontSize: 12, color: '#5f5f59', marginTop: 2 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #dee8ff' },
  driverInfo: { display: 'flex', alignItems: 'center', gap: 12 },
  driverAvatar: { width: 40, height: 40, borderRadius: '50%', border: '2px solid #dee8ff' },
  driverName: { fontSize: 14, fontWeight: 600, color: '#111c2d', display: 'flex', alignItems: 'center' },
  driverMeta: { fontSize: 12, color: '#5f5f59', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 },
  seatInfo: { display: 'flex', alignItems: 'center', gap: 8 },
  seatIcons: { display: 'flex' },
  seatBadge: { fontSize: 12, color: '#534434', background: '#e7eeff', padding: '4px 8px', borderRadius: 8 },
}