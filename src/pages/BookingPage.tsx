import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { shiftService, routeService, bookingService } from '../services/shiftService'
import type { Shift, Route } from '../types/shift'

const toDate = (raw: string) => {
  const asNum = Number(raw)
  const date = Number.isFinite(asNum) && asNum > 0 ? new Date(asNum) : new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatPrice = (price: number) => `HK$${price}`
const formatTime = (raw: string) => {
  const date = toDate(raw)
  if (!date) return '--:--'
  return date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })
}
const formatDate = (raw: string) => {
  const date = toDate(raw)
  if (!date) return raw
  return date.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })
}

const sceneLabelByType: Record<string, string> = {
  AIRPORT: '機場接送',
  EVENT: '演唱會散場',
  CROSS_BORDER: '跨境路線',
  THEME_PARK: '主題公園',
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
        notes,
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

  const canSubmit = Boolean(passengerName.trim() && passengerPhone.trim())
  const sceneLabel = sceneLabelByType[route.type] || '固定路線'
  const totalPrice = shift.price * seatCount

  // Confirmation view
  if (step === 'confirm') {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('/')}>
            ← 返回首頁
          </button>
        </header>
        <section style={styles.confirmHeroCard}>
          <div style={styles.successIcon}>✓</div>
          <div style={styles.confirmEyebrow}>預約完成</div>
          <h2 style={styles.confirmTitle}>加入班次成功！</h2>
          <p style={styles.confirmText}>你的乘車資料已提交，請準時到集合點上車。</p>
        </section>

        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>行程摘要</h3>
          <div style={styles.confirmDetails}>
            <div style={styles.confirmRow}>
              <span style={styles.confirmLabel}>班次路線</span>
              <span style={styles.confirmValue}>
                {route.origin.name} → {route.destination.name}
              </span>
            </div>
            <div style={styles.confirmRow}>
              <span style={styles.confirmLabel}>出發時間</span>
              <span style={styles.confirmValue}>
                {formatDate(shift.departureTime)} {formatTime(shift.departureTime)}
              </span>
            </div>
            <div style={styles.confirmRow}>
              <span style={styles.confirmLabel}>預約座位</span>
              <span style={styles.confirmValue}>{seatCount} 位</span>
            </div>
            <div style={{ ...styles.confirmRow, ...styles.confirmRowTotal }}>
              <span style={styles.confirmLabel}>總價</span>
              <span style={styles.totalPrice}>{formatPrice(totalPrice)}</span>
            </div>
          </div>
          <button style={styles.confirmActionBtn} onClick={() => navigate('/')}>
            返回首頁查看行程
          </button>
        </section>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <div style={styles.titleWrap}>
          <h1 style={styles.title}>確認加入班次</h1>
          <p style={styles.titleSub}>填寫乘車資料並完成預約</p>
        </div>
      </header>

      <section style={styles.heroCard}>
        <div style={styles.heroEyebrow}>{sceneLabel}</div>
        <h2 style={styles.heroTitle}>
          {route.origin.name} → {route.destination.name}
        </h2>
        <p style={styles.heroSubtitle}>已為你保留流程，完成資料後即可鎖定座位。</p>
        <div style={styles.heroMeta}>
          <span style={styles.heroMetaChip}>{formatDate(shift.departureTime)}</span>
          <span style={styles.heroMetaChip}>{formatTime(shift.departureTime)} 出發</span>
          <span style={styles.heroMetaChip}>尚餘 {shift.availableSeats} 位</span>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.tripSummary}>
          <div style={styles.tripSummaryTitle}>班次資訊</div>
          <div style={styles.tripSummaryValue}>
            {formatDate(shift.departureTime)} {formatTime(shift.departureTime)} · {formatPrice(shift.price)} / 位
          </div>
        </div>
      </section>

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
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                style={{
                  ...styles.seatBtn,
                  ...(seatCount === num ? styles.seatBtnActive : {}),
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

      <section style={styles.section}>
        <div style={styles.priceRow}>
          <span>單價</span>
          <span>
            {formatPrice(shift.price)} × {seatCount}
          </span>
        </div>
        <div style={{ ...styles.priceRow, ...styles.priceTotal }}>
          <span>總價</span>
          <span style={styles.totalPrice}>{formatPrice(totalPrice)}</span>
        </div>
      </section>

      <footer style={styles.footer}>
        <button
          style={{
            ...styles.submitBtn,
            opacity: canSubmit ? 1 : 0.5,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
          disabled={!canSubmit || submitting}
          onClick={handleSubmit}
        >
          {submitting ? '提交中...' : `確認加入班次 · ${formatPrice(totalPrice)}`}
        </button>
      </footer>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #eef8f4 0%, #f6f8f7 180px, #f6f8f7 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif',
    paddingBottom: '106px',
  },
  loading: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#6d7f78',
  },
  error: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#7f3f3f',
  },
  header: {
    padding: '16px 16px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: '8px 4px',
    border: 'none',
    background: 'transparent',
    color: '#1e4f43',
    fontSize: 15,
    cursor: 'pointer',
    fontWeight: 700,
  },
  titleWrap: {
    display: 'grid',
    gap: 2,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: '#1f3f38',
  },
  titleSub: {
    margin: 0,
    fontSize: 12,
    color: '#5f7b72',
    fontWeight: 600,
  },
  heroCard: {
    margin: '0 12px 0',
    borderRadius: 18,
    border: '1px solid rgba(30, 79, 67, 0.12)',
    background: 'linear-gradient(135deg, #1e4f43 0%, #2b6a5a 100%)',
    color: '#fff',
    padding: '16px 14px',
    boxShadow: '0 16px 32px rgba(30, 79, 67, 0.18)',
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: 700,
    opacity: 0.9,
  },
  heroTitle: {
    margin: '4px 0 0',
    fontSize: 21,
    lineHeight: 1.25,
    fontWeight: 800,
  },
  heroSubtitle: {
    margin: '8px 0 0',
    fontSize: 13,
    lineHeight: 1.5,
    color: 'rgba(255,255,255,0.92)',
  },
  heroMeta: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  heroMetaChip: {
    fontSize: 12,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.12)',
    padding: '4px 10px',
    fontWeight: 700,
  },
  section: {
    padding: '14px',
    background: '#fff',
    margin: '10px 12px 0',
    borderRadius: 14,
    border: '1px solid #e1e9e4',
    boxShadow: '0 8px 18px rgba(14, 64, 54, 0.05)',
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: 15,
    fontWeight: 700,
    color: '#27443c',
  },
  tripSummary: {
    display: 'grid',
    gap: 4,
  },
  tripSummaryTitle: {
    fontSize: 12,
    color: '#5f7b72',
    fontWeight: 700,
  },
  tripSummaryValue: {
    fontSize: 14,
    color: '#1f3f38',
    fontWeight: 700,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    display: 'block',
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 700,
    color: '#35534b',
  },
  input: {
    width: '100%',
    padding: '12px 13px',
    borderRadius: 10,
    border: '1px solid #d8e4de',
    fontSize: 15,
    color: '#1f3f38',
    boxSizing: 'border-box',
    background: '#fcfefd',
  },
  textarea: {
    width: '100%',
    padding: '12px 13px',
    borderRadius: 10,
    border: '1px solid #d8e4de',
    fontSize: 15,
    color: '#1f3f38',
    boxSizing: 'border-box',
    resize: 'vertical',
    background: '#fcfefd',
  },
  seatSelector: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  seatBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    border: '1px solid #d8e4de',
    background: '#fff',
    fontSize: 15,
    fontWeight: 700,
    color: '#35534b',
    cursor: 'pointer',
  },
  seatBtnActive: {
    border: '1px solid #1e4f43',
    background: '#e9f5f0',
    color: '#1e4f43',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    fontSize: 14,
    color: '#4e6c63',
    fontWeight: 600,
  },
  priceTotal: {
    borderTop: '1px solid #e4ece7',
    marginTop: 6,
    paddingTop: 12,
    fontSize: 16,
    color: '#1f3f38',
  },
  totalPrice: {
    fontSize: 21,
    fontWeight: 800,
    color: '#1e4f43',
  },
  footer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '14px 16px',
    background: '#fff',
    boxShadow: '0 -8px 24px rgba(14, 64, 54, 0.12)',
  },
  submitBtn: {
    width: '100%',
    padding: '15px 14px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #1e4f43 0%, #2a6a59 100%)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 800,
  },
  confirmHeroCard: {
    margin: '0 12px 0',
    borderRadius: 18,
    border: '1px solid rgba(30, 79, 67, 0.12)',
    background: 'linear-gradient(135deg, #1e4f43 0%, #2b6a5a 100%)',
    color: '#fff',
    padding: '16px 14px',
    textAlign: 'center',
    boxShadow: '0 16px 32px rgba(30, 79, 67, 0.18)',
  },
  successIcon: {
    width: 62,
    height: 62,
    borderRadius: '50%',
    background: '#2e7d32',
    color: '#fff',
    fontSize: 30,
    fontWeight: 900,
    lineHeight: '62px',
    margin: '0 auto 12px',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.18)',
  },
  confirmEyebrow: {
    fontSize: 12,
    fontWeight: 700,
    opacity: 0.92,
  },
  confirmTitle: {
    margin: '6px 0 0',
    fontSize: 24,
    fontWeight: 800,
  },
  confirmText: {
    margin: '10px 0 0',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 1.5,
    fontSize: 14,
  },
  confirmDetails: {
    background: '#f8fbf9',
    border: '1px solid #dce7e1',
    borderRadius: 12,
    padding: '10px 12px',
  },
  confirmRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 0',
    fontSize: 14,
  },
  confirmLabel: {
    color: '#5f7b72',
    fontWeight: 700,
  },
  confirmValue: {
    color: '#1f3f38',
    fontWeight: 700,
    textAlign: 'right',
  },
  confirmRowTotal: {
    borderTop: '1px solid #e4ece7',
    marginTop: 2,
    paddingTop: 12,
  },
  confirmActionBtn: {
    marginTop: 12,
    width: '100%',
    border: 'none',
    borderRadius: 10,
    padding: '12px 14px',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #1e4f43 0%, #2a6a59 100%)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 800,
  },
}
