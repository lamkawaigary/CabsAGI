// CabsAGI - Driver Trips Manager
// 司機行程管理中心 - 統計 + 行程列表 + 快捷操作

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { tripService } from '../../services/tripService'
import type { Trip, TripStatus } from '../../types/trip'
import BottomNav from '../../components/BottomNav'

// 狀態配置
const STATUS_CONFIG: Record<TripStatus, { label: string; color: string; bg: string }> = {
  'OPEN': { label: '🟢 開放中', color: '#4caf50', bg: '#e8f5e9' },
  'CONFIRMED': { label: '🟡 已確認', color: '#ff9800', bg: '#fff3e0' },
  'IN_PROGRESS': { label: '🔵 行程中', color: '#2196f3', bg: '#e3f2fd' },
  'COMPLETED': { label: '✅ 已完成', color: '#9e9e9e', bg: '#f5f5f5' },
  'CANCELLED': { label: '❌ 已取消', color: '#f44336', bg: '#ffebee' },
  'EXPIRED': { label: '⏰ 已過期', color: '#795548', bg: '#efebe9' },
}

type FilterStatus = 'all' | TripStatus

export default function DriverTripsManager() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all')

  // 統計數據
  const [stats, setStats] = useState({
    todayTrips: 0,
    weekRevenue: 0,
    pendingRequests: 0,
    completedRate: 0,
  })

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
      calculateStats(driverTrips || [])
    } catch (error) {
      console.error('Error loading trips:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (tripList: Trip[]) => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)

    // 今日行程
    const todayTrips = tripList.filter(t => {
      const dep = new Date(t.departureTime)
      return dep >= todayStart
    }).length

    // 待處理的乘客申請
    const pendingRequests = tripList.reduce((sum, t) => {
      return sum + (t.pendingPassengers?.length || 0)
    }, 0)

    // 完成率
    const completed = tripList.filter(t => t.status === 'COMPLETED').length
    const completedRate = tripList.length > 0 ? Math.round((completed / tripList.length) * 100) : 0

    setStats({
      todayTrips,
      weekRevenue: 0, // 需要 priceQuoteService 計算
      pendingRequests,
      completedRate,
    })
  }

  // 過濾行程
  const filteredTrips = trips.filter(trip => {
    // 狀態過濾
    if (filterStatus !== 'all' && trip.status !== filterStatus) return false
    
    // 日期範圍過濾
    if (dateRange !== 'all') {
      const tripDate = new Date(trip.departureTime)
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      if (dateRange === 'today') {
        if (tripDate < todayStart) return false
      } else if (dateRange === 'week') {
        const weekAgo = new Date(todayStart)
        weekAgo.setDate(weekAgo.getDate() - 7)
        if (tripDate < weekAgo) return false
      } else if (dateRange === 'month') {
        const monthAgo = new Date(todayStart)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        if (tripDate < monthAgo) return false
      }
    }
    
    return true
  })

  const formatDate = (iso: string) => {
    if (!iso) return '未知'
    const d = new Date(iso)
    return d.toLocaleDateString('zh-HK', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: TripStatus) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG['OPEN']
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: config.bg,
        color: config.color,
      }}>
        {config.label}
      </span>
    )
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
        <div style={styles.headerContent}>
          <h1 style={styles.title}>🚗 行程管理</h1>
          <button style={styles.settingsBtn} onClick={() => navigate('/driver-settings')}>
            ⚙️
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📅</div>
          <div style={styles.statValue}>{stats.todayTrips}</div>
          <div style={styles.statLabel}>今日行程</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>⏳</div>
          <div style={styles.statValue}>{stats.pendingRequests}</div>
          <div style={styles.statLabel}>待處理</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>✅</div>
          <div style={styles.statValue}>{stats.completedRate}%</div>
          <div style={styles.statLabel}>完成率</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>⚡ 快捷操作</div>
        <div style={styles.quickActions}>
          <button style={styles.quickActionBtn} onClick={() => navigate('/create-trip')}>
            ➕ 發布行程
          </button>
          <button style={styles.quickActionBtn} onClick={() => navigate('/browse-requests')}>
            📋 乘客需求
          </button>
          <button style={styles.quickActionBtn} onClick={() => navigate('/chats')}>
            💬 聊天
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        {/* Status Filter */}
        <div style={styles.filterRow}>
          {(['all', 'OPEN', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] as FilterStatus[]).map(status => (
            <button
              key={status}
              style={{
                ...styles.filterBtn,
                ...(filterStatus === status ? styles.filterBtnActive : {}),
              }}
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? '全部' : STATUS_CONFIG[status]?.label || status}
            </button>
          ))}
        </div>
        
        {/* Date Range Filter */}
        <div style={styles.filterRow}>
          {([
            { value: 'all', label: '全部時間' },
            { value: 'today', label: '今日' },
            { value: 'week', label: '7日內' },
            { value: 'month', label: '30日內' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              style={{
                ...styles.dateFilterBtn,
                ...(dateRange === opt.value ? styles.dateFilterBtnActive : {}),
              }}
              onClick={() => setDateRange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trips List */}
      <div style={styles.tripsList}>
        <div style={styles.sectionTitle}>
          📋 行程列表 ({filteredTrips.length})
        </div>

        {filteredTrips.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🚗</div>
            <div style={styles.emptyText}>暫時沒有行程</div>
            <button 
              style={styles.createBtn}
              onClick={() => navigate('/create-trip')}
            >
              發布第一個行程
            </button>
          </div>
        ) : (
          filteredTrips.map(trip => (
            <div key={trip.id} style={styles.tripCard}>
              {/* Header */}
              <div style={styles.tripHeader}>
                {getStatusBadge(trip.status)}
                <span style={styles.tripTime}>{formatDate(trip.departureTime)}</span>
              </div>

              {/* Route */}
              <div style={styles.tripRoute}>
                📍 {trip.route?.pickup?.placeName || '未知'} 
                <span style={styles.routeArrow}>→</span>
                📍 {trip.route?.dropoff?.placeName || '未知'}
              </div>

              {/* Info */}
              <div style={styles.tripInfo}>
                💺 座位：{trip.availableSeats || 0}/{trip.totalSeats || 0}
                {trip.pendingPassengers?.length > 0 && (
                  <span style={styles.pendingBadge}>
                    ⏳ {trip.pendingPassengers.length}位待批准
                  </span>
                )}
                {trip.passengers?.length > 0 && (
                  <span style={styles.passengerCount}>
                    👥 {trip.passengers.length}位乘客
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={styles.tripActions}>
                <button 
                  style={styles.viewBtn}
                  onClick={() => navigate(`/chat/${trip.id}`)}
                >
                  查看詳情
                </button>
                <button 
                  style={styles.chatBtn}
                  onClick={() => navigate(`/chat/${trip.id}`)}
                >
                  💬 進入聊天
                </button>
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
    background: '#fff9f5',
    paddingBottom: 80,
  },
  loading: {
    textAlign: 'center' as const,
    padding: 40,
    color: '#8b7355',
  },
  header: {
    background: '#fff',
    padding: '12px 16px',
    borderBottom: '1px solid #f0e0d6',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#4a3728',
  },
  settingsBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    padding: 16,
  },
  statCard: {
    background: '#fff',
    borderRadius: 16,
    padding: 16,
    textAlign: 'center' as const,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#4a3728',
  },
  statLabel: {
    fontSize: 12,
    color: '#8b7355',
    marginTop: 4,
  },
  section: {
    padding: '0 16px 16px',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#4a3728',
    marginBottom: 12,
  },
  quickActions: {
    display: 'flex',
    gap: 10,
  },
  quickActionBtn: {
    flex: 1,
    padding: '12px 8px',
    background: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 500,
    color: '#4a3728',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  filters: {
    padding: '0 16px 16px',
  },
  filterRow: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 8,
    marginBottom: 8,
  },
  filterBtn: {
    flexShrink: 0,
    padding: '8px 12px',
    background: '#fff',
    border: 'none',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    color: '#8b7355',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  filterBtnActive: {
    background: '#e07b4c',
    color: '#fff',
  },
  dateFilterBtn: {
    padding: '6px 10px',
    background: 'transparent',
    border: '1px solid #e0d0c6',
    borderRadius: 16,
    fontSize: 11,
    color: '#8b7355',
    cursor: 'pointer',
  },
  dateFilterBtnActive: {
    background: '#4a3728',
    color: '#fff',
    borderColor: '#4a3728',
  },
  tripsList: {
    padding: '0 16px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 16px',
    background: '#fff',
    borderRadius: 16,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#8b7355',
    marginBottom: 16,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  tripHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripTime: {
    fontSize: 12,
    color: '#8b7355',
  },
  tripRoute: {
    fontSize: 14,
    color: '#4a3728',
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  routeArrow: {
    color: '#e07b4c',
    fontWeight: 600,
  },
  tripInfo: {
    fontSize: 12,
    color: '#8b7355',
    marginBottom: 12,
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap' as const,
  },
  pendingBadge: {
    color: '#ff9800',
  },
  passengerCount: {
    color: '#4caf50',
  },
  tripActions: {
    display: 'flex',
    gap: 10,
  },
  viewBtn: {
    flex: 1,
    padding: '10px',
    background: '#f5f0eb',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    color: '#4a3728',
    cursor: 'pointer',
  },
  chatBtn: {
    flex: 1,
    padding: '10px',
    background: '#e07b4c',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    color: '#fff',
    cursor: 'pointer',
  },
}
