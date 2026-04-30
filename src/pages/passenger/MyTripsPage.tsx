// Cabs Carpool - Passenger My Trips Page
// 乘客的行程管理頁面 - 全新版本

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tripService } from '../../services/tripService'
import { useAuth } from '../../context/AuthContext'
import BottomNav from '../../components/BottomNav'
import TripProgressBar from '../../components/TripProgressBar'
import QRPassenger from '../../components/QRPassenger'
import type { Trip, TripStatus } from '../../types/trip'

export default function MyTripsPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)

  useEffect(() => {
    if (currentUser?.id) {
      loadJoinedTrips()
    }
  }, [currentUser?.id])

  const loadJoinedTrips = async () => {
    if (!currentUser?.id) return
    
    try {
      setLoading(true)
      const joined = await tripService.getByPassenger(currentUser.id)
      setTrips(joined || [])
    } catch (error) {
      console.error('Error loading trips:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  // 獲取乘客在行程中的狀態
  const getPassengerStatus = (trip: Trip): 'pending' | 'approved' | 'confirmed' | 'onboarded' | 'rejected' | 'no_show' | 'left' => {
    const passengerId = currentUser?.id
    
    if (trip.rejectedPassengers?.includes(passengerId || '')) return 'rejected'
    if (trip.noShowPassengers?.some(n => n.passengerId === passengerId)) return 'no_show'
    if (trip.leftPassengers?.some(l => l.passengerId === passengerId)) return 'left'
    if (trip.passengers?.some(p => p.passengerId === passengerId)) {
      const passenger = trip.passengers?.find(p => p.passengerId === passengerId)
      if (passenger?.onboarded) return 'onboarded'
      if (trip.confirmedByPassengers?.includes(passengerId || '')) return 'confirmed'
      return 'approved'
    }
    if (trip.pendingPassengers?.some(p => p.passengerId === passengerId)) return 'pending'
    
    return 'pending'
  }

  // 根據狀態顯示標籤
  const getStatusLabel = (trip: Trip) => {
    const pStatus = getPassengerStatus(trip)
    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: '⏳ 待批准', color: '#ff9800', bg: '#fff3e0' },
      approved: { label: '🟢 已批准', color: '#4caf50', bg: '#e8f5e9' },
      confirmed: { label: '🟡 已確認', color: '#4caf50', bg: '#e8f5e9' },
      onboarded: { label: '🔵 已上車', color: '#2196f3', bg: '#e3f2fd' },
      rejected: { label: '❌ 已拒絕', color: '#f44336', bg: '#ffebee' },
      no_show: { label: '❌ 未到', color: '#f44336', bg: '#ffebee' },
      left: { label: '🚪 已離開', color: '#9e9e9e', bg: '#f5f5f5' },
    }
    return statusConfig[pStatus] || { label: '未知', color: '#666', bg: '#f5f5f5' }
  }

  // 處理離開行程
  const handleLeave = async (trip: Trip) => {
    if (!confirm('確定要離開這個行程嗎？')) return
    
    try {
      await tripService.passengerLeave(trip.id, currentUser!.id)
      loadJoinedTrips()
      alert('已離開行程')
    } catch (error: any) {
      alert(error.message || '無法離開行程')
    }
  }

  // 處理確認乘車
  const handleConfirm = async (trip: Trip) => {
    try {
      await tripService.confirm(trip.id, currentUser!.id)
      loadJoinedTrips()
      alert('已確認乘車')
    } catch (error: any) {
      alert(error.message || '無法確認')
    }
  }

  // 根據狀態顯示動作按鈕
  const getActionButtons = (trip: Trip) => {
    const pStatus = getPassengerStatus(trip)
    const buttons: { label: string; action: () => void; style: any; disabled?: boolean }[] = []

    switch (pStatus) {
      case 'pending':
        buttons.push({ label: '⏳ 等待司機批准', action: () => {}, style: { background: '#ff9800', cursor: 'default' }, disabled: true })
        break
      
      case 'approved':
      case 'confirmed':
        if (trip.status === 'OPEN' || trip.status === 'CONFIRMED') {
          buttons.push({ label: '🚪 離開行程', action: () => handleLeave(trip), style: { background: '#ff9800' } })
        }
        if (trip.status === 'CONFIRMED' && pStatus === 'approved') {
          buttons.push({ label: '✅ 確認乘車', action: () => handleConfirm(trip), style: { background: '#4caf50' } })
        }
        break
      
      case 'onboarded':
        buttons.push({ label: '🔵 已上車', action: () => {}, style: { background: '#2196f3', cursor: 'default' }, disabled: true })
        break
      
      case 'rejected':
        buttons.push({ label: '❌ 已拒絕', action: () => {}, style: { background: '#f44336', cursor: 'default' }, disabled: true })
        break
      
      case 'no_show':
        buttons.push({ label: '❌ 已標記未到', action: () => {}, style: { background: '#9e9e9e', cursor: 'default' }, disabled: true })
        break
      
      case 'left':
        buttons.push({ label: '🚪 已離開', action: () => {}, style: { background: '#9e9e9e', cursor: 'default' }, disabled: true })
        break
    }

    return buttons
  }

  // 是否顯示 QR Code 按鈕
  const canShowQR = (trip: Trip) => {
    const pStatus = getPassengerStatus(trip)
    return (trip.status === 'CONFIRMED' || trip.status === 'IN_PROGRESS' || trip.status === 'OPEN') && 
           ['approved', 'confirmed', 'onboarded'].includes(pStatus)
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>載入中...</div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/passenger-home')}>←</button>
        <div style={styles.title}>🚗 我的行程</div>
        <div style={{width: 40}} />
      </header>

      {/* Content */}
      <div style={styles.content}>
        {trips.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🚗</div>
            <div>暫時沒有參與的行程</div>
            <div style={styles.emptySubtext}>瀏覽行程並加入以開始</div>
            <button 
              style={styles.browseBtn}
              onClick={() => navigate('/browse-trips')}
            >
              瀏覽行程
            </button>
          </div>
        ) : (
          trips.map(trip => {
            const status = getStatusLabel(trip)
            const pStatus = getPassengerStatus(trip)
            const actions = getActionButtons(trip)
            
            return (
              <div key={trip.id} style={styles.tripCard}>
                {/* Status Badge */}
                <div style={styles.cardHeader}>
                  <span style={{...styles.statusBadge, background: status.bg, color: status.color}}>
                    {status.label}
                  </span>
                  <span style={styles.time}>{formatDateTime(trip.departureTime)}</span>
                </div>
                
                {/* Route */}
                <div style={styles.route}>
                  <span>📍</span>
                  <span style={styles.routeText}>{trip.route?.pickup?.placeName || '未知上車點'}</span>
                  <span style={styles.routeArrow}>→</span>
                  <span style={styles.routeText}>{trip.route?.dropoff?.placeName || '未知下车点'}</span>
                </div>
                
                {/* Info */}
                <div style={styles.info}>
                  <span>👤 司機：{trip.driverName || '未知'}</span>
                  <span>💺 座位：{trip.availableSeats || 0}/{trip.totalSeats || 0}</span>
                </div>
                
                {/* Progress Bar */}
                <TripProgressBar 
                  trip={trip} 
                  currentUserId={currentUser?.id || ''}
                  currentUserRole="passenger"
                  onStatusChange={loadJoinedTrips}
                />
                
                {/* QR Code Button */}
                {canShowQR(trip) && (
                  <button 
                    style={styles.qrBtn}
                    onClick={() => {
                      setSelectedTrip(trip)
                      setShowQRModal(true)
                    }}
                  >
                    🎫 查看上車令牌
                  </button>
                )}
                
                {/* Action Buttons */}
                <div style={styles.actions}>
                  {actions.map((btn, idx) => (
                    <button 
                      key={idx}
                      onClick={btn.action}
                      style={{...styles.actionBtn, ...btn.style}}
                      disabled={btn.disabled}
                    >
                      {btn.label}
                    </button>
                  ))}
                  
                  {/* Chat button */}
                  <button 
                    onClick={() => navigate(`/chat/${trip.id}`)}
                    style={{...styles.actionBtn, background: '#e07b4c'}}
                  >
                    💬 聊天
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* QR Code Modal */}
      {showQRModal && selectedTrip && (
        <div style={styles.modalOverlay} onClick={() => setShowQRModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowQRModal(false)}>✕</button>
            <QRPassenger 
              tripId={selectedTrip.id}
              passengerId={currentUser?.id || ''}
              passengerName={currentUser?.name || ''}
            />
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#fff9f5',
    paddingBottom: 80,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: '#fff',
    borderBottom: '1px solid #f0e0d6',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    color: '#4a3728',
    cursor: 'pointer',
  },
  title: {
    fontSize: 17,
    fontWeight: 600,
    color: '#4a3728',
  },
  content: {
    padding: 16,
  },
  loading: {
    textAlign: 'center' as const,
    padding: 40,
    color: '#8b7355',
  },
  empty: {
    textAlign: 'center' as const,
    padding: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8b7355',
    marginTop: 8,
    marginBottom: 20,
  },
  browseBtn: {
    padding: '12px 24px',
    background: '#e07b4c',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  tripCard: {
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  time: {
    fontSize: 13,
    color: '#8b7355',
  },
  route: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    fontSize: 14,
  },
  routeText: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  routeArrow: {
    color: '#e07b4c',
  },
  info: {
    display: 'flex',
    gap: 16,
    fontSize: 13,
    color: '#8b7355',
    marginBottom: 12,
  },
  qrBtn: {
    width: '100%',
    padding: '12px 16px',
    background: '#fff9f5',
    color: '#e07b4c',
    border: '2px solid #e07b4c',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 12,
  },
  actions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  actionBtn: {
    flex: 1,
    minWidth: 80,
    padding: '10px 12px',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modalContent: {
    background: '#fff',
    borderRadius: 16,
    maxWidth: 360,
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto' as const,
    position: 'relative' as const,
  },
  modalClose: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    background: 'none',
    border: 'none',
    fontSize: 20,
    color: '#8b7355',
    cursor: 'pointer',
    zIndex: 1,
  },
}