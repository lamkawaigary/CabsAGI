import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { routeService, shiftService, bookingService } from '../services/shiftService'
import { createOrder } from '../services/orderService'
import { chatService } from '../services/chatService'
import { calculatePrice, calculateRoute, searchLocation, type LocationRecord, type RouteResult } from '../services/mapService'
import type { Route, Shift, Booking } from '../types/shift'

// ============== Types ==============
type QuoteView = {
  total: number
  distance: string
  duration: number
  tollsTotal: number
}

type BookingMode = 'official' | 'charter'
type CharterVehicleType = 'standard' | 'luxury' | 'van'

const CHARTER_VEHICLES: { id: CharterVehicleType; label: string; multiplier: number; note: string }[] = [
  { id: 'standard', label: '經濟轎車', multiplier: 1, note: '1-3人' },
  { id: 'luxury', label: '豪華轎車', multiplier: 1.4, note: '商務舒適' },
  { id: 'van', label: '保姆車', multiplier: 1.75, note: '多人行李' },
]

// Status mapping
const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: '待確認', color: '#7a5a1a', bg: '#fff3cd' },
  CONFIRMED: { label: '已確認', color: '#1a7a3a', bg: '#d4edda' },
  COMPLETED: { label: '已完成', color: '#155724', bg: '#c3e6cb' },
  CANCELLED: { label: '已取消', color: '#c62828', bg: '#f8d7da' },
  NO_SHOW: { label: '未到', color: '#6c757d', bg: '#e2e3e5' },
}

function getStatusDisplay(status: string) {
  return statusLabels[status] || { label: status, color: '#666', bg: '#f0f0f0' }
}

