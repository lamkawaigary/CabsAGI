import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { shiftService, bookingService } from '../services/shiftService'
import type { Shift, Booking } from '../types/shift'

// Icons
const Icons = {
  Home: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  ),
  Orders: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
  )
}

type Tab = 'shifts' | 'passengers' | 'profile'

const formatTime = (timestamp: string) => {
  const date = new Date(parseInt(timestamp))
  return date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (timestamp: string) => {
  const date = new Date(parseInt(timestamp))
  return date.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })
}

export default function DriverDashboard() {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('shifts')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // In real app, filter by driver ID
      // For now, get all scheduled shifts
      const allShifts = await shiftService.getAll()
      setShifts(allShifts.filter(s => s.status === 'SCHEDULED' || s.status === 'OPEN'))
    } catch (error) {
      console.error('Failed to load shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBookings = async (shiftId: string) => {
    try {
      const shiftBookings = await bookingService.getByShift(shiftId)
      setBookings(shiftBookings)
    } catch (error) {
      console.error('Failed to load bookings:', error)
    }
  }

  const handleStartShift = async (shift: Shift) => {
    try {
      await shiftService.updateStatus(shift.id, 'IN_PROGRESS')
      await shiftService.updateSeats(shift.id, shift.availableSeats - 1)
      loadData()
    } catch (error) {
      console.error('Failed to start shift:', error)
    }
  }

  const handleCompleteShift = async (shift: Shift) => {
    try {
      await shiftService.updateStatus(shift.id, 'COMPLETED')
      loadData()
    } catch (error) {
      console.error('Failed to complete shift:', error)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const tabs = [
    { id: 'shifts' as Tab, label: '班次', icon: Icons.Orders },
    { id: 'passengers' as Tab, label: '乘客', icon: Icons.User },
    { id: 'profile' as Tab, label: '個人', icon: Icons.User }
  ]

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <span style={styles.logoText}>CabsAGI</span>
          <span style={styles.welcomeText}>，司機</span>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <Icons.Logout />
        </button>
      </header>

      {/* Content */}
      <main style={styles.content}>
        {activeTab === 'shifts' && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>今日班次</h2>
            {loading ? (
              <div style={styles.loading}>載入中...</div>
            ) : shifts.length === 0 ? (
              <div style={styles.empty}>今日無班次</div>
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
                      <div style={styles.shiftStatus}>
                        {shift.status === 'SCHEDULED' ? '📅 待開始' : 
                         shift.status === 'OPEN' ? '🟢 可接載' :
                         shift.status === 'IN_PROGRESS' ? '🚗 進行中' : '✅ 已完成'}
                      </div>
                    </div>
                    <div style={styles.shiftActions}>
                      {shift.status === 'SCHEDULED' || shift.status === 'OPEN' ? (
                        <button 
                          style={styles.actionBtn}
                          onClick={() => handleStartShift(shift)}
                        >
                          開始
                        </button>
                      ) : shift.status === 'IN_PROGRESS' ? (
                        <button 
                          style={{...styles.actionBtn, background: '#4CAF50'}}
                          onClick={() => handleCompleteShift(shift)}
                        >
                          完成
                        </button>
                      ) : null}
                      <button 
                        style={{...styles.actionBtn, background: '#1976D2', marginTop: '8px'}}
                        onClick={() => {
                          setSelectedShift(shift)
                          loadBookings(shift.id)
                          setActiveTab('passengers')
                        }}
                      >
                        乘客名單
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'passengers' && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>乘客名單</h2>
            {selectedShift ? (
              <>
                <div style={styles.shiftHeader}>
                  <span style={styles.shiftTime}>{formatTime(selectedShift.departureTime)}</span>
                  <span style={styles.shiftMeta}>{selectedShift.availableSeats} 位剩餘</span>
                </div>
                {bookings.length === 0 ? (
                  <div style={styles.empty}>暫無乘客預訂</div>
                ) : (
                  <div style={styles.passengersList}>
                    {bookings.map(booking => (
                      <div key={booking.id} style={styles.passengerCard}>
                        <div style={styles.passengerInfo}>
                          <span style={styles.passengerName}>{booking.passengerName}</span>
                          <span style={styles.passengerPhone}>{booking.passengerPhone}</span>
                        </div>
                        <div style={styles.passengerMeta}>
                          <span>{booking.seatCount} 位</span>
                          <span style={{
                            ...styles.statusBadge,
                            background: booking.status === 'CONFIRMED' ? '#d4edda' : '#fff3cd'
                          }}>
                            {booking.status === 'CONFIRMED' ? '✅ 已確認' : '⏳ 處理中'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={styles.empty}>請先選擇班次</div>
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>個人資料</h2>
            <div style={styles.profileCard}>
              <div style={styles.avatar}>
                {(currentUser?.name || 'S').charAt(0).toUpperCase()}
              </div>
              <div style={styles.profileInfo}>
                <h3 style={styles.profileName}>{currentUser?.name || '司機'}</h3>
                <p style={styles.profileEmail}>{currentUser?.email || '未綁定電郵'}</p>
                <p style={styles.profilePhone}>{currentUser?.phone || '未綁定手機'}</p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Bottom Nav */}
      <nav style={styles.nav}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.navItem,
              ...(activeTab === tab.id ? styles.navItemActive : {})
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif',
    paddingBottom: '70px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: '#143b34',
    color: '#fff'
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 700
  },
  welcomeText: {
    fontSize: '14px',
    opacity: 0.8
  },
  logoutBtn: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    padding: '8px'
  },
  content: {
    padding: '16px'
  },
  section: {
    background: '#fff',
    borderRadius: '12px',
    padding: '16px'
  },
  sectionTitle: {
    margin: '0 0 16px',
    fontSize: '18px',
    fontWeight: 600
  },
  shiftsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  shiftCard: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px',
    background: '#f8f9fa',
    borderRadius: '12px'
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
    fontSize: '14px',
    color: '#666',
    marginTop: '4px'
  },
  shiftStatus: {
    fontSize: '13px',
    color: '#1976D2',
    marginTop: '8px'
  },
  shiftActions: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  actionBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: '#143b34',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    minWidth: '70px'
  },
  shiftHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #eee'
  },
  passengersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  passengerCard: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '8px'
  },
  passengerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  passengerName: {
    fontSize: '15px',
    fontWeight: 500
  },
  passengerPhone: {
    fontSize: '13px',
    color: '#666'
  },
  passengerMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    fontSize: '13px'
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px'
  },
  profileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '12px'
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: '#143b34',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 600
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    margin: '0 0 4px',
    fontSize: '18px',
    fontWeight: 600
  },
  profileEmail: {
    margin: 0,
    fontSize: '14px',
    color: '#666'
  },
  profilePhone: {
    margin: '4px 0 0',
    fontSize: '14px',
    color: '#666'
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#888'
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: '#888'
  },
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    background: '#fff',
    borderTop: '1px solid #eee',
    padding: '8px 0'
  },
  navItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '8px',
    border: 'none',
    background: 'transparent',
    color: '#888',
    fontSize: '12px',
    cursor: 'pointer'
  },
  navItemActive: {
    color: '#143b34'
  }
}
