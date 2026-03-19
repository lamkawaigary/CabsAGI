import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { routeService, shiftService, bookingService } from '../services/shiftService'
import type { Route, Shift, Booking } from '../types/shift'

export default function PassengerDashboard() {
  const navigate = useNavigate()
  const { currentUser, logout, sendOtp, verifyOtp } = useAuth()
  const [routes, setRoutes] = useState<Route[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'home' | 'bookings' | 'profile'>('home')
  
  // Phone verification state
  const [verifying, setVerifying] = useState(false)
  const [phone, setPhone] = useState(currentUser?.phone || '')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [verifyingPhone, setVerifyingPhone] = useState(false)
  const [message, setMessage] = useState('')

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

  const handleSendOtp = async () => {
    if (!phone) {
      setMessage('請輸入手機號碼')
      return
    }
    setVerifying(true)
    setMessage('')
    try {
      const result = await sendOtp('852', phone)
      if (result.ok) {
        setOtpSent(true)
        setMessage('驗證碼已發送')
      } else {
        setMessage(result.message)
      }
    } finally {
      setVerifying(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp) {
      setMessage('請輸入驗證碼')
      return
    }
    setVerifyingPhone(true)
    setMessage('')
    try {
      const result = await verifyOtp(otp)
      if (result.ok) {
        setMessage('電話驗證成功！')
        window.location.reload()
      } else {
        setMessage(result.message)
      }
    } finally {
      setVerifyingPhone(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>載入緊...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.logo}>CabsAGI</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>登出</button>
      </header>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button 
          style={{...styles.tab, ...(activeTab === 'home' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('home')}
        >
          首頁
        </button>
        <button 
          style={{...styles.tab, ...(activeTab === 'bookings' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('bookings')}
        >
          我的訂單
        </button>
        <button 
          style={{...styles.tab, ...(activeTab === 'profile' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('profile')}
        >
          個人
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'home' && (
          <div>
            {/* Shifts Section */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>🚗 即將出發班次</h2>
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
                      <button style={styles.bookBtn}>預訂</button>
                    </div>
                  </div>
                ))
              )}
            </section>

            {/* Routes Section */}
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
                      <button style={styles.bookBtn}>查看</button>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        )}

        {activeTab === 'bookings' && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>📋 我的訂單</h2>
            {bookings.length === 0 ? (
              <div style={styles.empty}>暫無訂單</div>
            ) : (
              bookings.map(booking => (
                <div key={booking.id} style={styles.card}>
                  <div style={styles.cardBody}>
                    <div>訂單: {booking.id}</div>
                    <div>座位: {booking.seatCount}</div>
                    <div>狀態: {booking.status}</div>
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>👤 個人資料</h2>
            <div style={styles.profile}>
              <div style={styles.profileItem}>
                <span>名稱:</span> {currentUser?.name || '-'}
              </div>
              <div style={styles.profileItem}>
                <span>電郵:</span> {currentUser?.email || '-'}
              </div>
              
              {/* Phone & Verification */}
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
                  <span><span>電話:</span> {currentUser?.phone || '-'}</span>
                  {currentUser?.phoneVerified && (
                    <span style={{ 
                      fontSize: 11, 
                      color: '#1a7a3a', 
                      background: '#b8e6c9',
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontWeight: 600,
                    }}>
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
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid #ddd',
                        fontSize: 14,
                        marginBottom: 8,
                      }}
                    />
                    {otpSent && (
                      <input
                        type="text"
                        placeholder="輸入驗證碼"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #ddd',
                          fontSize: 14,
                          marginBottom: 8,
                        }}
                      />
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {!otpSent ? (
                        <button
                          onClick={handleSendOtp}
                          disabled={verifying}
                          style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: 6,
                            border: '1px solid #1e56a3',
                            background: '#fff',
                            color: '#1e56a3',
                            fontWeight: 600,
                            cursor: verifying ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {verifying ? '發送中...' : '發送驗證碼'}
                        </button>
                      ) : (
                        <button
                          onClick={handleVerifyOtp}
                          disabled={verifyingPhone}
                          style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: 6,
                            border: '1px solid #1a7a3a',
                            background: '#1a7a3a',
                            color: '#fff',
                            fontWeight: 600,
                            cursor: verifyingPhone ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {verifyingPhone ? '驗證中...' : '確認'}
                        </button>
                      )}
                      {otpSent && (
                        <button
                          onClick={() => { setOtpSent(false); setOtp(''); setMessage(''); }}
                          style={{
                            padding: '8px',
                            borderRadius: 6,
                            border: '1px solid #999',
                            background: '#fff',
                            color: '#666',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          取消
                        </button>
                      )}
                    </div>
                    {message && (
                      <div style={{ 
                        fontSize: 12, 
                        color: message.includes('成功') ? '#1a7a3a' : '#c62828',
                        textAlign: 'center',
                        marginTop: 6,
                      }}>
                        {message}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div style={styles.profileItem}>
                <span>角色:</span> {currentUser?.role || '乘客'}
              </div>
              <div style={styles.profileItem}>
                <span>積分:</span> {currentUser?.points || 0}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
    fontFamily: 'Avenir Next, Noto Sans TC, sans-serif',
  },
  loading: {
    textAlign: 'center',
    padding: 40,
    fontSize: 16,
    color: '#666',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: '#284a41',
    color: '#fff',
  },
  logo: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
  },
  logoutBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    background: '#fff',
    borderBottom: '1px solid #eee',
  },
  tab: {
    flex: 1,
    padding: '14px',
    border: 'none',
    background: 'none',
    fontSize: 14,
    fontWeight: 600,
    color: '#666',
    cursor: 'pointer',
  },
  activeTab: {
    color: '#284a41',
    borderBottom: '2px solid #284a41',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: 18,
    fontWeight: 700,
    color: '#333',
  },
  empty: {
    padding: 24,
    textAlign: 'center',
    color: '#999',
    background: '#fff',
    borderRadius: 12,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#333',
  },
  price: {
    fontSize: 18,
    fontWeight: 700,
    color: '#284a41',
  },
  cardBody: {
    fontSize: 14,
    color: '#666',
    lineHeight: 1.6,
  },
  bookBtn: {
    marginTop: 12,
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: 8,
    background: '#284a41',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  profile: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  profileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #eee',
    fontSize: 14,
  },
}
