// Cabs Carpool - Trip Progress Bar Component v2.0
// Improved UI with Design System

import type { Trip, TripStatus } from '../types/trip'
import { tripService } from '../services/tripService'
import { colors, radius } from '../styles/designSystem'

interface TripProgressBarProps {
  trip: Trip
  currentUserId: string
  currentUserRole: 'driver' | 'passenger'
  onStatusChange?: () => void
}

export default function TripProgressBar({ 
  trip, 
  currentUserId, 
  currentUserRole,
  onStatusChange 
}: TripProgressBarProps) {
  
  const getTripProgress = (): number => {
    switch (trip.status) {
      case 'OPEN': {
        const approved = trip.passengers?.length || 0
        const total = trip.totalSeats || 1
        const ratio = approved / total
        return Math.min(20 + ratio * 20, 40)
      }
      case 'CONFIRMED': return 50
      case 'IN_PROGRESS': {
        const onboarded = trip.passengers?.filter(p => p.onboarded)?.length || 0
        const total = trip.passengers?.length || 1
        const ratio = onboarded / total
        return 50 + ratio * 40
      }
      case 'COMPLETED': return 100
      default: return 0
    }
  }

  const getPassengerProgress = (passengerId: string): number => {
    const isPending = trip.pendingPassengers?.some(p => p.passengerId === passengerId)
    const passenger = trip.passengers?.find(p => p.passengerId === passengerId)
    const isNoShow = trip.noShowPassengers?.some(n => n.passengerId === passengerId)
    
    if (isPending) return 10
    if (isNoShow) return 5
    if (!passenger) return 0
    
    if (trip.status === 'COMPLETED') return 100
    if (trip.status === 'IN_PROGRESS' && passenger.onboarded) return 80
    if (trip.status === 'IN_PROGRESS') return 60
    if (trip.status === 'CONFIRMED') return 40
    if (trip.status === 'OPEN') return 30
    
    return 0
  }

  const getStatusConfig = (status: TripStatus) => {
    const configs: Record<TripStatus, { label: string; color: string; bg: string }> = {
      'OPEN': { label: '🟢 招募中', color: colors.success, bg: colors.successBg },
      'CONFIRMED': { label: '🟡 已確認', color: colors.warning, bg: colors.warningBg },
      'IN_PROGRESS': { label: '🔵 行程中', color: colors.info, bg: colors.infoBg },
      'COMPLETED': { label: '✅ 已完成', color: '#9e9e9e', bg: '#f5f5f5' },
      'CANCELLED': { label: '❌ 已取消', color: colors.error, bg: colors.errorBg },
      'EXPIRED': { label: '⏰ 已過期', color: colors.warning, bg: colors.warningBg },
    }
    return configs[status] || configs['OPEN']
  }

  const progress = getTripProgress()
  const statusConfig = getStatusConfig(trip.status)
  const passengerProgress = currentUserRole === 'passenger' 
    ? getPassengerProgress(currentUserId) 
    : null

  return (
    <div style={styles.container}>
      {/* Status Header */}
      <div style={styles.statusHeader}>
        <span style={{
          ...styles.statusBadge,
          background: statusConfig.bg,
          color: statusConfig.color
        }}>
          {statusConfig.label}
        </span>
        {trip.status === 'OPEN' && (
          <span style={styles.recruitInfo}>
            {trip.passengers?.length || 0}/{trip.totalSeats} 人
          </span>
        )}
        {trip.status === 'IN_PROGRESS' && (
          <span style={styles.recruitInfo}>
            {trip.passengers?.filter(p => p.onboarded)?.length || 0}/{trip.passengers?.length || 0} 已上車
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div style={styles.progressContainer}>
        <div style={styles.progressBg}>
          <div style={{
            ...styles.progressFill,
            width: `${progress}%`,
            background: statusConfig.color,
          }} />
        </div>
        <span style={styles.progressLabel}>{progress}%</span>
      </div>

      {/* Passenger List (Driver View) */}
      {currentUserRole === 'driver' && trip.passengers && trip.passengers.length > 0 && (
        <div style={styles.passengerList}>
          <div style={styles.passengerTitle}>乘客狀態：</div>
          {trip.passengers.map((p, idx) => {
            const isNoShow = trip.noShowPassengers?.some(n => n.passengerId === p.passengerId)
            return (
              <div key={p.passengerId || idx} style={styles.passengerItem}>
                <span style={styles.passengerIcon}>
                  {isNoShow ? '❌' : p.onboarded ? '🚗' : '⏳'}
                </span>
                <span style={{
                  ...styles.passengerName,
                  color: isNoShow ? '#999' : p.onboarded ? colors.success : colors.textSecondary
                }}>
                  {p.name}
                </span>
                <span style={styles.passengerStatus}>
                  {isNoShow ? '未到' : p.onboarded ? '已上車' : '待上車'}
                </span>
                {trip.status === 'IN_PROGRESS' && !isNoShow && !p.onboarded && (
                  <button
                    onClick={async () => {
                      try {
                        await tripService.markPassengerOnboarded(trip.id, p.passengerId)
                        onStatusChange?.()
                      } catch (e: any) {
                        alert(e.message)
                      }
                    }}
                    style={styles.onboardBtn}
                  >
                    🚗
                  </button>
                )}
                {trip.status === 'IN_PROGRESS' && !isNoShow && p.onboarded && (
                  <button
                    onClick={async () => {
                      try {
                        await tripService.markPassengerNoShow(trip.id, p.passengerId)
                        onStatusChange?.()
                      } catch (e: any) {
                        alert(e.message)
                      }
                    }}
                    style={styles.noShowBtn}
                  >
                    ❌
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Passenger Personal Progress (Passenger View) */}
      {currentUserRole === 'passenger' && passengerProgress !== null && (
        <div style={styles.myProgress}>
          <div style={styles.myProgressLabel}>你的進度：</div>
          <div style={styles.myProgressBar}>
            <div style={{
              ...styles.myProgressFill,
              width: `${passengerProgress}%`,
            }} />
          </div>
          <span style={styles.myProgressText}>{passengerProgress}%</span>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: colors.white,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
    border: `2px solid ${colors.border}`,
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: radius.full,
    fontSize: 13,
    fontWeight: 600,
  },
  recruitInfo: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  progressBg: {
    flex: 1,
    height: 12,
    background: '#f0f0f0',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.sm,
    transition: 'width 0.3s ease',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textPrimary,
    minWidth: 40,
    textAlign: 'right' as const,
  },
  passengerList: {
    marginTop: 16,
    paddingTop: 12,
    borderTop: `1px solid ${colors.border}`,
  },
  passengerTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  passengerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    fontSize: 13,
  },
  passengerIcon: {
    fontSize: 14,
  },
  passengerName: {
    flex: 1,
  },
  passengerStatus: {
    fontSize: 12,
    color: colors.textMuted,
  },
  onboardBtn: {
    padding: '4px 8px',
    background: colors.success,
    color: colors.white,
    border: 'none',
    borderRadius: radius.sm,
    fontSize: 12,
    cursor: 'pointer',
  },
  noShowBtn: {
    padding: '4px 8px',
    background: colors.error,
    color: colors.white,
    border: 'none',
    borderRadius: radius.sm,
    fontSize: 12,
    cursor: 'pointer',
  },
  myProgress: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: `1px solid ${colors.border}`,
  },
  myProgressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  myProgressBar: {
    height: 8,
    background: '#f0f0f0',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  myProgressFill: {
    height: '100%',
    background: colors.primary,
    borderRadius: radius.sm,
  },
  myProgressText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 600,
    marginTop: 4,
  },
}