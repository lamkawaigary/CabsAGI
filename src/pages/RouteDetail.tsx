import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { routeService, shiftService } from '../services/shiftService'
import type { Route, Shift } from '../types/shift'

const formatPrice = (price: number) => `$${price}`
const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}分鐘`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}小時${mins}分` : `${hours}小時`
}

const formatTime = (timestamp: string) => {
  const date = new Date(parseInt(timestamp))
  return date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (timestamp: string) => {
  const date = new Date(parseInt(timestamp))
  return date.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })
}

export default function RouteDetail() {
  const { routeId } = useParams<{ routeId: string }>()
  const navigate = useNavigate()
  const [route, setRoute] = useState<Route | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (routeId) loadData()
  }, [routeId, selectedDate])

  const loadData = async () => {
    if (!routeId) return
    try {
      setLoading(true)
      const [routeData, shiftsData] = await Promise.all([
        routeService.getById(routeId),
        shiftService.getByRoute(routeId, selectedDate)
      ])
      setRoute(routeData)
      setShifts(shiftsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBooking = (shiftId: string) => {
    navigate(`/booking/${shiftId}`)
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>載入中...</div>
      </div>
    )
  }

  if (!route) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <p>路線不存在</p>
          <button style={styles.backBtn} onClick={() => navigate('/')}>返回首頁</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>
          ← 返回
        </button>
        <h1 style={styles.title}>{route.name}</h1>
      </header>

      {/* Route Info */}
      <section style={styles.section}>
        <div style={styles.routePath}>
          <div style={styles.stopPoint}>
            <div style={styles.stopDot} />
            <span>{route.origin.name}</span>
          </div>
          <div style={styles.routeLine} />
          {route.stops.filter(s => s.sequence > 0 && s.sequence < route.stops.length - 1).map(stop => (
            <div key={stop.sequence} style={styles.stopPoint}>
              <div style={{ ...styles.stopDot, ...styles.stopDotSmall }} />
              <span>{stop.name}</span>
            </div>
          ))}
          <div style={styles.stopPoint}>
            <div style={{ ...styles.stopDot, ...styles.stopDotEnd }} />
            <span>{route.destination.name}</span>
          </div>
        </div>

        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>行程時間</span>
            <span style={styles.statValue}>{formatDuration(route.duration)}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>距離</span>
            <span style={styles.statValue}>{route.distance}km</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>價錢</span>
            <span style={{ ...styles.statValue, color: '#1976D2' }}>{formatPrice(route.price)}起</span>
          </div>
        </div>
      </section>

      {/* Date Selection */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>選擇日期</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={styles.dateInput}
          min={new Date().toISOString().split('T')[0]}
        />
      </section>

      {/* Shifts */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>班次時間</h2>
        {shifts.length === 0 ? (
          <div style={styles.empty}>當日暫無班次</div>
        ) : (
          <div style={styles.shiftsList}>
            {shifts.map(shift => (
              <div key={shift.id} style={styles.shiftCard}>
                <div style={styles.shiftInfo}>
                  <div style={styles.shiftTime}>{formatTime(shift.departureTime)}</div>
                  <div style={styles.shiftMeta}>
                    <span>{formatDate(shift.departureTime)}</span>
                    <span>•</span>
                    <span>{shift.availableSeats}/{shift.totalSeats} 位</span>
                  </div>
                </div>
                <div style={styles.shiftPrice}>
                  <span style={styles.shiftPriceValue}>{formatPrice(shift.price)}</span>
                </div>
                <button
                  style={{
                    ...styles.bookBtn,
                    opacity: shift.availableSeats > 0 ? 1 : 0.5,
                    cursor: shift.availableSeats > 0 ? 'pointer' : 'not-allowed'
                  }}
                  disabled={shift.availableSeats === 0}
                  onClick={() => shift.availableSeats > 0 && handleBooking(shift.id)}
                >
                  {shift.availableSeats > 0 ? '預訂' : '滿座'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif'
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#888'
  },
  error: {
    padding: '40px',
    textAlign: 'center'
  },
  header: {
    padding: '16px 20px',
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  },
  backBtn: {
    padding: '8px 0',
    border: 'none',
    background: 'transparent',
    color: '#1976D2',
    fontSize: '15px',
    cursor: 'pointer'
  },
  title: {
    margin: '8px 0 0',
    fontSize: '20px',
    fontWeight: 600
  },
  section: {
    padding: '20px',
    background: '#fff',
    marginBottom: '8px'
  },
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: '16px',
    fontWeight: 600
  },
  routePath: {
    padding: '20px 0'
  },
  stopPoint: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
    color: '#333'
  },
  stopDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#1976D2',
    flexShrink: 0
  },
  stopDotSmall: {
    width: '8px',
    height: '8px',
    background: '#ccc'
  },
  stopDotEnd: {
    background: '#4CAF50'
  },
  routeLine: {
    width: '2px',
    height: '24px',
    marginLeft: '5px',
    background: '#e0e0e0'
  },
  stats: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '20px 0',
    borderTop: '1px solid #eee',
    marginTop: '20px'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#888'
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 600
  },
  dateInput: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '16px'
  },
  shiftsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  shiftCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    borderRadius: '12px',
    background: '#f9f9f9'
  },
  shiftInfo: {
    flex: 1
  },
  shiftTime: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a1a1a'
  },
  shiftMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '13px',
    color: '#888',
    marginTop: '4px'
  },
  shiftPrice: {
    marginRight: '16px'
  },
  shiftPriceValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1976D2'
  },
  bookBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: '#1976D2',
    color: '#fff',
    fontWeight: 600,
    fontSize: '14px'
  },
  empty: {
    padding: '30px',
    textAlign: 'center',
    color: '#888',
    background: '#f9f9f9',
    borderRadius: '12px'
  }
}
