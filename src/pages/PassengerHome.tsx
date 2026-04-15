// Cabs Carpool - Passenger Home (Simplified Chat-Centric)
// Version: 3.0
// 核心理念：瀏覽行程或提出需求，都是聊天話題的起點

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
  Check: () => <span style={{ fontSize: 18 }}>✅</span>,
  Close: () => <span style={{ fontSize: 18 }}>✖️</span>,
}

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
  const [error, setError] = useState<string | null>(null)
  
  // Create Request Modal
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newRequest, setNewRequest] = useState({
    pickup: '',
    dropoff: '',
    date: '',
    passengers: 1,
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
      setError('載入失敗，請檢查網絡連接')
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
      setCreating(true)
      
      // Create request
      const requestId = await requestService.create({
        passengerId: currentUser!.id,
        passengerName: currentUser!.name || '乘客',
        passengerPhone: currentUser!.phone || '',
        pickup: { placeName: newRequest.pickup, latitude: 0, longitude: 0 },
        dropoff: { placeName: newRequest.dropoff, latitude: 0, longitude: 0 },
        departureDate: newRequest.date,
        passengerCount: newRequest.passengers,
        notes: newRequest.notes,
      })
      
      // Create chat room for this request
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
      setNewRequest({ pickup: '', dropoff: '', date: '', passengers: 1, notes: '' })
      loadData()
      setActiveTab('my') // Switch to 'my' tab to show the new request
      alert('需求已發布！等司機聯絡你。')
    } catch (error) {
      console.error('Error:', error)
      alert('發布失敗，請重試')
    } finally {
      setCreating(false)
    }
  }

  const handleJoinTrip = async (trip: Trip) => {
    try {
      // Add passenger to trip
      await tripService.join(trip.id, {
        oderId: currentUser!.id,
        name: currentUser!.name || '乘客',
        phone: currentUser!.phone || '',
      })
      
      // Get or create chat room
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
        // Join existing chat room
        await chatService.joinChatRoom(roomId, {
          oderId: currentUser!.id,
          name: currentUser!.name || '乘客',
          role: 'passenger',
          phone: currentUser!.phone || '',
        })
      }
      
      // Navigate to chat
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
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        background: '#1e56a3',
        color: 'white',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18 }}>🚗 Cabs Carpool</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.8 }}>
            {currentUser?.name ? `👤 ${currentUser.name}` : '乘客'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/profile')} style={{background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 16, cursor: 'pointer'}}>👤</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          { key: 'trips', label: '📍 瀏覽行程' },
          { key: 'requests', label: '💬 乘客需求' },
          { key: 'my', label: '📋 我的需求' },
          { key: 'chats', label: '💬 我的聊天' },
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
        {/* Browse Trips */}
        {activeTab === 'trips' && (
          <div>
            {/* Request Button */}
            <button onClick={() => setShowCreate(true)} style={styles.requestBtn}>
              <Icon.Plus /> 提出路線需求
            </button>

            {loading ? <p style={styles.center}>載入中...</p> :
             trips.length === 0 ? (
              <p style={styles.center}>
                暫時沒有行程<br/>
                <small>可以提出需求，等司機聯絡你</small>
              </p>
            ) : (
              trips.map(trip => (
                <div key={trip.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span><Icon.User /> {trip.driverName}</span>
                    <span style={styles.time}>{formatDate(trip.departureTime)}</span>
                  </div>
                  <div style={styles.route}>
                    <Icon.Location /> {trip.route.pickup.placeName}
                    <br/>↓<br/>
                    {trip.route.dropoff.placeName}
                  </div>
                  <div style={styles.info}>
                    <span><Icon.User /> {trip.passengers.length}/{trip.totalSeats} 座位</span>
                  </div>
                  {trip.notes && <p style={styles.notes}>📝 {trip.notes}</p>}
                  
                  <button
                    onClick={() => handleJoinTrip(trip)}
                    style={styles.chatBtn}
                  >
                    <Icon.Chat /> 加入並聊天
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Browse Requests */}
        {activeTab === 'requests' && (
          <div>
            <p style={styles.sectionTitle}>其他乘客的需求</p>
            
            {error ? (
              <p style={{...styles.center, color: '#c62828'}}>{error}</p>
            ) : loading ? <p style={styles.center}>載入中...</p> :
             requests.length === 0 ? (
              <p style={styles.center}>暫時沒有需求</p>
            ) : (
              requests.map(req => (
                <div key={req.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span><Icon.User /> {req.passengerName} | {req.passengerCount}位</span>
                    <span style={styles.time}>{req.departureDate}</span>
                  </div>
                  <div style={styles.route}>
                    <Icon.Location /> {req.pickup.placeName}
                    <br/>↓<br/>
                    {req.dropoff.placeName}
                  </div>
                  {req.notes && <p style={styles.notes}>📝 {req.notes}</p>}
                  
                  <button
                    onClick={async () => {
                      try {
                        let roomId = await chatService.getRequestRoom(req.id)
                        if (!roomId) {
                          roomId = await chatService.createRequestChatRoom({
                            requestId: req.id,
                            passengerId: req.passengerId,
                            passengerName: req.passengerName,
                            passengerPhone: req.passengerPhone,
                            pickup: req.pickup.placeName,
                            dropoff: req.dropoff.placeName,
                            departureDate: req.departureDate,
                          })
                        } else {
                          await chatService.joinChatRoom(roomId, {
                            oderId: currentUser!.id,
                            name: currentUser!.name || '司機',
                            role: 'driver',
                            phone: currentUser!.phone || '',
                          })
                        }
                        navigate(`/chat/${roomId}`)
                      } catch (error) {
                        console.error('Error:', error)
                      }
                    }}
                    style={styles.chatBtn}
                  >
                    <Icon.Chat /> 聯絡乘客
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* My Requests */}
        {activeTab === 'my' && (
          <div>
            <button onClick={() => setShowCreate(true)} style={styles.requestBtn}>
              <Icon.Plus /> 提出新需求
            </button>
            
            {loading ? <p style={styles.center}>載入中...</p> :
             myRequests.length === 0 ? (
              <p style={styles.center}>
                暫時沒有需求記錄<br/>
                <small>提出需求後，司機可以直接聯絡你</small>
              </p>
            ) : (
              myRequests.map(req => (
                <div key={req.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span style={req.status === 'OPEN' ? styles.badgeOpen : styles.badgeClosed}>
                      {req.status === 'OPEN' ? '🟢 開放中' : req.status === 'CONFIRMED' ? '✅ 已確認' : '❌ 已取消'}
                    </span>
                    <span style={styles.time}>{req.departureDate}</span>
                  </div>
                  <div style={styles.route}>
                    <Icon.Location /> {req.pickup.placeName}
                    <br/>↓<br/>
                    {req.dropoff.placeName}
                  </div>
                  <div style={styles.info}>
                    <span><Icon.User /> {req.passengerCount} 位 | 已有 {req.interestedDrivers.length} 位司機有興趣</span>
                  </div>
                  {req.notes && <p style={styles.notes}>📝 {req.notes}</p>}
                  
                  <button
                    onClick={async () => {
                      try {
                        let roomId = await chatService.getRequestRoom(req.id)
                        if (roomId) {
                          navigate(`/chat/${roomId}`)
                        } else {
                          alert('暫時沒有司機聯絡你')
                        }
                      } catch (error) {
                        console.error('Error:', error)
                      }
                    }}
                    style={styles.chatBtn}
                  >
                    <Icon.Chat /> 進入聊天室
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
                <small>瀏覽行程或提出需求，司機會聯絡你！</small>
              </p>
            ) : (
              myChats.map(room => {
                const other = room.participants?.find((p: any) => p.oderId !== currentUser?.id)
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

      {/* Create Request Modal */}
      {showCreate && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0 }}>提出路線需求</h2>
              <button onClick={() => setShowCreate(false)} style={styles.closeBtn}><Icon.Close /></button>
            </div>
            
            <div style={styles.form}>
              <label>上車地點 *</label>
              <input
                type="text"
                placeholder="例：香港國際機場"
                value={newRequest.pickup}
                onChange={e => setNewRequest({...newRequest, pickup: e.target.value})}
                style={styles.input}
              />
              
              <label>目的地點 *</label>
              <input
                type="text"
                placeholder="例：深圳灣口岸"
                value={newRequest.dropoff}
                onChange={e => setNewRequest({...newRequest, dropoff: e.target.value})}
                style={styles.input}
              />
              
              <label>出發日期 *</label>
              <input
                type="date"
                value={newRequest.date}
                onChange={e => setNewRequest({...newRequest, date: e.target.value})}
                style={styles.input}
              />
              
              <label>人數</label>
              <select
                value={newRequest.passengers}
                onChange={e => setNewRequest({...newRequest, passengers: parseInt(e.target.value)})}
                style={styles.input}
              >
                {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n} 位</option>)}
              </select>
              
              <label>備註</label>
              <textarea
                placeholder="行李、寵物、特殊需求..."
                value={newRequest.notes}
                onChange={e => setNewRequest({...newRequest, notes: e.target.value})}
                style={{...styles.input, minHeight: 60}}
              />
              
              <button
                onClick={handleCreateRequest}
                disabled={creating}
                style={styles.submitBtn}
              >
                {creating ? '發布中...' : '✅ 發布需求'}
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
    background: '#1e56a3',
    color: 'white',
  },
  center: {
    textAlign: 'center',
    padding: 40,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#666',
    margin: '0 0 12px 0',
  },
  requestBtn: {
    width: '100%',
    padding: 14,
    background: '#143b34',
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
    fontSize: 13,
  },
  badgeOpen: {
    padding: '2px 8px',
    background: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: 10,
    fontSize: 12,
  },
  badgeClosed: {
    padding: '2px 8px',
    background: '#ffebee',
    color: '#c62828',
    borderRadius: 10,
    fontSize: 12,
  },
  time: {
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
  lastMsg: {
    fontSize: 13,
    color: '#1e56a3',
    marginTop: 8,
  },
  chatBtn: {
    width: '100%',
    padding: 12,
    background: '#1e56a3',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
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
    background: '#143b34',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
}
