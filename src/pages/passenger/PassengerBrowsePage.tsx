// Cabs Carpool - Passenger Browse Page v5.0
// New card design matching reference screenshot

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { tripService } from '../../services/tripService'
import { chatService } from '../../services/chatService'
import { colors, radius } from '../../styles/designSystem'
import BottomNav from '../../components/BottomNav'

const CATEGORIES = ['全部', '演唱會', '迪士尼', '機場', '口岸', '商務', '婚禮', '體育賽事']

const Icon = ({ name, style = {} }: { name: string; style?: React.CSSProperties }) => (
  <span style={{
    fontFamily: "'Material Symbols Outlined'",
    fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
    fontSize: 20,
    ...style
  }}>{name}</span>
)

export default function PassengerBrowsePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('全部')

  useEffect(() => {
    loadTrips()
  }, [])

  const loadTrips = async () => {
    try {
      setLoading(true)
      const publicTrips = await tripService.getPublicTrips()
      const filteredTrips = publicTrips.filter(t => t.driverId !== currentUser?.id)
      setTrips(filteredTrips || [])
    } catch (error) {
      console.error('Error loading trips:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTripTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    return isToday ? timeStr : `${d.getMonth() + 1}/${d.getDate()} ${timeStr}`
  }

  const getDriverRating = (trip: any) => {
    const hash = (trip.driverId || '').split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)
    return (4.5 + (hash % 5) / 10).toFixed(1)
  }

  const filteredTrips = trips.filter(trip => {
    if (activeCategory === '全部') return true
    const tripTags = trip.tags || []
    const places = `${trip.route?.pickup?.placeName || ''} ${trip.route?.dropoff?.placeName || ''}`.toLowerCase()

    if (tripTags.includes(activeCategory)) return true

    switch (activeCategory) {
      case '機場':
        return places.includes('airport') || places.includes('機場') || places.includes('國際機場')
      case '口岸':
        return places.includes('口岸') || places.includes('深圳灣') || places.includes('羅湖') || places.includes('落馬洲')
      case '商務':
        return places.includes('中環') || places.includes('灣仔') || places.includes('金鐘') || places.includes('商務')
      case '演唱會':
        return tripTags.includes('演唱會') || places.includes('演唱會') || places.includes('會展')
      case '迪士尼':
        return tripTags.includes('迪士尼') || places.includes('迪士尼') || places.includes('Disney')
      case '婚禮':
        return tripTags.includes('婚禮') || places.includes('婚禮') || places.includes('酒店')
      case '體育賽事':
        return tripTags.includes('體育賽事') || places.includes('足球') || places.includes('籃球') || places.includes('賽馬')
      default:
        return true
    }
  })

  const handleJoinTrip = async (trip: any) => {
    try {
      await tripService.requestJoin(trip.id, {
        passengerId: currentUser!.id,
        name: currentUser!.name || '乘客',
        phone: currentUser!.phone || '',
      })

      let roomId = await chatService.getTripRoom(trip.id)
      
      if (!roomId) {
        roomId = await chatService.createTripChatRoom({
          tripId: trip.id,
          driverId: trip.driverId,
          driverName: trip.driverName,
          driverPhone: trip.driverPhone,
          pickup: trip.route?.pickup?.placeName || trip.pickup?.placeName || '',
          dropoff: trip.route?.dropoff?.placeName || trip.dropoff?.placeName || '',
          departureTime: trip.departureTime,
        })
      } else {
        await chatService.joinChatRoom(roomId, {
          passengerId: currentUser!.id,
          name: currentUser!.name || '乘客',
          role: 'passenger',
          phone: currentUser!.phone || '',
        })
      }

      navigate(`/chat/${roomId}`)
    } catch (error: any) {
      console.error('Error joining trip:', error)
      alert('無法加入，請重試: ' + (error?.message || '未知錯誤'))
    }
  }

  const renderTripCard = (trip: any) => {
    const rating = getDriverRating(trip)
    const availableSeats = trip.availableSeats !== undefined 
      ? trip.availableSeats 
      : (trip.totalSeats || 7) - (trip.passengers?.length || 0)

    const pickup = trip.route?.pickup?.placeName || trip.pickup?.placeName || '上車地點'
    const dropoff = trip.route?.dropoff?.placeName || trip.dropoff?.placeName || '目的地'

    return (
      <div key={trip.id} style={cardStyles.card}>
        {/* Category Tags */}
        {trip.tags && trip.tags.length > 0 && (
          <div style={cardStyles.tagRow}>
            {trip.tags.slice(0, 2).map((tag: string) => (
              <span key={tag} style={cardStyles.tag}>{tag}</span>
            ))}
          </div>
        )}

        {/* Driver Info */}
        <div style={cardStyles.driverRow}>
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(trip.driverName || 'D')}&background=dee8ff&color=1d4ed8`}
            alt={trip.driverName}
            style={cardStyles.avatar}
          />
          <div style={cardStyles.driverInfo}>
            <span style={cardStyles.driverName}>{trip.driverName}</span>
            <span style={cardStyles.driverMeta}>⭐ {rating}</span>
          </div>
        </div>

        {/* Route */}
        <div style={cardStyles.routeRow}>
          <div style={cardStyles.routeStart}>{pickup}</div>
          <div style={cardStyles.routeArrow}>→</div>
          <div style={cardStyles.routeEnd}>{dropoff}</div>
        </div>

        {/* Time and Seats */}
        <div style={cardStyles.infoRow}>
          <span style={cardStyles.time}>
            <Icon name="schedule" style={{ fontSize: 14 }} />
            {formatTripTime(trip.departureTime)}
          </span>
          <span style={cardStyles.seats}>
            <Icon name="airline_seat_recline_normal" style={{ fontSize: 14 }} />
            剩 {availableSeats} 位
          </span>
        </div>

        {/* Join Button */}
        <button 
          style={cardStyles.joinBtn}
          onClick={() => handleJoinTrip(trip)}
        >
          加入
        </button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.appBar}>
        <button style={styles.menuBtn} onClick={() => navigate('/passenger-home')}>
          <Icon name="arrow_back" style={{ color: '#f59e0b' }} />
        </button>
        <h1 style={styles.title}>🔍 瀏覽行程</h1>
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
          ) : filteredTrips.length === 0 ? (
            <div style={styles.empty}>
              <Icon name="directions_car" style={{ fontSize: 48, color: '#5f5f59' }} />
              <p>暫時沒有行程</p>
              <p style={{ fontSize: 14, marginTop: 8, color: '#534434' }}>嘗試其他篩選條件</p>
            </div>
          ) : (
            <div style={styles.cardList}>
              {filteredTrips.map(renderTripCard)}
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
}

const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    border: '1px solid #dee8ff',
    cursor: 'pointer',
  },
  tagRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    fontSize: 11,
    background: '#dee8ff',
    color: '#001551',
    padding: '2px 8px',
    borderRadius: 8,
    fontWeight: 600,
  },
  driverRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '2px solid #dee8ff',
  },
  driverInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  driverName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111c2d',
  },
  driverMeta: {
    fontSize: 12,
    color: '#5f5f59',
  },
  routeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    padding: '10px 12px',
    background: '#f9f9ff',
    borderRadius: 10,
  },
  routeStart: {
    flex: 1,
    fontSize: 14,
    fontWeight: 600,
    color: '#111c2d',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  routeArrow: {
    fontSize: 18,
    color: '#1d4ed8',
    fontWeight: 700,
  },
  routeEnd: {
    flex: 1,
    fontSize: 14,
    fontWeight: 600,
    color: '#111c2d',
    textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  time: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 13,
    color: '#5f5f59',
  },
  seats: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 13,
    color: '#855300',
    fontWeight: 600,
  },
  joinBtn: {
    width: '100%',
    padding: '10px',
    background: '#f59e0b',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
}