// ============== Location Input Component ==============
function LocationInput({
  label,
  accent,
  value,
  onPick,
}: {
  label: string
  accent: string
  value: LocationRecord | null
  onPick: (v: LocationRecord | null) => void
}) {
  const [query, setQuery] = useState(() => value?.name || '')
  const [items, setItems] = useState<LocationRecord[]>([])
  const [open, setOpen] = useState(false)
  const [searched, setSearched] = useState(false)

  const runSearch = async (q: string) => {
    setQuery(q)
    setSearched(true)
    if (!q.trim()) {
      setItems([])
      setOpen(false)
      onPick(null)
      return
    }
    const result = await searchLocation(q)
    setItems(result)
    setOpen(true)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#4b665f', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #dce6dd', background: '#fbfdfb', borderRadius: 12, padding: '12px 12px' }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: accent }} />
        <input
          value={query}
          onChange={(e) => void runSearch(e.target.value)}
          onFocus={() => setOpen(items.length > 0)}
          placeholder="請輸入地點"
          style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', fontSize: 14 }}
        />
      </div>
      {open && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 8, marginTop: 6, background: '#fff', border: '1px solid #dce6dd', borderRadius: 12, boxShadow: '0 10px 24px rgba(29, 54, 46, 0.12)', maxHeight: 200, overflow: 'auto' }}>
          {items.length > 0 ? (
            items.map((item) => (
              <button
                key={`${item.id}-${item.lat}`}
                onClick={() => {
                  onPick(item)
                  setQuery(item.name)
                  setOpen(false)
                }}
                style={{ width: '100%', textAlign: 'left', border: 0, background: 'transparent', cursor: 'pointer', padding: '10px 12px', borderBottom: '1px solid #f2f4f2' }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: '#213f38' }}>{item.name}</div>
                <div style={{ fontSize: 12, color: '#758780' }}>{item.address}</div>
              </button>
            ))
          ) : (
            <div style={{ padding: '10px 12px', fontSize: 12, color: '#758780' }}>
              {searched ? '未找到地址，請換關鍵字。' : '開始輸入以獲取建議。'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============== Main Component ==============
export default function PassengerDashboard() {
  const navigate = useNavigate()
  const { currentUser, logout, sendOtp, verifyOtp } = useAuth()
  
  // Data
  const [routes, setRoutes] = useState<Route[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingShifts, setBookingShifts] = useState<Record<string, Shift>>({})
  const [loading, setLoading] = useState(true)
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'home' | 'bookings' | 'profile'>('home')
  const [bookingMode, setBookingMode] = useState<BookingMode>('official')
  
  // Charter booking state
  const [pickup, setPickup] = useState<LocationRecord | null>(null)
  const [dropoff, setDropoff] = useState<LocationRecord | null>(null)
  const [quote, setQuote] = useState<QuoteView | null>(null)
  const [, setRouteInfo] = useState<RouteResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [charterPassengers, setCharterPassengers] = useState(1)
  const [vehicleType, setVehicleType] = useState<CharterVehicleType>('standard')
  const [charterNotice, setCharterNotice] = useState('')
  
  // Phone verification state
  const [verifying, setVerifying] = useState(false)
  const [phone, setPhone] = useState(currentUser?.phone || '')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [verifyingPhone, setVerifyingPhone] = useState(false)
  const [message, setMessage] = useState('')

  // Memos
  const bookingReady = useMemo(() => !!pickup && !!dropoff, [pickup, dropoff])
  const selectedVehicle = useMemo(() => CHARTER_VEHICLES.find((v) => v.id === vehicleType) || CHARTER_VEHICLES[0], [vehicleType])
  const quoteWithVehicle = useMemo<QuoteView | null>(() => {
    if (!quote) return null
    return { ...quote, total: Math.round(quote.total * selectedVehicle.multiplier) }
  }, [quote, selectedVehicle.multiplier])

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
      
      if (bookingsData.length > 0) {
        const shiftIds = [...new Set(bookingsData.map(b => b.shiftId))]
        const shiftDetails: Record<string, Shift> = {}
        await Promise.all(
          shiftIds.map(async (shiftId) => {
            const shift = await shiftService.getById(shiftId)
            if (shift) shiftDetails[shiftId] = shift
          })
        )
        setBookingShifts(shiftDetails)
      }
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

  // Charter functions
  const refreshQuote = async () => {
    if (!pickup || !dropoff) return
    setCalculating(true)
    setCharterNotice('')
    try {
      const route = await calculateRoute(pickup, dropoff)
      const pricing = calculatePrice(route)
      setRouteInfo(route)
      setQuote(pricing)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知錯誤'
      setCharterNotice(`計算失敗: ${msg}`)
    } finally {
      setCalculating(false)
    }
  }

  const placeCharterOrder = async () => {
    if (!pickup || !dropoff || !currentUser || !quoteWithVehicle) return
    
    setPlacingOrder(true)
    setCharterNotice('')
    try {
      await createOrder({
        pickup: pickup.name,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoff: dropoff.name,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        price: quoteWithVehicle.total,
        distance: Number(quoteWithVehicle.distance),
        duration: quoteWithVehicle.duration,
        tollFee: quoteWithVehicle.tollsTotal,
        passengerId: currentUser.id,
        passengerName: currentUser.name,
        orderType: 'charter',
        passengersCount: charterPassengers,
        vehicleType,
        bookingDateTime: new Date().toISOString(),
      })
      setCharterNotice('包車訂單已建立！')
      // Reset
      setPickup(null)
      setDropoff(null)
      setQuote(null)
      setRouteInfo(null)
      // Refresh bookings
      const bookingsData = await bookingService.getByUser(currentUser.id)
      setBookings(bookingsData)
      // Switch to bookings tab
      setActiveTab('bookings')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知錯誤'
      setCharterNotice(`建立訂單失敗: ${msg}`)
    } finally {
      setPlacingOrder(false)
    }
  }

  // OTP handlers
  const handleSendOtp = async () => {
    if (!phone) { setMessage('請輸入手機號碼'); return }
    setVerifying(true)
    setMessage('')
    try {
      const result = await sendOtp('852', phone)
      if (result.ok) { setOtpSent(true); setMessage('驗證碼已發送') }
      else { setMessage(result.message) }
    } finally { setVerifying(false) }
  }

  const handleVerifyOtp = async () => {
    if (!otp) { setMessage('請輸入驗證碼'); return }
    setVerifyingPhone(true)
    setMessage('')
    try {
      const result = await verifyOtp(otp)
      if (result.ok) { setMessage('電話驗證成功！'); window.location.reload() }
      else { setMessage(result.message) }
    } finally { setVerifyingPhone(false) }
  }

  const handleOpenChat = async (_booking: Booking, shift: Shift) => {
    if (!currentUser || !shift.driverId || !shift.driverName) {
      alert('司機尚未分配，暫時未能開啟對話')
      return
    }
    try {
      const conversationId = await chatService.getOrCreateShiftConversation(
        shift.id, shift.driverId, shift.driverName,
        currentUser.id, currentUser.name,
        shift.routeName || '旅程對話'
      )
      navigate(`/chat/${conversationId}`)
    } catch (error) {
      console.error('Failed to open chat:', error)
      alert('無法開啟對話，請稍後再試')
    }
  }

  if (loading) {
    return <div style={styles.container}><div style={styles.loading}>載入中...</div></div>
  }

  return (
    <div style={styles.container}>
      {/* Hidden reCAPTCHA container */}
      <div id="recaptcha-container" style={{ position: 'absolute', left: -9999, top: -9999 }} />
      
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.logo}>CabsAGI</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>登出</button>
      </header>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={{ ...styles.tab, ...(activeTab === 'home' ? styles.activeTab : {}) }} onClick={() => setActiveTab('home')}>
          首頁
        </button>
        <button style={{ ...styles.tab, ...(activeTab === 'bookings' ? styles.activeTab : {}) }} onClick={() => setActiveTab('bookings')}>
          我的訂單
        </button>
        <button style={{ ...styles.tab, ...(activeTab === 'profile' ? styles.activeTab : {}) }} onClick={() => setActiveTab('profile')}>
          個人
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'home' && (
          <div>
            {/* Booking Mode Toggle */}
            <div style={styles.modeToggle}>
              <button
                style={{ ...styles.modeBtn, ...(bookingMode === 'official' ? styles.modeBtnActive : {}) }}
                onClick={() => setBookingMode('official')}
              >
                🚌 官方班次
              </button>
              <button
                style={{ ...styles.modeBtn, ...(bookingMode === 'charter' ? styles.modeBtnActive : {}) }}
                onClick={() => setBookingMode('charter')}
              >
                🚗 包車點對點
              </button>
            </div>

            {bookingMode === 'official' ? (
              // Official Routes & Shifts
              <div>
                <section style={styles.section}>
                  <h2 style={styles.sectionTitle}>🚌 即將出發班次</h2>
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
                          <button style={styles.bookBtn} onClick={() => navigate(`/booking/${shift.id}`)}>預訂</button>
                        </div>
                      </div>
                    ))
                  )}
                </section>

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
                          <button style={styles.bookBtn} onClick={() => navigate(`/route/${route.id}`)}>查看</button>
                        </div>
                      </div>
                    ))
                  )}
                </section>
              </div>
            ) : (
              // Charter Booking
              <div style={styles.charterContainer}>
                {/* Vehicle Type */}
                <div style={styles.vehicleSelector}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#36534b', marginBottom: 8 }}>選擇車型</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {CHARTER_VEHICLES.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setVehicleType(item.id)}
                        style={{
                          border: item.id === vehicleType ? '1px solid #1f4f43' : '1px solid #dce6dd',
                          borderRadius: 10,
                          background: item.id === vehicleType ? '#e9f4ef' : '#fff',
                          color: '#24453d',
                          cursor: 'pointer',
                          padding: '8px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: '#688079' }}>{item.note}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Passengers */}
                <div style={styles.passengerRow}>
                  <span style={{ fontSize: 12, color: '#45645a' }}>乘客人數</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => setCharterPassengers(p => Math.max(1, p - 1))} style={styles.countBtn}>-</button>
                    <strong style={{ minWidth: 28, textAlign: 'center' }}>{charterPassengers}</strong>
                    <button onClick={() => setCharterPassengers(p => Math.min(6, p + 1))} style={styles.countBtn}>+</button>
                  </div>
                </div>

                {/* Location Inputs */}
                <LocationInput label="上車地點" accent="#2e8b6d" value={pickup} onPick={v => { setPickup(v); setQuote(null) }} />
                <LocationInput label="目的地" accent="#df5f4a" value={dropoff} onPick={v => { setDropoff(v); setQuote(null) }} />

                {/* Quote Result */}
                {quoteWithVehicle && (
                  <div style={styles.quoteBox}>
                    <div style={styles.quoteRow}><span>距離</span><strong>{quoteWithVehicle.distance} km</strong></div>
                    <div style={styles.quoteRow}><span>車程</span><strong>{quoteWithVehicle.duration} 分鐘</strong></div>
                    <div style={styles.quoteRow}><span>隧道費</span><strong>HK${quoteWithVehicle.tollsTotal}</strong></div>
                    <div style={{ ...styles.quoteRow, fontSize: 18, borderTop: '1px solid #d6e3da', paddingTop: 8 }}>
                      <span style={{ fontWeight: 700 }}>預估總價</span>
                      <strong style={{ color: '#1e4f43' }}>HK${quoteWithVehicle.total}</strong>
                    </div>
                  </div>
                )}

                {/* Notice */}
                {charterNotice && (
                  <div style={{ ...styles.notice, background: charterNotice.includes('成功') ? '#eff9f2' : '#fff0ec', borderColor: charterNotice.includes('成功') ? '#c3dfcf' : '#edc2bb' }}>
                    {charterNotice}
                  </div>
                )}

                {/* Actions */}
                <div style={styles.charterActions}>
                  <button
                    onClick={() => void refreshQuote()}
                    disabled={!bookingReady || calculating}
                    style={{ ...styles.actionBtn, background: bookingReady ? '#f0bf2a' : '#e9e8e1', color: bookingReady ? '#2e2a12' : '#8a8679' }}
                  >
                    {calculating ? '計算中...' : '計算報價'}
                  </button>
                  <button
                    onClick={() => void placeCharterOrder()}
                    disabled={!quoteWithVehicle || placingOrder}
                    style={{ ...styles.actionBtn, background: quoteWithVehicle ? '#1e4f43' : '#e9e8e1', color: quoteWithVehicle ? '#effff7' : '#8a8679' }}
                  >
                    {placingOrder ? '建立中...' : '確認包車'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'bookings' && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>📋 我的訂單</h2>
            {bookings.length === 0 ? (
              <div style={styles.empty}>暫無訂單</div>
            ) : (
              bookings.map(booking => {
                const shift = bookingShifts[booking.shiftId]
                const statusDisplay = getStatusDisplay(booking.status)
                return (
                  <div key={booking.id} style={styles.bookingCard}>
                    <div style={styles.bookingHeader}>
                      <span style={styles.bookingId}>訂單: {booking.id?.slice(0, 8)}...</span>
                      <span style={{ ...styles.bookingStatus, color: statusDisplay.color, background: statusDisplay.bg }}>
                        {statusDisplay.label}
                      </span>
                    </div>
                    <div style={styles.bookingRoute}>
                      <div>📍 {shift?.routeName || '班次'} → {shift?.routeName ? '' : ''}</div>
                      <div>🕐 {shift ? new Date(shift.departureTime).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : booking.createdAt ? new Date(booking.createdAt).toLocaleString('zh-HK') : '時間待定'}</div>
                    </div>
                    <div style={styles.bookingDetails}>
                      <div><span>座位:</span> {booking.seatCount}</div>
                      <div><span>金額:</span> <strong style={styles.priceText}>${booking.totalPrice}</strong></div>
                    </div>
                    {shift?.driverName && (
                      <div style={styles.driverInfo}>
                        <div>👤 司機: {shift.driverName}</div>
                        {shift.driverPhone && <a href={`tel:${shift.driverPhone}`} style={styles.driverPhone}>📞 {shift.driverPhone}</a>}
                      </div>
                    )}
                    <div style={styles.bookingActions}>
                      {shift?.driverId && (
                        <button onClick={() => handleOpenChat(booking, shift)} style={{ ...styles.actionBtn, background: '#e3f2fd' }}>💬 對話</button>
                      )}
                      {shift?.driverPhone && (
                        <a href={`tel:${shift.driverPhone}`} style={styles.actionBtn}>📞 聯絡</a>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>👤 個人資料</h2>
            <div style={styles.profile}>
              <div style={styles.profileItem}><span>名稱:</span> {currentUser?.name || '-'}</div>
              <div style={styles.profileItem}><span>電郵:</span> {currentUser?.email || '-'}</div>
              
              <div style={{ 
                ...styles.profileItem, 
                flexDirection: 'column',
                alignItems: 'stretch',
                background: currentUser?.phoneVerified ? '#e6f7ed' : '#fff8e6',
                border: `1px solid ${currentUser?.phoneVerified ? '#b8e6c9' : '#ffe0b2'}`,
                borderRadius: 10,
                padding: 12,
                marginTop: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span>電話: {currentUser?.phone || '-'}</span>
                  {currentUser?.phoneVerified && (
                    <span style={{ fontSize: 11, color: '#1a7a3a', background: '#b8e6c9', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                      ✅ 已驗證
                    </span>
                  )}
                </div>
                
                {!currentUser?.phoneVerified && (
                  <>
                    <input
                      type="tel"
                      placeholder="輸入手機號碼"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      disabled={otpSent}
                      style={styles.input}
                    />
                    {otpSent && (
                      <input
                        type="text"
                        placeholder="輸入驗證碼"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        style={{ ...styles.input, marginBottom: 8 }}
                      />
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {!otpSent ? (
                        <button onClick={handleSendOtp} disabled={verifying} style={styles.otpBtn}>
                          {verifying ? '發送中...' : '發送驗證碼'}
                        </button>
                      ) : (
                        <button onClick={handleVerifyOtp} disabled={verifyingPhone} style={styles.otpBtn}>
                          {verifyingPhone ? '驗證中...' : '確認'}
                        </button>
                      )}
                    </div>
                  </>
                )}
                {message && <div style={{ marginTop: 8, fontSize: 13, color: message.includes('成功') ? '#1a7a3a' : '#c62828' }}>{message}</div>}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// ============== Styles ==============
const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#f5f5f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif' },
  loading: { padding: 40, textAlign: 'center', color: '#888' },
  header: { padding: '16px 20px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { margin: 0, fontSize: 20, fontWeight: 700, color: '#1f4f43' },
  logoutBtn: { padding: '8px 16px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', color: '#666', cursor: 'pointer', fontSize: 14 },
  tabs: { display: 'flex', background: '#fff', borderBottom: '1px solid #eee' },
  tab: { flex: 1, padding: '14px 0', border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#888', cursor: 'pointer' },
  activeTab: { color: '#1f4f43', borderBottom: '2px solid #1f4f43' },
  content: { padding: 12 },
  section: { background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#333' },
  empty: { padding: 20, textAlign: 'center', color: '#999', fontSize: 14 },
  card: { border: '1px solid #eee', borderRadius: 10, padding: 12, marginBottom: 10 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#333' },
  price: { fontSize: 16, fontWeight: 700, color: '#1f4f43' },
  cardBody: { fontSize: 13, color: '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  bookBtn: { padding: '6px 16px', borderRadius: 6, border: 'none', background: '#1f4f43', color: '#fff', fontSize: 13, cursor: 'pointer' },
  
  // Booking mode toggle
  modeToggle: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 },
  modeBtn: { padding: '12px', borderRadius: 10, border: '1px solid #dce6dd', background: '#fff', fontSize: 14, fontWeight: 600, color: '#555', cursor: 'pointer' },
  modeBtnActive: { background: '#1f4f43', color: '#fff', borderColor: '#1f4f43' },
  
  // Charter
  charterContainer: { background: '#fff', borderRadius: 12, padding: 14, display: 'grid', gap: 12 },
  vehicleSelector: { marginBottom: 4 },
  passengerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' },
  countBtn: { width: 30, height: 30, border: '1px solid #cfddd4', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 800 },
  quoteBox: { background: '#f5f9f6', border: '1px solid #dde8df', borderRadius: 10, padding: 12, display: 'grid', gap: 6 },
  quoteRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#5c7068' },
  notice: { borderRadius: 8, padding: '10px 12px', border: '1px solid', fontSize: 13 },
  charterActions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  actionBtn: { padding: '12px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'center' },
  
  // Bookings
  bookingCard: { background: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, border: '1px solid #eee' },
  bookingHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bookingId: { fontSize: 12, color: '#888' },
  bookingStatus: { fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600 },
  bookingRoute: { fontSize: 13, color: '#333', marginBottom: 8, display: 'grid', gap: 4 },
  bookingDetails: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666', marginBottom: 8 },
  priceText: { color: '#1f4f43', fontWeight: 600 },
  driverInfo: { fontSize: 12, color: '#555', marginBottom: 8, display: 'grid', gap: 4 },
  driverPhone: { color: '#1976D2', textDecoration: 'none' },
  bookingActions: { display: 'flex', gap: 8 },
  
  // Profile
  profile: { display: 'grid', gap: 8 },
  profileItem: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#333' },
  input: { padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, marginBottom: 8, width: '100%', boxSizing: 'border-box' },
  otpBtn: { flex: 1, padding: '8px', borderRadius: 6, border: 'none', background: '#1f4f43', color: '#fff', fontSize: 14, cursor: 'pointer' },
}