// CabsAGI - Driver Trips Manager v2
// 司機行程管理中心 - 像Uber/滴滴司機端介面

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { tripService } from '../../services/tripService'
import type { Trip, TripStatus } from '../../types/trip'
import BottomNav from '../../components/BottomNav'

// 司機行程狀態
type DriverTripStatus = 'all' | 'OPEN' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

// 狀態配置
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; nextAction?: string }> = {
  'OPEN': { 
    label: '等待乘客', 
    color: '#4caf50', 
    bg: '#e8f5e9',
    nextAction: 'confirm'
  },
  'CONFIRMED': { 
    label: '已確認出發', 
    color: '#ff9800', 
    bg: '#fff3e0',
    nextAction: 'start'
  },
  'IN_PROGRESS': { 
    label: '行程中', 
    color: '#2196f3', 
    bg: '#e3f2fd',
    nextAction: 'complete'
  },
  'COMPLETED': { 
    label: '已完成', 
    color: '#9e9e9e', 
    bg: '#f5f5f5'
  },
  'CANCELLED': { 
    label: '已取消', 
    color: '#f44336', 
    bg: '#ffebee'
  },
}

export default function DriverTripsManager() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<DriverTripStatus>('all')
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (currentUser?.id) {
      loadTrips()
    }
  }, [currentUser?.id])

  const loadTrips = async () => {
    if (!currentUser?.id) return
    try {
      const driverTrips = await tripService.getByDriver(currentUser.id)
      setTrips(driverTrips || [])
    } catch (error) {
      console.error('Error loading trips:', error)
    } finally {
      setLoading(false)
    }
  }

  // 過濾行程
  const filteredTrips = trips.filter(trip => {
    if (filterStatus === 'all') return true
    return trip.status === filterStatus
  })

  // 取得進行動程（司機最關心的）
  const activeTrip = trips.find(t => t.status === 'IN_PROGRESS' || t.status === 'CONFIRMED')

  // 更新行程狀態
  const updateTripStatus = async (tripId: string, newStatus: TripStatus) => {
    setActionLoading(true)
    try {
      await tripService.updateStatus(tripId, newStatus)
      await loadTrips()
      setSelectedTrip(null)
    } catch (error) {
      console.error('Error updating trip:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const formatTime = (iso: string) => {
    if (!iso) return '--:--'
    const d = new Date(iso)
    return d.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (iso: string) => {
    if (!iso) return '--'
    const d = new Date(iso)
    return d.toLocaleDateString('zh-HK', { month: 'numeric', day: 'numeric' })
  }

  // 司機操作按鈕
  const getActionButton = (trip: Trip) => {
    const status = trip.status
    
    if (status === 'OPEN') {
      return (
        <button 
          style={styles.actionBtnConfirm}
          onClick={() => updateTripStatus(trip.id, 'CONFIRMED')}
          disabled={actionLoading}
        >
          ✅ 確認出發
        </button>
      )
    }
    
    if (status === 'CONFIRMED') {
      return (
        <button 
          style={styles.actionBtnStart}
          onClick={() => updateTripStatus(trip.id, 'IN_PROGRESS')}
          disabled={actionLoading}
        >
          🚗 開始行程
        </button>
      )
    }
    
    if (status === 'IN_PROGRESS') {
      return (
        <button 
          style={styles.actionBtnComplete}
          onClick={() => updateTripStatus(trip.id, 'COMPLETED')}
          disabled={actionLoading}
        >
          ✅ 完成行程
        </button>
      )
    }
    
    return null
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>載入中...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>🚗 行程管理</h1>
          <button style={styles.settingsBtn} onClick={() => navigate('/driver-settings')}>
            ⚙️
          </button>
        </div>
        
        {/* Quick Stats */}
        <div style={styles.quickStats}>
          <div style={styles.statItem}>
            <span style={styles.statNum}>{trips.filter(t => t.status === 'IN_PROGRESS').length}</span>
            <span style={styles.statLabel}>進行中</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <span style={styles.statNum}>{trips.filter(t => t.status === 'OPEN').length}</span>
            <span style={styles.statLabel}>待確認</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <span style={styles.statNum}>{trips.filter(t => t.status === 'COMPLETED').length}</span>
            <span style={styles.statLabel}>已完成</span>
          </div>
        </div>
      </header>

      {/* Active Trip Card (如果有進行中的行程) */}
      {activeTrip && (
        <div style={styles.activeTripSection}>
          <div style={styles.activeTripHeader}>
            <span style={styles.activeLabel}>🚗 當前行程</span>
            <span style={{...styles.statusBadge, background: STATUS_CONFIG[activeTrip.status]?.bg, color: STATUS_CONFIG[activeTrip.status]?.color}}>
              {STATUS_CONFIG[activeTrip.status]?.label}
            </span>
          </div>
          
          <div style={styles.activeTripCard}>
            <div style={styles.routeInfo}>
              <div style={styles.routePoint}>
                <div style={styles.routeDotGreen} />
                <div>
                  <div style={styles.routeLabel}>上車</div>
                  <div style={styles.routePlace}>{activeTrip.route?.pickup?.placeName || '未知'}</div>
                </div>
              </div>
              <div style={styles.routeLine} />
              <div style={styles.routePoint}>
                <div style={styles.routeDotRed} />
                <div>
                  <div style={styles.routeLabel}>目的地</div>
                  <div style={styles.routePlace}>{activeTrip.route?.dropoff?.placeName || '未知'}</div>
                </div>
              </div>
            </div>
            
            <div style={styles.tripMeta}>
              <span>🕐 {formatTime(activeTrip.departureTime)}</span>
              <span>💺 {activeTrip.passengers?.length || 0}/{activeTrip.totalSeats} 人</span>
            </div>
            
            {/* 乘客列表 */}
            {activeTrip.passengers?.length > 0 && (
              <div style={styles.passengerList}>
                {activeTrip.passengers.map((p: any, idx: number) => (
                  <div key={idx} style={styles.passengerItem}>
                    <span>👤 {p.name}</span>
                    {p.onboarded && <span style={styles.onboardedBadge}>已上車</span>}
                  </div>
                ))}
              </div>
            )}
            
            <div style={styles.activeActions}>
              {getActionButton(activeTrip)}
              <button 
                style={styles.actionBtnChat}
                onClick={() => navigate(`/chat/${activeTrip.id}`)}
              >
                💬 聯絡乘客
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={styles.filterSection}>
        <div style={styles.filterTabs}>
          {(['all', 'OPEN', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] as DriverTripStatus[]).map(status => (
            <button
              key={status}
              style={{
                ...styles.filterTab,
                ...(filterStatus === status ? styles.filterTabActive : {}),
              }}
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? '全部' : STATUS_CONFIG[status]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trips List */}
      <div style={styles.tripsList}>
        {filteredTrips.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🚗</div>
            <div style={styles.emptyText}>暫時沒有行程</div>
          </div>
        ) : (
          filteredTrips.map(trip => (
            <div 
              key={trip.id} 
              style={styles.tripCard}
              onClick={() => setSelectedTrip(trip === selectedTrip ? null : trip)}
            >
              {/* Trip Header */}
              <div style={styles.tripCardHeader}>
                <div style={styles.tripTime}>
                  <span style={styles.tripDate}>{formatDate(trip.departureTime)}</span>
                  <span style={styles.tripHour}>{formatTime(trip.departureTime)}</span>
                </div>
                <span style={{
                  ...styles.statusBadge,
                  background: STATUS_CONFIG[trip.status]?.bg,
                  color: STATUS_CONFIG[trip.status]?.color
                }}>
                  {STATUS_CONFIG[trip.status]?.label}
                </span>
              </div>

              {/* Route */}
              <div style={styles.tripRoute}>
                <div style={styles.routeItem}>
                  <div style={styles.routeDotGreen} />
                  <span>{trip.route?.pickup?.placeName || '未知'}</span>
                </div>
                <div style={styles.routeArrow}>↓</div>
                <div style={styles.routeItem}>
                  <div style={styles.routeDotRed} />
                  <span>{trip.route?.dropoff?.placeName || '未知'}</span>
                </div>
              </div>

              {/* Trip Info */}
              <div style={styles.tripInfoRow}>
                <span>💺 {trip.passengers?.length || 0}/{trip.totalSeats} 乘客</span>
                {trip.pendingPassengers?.length > 0 && (
                  <span style={styles.pendingBadge}>⏳ {trip.pendingPassengers.length} 待批准</span>
                )}
              </div>

              {/* Expanded Details */}
              {selectedTrip?.id === trip.id && (
                <div style={styles.tripDetails}>
                  {/* Passengers */}
                  {trip.passengers?.length > 0 && (
                    <div style={styles.detailSection}>
                      <div style={styles.detailLabel}>已上車乘客：</div>
                      {trip.passengers.map((p: any, idx: number) => (
                        <div key={idx} style={styles.passengerRow}>
                          <span>👤 {p.name}</span>
                          <span>{p.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Pending Passengers */}
                  {trip.pendingPassengers?.length > 0 && (
                    <div style={styles.detailSection}>
                      <div style={styles.detailLabel}>待批准：</div>
                      {trip.pendingPassengers.map((p: any, idx: number) => (
                        <div key={idx} style={styles.passengerRow}>
                          <span>👤 {p.name}</span>
                          <div style={styles.pendingActions}>
                            <button 
                              style={styles.approveBtn}
                              onClick={(e) => {
                                e.stopPropagation()
                                tripService.acceptPassenger(trip.id, p.passengerId)
                                loadTrips()
                              }}
                            >
                              ✅
                            </button>
                            <button 
                              style={styles.rejectBtn}
                              onClick={(e) => {
                                e.stopPropagation()
                                tripService.rejectPassenger(trip.id, p.passengerId)
                                loadTrips()
                              }}
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={styles.cardActions}>
                    {getActionButton(trip)}
                    <button 
                      style={styles.actionBtnChat}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/chat/${trip.id}`)
                      }}
                    >
                      💬 聊天
                    </button>
                    <button 
                      style={styles.actionBtnReport}
                      onClick={(e) => {
                        e.stopPropagation()
                        alert('舉報功能：行程中遇到問題可在此反饋')
                      }}
                    >
                      ⚠️ 報告問題
                    </button>
                  </div>
                </div>
              )}

              {/* Expand Indicator */}
              <div style={styles.expandIndicator}>
                {selectedTrip?.id === trip.id ? '▲ 收合' : '▼ 展開'}
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
    paddingBottom: 80,
  },
  loading: {
    textAlign: 'center' as const,
    padding: 40,
    color: '#666',
  },
  header: {
    background: '#fff',
    padding: '16px',
    borderBottom: '1px solid #eee',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#333',
  },
  settingsBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
  },
  quickStats: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8f8f8',
    borderRadius: 12,
    padding: '12px 0',
  },
  statItem: {
    flex: 1,
    textAlign: 'center' as const,
  },
  statNum: {
    display: 'block',
    fontSize: 24,
    fontWeight: 700,
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  statDivider: {
    width: 1,
    height: 30,
    background: '#ddd',
  },
  
  // Active Trip Section
  activeTripSection: {
    padding: 16,
  },
  activeTripHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
  },
  activeTripCard: {
    background: '#fff',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
    border: '2px solid #4caf50',
  },
  routeInfo: {
    marginBottom: 12,
  },
  routePoint: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  routeDotGreen: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#4caf50',
  },
  routeDotRed: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#f44336',
  },
  routeLabel: {
    fontSize: 11,
    color: '#888',
  },
  routePlace: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
  },
  routeLine: {
    width: 2,
    height: 20,
    background: '#ddd',
    marginLeft: 5,
  },
  tripMeta: {
    display: 'flex',
    gap: 16,
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  passengerList: {
    borderTop: '1px solid #eee',
    paddingTop: 12,
    marginBottom: 12,
  },
  passengerItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    fontSize: 13,
  },
  onboardedBadge: {
    fontSize: 11,
    color: '#4caf50',
    background: '#e8f5e9',
    padding: '2px 8px',
    borderRadius: 10,
  },
  activeActions: {
    display: 'flex',
    gap: 10,
  },

  // Filter Section
  filterSection: {
    padding: '0 16px 12px',
    background: '#fff',
  },
  filterTabs: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 8,
  },
  filterTab: {
    padding: '8px 14px',
    borderRadius: 20,
    border: 'none',
    background: '#f0f0f0',
    fontSize: 13,
    fontWeight: 500,
    color: '#666',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  filterTabActive: {
    background: '#333',
    color: '#fff',
  },

  // Trips List
  tripsList: {
    padding: '0 16px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 0',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#888',
  },
  tripCard: {
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  tripCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripTime: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  tripDate: {
    fontSize: 12,
    color: '#888',
  },
  tripHour: {
    fontSize: 18,
    fontWeight: 700,
    color: '#333',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  tripRoute: {
    marginBottom: 12,
  },
  routeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: '#333',
  },
  routeArrow: {
    marginLeft: 4,
    color: '#ccc',
    fontSize: 12,
  },
  tripInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 13,
    color: '#666',
  },
  pendingBadge: {
    color: '#ff9800',
  },

  // Expanded Details
  tripDetails: {
    borderTop: '1px solid #eee',
    marginTop: 12,
    paddingTop: 12,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  passengerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    fontSize: 13,
    borderBottom: '1px solid #f5f5f5',
  },
  pendingActions: {
    display: 'flex',
    gap: 8,
  },
  approveBtn: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: 'none',
    background: '#4caf50',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 12,
  },
  rejectBtn: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: 'none',
    background: '#f44336',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 12,
  },
  cardActions: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
  },
  expandIndicator: {
    textAlign: 'center' as const,
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    cursor: 'pointer',
  },

  // Action Buttons
  actionBtnConfirm: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 10,
    border: 'none',
    background: '#4caf50',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  actionBtnStart: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 10,
    border: 'none',
    background: '#2196f3',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  actionBtnComplete: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 10,
    border: 'none',
    background: '#4caf50',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  actionBtnChat: {
    padding: '12px 16px',
    borderRadius: 10,
    border: 'none',
    background: '#f5f5f5',
    color: '#333',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  actionBtnReport: {
    padding: '12px 16px',
    borderRadius: 10,
    border: 'none',
    background: '#fff3e0',
    color: '#ff9800',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
}
