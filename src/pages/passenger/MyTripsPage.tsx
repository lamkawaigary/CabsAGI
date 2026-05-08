// Cabs Carpool - Passenger My Trips Page v7.0
// Material Symbols Design with Design System

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tripService } from '../../services/tripService'
import { chatService } from '../../services/chatService'
import { useAuth } from '../../context/AuthContext'
import BottomNav from '../../components/BottomNav'
import TripProgressBar from '../../components/TripProgressBar'
import QRPassenger from '../../components/QRPassenger'
import type { Trip } from '../../types/trip'
import { colors, radius, shadows, spacing } from '../../styles/designSystem'

// Material Symbol Icon Component
const Icon = ({ name, filled = false, style = {} }: { name: string; filled?: boolean; style?: React.CSSProperties }) => (
  <span style={{
    fontFamily: "'Material Symbols Outlined'",
    fontVariationSettings: filled ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
    fontSize: 20,
    ...style
  }}>
    {name}
  </span>
)

export default function MyTripsPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

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
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const getPassengerStatus = (trip: Trip): 'pending' | 'approved' | 'confirmed' | 'onboarded' | 'rejected' => {
    const passengerId = currentUser?.id

    if (trip.rejectedPassengers?.includes(passengerId || '')) return 'rejected'
    if (trip.passengers?.some(p => p.passengerId === passengerId)) {
      const passenger = trip.passengers?.find(p => p.passengerId === passengerId)
      if (passenger?.onboarded) return 'onboarded'
      if (trip.confirmedByPassengers?.includes(passengerId || '')) return 'confirmed'
      return 'approved'
    }
    if (trip.pendingPassengers?.some(p => p.passengerId === passengerId)) return 'pending'

    return 'pending'
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string; icon: string }> = {
      pending: { label: '待批准', color: '#b45309', bg: '#fef3c7', icon: 'schedule' },
      approved: { label: '已批准', color: '#15803d', bg: '#dcfce7', icon: 'check_circle' },
      confirmed: { label: '已確認', color: '#15803d', bg: '#dcfce7', icon: 'task_alt' },
      onboarded: { label: '已上車', color: '#1d4ed8', bg: '#dbeafe', icon: 'airline_seat_recline_normal' },
      rejected: { label: '已拒絕', color: '#dc2626', bg: '#fee2e2', icon: 'cancel' },
    }
    return configs[status] || configs.pending
  }

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

  const handleConfirm = async (trip: Trip) => {
    try {
      await tripService.confirm(trip.id, currentUser!.id)
      loadJoinedTrips()
      alert('已確認乘車')
    } catch (error: any) {
      alert(error.message || '無法確認')
    }
  }

  const getActionButtons = (trip: Trip) => {
    const pStatus = getPassengerStatus(trip)
    const buttons: { label: string; action: () => void; style: React.CSSProperties; disabled?: boolean }[] = []

    switch (pStatus) {
      case 'pending':
        buttons.push({
          label: '等待司機批准',
          action: () => { },
          style: { background: colors.surfaceContainer, color: colors.textSecondary, cursor: 'default' },
          disabled: true
        })
        break

      case 'approved':
      case 'confirmed':
        if (trip.status === 'OPEN' || trip.status === 'CONFIRMED') {
          buttons.push({
            label: '離開行程',
            action: () => handleLeave(trip),
            style: { background: colors.warning, color: colors.white }
          })
        }
        if (trip.status === 'CONFIRMED' && pStatus === 'approved') {
          buttons.push({
            label: '確認乘車',
            action: () => handleConfirm(trip),
            style: { background: colors.success, color: colors.white }
          })
        }
        break

      case 'onboarded':
        buttons.push({
          label: '已上車',
          action: () => { },
          style: { background: colors.secondary, color: colors.white, cursor: 'default' },
          disabled: true
        })
        break

      case 'rejected':
        buttons.push({
          label: '已拒絕',
          action: () => { },
          style: { background: colors.error, color: colors.white, cursor: 'default' },
          disabled: true
        })
        break
    }

    return buttons
  }

  const canShowQR = (trip: Trip) => {
    const pStatus = getPassengerStatus(trip)
    return (trip.status === 'CONFIRMED' || trip.status === 'IN_PROGRESS') &&
      ['approved', 'confirmed', 'onboarded'].includes(pStatus)
  }

  const renderTrip = (trip: Trip) => {
    const pStatus = getPassengerStatus(trip)
    const status = getStatusConfig(pStatus)
    const actions = getActionButtons(trip)

    return (
      <div key={trip.id} style={styles.card}>
        {/* Decorative corner */}
        <div style={styles.cardDecor} />

        {/* Header Row */}
        <div style={styles.cardHeader}>
          <div style={styles.statusChip}>
            <Icon name={status.icon} style={{ fontSize: 14, color: status.color }} />
            <span style={{ ...styles.statusText, color: status.color }}>{status.label}</span>
          </div>
          <span style={styles.time}>{formatDateTime(trip.departureTime)}</span>
        </div>

        {/* Route */}
        <div style={styles.routeSection}>
          <div style={styles.routeDots}>
            <div style={styles.routeDot} />
            <div style={styles.routeLine} />
            <div style={styles.routeDotEnd} />
          </div>
          <div style={styles.routePlaces}>
            <div>
              <div style={styles.placeName}>{trip.route.pickup?.placeName || '未知上車點'}</div>
              <div style={styles.placeTime}>上車</div>
            </div>
            <div style={{ marginTop: 24 }}>
              <div style={styles.placeName}>{trip.route.dropoff?.placeName || '未知下车点'}</div>
              <div style={styles.placeTime}>目的地</div>
            </div>
          </div>
        </div>

        {/* Driver & Seats Info */}
        <div style={styles.infoRow}>
          <div style={styles.driverInfo}>
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(trip.driverName || '司機')}&background=dee8ff&color=1d4ed8`}
              alt={trip.driverName}
              style={styles.driverAvatar}
            />
            <div>
              <div style={styles.driverName}>
                {trip.driverName}
                <Icon name="verified" style={{ fontSize: 14, color: colors.primary, marginLeft: 4 }} />
              </div>
              <div style={styles.driverMeta}>司機</div>
            </div>
          </div>
          <div style={styles.seatBadge}>
            <Icon name="airline_seat_recline_normal" style={{ fontSize: 16 }} />
            <span>{trip.availableSeats || 0}/{trip.totalSeats || 0} 座位</span>
          </div>
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
            <Icon name="qr_code" style={{ fontSize: 18 }} />
            查看上車令牌
          </button>
        )}

        {/* Action Buttons */}
        <div style={styles.actions}>
          {actions.map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.action}
              style={{ ...styles.actionBtn, ...btn.style }}
              disabled={btn.disabled}
            >
              {btn.label}
            </button>
          ))}

          <button
            onClick={() => {
              const tripData = trip as any
              const roomId = tripData.chatRoomId || trip.id
              navigate(`/chat/${roomId}`)
            }}
            style={{ ...styles.actionBtn, background: colors.secondary, color: colors.white }}
          >
            <Icon name="chat" style={{ fontSize: 16 }} />
            聊天
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <Icon name="progress_activity" style={{ fontSize: 32, color: colors.tertiary }} />
          <p>載入中...</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Top App Bar */}
      <header style={styles.appBar}>
        <button style={styles.menuBtn} onClick={() => setDrawerOpen(true)}>
          <Icon name="menu" style={{ color: colors.primary }} />
        </button>
        <h1 style={styles.logo}>OpenCabs</h1>
        <div style={styles.avatar} onClick={() => navigate('/profile')}>
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'U')}&background=ffddb8&color=855300`}
            alt="User"
          />
        </div>
      </header>


      {/* Side Drawer */}
      {drawerOpen && (
        <>
          <div style={styles.drawerOverlay} onClick={() => setDrawerOpen(false)} />
          <div style={styles.drawer}>
            <div style={styles.drawerHeader}>
              <h2 style={styles.drawerLogo}>OpenCabs</h2>
              <button style={styles.drawerClose} onClick={() => setDrawerOpen(false)}>
                <Icon name="close" style={{ fontSize: 24 }} />
              </button>
            </div>
            <nav style={styles.drawerNav}>
              <button style={styles.drawerItem} onClick={() => { setDrawerOpen(false); navigate('/passenger-home') }}>
                <Icon name="home" style={{ fontSize: 20 }} />
                <span>首頁</span>
              </button>
              <button style={styles.drawerItem} onClick={() => { setDrawerOpen(false); navigate('/browse-trips') }}>
                <Icon name="search" style={{ fontSize: 20 }} />
                <span>瀏覽行程</span>
              </button>
              <button style={styles.drawerItem} onClick={() => { setDrawerOpen(false); navigate('/my-requests') }}>
                <Icon name="assignment" style={{ fontSize: 20 }} />
                <span>我的需求</span>
              </button>
              <button style={styles.drawerItem} onClick={() => { setDrawerOpen(false); navigate('/my-trips') }}>
                <Icon name="directions_car" style={{ fontSize: 20 }} />
                <span>我的行程</span>
              </button>
              <button style={styles.drawerItem} onClick={() => { setDrawerOpen(false); navigate('/chats') }}>
                <Icon name="chat" style={{ fontSize: 20 }} />
                <span>收件箱</span>
              </button>
              <button style={styles.drawerItem} onClick={() => { setDrawerOpen(false); navigate('/profile') }}>
                <Icon name="person" style={{ fontSize: 20 }} />
                <span>個人資料</span>
              </button>
            </nav>
          </div>
        </>
      )}

      {/* Content */}
      <main style={styles.main}>
        {trips.length === 0 ? (
          <div style={styles.empty}>
            <Icon name="directions_car" style={{ fontSize: 48, color: colors.tertiary }} />
            <p>暫時沒有參與的行程</p>
            <p style={styles.emptySubtext}>瀏覽行程並加入以開始</p>
            <button
              style={styles.browseBtn}
              onClick={() => navigate('/browse-trips')}
            >
              <Icon name="search" style={{ fontSize: 18 }} />
              瀏覽行程
            </button>
          </div>
        ) : (
          <div style={styles.cardList}>
            {trips.map(renderTrip)}
          </div>
        )}
      </main>

      {/* QR Modal */}
      {showQRModal && selectedTrip && (
        <div style={styles.modalOverlay} onClick={() => setShowQRModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowQRModal(false)}>
              <Icon name="close" style={{ fontSize: 24, color: colors.textSecondary }} />
            </button>
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

// ============ STYLES ============
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: colors.background,
    paddingBottom: 140,
  },
  appBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    padding: '0 20px',
    height: 64,
    background: 'rgba(255,251,249,0.9)',
    backdropFilter: 'blur(12px)',
    borderBottom: `1px solid ${colors.outlineVariant}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuBtn: {
    padding: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '50%',
  },
  logo: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 20,
    fontWeight: 800,
    color: colors.primary,
    fontStyle: 'italic',
    letterSpacing: '-0.02em',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    overflow: 'hidden',
    border: `2px solid ${colors.outlineVariant}`,
  },
  drawerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 100,
  },
  drawer: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 280,
    height: '100%',
    background: colors.surface,
    boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
    zIndex: 101,
    padding: '20px 0',
  },
  drawerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px 20px',
    borderBottom: `1px solid ${colors.outlineVariant}`,
  },
  drawerLogo: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 20,
    fontWeight: 800,
    color: colors.primary,
    fontStyle: 'italic',
    letterSpacing: '-0.02em',
  },
  drawerClose: {
    padding: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '50%',
  },
  drawerNav: {
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  drawerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 16px',
    borderRadius: radius.lg,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 500,
    color: colors.textPrimary,
    transition: 'background 0.2s',
  },
  main: {
    paddingTop: 80,
    paddingLeft: spacing.container,
    paddingRight: spacing.container,
  },
  loading: {
    textAlign: 'center' as const,
    padding: 60,
    color: colors.textSecondary,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: colors.textSecondary,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.tertiary,
    marginTop: 4,
  },
  browseBtn: {
    marginTop: 16,
    padding: '12px 24px',
    background: `linear-gradient(to right, ${colors.primary}, ${colors.primaryDark})`,
    color: colors.white,
    border: 'none',
    borderRadius: radius.xl,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: shadows.fab,
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  card: {
    background: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.lg,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    boxShadow: shadows.card,
  },
  cardDecor: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    width: 96,
    height: 96,
    background: `${colors.primary}15`,
    borderRadius: '0 0 0 96px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statusChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: radius.full,
    background: colors.surfaceContainer,
  },
  statusText: {
    fontSize: 13,
    fontWeight: 600,
  },
  time: {
    fontSize: 13,
    color: colors.tertiary,
  },
  routeSection: {
    display: 'flex',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  routeDots: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    border: `2px solid ${colors.secondary}`,
    background: colors.surfaceContainerLowest,
    zIndex: 10,
  },
  routeLine: {
    width: 2,
    height: 40,
    background: colors.surfaceContainerHigh,
    marginTop: -2,
    marginBottom: -2,
  },
  routeDotEnd: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: colors.secondary,
    zIndex: 10,
  },
  routePlaces: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing.xxl,
  },
  placeName: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  placeTime: {
    fontSize: 12,
    color: colors.tertiary,
    marginTop: 2,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTop: `1px solid ${colors.surfaceContainerHigh}`,
    marginBottom: spacing.lg,
  },
  driverInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: `2px solid ${colors.surfaceContainerHigh}`,
  },
  driverName: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
    display: 'flex',
    alignItems: 'center',
  },
  driverMeta: {
    fontSize: 12,
    color: colors.tertiary,
    marginTop: 2,
  },
  seatBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: colors.textSecondary,
    background: colors.surfaceContainer,
    padding: '8px 12px',
    borderRadius: radius.sm,
  },
  qrBtn: {
    width: '100%',
    padding: '12px 16px',
    background: colors.surfaceContainerLow,
    color: colors.primary,
    border: `2px solid ${colors.primary}`,
    borderRadius: radius.md,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  actions: {
    display: 'flex',
    gap: spacing.sm,
    flexWrap: 'wrap' as const,
  },
  actionBtn: {
    flex: 1,
    minWidth: 80,
    padding: '10px 12px',
    color: colors.white,
    border: 'none',
    borderRadius: radius.sm,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
    background: colors.white,
    borderRadius: radius.lg,
    maxWidth: 360,
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto' as const,
    position: 'relative' as const,
    padding: 20,
  },
  modalClose: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    zIndex: 1,
  },
}
