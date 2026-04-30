// Cabs Carpool - Driver Dashboard (Simplified Chat-Centric)
// Version: 3.0
// 核心理念：行程只是聊天話題的起點

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { tripService, requestService } from '../services/tripService'
import { chatService } from '../services/chatService'
import type { Trip, PassengerRequest } from '../types/trip'

// ============ ICONS ============
const Icon = {
  Plus: () => <span style={{ fontSize: 18 }}>➕</span>,
  Chat: () => <span style={{ fontSize: 18 }}>💬</span>,
  Location: () => <span style={{ fontSize: 18 }}>📍</span>,
  User: () => <span style={{ fontSize: 18 }}>👤</span>,
  Clock: () => <span style={{ fontSize: 18 }}>🕐</span>,
  Car: () => <span style={{ fontSize: 18 }}>🚗</span>,
  Check: () => <span style={{ fontSize: 18 }}>✅</span>,
  Close: () => <span style={{ fontSize: 18 }}>✖️</span>,
}

// ============ MAIN COMPONENT ============
export default function DriverDashboard() {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'trips' | 'requests' | 'chats'>('trips')
  
  // State
  const [myTrips, setMyTrips] = useState<Trip[]>([])
  const [requests, setRequests] = useState<PassengerRequest[]>([])
  const [myChats, setMyChats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Create Trip Modal
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newTrip, setNewTrip] = useState({
    pickup: '',
    dropoff: '',
    date: '',
    time: '',
    seats: 4,
    notes: '',
  })

  useEffect(() => {
    if (!currentUser?.id) return
    
    // Subscribe to user's chat rooms
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
      setError(null)
      setLoading(true)
      const [trips, reqs] = await Promise.all([
        tripService.getByDriver(currentUser!.id),
        requestService.getPublicRequests()
      ])
      setMyTrips(trips)
      setRequests(reqs)
    } catch (error) {
      console.error('Error loading data:', error)
      setError('載入失敗，請檢查網絡連接')
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
      setCreating(true)
      const departureTime = new Date(`${newTrip.date}T${newTrip.time}`).toISOString()
      
      // Create trip
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
      
      // Create chat room for this trip
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
      setNewTrip({ pickup: '', dropoff: '', date: '', time: '', seats: 4, notes: '' })
      loadData()
      alert('行程已發布！可以開始聊天了。')
    } catch (error) {
      console.error('Error creating trip:', error)
      alert('發布失敗，請重試')
    } finally {
      setCreating(false)
    }
  }

  const handleContactPassenger = async (request: PassengerRequest) => {
    try {
      // Always create a new chat room for this driver-passenger pair
      const roomId = await chatService.createRequestChatRoom({
        requestId: request.id,
        passengerId: request.passengerId,
        passengerName: request.passengerName,
        passengerPhone: request.passengerPhone,
        pickup: request.pickup.placeName,
        dropoff: request.dropoff.placeName,
        departureDate: request.departureDate,
      })
      
      // Add driver as participant
      await chatService.joinChatRoom(roomId, {
        passengerId: currentUser!.id,
        name: currentUser!.name || '司機',
        role: 'driver',
        phone: currentUser!.phone || '',
      })
      
      // Add driver as interested
      await requestService.addInterestedDriver(request.id, {
        driverId: currentUser!.id,
        driverName: currentUser!.name || '司機',
        driverPhone: currentUser!.phone || '',
      })
      
      navigate(`/chat/${roomId}`)
    } catch (error) {
      console.error('Error:', error)
      alert('無法開啟聊天室，請重試')
    }
  }

  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        background: '#e07b4c',
        color: 'white',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18 }}>🚗 司機平台</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.8 }}>
            {currentUser?.name ? `👤 ${currentUser.name}` : '司機'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/profile')} style={{...styles.logoutBtn, background: 'rgba(255,255,255,0.2)', padding: '8px 12px'}}>👤</button>
          <button onClick={logout} style={styles.logoutBtn}>登出</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { key: 'trips', label: '📍 我的行程' },
          { key: 'requests', label: '💬 乘客需求' },
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
      <div style={{ padding: 16 }}>
        {/* Create Trip Button */}
        <button onClick={() => setShowCreate(true)} style={styles.createBtn}>
          <Icon.Plus /> 發布行程
        </button>

        {activeTab === 'trips' && (
          <div>
            {loading ? <p style={styles.center}>載入中...</p> :
             myTrips.length === 0 ? (
              <p style={styles.center}>暫時沒有行程<br/><small>發布行程讓乘客聯絡你</small></p>
            ) : (
              myTrips.map(trip => {
                const statusBadge = {
                  'OPEN': '🟢 開放中',
                  'CONFIRMED': '✅ 已確認',
                  'IN_PROGRESS': '🔵 行程中',
                  'COMPLETED': '✅ 已完成',
                  'CANCELLED': '❌ 已取消',
                  'EXPIRED': '⏰ 已過期',
                }[trip.status] || trip.status
                
                return (
                <div key={trip.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span style={{
                      ...styles.badge,
                      background: trip.status === 'OPEN' ? '#4caf50' : 
                                 trip.status === 'IN_PROGRESS' ? '#2196f3' :
                                 trip.status === 'COMPLETED' ? '#9e9e9e' : '#f44336'
                    }}>
                      {statusBadge}
                    </span>
                    <span style={styles.time}>{formatDateTime(trip.departureTime)}</span>
                  </div>
                  <div style={styles.route}>
                    <Icon.Location /> {trip.route.pickup.placeName}
                    <br/>↓<br/>
                    {trip.route.dropoff.placeName}
                  </div>
                  <div style={styles.info}>
                    <span><Icon.User /> {trip.passengers?.length || 0} 位乘客 | 💺 {trip.availableSeats || trip.totalSeats} 剩餘 / {trip.totalSeats} 總位</span>
                  </div>
                  {trip.notes && <p style={styles.notes}>📝 {trip.notes}</p>}
                  
                  {/* Status Change Buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {trip.status === 'OPEN' && (
                      <button 
                        onClick={() => tripService.updateStatus(trip.id, 'IN_PROGRESS')}
                        style={{...styles.actionBtn, background: '#2196f3'}}
                      >
                        🚗 開始行程
                      </button>
                    )}
                    {trip.status === 'IN_PROGRESS' && (
                      <button 
                        onClick={() => tripService.updateStatus(trip.id, 'COMPLETED')}
                        style={{...styles.actionBtn, background: '#4caf50'}}
                      >
                        ✅ 完成行程
                      </button>
                    )}
                    {trip.status !== 'CANCELLED' && trip.status !== 'COMPLETED' && trip.status !== 'EXPIRED' && (
                      <button 
                        onClick={() => tripService.updateStatus(trip.id, 'CANCELLED')}
                        style={{...styles.actionBtn, background: '#f44336'}}
                      >
                        ❌ 取消行程
                      </button>
                    )}
                  </div>
                  
                  {/* Pending Passengers */}
                  {trip.pendingPassengers?.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#e07b4c' }}>
                        ⏳ 待批准乘客：
                      </p>
                      {trip.pendingPassengers.map(p => (
                        <div key={p.passengerId} style={styles.participant}>
                          <span>{p.name}</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button 
                              onClick={() => tripService.approvePassenger(trip.id, p.passengerId)}
                              style={{...styles.smallBtn, background: '#4caf50'}}
                            >
                              ✅ 批准
                            </button>
                            <button 
                              onClick={() => tripService.rejectPassenger(trip.id, p.passengerId)}
                              style={{...styles.smallBtn, background: '#f44336'}}
                            >
                              ❌ 拒絕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Approved Passengers list */}
                  {trip.passengers?.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>👥 已批准乘客：</p>
                      {trip.passengers.map(p => (
                        <div key={p.passengerId} style={styles.participant}>
                          <span>{p.name}</span>
                          <span style={{ fontSize: 12, color: p.confirmed ? '#4caf50' : '#666' }}>
                            {p.confirmed ? '✅ 已確認乘車' : '⏳ 待乘車確認'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div>
            {error ? (
              <p style={{...styles.center, color: '#c62828'}}>{error}</p>
            ) : loading ? <p style={styles.center}>載入中...</p> :
             requests.length === 0 ? (
              <p style={styles.center}>暫時沒有乘客需求</p>
            ) : (
              requests.map(req => (
                <div key={req.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span>📝 乘客需求</span>
                    <span style={styles.time}>{req.departureDate}</span>
                  </div>
                  <div style={styles.route}>
                    <Icon.Location /> {req.pickup.placeName}
                    <br/>↓<br/>
                    {req.dropoff.placeName}
                  </div>
                  <div style={styles.info}>
                    <span><Icon.User /> {req.passengerName} | {req.passengerCount} 位</span>
                  </div>
                  {req.notes && <p style={styles.notes}>📝 {req.notes}</p>}
                  
                  <button
                    onClick={() => handleContactPassenger(req)}
                    style={styles.chatBtn}
                  >
                    <Icon.Chat /> 聯絡乘客
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'chats' && (
          <div>
            {loading ? <p style={styles.center}>載入中...</p> :
             myChats.length === 0 ? (
              <p style={styles.center}>
                暫時沒有聊天記錄<br/>
                <small>開始與乘客聊天吧！</small>
              </p>
            ) : (
              myChats.map(room => {
                const other = room.participants?.find((p: any) => p.passengerId !== currentUser?.id)
                return (
                  <div 
                    key={room.id} 
                    style={styles.card}
                    onClick={() => navigate(`/chat/${room.id}`)}
                  >
                    <div style={styles.cardHeader}>
                      <span>{room.roomType === 'trip' ? '🚗 行程' : '📝 需求'}</span>
                      <span style={room.status === 'active' ? styles.badgeOpen : styles.badgeClosed}>
                        {room.status === 'active' ? '🟢 進行中' : '❌ 已關閉'}
                      </span>
                    </div>
                    <div style={styles.route}>
                      <Icon.Location /> {room.topicPickup}
                      <br/>↓<br/>
                      {room.topicDropoff}
                    </div>
                    <div style={styles.info}>
                      <span><Icon.User /> {other?.name || '未知'} | {other?.role === 'driver' ? '司機' : '乘客'}</span>
                    </div>
                    <p style={styles.lastMsg}>
                      💬 點擊進入聊天室
                    </p>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Create Trip Modal */}
      {showCreate && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0 }}>發布行程</h2>
              <button onClick={() => setShowCreate(false)} style={styles.closeBtn}><Icon.Close /></button>
            </div>
            
            <div style={styles.form}>
              <label>上車地點 *</label>
              <input
                type="text"
                placeholder="例：香港國際機場"
                value={newTrip.pickup}
                onChange={e => setNewTrip({...newTrip, pickup: e.target.value})}
                style={styles.input}
              />
              
              <label>目的地點 *</label>
              <input
                type="text"
                placeholder="例：深圳灣口岸"
                value={newTrip.dropoff}
                onChange={e => setNewTrip({...newTrip, dropoff: e.target.value})}
                style={styles.input}
              />
              
              <label>日期 *</label>
              <input
                type="date"
                value={newTrip.date}
                onChange={e => setNewTrip({...newTrip, date: e.target.value})}
                style={styles.input}
              />
              
              <label>時間 *</label>
              <input
                type="time"
                value={newTrip.time}
                onChange={e => setNewTrip({...newTrip, time: e.target.value})}
                style={styles.input}
              />
              
              <label>座位數目</label>
              <select
                value={newTrip.seats}
                onChange={e => setNewTrip({...newTrip, seats: parseInt(e.target.value)})}
                style={styles.input}
              >
                {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} 位</option>)}
              </select>
              
              <label>備註</label>
              <textarea
                placeholder="行李、寵物等..."
                value={newTrip.notes}
                onChange={e => setNewTrip({...newTrip, notes: e.target.value})}
                style={{...styles.input, minHeight: 60}}
              />
              
              <button
                onClick={handleCreateTrip}
                disabled={creating}
                style={styles.submitBtn}
              >
                {creating ? '發布中...' : '✅ 發布行程'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============ STYLES ============
const styles: Record<string, React.CSSProperties> = {
  logoutBtn: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    background: 'white',
    borderBottom: '1px solid #e0e0e0',
  },
  tab: {
    flex: 1,
    padding: '14px 0',
    border: 'none',
    background: 'transparent',
    color: '#666',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  tabActive: {
    background: '#e07b4c',
    color: 'white',
  },
  createBtn: {
    width: '100%',
    padding: 14,
    background: '#e07b4c',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  center: {
    textAlign: 'center',
    padding: 40,
    color: '#666',
  },
  card: {
    background: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    padding: '4px 10px',
    color: 'white',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
  },
  badgeOpen: {
    padding: '4px 10px',
    background: '#e8f5e9',
    color: '#e07b4c',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
  },
  badgeClosed: {
    padding: '4px 10px',
    background: '#ffebee',
    color: '#c62828',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
  },
  actionBtn: {
    padding: '6px 12px',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
  smallBtn: {
    padding: '4px 8px',
    color: 'white',
    border: 'none',
    borderRadius: 4,
    fontSize: 11,
    cursor: 'pointer',
  },
  time: {
    fontSize: 13,
    color: '#666',
  },
  route: {
    display: 'flex',
    gap: 8,
    fontSize: 14,
    marginBottom: 12,
  },
  info: {
    fontSize: 13,
    color: '#666',
  },
  notes: {
    fontSize: 13,
    color: '#444',
    background: '#f8f8f8',
    padding: '8px 12px',
    borderRadius: 6,
    marginTop: 8,
  },
  participant: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  chatBtn: {
    width: '100%',
    padding: 10,
    background: '#e07b4c',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
    background: 'white',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    borderRadius: '16px 16px 0 0',
    padding: 20,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 24,
    cursor: 'pointer',
  },
  form: {
    display: 'grid',
    gap: 12,
  },
  input: {
    width: '100%',
    padding: 12,
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 15,
    boxSizing: 'border-box',
  },
  submitBtn: {
    width: '100%',
    padding: 14,
    background: '#e07b4c',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
}
