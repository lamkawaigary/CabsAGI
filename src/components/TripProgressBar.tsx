// Cabs Carpool - Trip Progress Bar Component
// 行程進度條 - 複雜進度模式顯示

import type { Trip, TripStatus } from '../types/trip'
import { tripService } from '../services/tripService'

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
  
  // 計算行程進度百分比
  const getTripProgress = (): number => {
    switch (trip.status) {
      case 'OPEN': {
        // 招募中：根據乘客報名進度
        const approved = trip.passengers?.length || 0
        const total = trip.totalSeats || 1
        const ratio = approved / total
        return Math.min(20 + ratio * 20, 40)  // 20-40%
      }
      case 'CONFIRMED': return 50  // 已確認
      case 'IN_PROGRESS': {
        // 行程中：根據上車人數
        const onboarded = trip.passengers?.filter(p => p.onboarded)?.length || 0
        const total = trip.passengers?.length || 1
        const ratio = onboarded / total
        return 50 + ratio * 40  // 50-90%
      }
      case 'COMPLETED': return 100
      default: return 0
    }
  }

  // 獲取乘客個人進度
  const getPassengerProgress = (oderId: string): number => {
    const isPending = trip.pendingPassengers?.some(p => p.oderId === oderId)
    const passenger = trip.passengers?.find(p => p.oderId === oderId)
    const isNoShow = trip.noShowPassengers?.some(n => n.oderId === oderId)
    
    if (isPending) return 10                                    // 等待批准
    if (isNoShow) return 5                                      // 未到
    if (!passenger) return 0
    
    if (trip.status === 'COMPLETED') return 100
    if (trip.status === 'IN_PROGRESS' && passenger.onboarded) return 80  // 已上車
    if (trip.status === 'IN_PROGRESS') return 60                // 行程中
    if (trip.status === 'CONFIRMED') return 40                   // 已批准，等出發
    if (trip.status === 'OPEN') return 30                  // 已批准，招募中
    
    return 0
  }

  const getStatusConfig = (status: TripStatus) => {
    const configs: Record<TripStatus, { label: string; color: string; bg: string }> = {
      'OPEN': { label: '🟢 招募中', color: '#4caf50', bg: '#e8f5e9' },
      'CONFIRMED': { label: '🟡 已確認', color: '#ff9800', bg: '#fff3e0' },
      'IN_PROGRESS': { label: '🔵 行程中', color: '#2196f3', bg: '#e3f2fd' },
      'COMPLETED': { label: '✅ 已完成', color: '#9e9e9e', bg: '#f5f5f5' },
      'CANCELLED': { label: '❌ 已取消', color: '#f44336', bg: '#ffebee' },
      'EXPIRED': { label: '⏰ 已過期', color: '#ff9800', bg: '#fff3e0' },
    }
    return configs[status] || configs['OPEN']
  }

  const progress = getTripProgress()
  const statusConfig = getStatusConfig(trip.status)
  const passengerProgress = currentUserRole === 'passenger' 
    ? getPassengerProgress(currentUserId) 
    : null

  // 刪除未使用的 getPassengerStatusIcon 函數，保持代碼整潔
  return (
    <div style={styles.container}>
      {/* 狀態標題 */}
      <div style={styles.statusHeader}>
        <span style={{...styles.statusBadge, background: statusConfig.bg, color: statusConfig.color}}>
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

      {/* 主進度條 */}
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

      {/* 乘客列表（司機看到） */}
      {currentUserRole === 'driver' && trip.passengers && trip.passengers.length > 0 && (
        <div style={styles.passengerList}>
          <div style={styles.passengerTitle}>乘客狀態：</div>
          {trip.passengers.map((p, idx) => {
            const isNoShow = trip.noShowPassengers?.some(n => n.oderId === p.oderId)
            return (
              <div key={p.oderId || idx} style={styles.passengerItem}>
                <span style={styles.passengerIcon}>
                  {isNoShow ? '❌' : p.onboarded ? '🚗' : '⏳'}
                </span>
                <span style={{
                  ...styles.passengerName,
                  color: isNoShow ? '#999' : p.onboarded ? '#4caf50' : '#666'
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
                        await tripService.markPassengerOnboarded(trip.id, p.oderId)
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
                        await tripService.markPassengerNoShow(trip.id, p.oderId)
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

      {/* 乘客個人進度（乘客看到） */}
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
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    border: '2px solid #f0e0d6',
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
  },
  recruitInfo: {
    fontSize: 13,
    color: '#8b7355',
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
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    transition: 'width 0.3s ease',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#4a3728',
    minWidth: 40,
    textAlign: 'right' as const,
  },
  passengerList: {
    marginTop: 16,
    paddingTop: 12,
    borderTop: '1px solid #f0e0d6',
  },
  passengerTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#8b7355',
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
    color: '#999',
  },
  onboardBtn: {
    padding: '4px 8px',
    background: '#4caf50',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
  },
  noShowBtn: {
    padding: '4px 8px',
    background: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
  },
  myProgress: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid #f0e0d6',
  },
  myProgressLabel: {
    fontSize: 12,
    color: '#8b7355',
    marginBottom: 6,
  },
  myProgressBar: {
    height: 8,
    background: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  myProgressFill: {
    height: '100%',
    background: '#e07b4c',
    borderRadius: 4,
  },
  myProgressText: {
    fontSize: 12,
    color: '#e07b4c',
    fontWeight: 600,
    marginTop: 4,
  },
}