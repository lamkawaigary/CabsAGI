import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { shiftService, routeService, bookingService } from '../services/shiftService'
import type { Shift, Route } from '../types/shift'

const formatPrice = (price: number) => `$${price}`
const formatTime = (timestamp: string) => {
  const date = new Date(parseInt(timestamp))
  return date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })
}
const formatDate = (timestamp: string) => {
  const date = new Date(parseInt(timestamp))
  return date.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })
}

export default function BookingPage() {
  const { shiftId } = useParams<{ shiftId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  
  const [shift, setShift] = useState<Shift | null>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'details' | 'payment' | 'confirm'>('details')
  
  // Form fields
  const [passengerName, setPassengerName] = useState('')
  const [passengerPhone, setPassengerPhone] = useState('')
  const [passengerEmail, setPassengerEmail] = useState('')
  const [seatCount, setSeatCount] = useState(1)
  const [pickupIndex] = useState(0)
  const [dropoffIndex, setDropoffIndex] = useState(1)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [shiftId])

  useEffect(() => {
    if (currentUser) {
      setPassengerName(currentUser.name || '')
      setPassengerEmail(currentUser.email || '')
    }
  }, [currentUser])

  const loadData = async () => {
    if (!shiftId) return
    try {
      setLoading(true)
      const shiftData = await shiftService.getById(shiftId)
      if (shiftData) {
        setShift(shiftData)
        if (shiftData.routeId) {
          const routeData = await routeService.getById(shiftData.routeId)
          if (routeData) {
            setRoute(routeData)
            setDropoffIndex((routeData.stops?.length || 2) - 1)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!shift || !currentUser) return
    
    setSubmitting(true)
    try {
      const bookingId = await bookingService.create({
        shiftId: shift.id,
        routeId: shift.routeId,
        userId: currentUser.id,
        passengerName,
        passengerPhone,
        passengerEmail,
        pickupStopIndex: pickupIndex,
        dropoffStopIndex: dropoffIndex,
        seatCount,
        totalPrice: shift.price * seatCount,
        notes
      })
      
      // Simulate payment - in real app would integrate Stripe/PayPal
      await bookingService.confirmPayment(bookingId, `sim_${Date.now()}`)
      
      setStep('confirm')
    } catch (error) {
      console.error('Booking failed:', error)
      alert('預訂失敗，請重試')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>載入中...</div>
      </div>
    )
  }

  if (!shift || !route) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <p>班次不存在</p>
          <button style={styles.backBtn} onClick={() => navigate('/')}>返回首頁</button>
        </div>
      </div>
    )
  }

  // Confirmation view
  if (step === 'confirm') {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('/')}>← 返回首頁</button>
        </header>
        <div style={styles.confirmBox}>
          <div style={styles.successIcon}>✓</div>
          <h2 style={styles.confirmTitle}>加入班次成功！</h2>
          <p style={styles.confirmText}>
            你的乘車資料已提交，請準時到集合點上車。
          </p>
          <div style={styles.confirmDetails}>
            <div style={styles.confirmRow}>
              <span>班次路線</span>
              <span>{route.origin.name} → {route.destination.name}</span>
            </div>
            <div style={styles.confirmRow}>
              <span>出發時間</span>
              <span>{formatDate(shift.departureTime)} {formatTime(shift.departureTime)}</span>
            </div>
            <div style={styles.confirmRow}>
              <span>預約座位</span>
              <span>{seatCount} 位</span>
            </div>
            <div style={styles.confirmRow}>
              <span>總價</span>
              <span style={styles.totalPrice}>{formatPrice(shift.price * seatCount)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <h1 style={styles.title}>預訂資料</h1>
      </header>

      {/* Trip Summary */}
      <section style={styles.section}>
        <div style={styles.tripSummary}>
          <div style={styles.tripPath}>
            <span>{route.origin.name}</span>
            <span style={styles.arrow}>→</span>
            <span>{route.destination.name}</span>
          </div>
          <div style={styles.tripMeta}>
            <span>{formatDate(shift.departureTime)}</span>
            <span>{formatTime(shift.departureTime)}</span>
            <span>•</span>
            <span>{shift.availableSeats} 位可用</span>
          </div>
        </div>
      </section>

      {/* Passenger Details */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>乘車資料確認</h2>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>聯絡姓名</label>
          <input
            type="text"
            value={passengerName}
            onChange={(e) => setPassengerName(e.target.value)}
            placeholder="請輸入姓名"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>聯絡電話（上車聯絡）</label>
          <input
            type="tel"
            value={passengerPhone}
            onChange={(e) => setPassengerPhone(e.target.value)}
            placeholder="請輸入電話"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>電郵（可選）</label>
          <input
            type="email"
            value={passengerEmail}
            onChange={(e) => setPassengerEmail(e.target.value)}
            placeholder="請輸入電郵"
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>預約座位數量</label>
          <div style={styles.seatSelector}>
            {[1, 2, 3, 4, 5].map(num => (
              <button
                key={num}
                style={{
                  ...styles.seatBtn,
                  ...(seatCount === num ? styles.seatBtnActive : {})
                }}
                onClick={() => setSeatCount(num)}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>備註（可選）</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="例如：行李較多、同行長者..."
            style={styles.textarea}
            rows={3}
          />
        </div>
      </section>

      {/* Price Summary */}
      <section style={styles.section}>
        <div style={styles.priceRow}>
          <span>單價</span>
          <span>{formatPrice(shift.price)} x {seatCount}</span>
        </div>
        <div style={{ ...styles.priceRow, ...styles.priceTotal }}>
          <span>總價</span>
          <span style={styles.totalPrice}>{formatPrice(shift.price * seatCount)}</span>
        </div>
      </section>

      {/* Submit Button */}
      <footer style={styles.footer}>
        <button
          style={{
            ...styles.submitBtn,
            opacity: passengerName && passengerPhone ? 1 : 0.5,
            cursor: passengerName && passengerPhone ? 'pointer' : 'not-allowed'
          }}
          disabled={!passengerName || !passengerPhone || submitting}
          onClick={handleSubmit}
        >
          {submitting ? '提交中...' : `確認加入班次 · ${formatPrice(shift.price * seatCount)}`}
        </button>
      </footer>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif',
    paddingBottom: '100px'
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
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
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
    margin: 0,
    fontSize: '18px',
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
  tripSummary: {
    textAlign: 'center'
  },
  tripPath: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '8px'
  },
  arrow: {
    color: '#1976D2'
  },
  tripMeta: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#666'
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '16px',
    boxSizing: 'border-box',
    resize: 'vertical'
  },
  seatSelector: {
    display: 'flex',
    gap: '8px'
  },
  seatBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    background: '#fff',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer'
  },
  seatBtnActive: {
    border: '2px solid #1976D2',
    background: '#E3F2FD',
    color: '#1976D2'
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    color: '#666'
  },
  priceTotal: {
    borderTop: '1px solid #eee',
    marginTop: '8px',
    paddingTop: '16px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a'
  },
  totalPrice: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1976D2'
  },
  footer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '16px 20px',
    background: '#fff',
    boxShadow: '0 -2px 10px rgba(0,0,0,0.08)'
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: 'none',
    background: '#1976D2',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600
  },
  confirmBox: {
    padding: '40px 20px',
    textAlign: 'center'
  },
  successIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: '#4CAF50',
    color: '#fff',
    fontSize: '32px',
    lineHeight: '64px',
    margin: '0 auto 20px'
  },
  confirmTitle: {
    margin: '0 0 12px',
    fontSize: '24px',
    fontWeight: 600
  },
  confirmText: {
    margin: '0 0 24px',
    color: '#666',
    lineHeight: 1.5
  },
  confirmDetails: {
    background: '#f9f9f9',
    borderRadius: '12px',
    padding: '16px'
  },
  confirmRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    color: '#333'
  }
}
