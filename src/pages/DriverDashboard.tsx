// Cabs Carpool - Driver Dashboard v4.0
// Improved UI with Design System

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { tripService, requestService } from '../services/tripService'
import { chatService } from '../services/chatService'
import type { Trip, PassengerRequest } from '../types/trip'
import { colors, radius, shadows } from '../styles/designSystem'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge, { getStatusBadge } from '../components/ui/Badge'

// ============ ICONS ============
const Icon = {
  Plus: () => <span style={{ fontSize: 18 }}>➕</span>,
  Chat: () => <span style={{ fontSize: 18 }}>💬</span>,
  Location: () => <span style={{ fontSize: 18 }}>📍</span>,
  User: () => <span style={{ fontSize: 18 }}>👤</span>,
  Clock: () => <span style={{ fontSize: 18 }}>🕐</span>,
  Car: () => <span style={{ fontSize: 18 }}>🚗</span>,
  Earnings: () => <span style={{ fontSize: 18 }}>💰</span>,
  Check: () => <span style={{ fontSize: 18 }}>✅</span>,
  Close: () => <span style={{ fontSize: 18 }}>✖️</span>,
  Menu: () => <span style={{ fontSize: 18 }}>☰</span>,
}

// ============ MAIN COMPONENT ============
export default function DriverDashboard() {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'trips' | 'requests' | 'earnings'>('trips')
  
  // State
  const [myTrips, setMyTrips] = useState<Trip[]>([])
  const [requests, setRequests] = useState<PassengerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTrip, setNewTrip] = useState({
    pickup: '',
    dropoff: '',
    date: '',
    time: '',
    seats: 4,
    price: '',
    notes: '',
  })

  useEffect(() => {
    if (!currentUser?.id) return
    loadData()
  }, [currentUser?.id])

  const loadData = async () => {
    try {
      setLoading(true)
      const [trips, reqs] = await Promise.all([
        tripService.getByDriver(currentUser!.id),
        requestService.getPublicRequests()
      ])
      setMyTrips(trips)
      setRequests(reqs)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTrip = async () => {
    if (!newTrip.pickup || !newTrip.dropoff || !newTrip.date || !newTrip.time) {
      alert('請填寫所有必填欄位')
      return
    }
    
    try {
      const departureTime = new Date(`${newTrip.date}T${newTrip.time}`).toISOString()
      
      const tripId = await tripService.create({
        driverId: currentUser!.id,
        driverName: currentUser!.name || '司機',
        driverPhone: currentUser!.phone || '',
        pickup: { placeName: newTrip.pickup, latitude: 0, longitude: 0 },
        dropoff: { placeName: newTrip.dropoff, latitude: 0, longitude: 0 },
        departureTime,
        totalSeats: newTrip.seats,
        notes: newTrip.notes,
      })
      
      await chatService.createTripChatRoom({
        tripId,
        driverId: currentUser!.id,
        driverName: currentUser!.name || '司機',
        driverPhone: currentUser!.phone || '',
        pickup: newTrip.pickup,
        dropoff: newTrip.dropoff,
        departureTime,
      })
      
      setShowCreate(false)
      setNewTrip({ pickup: '', dropoff: '', date: '', time: '', seats: 4, price: '', notes: '' })
      loadData()
      alert('行程已發布！')
    } catch (error) {
      console.error('Error creating trip:', error)
      alert('發布失敗，請重試')
    }
  }

  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  // Calculate earnings (mock for now)
  const totalEarnings = myTrips
    .filter(t => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + (t.totalSeats - (t.availableSeats || 0)) * 100, 0)

  return (
    <div style={{ minHeight: '100vh', background: colors.background }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.headerTitle}>🚗 司機平台</h1>
            <p style={styles.headerSubtitle}>
              {currentUser?.name ? `👤 ${currentUser.name}` : '司機'}
            </p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={() => navigate('/profile')} style={styles.iconBtn}>👤</button>
            <button onClick={logout} style={styles.logoutBtn}>登出</button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <span style={styles.statIcon}>📍</span>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{myTrips.length}</span>
            <span style={styles.statLabel}>我的行程</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statIcon}>💰</span>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>${totalEarnings}</span>
            <span style={styles.statLabel}>总收入</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statIcon}>👥</span>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{myTrips.reduce((sum, t) => sum + (t.passengers?.length || 0), 0)}</span>
            <span style={styles.statLabel}>總乘客</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { key: 'trips', label: '📍 我的行程' },
          { key: 'requests', label: '💬 乘客需求' },
          { key: 'earnings', label: '💰 收入' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.tabActive : {})
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Create Trip Button */}
        <Button fullWidth onClick={() => setShowCreate(true)} style={{ marginBottom: 16 }}>
          <Icon.Plus /> 發布新行程
        </Button>

        {activeTab === 'trips' && (
          <div>
            {loading ? (
              <p style={styles.center}>載入中...</p>
            ) : myTrips.length === 0 ? (
              <Card>
                <p style={styles.center}>
                  暫時沒有行程<br/>
                  <small style={{ color: colors.textSecondary }}>發布行程讓乘客聯絡你</small>
                </p>
              </Card>
            ) : (
              myTrips.map(trip => {
                const statusBadge = getStatusBadge(trip.status)
                return (
                  <Card key={trip.id} style={{ marginBottom: 12 }}>
                    <div style={styles.cardHeader}>
                      <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                      <span style={styles.time}>{formatDateTime(trip.departureTime)}</span>
                    </div>
                    
                    <div style={styles.route}>
                      <div style={styles.routePoint}>
                        <span style={{...styles.routeDot, color: colors.success}}>●</span>
                        <span style={styles.placeName}>{trip.route.pickup.placeName}</span>
                      </div>
                      <div style={styles.routeLine}>↓</div>
                      <div style={styles.routePoint}>
                        <span style={{...styles.routeDot, color: colors.primary}}>●</span>
                        <span style={styles.placeName}>{trip.route.dropoff.placeName}</span>
                      </div>
                    </div>
                    
                    <div style={styles.tripInfo}>
                      <span>💺 {trip.passengers?.length || 0}/{trip.totalSeats} 座位</span>
                      {trip.notes && <span>📝 {trip.notes}</span>}
                    </div>

                    {/* Status Actions */}
                    <div style={styles.actionGroup}>
                      {trip.status === 'OPEN' && (
                        <Button 
                          size="sm" 
                          onClick={() => tripService.updateStatus(trip.id, 'IN_PROGRESS')}
                        >
                          🚗 開始行程
                        </Button>
                      )}
                      {trip.status === 'IN_PROGRESS' && (
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => tripService.updateStatus(trip.id, 'COMPLETED')}
                        >
                          ✅ 完成行程
                        </Button>
                      )}
                      {trip.status !== 'CANCELLED' && trip.status !== 'COMPLETED' && trip.status !== 'EXPIRED' && (
                        <Button 
                          size="sm" 
                          variant="danger"
                          onClick={() => tripService.updateStatus(trip.id, 'CANCELLED')}
                        >
                          ❌ 取消
                        </Button>
                      )}
                    </div>

                    {/* Pending Passengers */}
                    {trip.pendingPassengers?.length > 0 && (
                      <div style={styles.section}>
                        <p style={styles.sectionTitle}>⏳ 待批准乘客：</p>
                        {trip.pendingPassengers.map(p => (
                          <div key={p.passengerId} style={styles.participant}>
                            <span>{p.name}</span>
                            <div style={styles.participantActions}>
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => tripService.approvePassenger(trip.id, p.passengerId)}
                              >
                                ✅
                              </Button>
                              <Button 
                                size="sm" 
                                variant="danger"
                                onClick={() => tripService.rejectPassenger(trip.id, p.passengerId)}
                              >
                                ❌
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Approved Passengers */}
                    {trip.passengers?.length > 0 && (
                      <div style={styles.section}>
                        <p style={styles.sectionTitle}>👥 已批准乘客：</p>
                        {trip.passengers.map(p => (
                          <div key={p.passengerId} style={styles.participant}>
                            <span>{p.name}</span>
                            <span style={styles.participantStatus}>
                              {p.onboarded ? '🚗 已上車' : '⏳ 待上車'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div>
            <p style={styles.sectionTitle}>其他乘客的需求</p>
            {loading ? (
              <p style={styles.center}>載入中...</p>
            ) : requests.length === 0 ? (
              <Card><p style={styles.center}>暫時沒有需求</p></Card>
            ) : (
              requests.map(req => (
                <Card key={req.id} style={{ marginBottom: 12 }}>
                  <div style={styles.cardHeader}>
                    <span>👤 {req.passengerName} | {req.passengerCount}位</span>
                    <span style={styles.time}>{req.departureDate}</span>
                  </div>
                  <div style={styles.route}>
                    <div style={styles.routePoint}>
                      <span style={{...styles.routeDot, color: colors.success}}>●</span>
                      <span style={styles.placeName}>{req.pickup.placeName}</span>
                    </div>
                    <div style={styles.routeLine}>↓</div>
                    <div style={styles.routePoint}>
                      <span style={{...styles.routeDot, color: colors.primary}}>●</span>
                      <span style={styles.placeName}>{req.dropoff.placeName}</span>
                    </div>
                  </div>
                  {req.notes && <p style={styles.notes}>📝 {req.notes}</p>}
                  <Button 
                    fullWidth 
                    variant="secondary"
                    onClick={async () => {
                      try {
                        const roomId = await chatService.createRequestChatRoom({
                          requestId: req.id,
                          passengerId: req.passengerId,
                          passengerName: req.passengerName,
                          passengerPhone: req.passengerPhone,
                          pickup: req.pickup.placeName,
                          dropoff: req.dropoff.placeName,
                          departureDate: req.departureDate,
                        })
                        navigate(`/chat/${roomId}`)
                      } catch (error) {
                        console.error('Error:', error)
                        alert('無法開啟聊天室，請重試')
                      }
                    }}
                  >
                    <Icon.Chat /> 聯絡乘客
                  </Button>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div>
            <Card style={{ marginBottom: 16, background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` }}>
              <div style={{ color: 'white', textAlign: 'center' }}>
                <p style={{ margin: '0 0 8px', fontSize: 14, opacity: 0.9 }}>總收入</p>
                <p style={{ margin: 0, fontSize: 36, fontWeight: 'bold' }}>${totalEarnings}</p>
              </div>
            </Card>
            <p style={styles.sectionTitle}>已完成行程</p>
            {myTrips
              .filter(t => t.status === 'COMPLETED')
              .map(trip => (
                <Card key={trip.id} style={{ marginBottom: 8 }}>
                  <div style={styles.earningsItem}>
                    <div>
                      <p style={styles.earningsRoute}>
                        {trip.route.pickup.placeName} → {trip.route.dropoff.placeName}
                      </p>
                      <p style={styles.earningsDate}>{formatDateTime(trip.departureTime)}</p>
                    </div>
                    <div style={styles.earningsAmount}>
                      +${(trip.totalSeats - (trip.availableSeats || 0)) * 100}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Create Trip Modal */}
      {showCreate && (
        <div style={styles.modalOverlay} onClick={() => setShowCreate(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>發布新行程</h2>
              <button onClick={() => setShowCreate(false)} style={styles.closeBtn}>✕</button>
            </div>
            
            <div style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>上車地點</label>
                <input
                  style={styles.input}
                  placeholder="例如：香港國際機場"
                  value={newTrip.pickup}
                  onChange={e => setNewTrip({...newTrip, pickup: e.target.value})}
                />
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>目的地</label>
                <input
                  style={styles.input}
                  placeholder="例如：深圳灣口岸"
                  value={newTrip.dropoff}
                  onChange={e => setNewTrip({...newTrip, dropoff: e.target.value})}
                />
              </div>
              
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>日期</label>
                  <input
                    style={styles.input}
                    type="date"
                    value={newTrip.date}
                    onChange={e => setNewTrip({...newTrip, date: e.target.value})}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>時間</label>
                  <input
                    style={styles.input}
                    type="time"
                    value={newTrip.time}
                    onChange={e => setNewTrip({...newTrip, time: e.target.value})}
                  />
                </div>
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>座位數</label>
                <div style={styles.seatSelector}>
                  {[1,2,3,4,5,6,7].map(n => (
                    <button
                      key={n}
                      style={{
                        ...styles.seatBtn,
                        ...(newTrip.seats === n ? styles.seatBtnActive : {})
                      }}
                      onClick={() => setNewTrip({...newTrip, seats: n})}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>備註（可選）</label>
                <textarea
                  style={styles.textarea}
                  placeholder="任何特別要求..."
                  value={newTrip.notes}
                  onChange={e => setNewTrip({...newTrip, notes: e.target.value})}
                />
              </div>
              
              <Button fullWidth onClick={handleCreateTrip}>
                🚗 發布行程
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============ STYLES ============
const styles: Record<string, React.CSSProperties> = {
  header: {
    background: colors.white,
    padding: '16px',
    borderBottom: `1px solid ${colors.border}`,
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    margin: '4px 0 0',
    fontSize: 13,
    color: colors.textSecondary,
  },
  headerActions: {
    display: 'flex',
    gap: 8,
  },
  iconBtn: {
    padding: '8px 12px',
    background: colors.primaryLight,
    border: 'none',
    borderRadius: radius.sm,
    fontSize: 16,
    cursor: 'pointer',
  },
  logoutBtn: {
    padding: '8px 16px',
    background: 'transparent',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    color: colors.textSecondary,
    cursor: 'pointer',
  },
  statsContainer: {
    display: 'flex',
    gap: 12,
    padding: '16px',
    background: colors.white,
  },
  statCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    background: colors.background,
    borderRadius: radius.md,
  },
  statIcon: {
    fontSize: 24,
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  tabs: {
    display: 'flex',
    background: colors.white,
    borderBottom: `1px solid ${colors.border}`,
  },
  tab: {
    flex: 1,
    padding: '14px 0',
    border: 'none',
    background: 'transparent',
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  tabActive: {
    background: colors.primary,
    color: colors.white,
  },
  content: {
    padding: 16,
  },
  center: {
    textAlign: 'center',
    padding: 40,
    color: colors.textSecondary,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  time: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  route: {
    marginBottom: 12,
  },
  routePoint: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  routeDot: {
    fontSize: 10,
  },
  placeName: {
    fontSize: 15,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  routeLine: {
    paddingLeft: 4,
    color: colors.textLight,
    fontSize: 14,
  },
  tripInfo: {
    display: 'flex',
    gap: 12,
    fontSize: 13,
    color: colors.textSecondary,
  },
  notes: {
    fontSize: 13,
    color: colors.textSecondary,
    background: colors.background,
    padding: '8px 12px',
    borderRadius: radius.sm,
    marginTop: 8,
  },
  actionGroup: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap' as const,
  },
  section: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: `1px solid ${colors.border}`,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textSecondary,
    margin: '0 0 12px 0',
  },
  participant: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: `1px solid ${colors.border}`,
  },
  participantActions: {
    display: 'flex',
    gap: 4,
  },
  participantStatus: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  modal: {
    background: colors.white,
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    borderRadius: `${radius.lg} ${radius.lg} 0 0`,
    padding: 20,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 24,
    cursor: 'pointer',
    color: colors.textSecondary,
  },
  form: {
    display: 'grid',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textSecondary,
  },
  row: {
    display: 'flex',
    gap: 12,
  },
  input: {
    width: '100%',
    padding: 12,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    fontSize: 15,
    boxSizing: 'border-box' as const,
  },
  seatSelector: {
    display: 'flex',
    gap: 8,
  },
  seatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    border: `2px solid ${colors.primary}`,
    background: colors.white,
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  seatBtnActive: {
    background: colors.primary,
    color: colors.white,
  },
  textarea: {
    width: '100%',
    padding: 12,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    fontSize: 15,
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  earningsItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsRoute: {
    margin: 0,
    fontSize: 14,
    fontWeight: 500,
    color: colors.textPrimary,
  },
  earningsDate: {
    margin: '4px 0 0',
    fontSize: 12,
    color: colors.textSecondary,
  },
  earningsAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
  },
}