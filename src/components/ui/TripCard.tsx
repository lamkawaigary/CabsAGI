// Cabs Carpool - TripCard Component
// 統一路程卡片展示

import { colors, radius, shadows } from '../../styles/designSystem'
import Badge, { getStatusBadge } from './Badge'
import Card from './Card'
import type { Trip } from '../../types/trip'

interface TripCardProps {
  trip: Trip
  onAction?: (trip: Trip) => void
  actionLabel?: string
  actionIcon?: string
  showDriver?: boolean
}

export default function TripCard({ 
  trip, 
  onAction, 
  actionLabel = '查看詳情',
  actionIcon = '→',
  showDriver = true,
}: TripCardProps) {
  const statusBadge = getStatusBadge(trip.status)

  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <Card style={{ marginBottom: 12 }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {showDriver && (
            <span style={styles.driverName}>👤 {trip.driverName}</span>
          )}
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>
        <span style={styles.time}>{formatDateTime(trip.departureTime)}</span>
      </div>

      {/* Route */}
      <div style={styles.route}>
        <div style={styles.routePoint}>
          <span style={styles.routeDot}>●</span>
          <span style={styles.placeName}>{trip.route.pickup.placeName}</span>
        </div>
        <div style={styles.routeLine}>↓</div>
        <div style={styles.routePoint}>
          <span style={{...styles.routeDot, color: colors.primary}}>●</span>
          <span style={styles.placeName}>{trip.route.dropoff.placeName}</span>
        </div>
      </div>

      {/* Info */}
      <div style={styles.info}>
        <span>💺 {trip.passengers?.length || 0}/{trip.totalSeats} 座位</span>
        {trip.notes && <span style={styles.notes}>📝 {trip.notes}</span>}
      </div>

      {/* Action */}
      {onAction && (
        <button 
          onClick={() => onAction(trip)} 
          style={styles.actionBtn}
        >
          {actionIcon} {actionLabel}
        </button>
      )}
    </Card>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  driverName: {
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
    color: colors.success,
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
  info: {
    display: 'flex',
    gap: 12,
    fontSize: 13,
    color: colors.textSecondary,
    flexWrap: 'wrap' as const,
  },
  notes: {
    color: colors.textLight,
  },
  actionBtn: {
    width: '100%',
    marginTop: 12,
    padding: '10px 16px',
    background: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: radius.sm,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
}