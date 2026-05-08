// Cabs Carpool - Passenger Requests Page v7.0
// Material Symbols Design with Design System

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestService } from '../../services/tripService'
import { chatService } from '../../services/chatService'
import { useAuth } from '../../context/AuthContext'
import BottomNav from '../../components/BottomNav'
import type { PassengerRequest } from '../../types/trip'
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

export default function PassengerRequestsPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [requests, setRequests] = useState<PassengerRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentUser?.role === 'passenger') {
      loadUserRequests()
    } else {
      setLoading(false)
    }
  }, [currentUser])

  const loadUserRequests = async () => {
    try {
      setLoading(true)
      const myRequests = await requestService.getByPassenger(currentUser?.id || '')
      setRequests(myRequests || [])
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPickup = (req: PassengerRequest): string => req.pickup?.placeName || '未知'
  const getDropoff = (req: PassengerRequest): string => req.dropoff?.placeName || '未知'

  const renderRequest = (req: PassengerRequest) => {
    const isOpen = req.status === 'OPEN'

    return (
      <div key={req.id} style={styles.card}>
        {/* Decorative corner */}
        <div style={styles.cardDecor} />

        {/* Header Row */}
        <div style={styles.cardHeader}>
          <div style={{ ...styles.statusChip, ...(isOpen ? styles.statusChipOpen : styles.statusChipClosed) }}>
            <Icon
              name={isOpen ? 'check_circle' : 'cancel'}
              style={{ fontSize: 14, color: isOpen ? '#15803d' : '#6b7280' }}
            />
            <span style={{ color: isOpen ? '#15803d' : '#6b7280' }}>
              {isOpen ? '開放中' : '已關閉'}
            </span>
          </div>
          <span style={styles.time}>{req.departureDate || '時間待定'}</span>
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
              <div style={styles.placeName}>{getPickup(req)}</div>
              <div style={styles.placeTime}>上車</div>
            </div>
            <div style={{ marginTop: 24 }}>
              <div style={styles.placeName}>{getDropoff(req)}</div>
              <div style={styles.placeTime}>目的地</div>
            </div>
          </div>
        </div>

        {/* Info Row */}
        <div style={styles.infoRow}>
          <div style={styles.infoItem}>
            <Icon name="group" style={{ fontSize: 16, color: colors.tertiary }} />
            <span>{req.passengerCount || 1} 位乘客</span>
          </div>
          <div style={styles.infoItem}>
            <Icon name="directions_car" style={{ fontSize: 16, color: colors.tertiary }} />
            <span>{req.interestedDrivers?.length || 0} 位司機感興趣</span>
          </div>
        </div>

        {/* Notes */}
        {req.notes && (
          <div style={styles.notes}>
            <Icon name="notes" style={{ fontSize: 16, color: colors.tertiary }} />
            <span>{req.notes}</span>
          </div>
        )}

        {/* Tags */}
        {req.tags && req.tags.length > 0 && (
          <div style={styles.tags}>
            {req.tags.map(tag => (
              <span key={tag} style={styles.tag}>{tag}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button
            style={styles.editBtn}
            onClick={() => navigate(`/edit-request/${req.id}`)}
          >
            <Icon name="edit" style={{ fontSize: 16 }} />
            編輯
          </button>
          <button
            style={styles.chatBtn}
            onClick={async () => {
              try {
                const roomId = await chatService.createRequestChatRoom({
                  requestId: req.id,
                  passengerId: req.passengerId,
                  passengerName: req.passengerName,
                  passengerPhone: req.passengerPhone,
                  pickup: getPickup(req),
                  dropoff: getDropoff(req),
                  departureDate: req.departureDate,
                })
                navigate(`/chat/${roomId}`)
              } catch (error) {
                console.error('Error:', error)
                alert('無法開啟聊天室')
              }
            }}
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
        <button style={styles.backBtn} onClick={() => navigate('/passenger-home')}>
          <Icon name="arrow_back" style={{ color: colors.primary }} />
        </button>
        <h1 style={styles.title}>我的需求</h1>
        <button style={styles.addBtn} onClick={() => navigate('/create-request')}>
          <Icon name="add" style={{ fontSize: 20, color: colors.white }} />
        </button>
      </header>

      {/* Content */}
      <main style={styles.main}>
        {requests.length === 0 ? (
          <div style={styles.empty}>
            <Icon name="assignment" style={{ fontSize: 48, color: colors.tertiary }} />
            <p>暫時沒有需求</p>
            <p style={styles.emptySubtext}>發布你的第一個乘車需求吧！</p>
            <button
              style={styles.createBtn}
              onClick={() => navigate('/create-request')}
            >
              <Icon name="add" style={{ fontSize: 18 }} />
              發布需求
            </button>
          </div>
        ) : (
          <div style={styles.cardList}>
            {requests.map(renderRequest)}
          </div>
        )}
      </main>

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
  backBtn: {
    padding: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '50%',
  },
  title: {
    fontSize: 17,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: colors.primary,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
  },
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: colors.textSecondary,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.tertiary,
    marginTop: 4,
  },
  createBtn: {
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
    flexDirection: 'column' as const,
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
    fontSize: 13,
    fontWeight: 600,
  },
  statusChipOpen: {
    background: colors.successBg,
  },
  statusChipClosed: {
    background: colors.surfaceContainer,
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
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: colors.textSecondary,
  },
  notes: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    fontSize: 13,
    color: colors.textSecondary,
    background: colors.surfaceContainerLow,
    padding: '10px 12px',
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tag: {
    padding: '4px 10px',
    background: colors.primaryLight,
    color: colors.primaryDark,
    borderRadius: radius.full,
    fontSize: 12,
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    borderTop: `1px solid ${colors.surfaceContainerHigh}`,
  },
  editBtn: {
    flex: 1,
    padding: '10px 12px',
    background: colors.surfaceContainer,
    color: colors.textSecondary,
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
  chatBtn: {
    flex: 1,
    padding: '10px 12px',
    background: colors.secondary,
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
}
