import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { tripService } from '../../services/tripService'
import { listingService } from '../../services/listingService'
import BottomNav from '../../components/BottomNav'

const Icon = ({ name, style = {} }: { name: string; style?: React.CSSProperties }) => (
  <span style={{ fontFamily: "'Material Symbols Outlined'", fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24", fontSize: 20, ...style }}>{name}</span>
)

export default function DriverHomePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [trips, setTrips] = useState<any[]>([])
  const [stats, setStats] = useState({ active: 0, completed: 0, earnings: 0 })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const myTrips = await tripService.getByDriver(currentUser!.id)
      setTrips(myTrips.slice(0, 5))
      const completed = myTrips.filter(t => t.status === 'COMPLETED').length
      setStats({ active: myTrips.filter(t => ['OPEN', 'CONFIRMED', 'IN_PROGRESS'].includes(t.status)).length, completed, earnings: completed * 350 })
    } catch (error) {
      console.error('Error loading:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; text: string }> = {
      OPEN: { bg: '#e7eeff', color: '#1d4ed8', text: '待出發' },
      CONFIRMED: { bg: '#fef3c7', color: '#92400e', text: '已確認' },
      IN_PROGRESS: { bg: '#e8f5e9', color: '#2e7d32', text: '進行中' },
      COMPLETED: { bg: '#e0e0e0', color: '#424242', text: '已完成' },
      CANCELLED: { bg: '#ffebee', color: '#c62828', text: '已取消' },
    }
    return map[status] || { bg: '#f5f5f5', color: '#757575', text: status }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div style={styles.container}>
      <header style={styles.appBar}>
        <div>
          <div style={styles.greeting}>司機你好</div>
          <div style={styles.userName}>{currentUser?.name}</div>
        </div>
        <div style={styles.avatar}>
          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'D')}&background=ffddb8&color=855300`} alt="Driver" />
        </div>
      </header>

      <main style={styles.main}>
        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard} onClick={() => navigate('/driver-trips')}>
            <Icon name="directions_car" style={{ fontSize: 28, color: '#f59e0b' }} />
            <div style={styles.statValue}>{stats.active}</div>
            <div style={styles.statLabel}>進行中</div>
          </div>
          <div style={styles.statCard}>
            <Icon name="check_circle" style={{ fontSize: 28, color: '#4caf50' }} />
            <div style={styles.statValue}>{stats.completed}</div>
            <div style={styles.statLabel}>已完成</div>
          </div>
          <div style={styles.statCard}>
            <Icon name="account_balance_wallet" style={{ fontSize: 28, color: '#1d4ed8' }} />
            <div style={styles.statValue}>HK$ {stats.earnings}</div>
            <div style={styles.statLabel}>總收入</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={styles.quickActions}>
          <button style={styles.actionBtn} onClick={() => navigate('/create-trip')}>
            <Icon name="add_location_alt" style={{ fontSize: 24, color: '#fff' }} />
            <span>發布行程</span>
          </button>
          <button style={styles.actionBtnSecondary} onClick={() => navigate('/driver-trips')}>
            <Icon name="list_alt" style={{ fontSize: 24, color: '#f59e0b' }} />
            <span>行程管理</span>
          </button>
        </div>

        {/* Recent Trips */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>最近行程</h2>
            <span style={styles.viewAll} onClick={() => navigate('/driver-trips')}>查看全部</span>
          </div>

          {trips.length === 0 ? (
            <div style={styles.empty}>
              <Icon name=" directions_car" style={{ fontSize: 48, color: '#5f5f59' }} />
              <p>暫時沒有行程</p>
              <p style={{ fontSize: 14, marginTop: 8, color: '#534434' }}>點擊上方發布行程開始接載乘客</p>
            </div>
          ) : (
            <div style={styles.tripList}>
              {trips.map(trip => {
                const badge = getStatusBadge(trip.status)
                return (
                  <div key={trip.id} style={styles.tripCard} onClick={() => navigate(`/trip/${trip.id}`)}>
                    <div style={styles.tripHeader}>
                      <span style={styles.routeTag}>{trip.route?.pickup?.placeName} → {trip.route?.dropoff?.placeName}</span>
                      <span style={{ ...styles.statusBadge, background: badge.bg, color: badge.color }}>{badge.text}</span>
                    </div>
                    <div style={styles.tripMeta}>
                      <span><Icon name="schedule" style={{ fontSize: 14, color: '#5f5f59' }} /> {formatTime(trip.departureTime)}</span>
                      <span><Icon name="group" style={{ fontSize: 14, color: '#5f5f59' }} /> {trip.passengerCount || 0}/{trip.availableSeats || 7} 位</span>
                      <span><Icon name="attach_money" style={{ fontSize: 14, color: '#5f5f59' }} /> HK$ {trip.price || 0}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#f9f9ff', paddingBottom: 140 },
  appBar: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '0 20px', height: 80, background: 'linear-gradient(to right, #f59e0b, #855300)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  userName: { fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 4 },
  avatar: { width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.3)' },
  main: { paddingTop: 96, paddingLeft: 20, paddingRight: 20 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 },
  statCard: { background: '#fff', borderRadius: 16, padding: 16, textAlign: 'center', boxShadow: '0 4px 20px rgba(29,78,216,0.05)', cursor: 'pointer' },
  statValue: { fontSize: 20, fontWeight: 700, color: '#111c2d', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#534434', marginTop: 4 },
  quickActions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 },
  actionBtn: { background: 'linear-gradient(to right, #f59e0b, #855300)', color: '#fff', padding: '16px 20px', borderRadius: 16, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 30px rgba(245,158,11,0.3)' },
  actionBtnSecondary: { background: '#fff', color: '#111c2d', padding: '16px 20px', borderRadius: 16, border: '2px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  section: { paddingTop: 8 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 700, color: '#111c2d', margin: 0 },
  viewAll: { fontSize: 14, fontWeight: 600, color: '#1d4ed8', cursor: 'pointer' },
  empty: { textAlign: 'center' as const, padding: '40px 20px', color: '#534434', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  tripList: { display: 'flex', flexDirection: 'column', gap: 12 },
  tripCard: { background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 4px 20px rgba(29,78,216,0.05)', cursor: 'pointer' },
  tripHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  routeTag: { fontSize: 14, fontWeight: 600, color: '#111c2d' },
  statusBadge: { fontSize: 12, padding: '4px 8px', borderRadius: 8 },
  tripMeta: { display: 'flex', gap: 16, fontSize: 12, color: '#5f5f59' },
}
