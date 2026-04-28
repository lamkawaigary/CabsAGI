// Cabs Carpool - Driver Trips Page
// 司機的行程管理頁面 - 全新版本

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tripService } from '../../services/tripService'
import { useAuth } from '../../context/AuthContext'
import BottomNav from '../../components/BottomNav'
import TripProgressBar from '../../components/TripProgressBar'
import QRScanner from '../../components/QRScanner'
import type { Trip } from '../../types/trip'

export default function DriverTripsPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [showScanner, setShowScanner] = useState(false)
  const [scannerTripId, setScannerTripId] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser?.id) {
      loadUserTrips()
    }
  }, [currentUser?.id])

  const loadUserTrips = async () => {
    try {
      setLoading(true)
      const myTrips = await tripService.getByDriver(currentUser?.id || '')
      setTrips(myTrips || [])
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

  // 根據狀態顯示標籤
  const getStatusLabel = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string }> = {
      'OPEN': { label: '🟢 開放中', color: '#4caf50', bg: '#e8f5e9' },
      'CONFIRMED': { label: '🟡 已確認', color: '#ff9800', bg: '#fff3e0' },
      'IN_PROGRESS': { label: '🔵 行程中', color: '#2196f3', bg: '#e3f2fd' },
      'COMPLETED': { label: '✅ 已完成', color: '#9e9e9e', bg: '#f5f5f5' },
      'CANCELLED': { label: '❌ 已取消', color: '#f44336', bg: '#ffebee' },
      'EXPIRED': { label: '⏰ 已過期', color: '#9e9e9e', bg: '#f5f5f5' },
    }
    return configs[status] || { label: status, color: '#666', bg: '#f5f5f5' }
  }

  // 處理批准乘客
  const handleApprove = async (tripId: string, oderId: string) => {
    try {
      await tripService.approvePassenger(tripId, oderId)
      loadUserTrips()
      alert('已批准乘客')
    } catch (error: any) {
      alert(error.message || '無法批准')
    }
  }

  // 處理拒絕乘客
  const handleReject = async (tripId: string, oderId: string) => {
    if (!confirm('確定要拒絕這位乘客嗎？')) return
    try {
      await tripService.rejectPassenger(tripId, oderId)
      loadUserTrips()
      alert('已拒絕乘客')
    } catch (error: any) {
      alert(error.message || '無法拒絕')
    }
  }

  // 獲取可用的動作按鈕
  const getActionButtons = (trip: Trip) => {
    const buttons: { label: string; action: () => void; style: any }[] = []
    const status = trip.status

    // OPEN -> CONFIRMED
    if (status === 'OPEN') {
      buttons.push({ 
        label: '✅ 確認出發', 
        action: () => tripService.updateStatus(trip.id, 'CONFIRMED').then(() => { loadUserTrips(); alert('已確認出發') }), 
        style: { background: '#ff9800' } 
      })
    }

    // CONFIRMED -> IN_PROGRESS
    if (status === 'CONFIRMED') {
      buttons.push({ 
        label: '🚗 開始行程', 
        action: () => tripService.updateStatus(trip.id, 'IN_PROGRESS').then(() => { loadUserTrips(); alert('已開始行程') }), 
        style: { background: '#2196f3' } 
      })
    }

    // IN_PROGRESS -> COMPLETED
    if (status === 'IN_PROGRESS') {
      buttons.push({ 
        label: '📷 掃描上車', 
        action: () => { setScannerTripId(trip.id); setShowScanner(true) }, 
        style: { background: '#9c27b0' } 
      })
      buttons.push({ 
        label: '✅ 完成行程', 
        action: () => tripService.updateStatus(trip.id, 'COMPLETED').then(() => { loadUserTrips(); alert('行程已完成') }), 
        style: { background: '#4caf50' } 
      })
    }

    // Cancel button for non-ended trips
    if (status !== 'CANCELLED' && status !== 'COMPLETED' && status !== 'EXPIRED') {
      buttons.push({ 
        label: '❌ 取消', 
        action: () => {
          if (confirm('確定要取消這個行程嗎？')) {
            tripService.updateStatus(trip.id, 'CANCELLED').then(() => { loadUserTrips(); alert('已取消行程') })
          }
        }, 
        style: { background: '#f44336' } 
      })
    }

    return buttons
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
        <button style={styles.backBtn} onClick={() => navigate('/driver-home')}>←</button>
        <div style={styles.title}>🚗 我的行程</div>
        <div style={{width: 40}} />
      </header>

      {/* Content */}
      <div style={styles.content}>
        {trips.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🚗</div>
            <div>暫時沒有發布行程</div>
            <div style={styles.emptySubtext}>創建行程開始賺取收益</div>
            <button 
              style={styles.createBtn}
              onClick={() => navigate('/create-trip')}
            >
              創建行程
            </button>
          </div>
        ) : (
          trips.map(trip => {
            const status = getStatusLabel(trip.status)
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
                  <span>💺 剩餘：{trip.availableSeats || 0} / {trip.totalSeats || 0}</span>
                  <span>👥 已加入：{trip.passengers?.length || 0} 位</span>
                </div>

                {/* Pending Passengers */}
                {trip.pendingPassengers && trip.pendingPassengers.length > 0 && (
                  <div style={styles.pendingSection}>
                    <div style={styles.pendingTitle}>⏳ 待批准乘客：</div>
                    {trip.pendingPassengers.map(p => (
                      <div key={p.oderId} style={styles.pendingItem}>
                        <span style={styles.pendingName}>{p.name}</span>
                        <div style={styles.pendingActions}>
                          <button 
                            style={{...styles.smallBtn, background: '#4caf50'}}
                            onClick={() => handleApprove(trip.id, p.oderId)}
                          >
                            批准
                          </button>
                          <button 
                            style={{...styles.smallBtn, background: '#f44336'}}
                            onClick={() => handleReject(trip.id, p.oderId)}
                          >
                            拒絕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Passengers List */}
                {trip.passengers && trip.passengers.length > 0 && (
                  <div style={styles.passengersSection}>
                    <div style={styles.passengersTitle}>✅ 已批准乘客：</div>
                    {trip.passengers.map(p => (
                      <div key={p.oderId} style={styles.passengerItem}>
                        <span style={styles.passengerName}>{p.name}</span>
                        <span style={styles.passengerStatus}>
                          {p.onboarded ? '🔵 已上車' : p.confirmed ? '✅ 已確認' : '⏳ 待出發'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Progress Bar */}
                <TripProgressBar 
                  trip={trip} 
                  currentUserId={currentUser?.id || ''}
                  currentUserRole="driver"
                  onStatusChange={loadUserTrips}
                />
                
                {/* Action Buttons */}
                <div style={styles.actions}>
                  {actions.map((btn, idx) => (
                    <button 
                      key={idx}
                      onClick={btn.action}
                      style={{...styles.actionBtn, ...btn.style}}
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

      {/* QR Scanner Modal */}
      {showScanner && scannerTripId && (
        <div style={styles.modalOverlay} onClick={() => setShowScanner(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowScanner(false)}>✕</button>
            <QRScanner 
              tripId={scannerTripId}
              onScanSuccess={() => {
                loadUserTrips()
                setShowScanner(false)
              }}
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
  createBtn: {
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
  pendingSection: {
    background: '#fff3e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e65100',
    marginBottom: 8,
  },
  pendingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid #ffe0b2',
  },
  pendingName: {
    fontSize: 13,
    color: '#4a3728',
  },
  pendingActions: {
    display: 'flex',
    gap: 6,
  },
  smallBtn: {
    padding: '4px 10px',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 11,
    cursor: 'pointer',
  },
  passengersSection: {
    background: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  passengersTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#2e7d32',
    marginBottom: 8,
  },
  passengerItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
  },
  passengerName: {
    fontSize: 13,
    color: '#4a3728',
  },
  passengerStatus: {
    fontSize: 12,
    color: '#666',
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