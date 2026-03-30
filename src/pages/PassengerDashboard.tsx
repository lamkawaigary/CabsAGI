import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { routeService, shiftService, bookingService } from '../services/shiftService'
import { chatService } from '../services/chatService'
import PointsWallet from '../components/PointsWallet'
import type { Booking, Route, Shift } from '../types/shift'

type Tab = 'routes' | 'bookings' | 'profile'
type Scene = 'all' | 'event' | 'airport'

const BOOKING_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  PENDING: { label: '待確認', bg: '#fff3cd', color: '#7a5a1a' },
  CONFIRMED: { label: '已確認', bg: '#d4edda', color: '#1a7a3a' },
  COMPLETED: { label: '已完成', bg: '#c3e6cb', color: '#155724' },
  CANCELLED: { label: '已取消', bg: '#f8d7da', color: '#c62828' },
  NO_SHOW: { label: '未到', bg: '#e2e3e5', color: '#5f6368' },
}

const toDate = (raw: string) => {
  const asNum = Number(raw)
  const date = Number.isFinite(asNum) && asNum > 0 ? new Date(asNum) : new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDateTime = (raw: string) => {
  const date = toDate(raw)
  if (!date) return raw
  return date.toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatRouteScene = (route: Route) => {
  if (route.type === 'AIRPORT') return '機場接送'
  if (route.type === 'EVENT') return '演唱會散場'
  if (route.type === 'CROSS_BORDER') return '跨境路線'
  return '固定路線'
}

export default function PassengerDashboard() {
  const navigate = useNavigate()
  const { currentUser, logout, sendOtp, verifyOtp } = useAuth()

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('routes')
  const [selectedScene, setSelectedScene] = useState<Scene>('all')
  const [routes, setRoutes] = useState<Route[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingShifts, setBookingShifts] = useState<Record<string, Shift>>({})

  // phone verify states
  const [phone, setPhone] = useState(currentUser?.phone || '')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState('')

  useEffect(() => {
    void loadData()
  }, [currentUser?.id])

  useEffect(() => {
    setPhone(currentUser?.phone || '')
  }, [currentUser?.phone])

  const loadData = async () => {
    try {
      setLoading(true)
      const [routesData, shiftsData, bookingsData] = await Promise.all([
        routeService.getAll(),
        shiftService.getAll(),
        currentUser ? bookingService.getByUser(currentUser.id) : Promise.resolve([]),
      ])

      setRoutes(routesData.filter((route) => route.status === 'ACTIVE'))
      setShifts(
        shiftsData.filter((shift) =>
          ['OPEN', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(shift.status),
        ),
      )
      setBookings(bookingsData)

      const relatedShiftIds = Array.from(new Set(bookingsData.map((booking) => booking.shiftId)))
      if (relatedShiftIds.length > 0) {
        const detailEntries = await Promise.all(
          relatedShiftIds.map(async (shiftId) => {
            const shift = await shiftService.getById(shiftId)
            return shift ? [shiftId, shift] : null
          }),
        )
        const detailMap: Record<string, Shift> = {}
        detailEntries.forEach((entry) => {
          if (!entry) return
          detailMap[entry[0]] = entry[1]
        })
        setBookingShifts(detailMap)
      } else {
        setBookingShifts({})
      }
    } catch (error) {
      console.error('Failed to load passenger dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      setVerifyMessage('請輸入手機號碼')
      return
    }
    setVerifying(true)
    setVerifyMessage('')
    try {
      const result = await sendOtp('852', phone)
      if (!result.ok) {
        setVerifyMessage(result.message)
        return
      }
      setOtpSent(true)
      setVerifyMessage('驗證碼已發送')
    } finally {
      setVerifying(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setVerifyMessage('請輸入驗證碼')
      return
    }
    setVerifyingOtp(true)
    setVerifyMessage('')
    try {
      const result = await verifyOtp(otp)
      if (!result.ok) {
        setVerifyMessage(result.message)
        return
      }
      setVerifyMessage('電話驗證成功，頁面將刷新')
      window.location.reload()
    } finally {
      setVerifyingOtp(false)
    }
  }

  const handleOpenChat = async (booking: Booking) => {
    const shift = bookingShifts[booking.shiftId]
    if (!currentUser || !shift?.driverId || !shift.driverName) {
      alert('司機尚未分配，暫時未能開啟對話')
      return
    }

    try {
      const conversationId = await chatService.getOrCreateShiftConversation(
        shift.id,
        shift.driverId,
        shift.driverName,
        currentUser.id,
        currentUser.name,
        shift.routeName || '旅程對話',
      )
      navigate(`/chat/${conversationId}`)
    } catch (error) {
      console.error('Failed to open conversation:', error)
      alert('暫時無法開啟對話，請稍後再試')
    }
  }

  const sceneRoutes = useMemo(() => {
    if (selectedScene === 'all') return routes
    if (selectedScene === 'airport') {
      return routes.filter((route) => route.type === 'AIRPORT')
    }
    return routes.filter((route) => route.type === 'EVENT' || route.type === 'CROSS_BORDER')
  }, [routes, selectedScene])

  const openBookableShifts = useMemo(
    () =>
      shifts.filter(
        (shift) =>
          (shift.status === 'OPEN' || shift.status === 'SCHEDULED') &&
          !shift.driverId &&
          shift.availableSeats > 0,
      ),
    [shifts],
  )

  const openBookableShiftsByRoute = useMemo(() => {
    const map = new Map<string, Shift[]>()
    openBookableShifts.forEach((shift) => {
      const existing = map.get(shift.routeId) || []
      existing.push(shift)
      map.set(shift.routeId, existing)
    })
    map.forEach((value) => {
      value.sort((a, b) => {
        const aTime = toDate(a.departureTime)?.getTime() || 0
        const bTime = toDate(b.departureTime)?.getTime() || 0
        return aTime - bTime
      })
    })
    return map
  }, [openBookableShifts])

  const highlightedShifts = useMemo(() => {
    const allowedRouteIds = new Set(sceneRoutes.map((route) => route.id))
    return openBookableShifts
      .filter((shift) => allowedRouteIds.has(shift.routeId))
      .sort((a, b) => {
        const aTime = toDate(a.departureTime)?.getTime() || 0
        const bTime = toDate(b.departureTime)?.getTime() || 0
        return aTime - bTime
      })
      .slice(0, 4)
  }, [openBookableShifts, sceneRoutes])

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>資料載入中...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div id="recaptcha-container" style={{ position: 'absolute', left: -9999, top: -9999 }} />

      <header style={styles.header}>
        <div>
          <h1 style={styles.logo}>CabsAGI</h1>
          <p style={styles.headerSub}>路線型共乘</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          登出
        </button>
      </header>

      <main style={styles.content}>
        {activeTab === 'routes' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>選擇出行場景</h2>
              </div>
              <div style={styles.sceneRow}>
                <button
                  onClick={() => setSelectedScene('all')}
                  style={{
                    ...styles.sceneChip,
                    ...(selectedScene === 'all' ? styles.sceneChipActive : {}),
                  }}
                >
                  全部路線
                </button>
                <button
                  onClick={() => setSelectedScene('event')}
                  style={{
                    ...styles.sceneChip,
                    ...(selectedScene === 'event' ? styles.sceneChipActive : {}),
                  }}
                >
                  演唱會散場返內地
                </button>
                <button
                  onClick={() => setSelectedScene('airport')}
                  style={{
                    ...styles.sceneChip,
                    ...(selectedScene === 'airport' ? styles.sceneChipActive : {}),
                  }}
                >
                  機場接送到市區
                </button>
              </div>
            </section>

            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>即將出發班次</h2>
              </div>
              {highlightedShifts.length === 0 ? (
                <div style={styles.empty}>目前此場景暫無可預約班次</div>
              ) : (
                <div style={styles.list}>
                  {highlightedShifts.map((shift) => (
                    <div key={shift.id} style={styles.shiftCard}>
                      <div>
                        <div style={styles.shiftTitle}>{shift.routeName || '路線班次'}</div>
                        <div style={styles.shiftMeta}>{formatDateTime(shift.departureTime)}</div>
                        <div style={styles.shiftMeta}>
                          剩餘座位 {shift.availableSeats}/{shift.totalSeats}
                        </div>
                      </div>
                      <button style={styles.primaryBtn} onClick={() => navigate(`/booking/${shift.id}`)}>
                        選這班
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>推薦路線</h2>
              </div>
              {sceneRoutes.length === 0 ? (
                <div style={styles.empty}>目前沒有可用路線</div>
              ) : (
                <div style={styles.list}>
                  {sceneRoutes.map((route) => {
                    const routeShifts = openBookableShiftsByRoute.get(route.id) || []
                    const nextShift = routeShifts[0]
                    return (
                      <div key={route.id} style={styles.routeCard}>
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={styles.routeTitleRow}>
                            <strong style={styles.routeTitle}>{route.name}</strong>
                            <span style={styles.sceneTag}>{formatRouteScene(route)}</span>
                          </div>
                          <div style={styles.routePathText}>
                            {route.origin.name} {'->'} {route.destination.name}
                          </div>
                          {nextShift ? (
                            <div style={styles.routeMetaText}>
                              下一班：{formatDateTime(nextShift.departureTime)} ｜ 剩餘 {nextShift.availableSeats} 位
                            </div>
                          ) : (
                            <div style={styles.routeMetaText}>目前沒有可預約班次，請稍後再試</div>
                          )}
                        </div>
                        <button style={styles.outlineBtn} onClick={() => navigate(`/route/${route.id}`)}>
                          查看班次
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'bookings' && (
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>我的行程</h2>
            </div>
            {bookings.length === 0 ? (
              <div style={styles.empty}>目前尚無預訂紀錄</div>
            ) : (
              <div style={styles.list}>
                {bookings.map((booking, index) => {
                  const shift = bookingShifts[booking.shiftId]
                  const status = BOOKING_STATUS[booking.status] || {
                    label: booking.status,
                    bg: '#f0f0f0',
                    color: '#666',
                  }
                  return (
                    <div key={booking.id || `${booking.shiftId}-${index}`} style={styles.bookingCard}>
                      <div style={styles.routeTitleRow}>
                        <strong style={styles.routeTitle}>{shift?.routeName || '班次行程'}</strong>
                        <span style={{ ...styles.statusBadge, background: status.bg, color: status.color }}>
                          {status.label}
                        </span>
                      </div>
                      <div style={styles.routeMetaText}>
                        出發：{shift ? formatDateTime(shift.departureTime) : '待確認'}
                      </div>
                      <div style={styles.routeMetaText}>座位：{booking.seatCount} 位</div>
                      <div style={styles.routeMetaText}>總價：HK${booking.totalPrice}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          style={styles.outlineBtn}
                          onClick={() => navigate(`/booking/${booking.shiftId}`)}
                        >
                          查看詳情
                        </button>
                        <button
                          style={styles.primaryBtn}
                          onClick={() => void handleOpenChat(booking)}
                        >
                          聯絡司機
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>我的資料</h2>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={styles.profileRow}>
                <span>名稱</span>
                <strong>{currentUser?.name || '-'}</strong>
              </div>
              <div style={styles.profileRow}>
                <span>電郵</span>
                <strong>{currentUser?.email || '-'}</strong>
              </div>
              <div style={styles.profileBox}>
                <div style={styles.profileRow}>
                  <span>電話</span>
                  <strong>{currentUser?.phone || '-'}</strong>
                </div>
                {currentUser?.phoneVerified ? (
                  <div style={styles.verifiedTag}>✅ 已完成電話驗證</div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <input
                      type="tel"
                      placeholder="輸入手機號碼"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))}
                      disabled={otpSent}
                      style={styles.input}
                    />
                    {otpSent && (
                      <input
                        type="text"
                        placeholder="輸入驗證碼"
                        value={otp}
                        onChange={(event) => setOtp(event.target.value)}
                        maxLength={6}
                        style={styles.input}
                      />
                    )}
                    <button
                      style={styles.primaryBtn}
                      onClick={otpSent ? handleVerifyOtp : handleSendOtp}
                      disabled={verifying || verifyingOtp}
                    >
                      {otpSent
                        ? verifyingOtp
                          ? '驗證中...'
                          : '確認驗證碼'
                        : verifying
                          ? '發送中...'
                          : '發送驗證碼'}
                    </button>
                    {verifyMessage && <div style={styles.verifyMessage}>{verifyMessage}</div>}
                  </div>
                )}
              </div>

              {currentUser && (
                <div style={{ marginTop: 6 }}>
                  <PointsWallet userId={currentUser.id} userRole="passenger" />
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <nav style={styles.bottomNav}>
        <button
          style={{ ...styles.navBtn, ...(activeTab === 'routes' ? styles.navBtnActive : {}) }}
          onClick={() => setActiveTab('routes')}
        >
          路線
        </button>
        <button
          style={{ ...styles.navBtn, ...(activeTab === 'bookings' ? styles.navBtnActive : {}) }}
          onClick={() => setActiveTab('bookings')}
        >
          行程
        </button>
        <button style={styles.navBtn} onClick={() => navigate('/messages')}>
          訊息
        </button>
        <button
          style={{ ...styles.navBtn, ...(activeTab === 'profile' ? styles.navBtnActive : {}) }}
          onClick={() => setActiveTab('profile')}
        >
          我的
        </button>
      </nav>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f4f6f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif',
    paddingBottom: 76,
  },
  loading: {
    padding: 36,
    textAlign: 'center',
    color: '#6f7d78',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: '#ffffff',
    borderBottom: '1px solid #e5ebe7',
  },
  logo: {
    margin: 0,
    fontSize: 20,
    color: '#1d4b41',
    fontWeight: 800,
  },
  headerSub: {
    margin: '2px 0 0',
    fontSize: 12,
    color: '#6e7f79',
  },
  logoutBtn: {
    border: '1px solid #d9e1dc',
    background: '#fff',
    color: '#4e6660',
    borderRadius: 10,
    padding: '7px 12px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  content: {
    padding: 12,
    display: 'grid',
    gap: 12,
  },
  section: {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #e2eae5',
    padding: 12,
    boxShadow: '0 1px 2px rgba(20, 45, 37, 0.05)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 15,
    color: '#243f38',
    fontWeight: 700,
  },
  sceneRow: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 2,
  },
  sceneChip: {
    whiteSpace: 'nowrap',
    border: '1px solid #dbe5df',
    background: '#fff',
    color: '#48645d',
    borderRadius: 999,
    padding: '7px 11px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  sceneChipActive: {
    border: '1px solid #1e4f43',
    background: '#e9f5f0',
    color: '#1e4f43',
  },
  list: {
    display: 'grid',
    gap: 8,
  },
  shiftCard: {
    border: '1px solid #dce7e1',
    borderRadius: 12,
    padding: 10,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    background: '#fcfefd',
  },
  shiftTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#23413a',
  },
  shiftMeta: {
    fontSize: 12,
    color: '#5f7770',
    marginTop: 2,
  },
  routeCard: {
    border: '1px solid #dce7e1',
    borderRadius: 12,
    padding: 10,
    display: 'grid',
    gap: 8,
    background: '#fcfefd',
  },
  routeTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  routeTitle: {
    fontSize: 14,
    color: '#203d36',
  },
  sceneTag: {
    border: '1px solid #d6e7dd',
    background: '#f0f7f3',
    color: '#3f675c',
    borderRadius: 999,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 700,
  },
  routePathText: {
    fontSize: 13,
    color: '#335149',
    fontWeight: 600,
  },
  routeMetaText: {
    fontSize: 12,
    color: '#5f7770',
  },
  bookingCard: {
    border: '1px solid #dce7e1',
    borderRadius: 12,
    padding: 10,
    background: '#fcfefd',
    display: 'grid',
    gap: 3,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 999,
    padding: '2px 8px',
  },
  profileRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 14,
    color: '#334f48',
    gap: 8,
  },
  profileBox: {
    border: '1px solid #dce7e1',
    borderRadius: 12,
    padding: 10,
    display: 'grid',
    gap: 8,
    background: '#fcfefd',
  },
  verifiedTag: {
    fontSize: 12,
    color: '#2c7a49',
    background: '#e5f6eb',
    border: '1px solid #cbe9d5',
    borderRadius: 8,
    padding: '6px 8px',
    fontWeight: 600,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #d8e2dc',
    borderRadius: 10,
    padding: '10px 11px',
    fontSize: 14,
  },
  verifyMessage: {
    fontSize: 12,
    color: '#5e7069',
  },
  primaryBtn: {
    border: 'none',
    borderRadius: 9,
    background: '#1e4f43',
    color: '#fff',
    padding: '9px 12px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  outlineBtn: {
    border: '1px solid #cfe0d7',
    borderRadius: 9,
    background: '#fff',
    color: '#36544b',
    padding: '9px 12px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  empty: {
    border: '1px dashed #d4dfd9',
    borderRadius: 10,
    background: '#f8fbf9',
    color: '#6a7f78',
    fontSize: 13,
    textAlign: 'center',
    padding: '14px 12px',
  },
  bottomNav: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    background: '#fff',
    borderTop: '1px solid #dfe8e3',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    padding: '8px 6px',
    zIndex: 20,
  },
  navBtn: {
    border: 'none',
    background: 'transparent',
    color: '#6f8079',
    fontSize: 12,
    fontWeight: 700,
    padding: '8px 4px',
    borderRadius: 8,
    cursor: 'pointer',
  },
  navBtnActive: {
    color: '#1e4f43',
    background: '#e9f4ef',
  },
}