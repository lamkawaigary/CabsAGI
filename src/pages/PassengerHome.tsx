// Cabs Carpool - Passenger Home v4.0
// Improved UI with Design System

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { tripService, requestService } from '../services/tripService'
import QRPassenger from '../components/QRPassenger'
import { chatService } from '../services/chatService'
import type { Trip, PassengerRequest } from '../types/trip'
import { colors, radius } from '../styles/designSystem'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

// ============ ICONS ============
const Icon = {
  Plus: () => <span style={{ fontSize: 18 }}>➕</span>,
  Chat: () => <span style={{ fontSize: 18 }}>💬</span>,
  Location: () => <span style={{ fontSize: 18 }}>📍</span>,
  User: () => <span style={{ fontSize: 18 }}>👤</span>,
  Search: () => <span style={{ fontSize: 18 }}>🔍</span>,
  Clock: () => <span style={{ fontSize: 18 }}>🕐</span>,
}

// ============ TAGS ============
const TAGS = ['演唱會', '迪士尼', '機場', '口岸', '商務', '婚禮', '體育賽事', '其他']

// ============ MAIN COMPONENT ============
export default function PassengerHome() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'trips' | 'requests' | 'my' | 'chats'>('trips')
  
  // State
  const [trips, setTrips] = useState<Trip[]>([])
  const [requests, setRequests] = useState<PassengerRequest[]>([])
  const [myRequests, setMyRequests] = useState<PassengerRequest[]>([])
  const [myChats, setMyChats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedTripForQR, setSelectedTripForQR] = useState<any>(null)
  
  // Create Request Modal
  const [showCreate, setShowCreate] = useState(false)
  const [newRequest, setNewRequest] = useState({
    pickup: '',
    dropoff: '',
    date: '',
    passengers: 1,
    notes: '',
    tags: [] as string[],
  })

  useEffect(() => {
    if (!currentUser?.id) return
    
    const unsubChats = chatService.subscribeToUserRooms(currentUser!.id, (rooms) => {
      setMyChats(rooms)
    })
    
    loadData()
    
    return () => {
      unsubChats()
    }
  }, [currentUser?.id])

  const loadData = async () => {
    try {
      setLoading(true)
      const [allTrips, allRequests] = await Promise.all([
        tripService.getPublicTrips(),
        requestService.getPublicRequests()
      ])
      setTrips(allTrips)
      setRequests(allRequests)
      
      if (currentUser?.id) {
        const my = await requestService.getByPassenger(currentUser.id)
        setMyRequests(my)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRequest = async () => {
    if (!newRequest.pickup || !newRequest.dropoff || !newRequest.date) {
      alert('請填寫上下車地點和日期')
      return
    }
    
    try {
      const requestId = await requestService.create({
        passengerId: currentUser!.id,
        passengerName: currentUser!.name || '乘客',
        passengerPhone: currentUser!.phone || '',
        pickup: { placeName: newRequest.pickup, latitude: 0, longitude: 0 },
        dropoff: { placeName: newRequest.dropoff, latitude: 0, longitude: 0 },
        departureDate: newRequest.date,
        passengerCount: newRequest.passengers,
        notes: newRequest.notes,
        tags: newRequest.tags,
      })
      
      await chatService.createRequestChatRoom({
        requestId,
        passengerId: currentUser!.id,
        passengerName: currentUser!.name || '乘客',
        passengerPhone: currentUser!.phone || '',
        pickup: newRequest.pickup,
        dropoff: newRequest.dropoff,
        departureDate: newRequest.date,
      })
      
      setShowCreate(false)
      setNewRequest({ pickup: '', dropoff: '', date: '', passengers: 1, notes: '', tags: [] })
      loadData()
      setActiveTab('my')
      alert('需求已發布！等司機聯絡你。')
    } catch (error) {
      console.error('Error:', error)
      alert('發布失敗，請重試')
    }
  }

  const handleJoinTrip = async (trip: Trip) => {
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
          pickup: trip.route.pickup.placeName,
          dropoff: trip.route.dropoff.placeName,
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
    } catch (error) {
      console.error('Error:', error)
      alert('無法加入，請重試')
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.background }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.headerTitle}>🚗 Cabs Carpool</h1>
            <p style={styles.headerSubtitle}>
              {currentUser?.name ? `👤 ${currentUser.name}` : '乘客'}
            </p>
          </div>
          <button onClick={() => navigate('/profile')} style={styles.profileBtn}>
            👤
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        <Button fullWidth onClick={() => setShowCreate(true)}>
          <Icon.Plus /> 提出路線需求
        </Button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { key: 'trips', label: '📍 瀏覽行程' },
          { key: 'requests', label: '💬 乘客需求' },
          { key: 'my', label: '📋 我的需求' },
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
        {/* Browse Trips */}
        {activeTab === 'trips' && (
          <div>
            {loading ? (
              <Card><p style={styles.center}>載入中...</p></Card>
            ) : trips.length === 0 ? (
              <Card>
                <p style={styles.center}>
                  暫時沒有行程<br/>
                  <small style={{ color: colors.textSecondary }}>
                    可以提出需求，等司機聯絡你
                  </small>
                </p>
              </Card>
            ) : (
              trips.map(trip => (
                <Card key={trip.id} style={{ marginBottom: 12 }}>
                  <div style={styles.cardHeader}>
                    <span style={styles.driverInfo}>
                      👤 {trip.driverName}
                    </span>
                    <span style={styles.time}>{formatDate(trip.departureTime)}</span>
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
                    <span>💺 {trip.passengers.length}/{trip.totalSeats} 座位</span>
                    {trip.notes && <span>📝</span>}
                  </div>
                  
                  <Button 
                    fullWidth 
                    variant="secondary"
                    onClick={() => handleJoinTrip(trip)}
                    style={{ marginTop: 12 }}
                  >
                    <Icon.Chat /> 加入並聊天
                  </Button>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Browse Requests */}
        {activeTab === 'requests' && (
          <div>
            <p style={styles.sectionTitle}>其他乘客的需求</p>
            
            {loading ? (
              <Card><p style={styles.center}>載入中...</p></Card>
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
                    variant="outline"
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
                    style={{ marginTop: 12 }}
                  >
                    <Icon.Chat /> 聯絡乘客
                  </Button>
                </Card>
              ))
            )}
          </div>
        )}

        {/* My Requests */}
        {activeTab === 'my' && (
          <div>
            <Button fullWidth variant="secondary" onClick={() => setShowCreate(true)} style={{ marginBottom: 16 }}>
              <Icon.Plus /> 提出新需求
            </Button>
            
            {loading ? (
              <Card><p style={styles.center}>載入中...</p></Card>
            ) : myRequests.length === 0 ? (
              <Card>
                <p style={styles.center}>
                  暫時沒有需求記錄<br/>
                  <small style={{ color: colors.textSecondary }}>
                    提出需求後，司機可以直接聯絡你
                  </small>
                </p>
              </Card>
            ) : (
              myRequests.map(req => (
                <Card key={req.id} style={{ marginBottom: 12 }}>
                  <div style={styles.cardHeader}>
                    <Badge variant={req.status === 'OPEN' ? 'success' : 'error'}>
                      {req.status === 'OPEN' ? '🟢 開放中' : req.status === 'CONFIRMED' ? '✅ 已確認' : '❌ 已取消'}
                    </Badge>
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
                  
                  <div style={styles.tripInfo}>
                    <span>👤 {req.passengerCount}位乘客</span>
                    {req.interestedDrivers?.length > 0 && (
                      <span>有 {req.interestedDrivers.length} 位司機感興趣</span>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      {showCreate && (
        <div style={styles.modalOverlay} onClick={() => setShowCreate(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>提出路線需求</h2>
              <button onClick={() => setShowCreate(false)} style={styles.closeBtn}>✕</button>
            </div>
            
            <div style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>上車地點 📍</label>
                <input
                  style={styles.input}
                  placeholder="例如：香港國際機場"
                  value={newRequest.pickup}
                  onChange={e => setNewRequest({...newRequest, pickup: e.target.value})}
                />
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>目的地 📍</label>
                <input
                  style={styles.input}
                  placeholder="例如：深圳灣口岸"
                  value={newRequest.dropoff}
                  onChange={e => setNewRequest({...newRequest, dropoff: e.target.value})}
                />
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>出發日期 📅</label>
                <input
                  style={styles.input}
                  type="date"
                  value={newRequest.date}
                  onChange={e => setNewRequest({...newRequest, date: e.target.value})}
                />
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>乘客數 👥</label>
                <div style={styles.seatSelector}>
                  {[1, 2, 3, 4, 5, 6, 7].map(n => (
                    <button
                      key={n}
                      type="button"
                      style={{
                        ...styles.seatBtn,
                        ...(newRequest.passengers === n ? styles.seatBtnActive : {})
                      }}
                      onClick={() => setNewRequest({...newRequest, passengers: n})}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>備註 📝（可選）</label>
                <textarea
                  style={styles.textarea}
                  placeholder="任何特別要求或備註..."
                  value={newRequest.notes}
                  onChange={e => setNewRequest({...newRequest, notes: e.target.value})}
                />
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>標籤 🏷️（可選）</label>
                <div style={styles.tagGrid}>
                  {TAGS.map(tag => {
                    const isSelected = newRequest.tags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        style={{
                          ...styles.tagBtn,
                          ...(isSelected ? styles.tagBtnActive : {})
                        }}
                        onClick={() => {
                          if (isSelected) {
                            setNewRequest({
                              ...newRequest,
                              tags: newRequest.tags.filter(t => t !== tag)
                            })
                          } else {
                            setNewRequest({
                              ...newRequest,
                              tags: [...newRequest.tags, tag]
                            })
                          }
                        }}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
              
              <Button fullWidth onClick={handleCreateRequest}>
                🚗 發布需求
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedTripForQR && (
        <div style={styles.modalOverlay} onClick={() => setShowQRModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>上車二維碼</h2>
              <button onClick={() => setShowQRModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <QRPassenger 
              tripId={selectedTripForQR.id}
              passengerId={currentUser?.id || ''}
              passengerName={currentUser?.name || ''}
            />
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
  profileBtn: {
    padding: '8px 12px',
    background: colors.primaryLight,
    border: 'none',
    borderRadius: radius.sm,
    fontSize: 16,
    cursor: 'pointer',
  },
  quickActions: {
    padding: 16,
    background: colors.white,
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textSecondary,
    margin: '0 0 12px 0',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverInfo: {
    fontSize: 13,
    color: colors.textSecondary,
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
  tagGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  tagBtn: {
    padding: '8px 14px',
    borderRadius: radius.full,
    border: `2px solid ${colors.border}`,
    background: colors.white,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  tagBtnActive: {
    border: `2px solid ${colors.primary}`,
    background: colors.primary,
    color: colors.white,
  },
}