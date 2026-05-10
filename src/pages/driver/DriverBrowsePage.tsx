// Cabs Carpool - Driver Browse Page v4.0
// Browse passenger requests from trips collection (unified)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { tripService } from '../../services/tripService'
import BottomNav from '../../components/BottomNav'

export default function DriverBrowsePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadListings()
  }, [])

  const loadListings = async () => {
    try {
      setLoading(true)
      console.log('[DriverBrowsePage] Loading trips with NEGOTIATED pricing...')
      const all = await tripService.getPublicTrips()
      console.log('[DriverBrowsePage] getPublicTrips returned:', all.length, 'trips')
      
      // Filter: show only NEGOTIATED (passenger requests) where driver is NOT the initiator
      const passengerRequests = all.filter(t => 
        t.pricingMode === 'NEGOTIATED' && 
        t.initiatorId !== currentUser?.id
      )
      console.log('[DriverBrowsePage] Filtered to', passengerRequests.length, 'passenger requests')
      setTrips(passengerRequests as any[])
    } catch (error) {
      console.error('Error loading:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/driver-home')}>←</button>
        <div style={styles.title}>🔍 瀏覽乘客需求</div>
        <button style={styles.refreshBtn} onClick={loadListings}>↻</button>
      </header>

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.empty}>載入中...</div>
        ) : trips.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>👤</div>
            <div>暫時沒有乘客需求</div>
            <div style={styles.emptySubtext}>乘客發布需求後會在這裡顯示</div>
          </div>
        ) : (
          trips.map(listing => (
            <div 
              key={listing.id} 
              style={styles.card}
              onClick={() => navigate(`/listing/${listing.id}`)}
            >
              <div style={styles.cardHeader}>
                <span style={styles.badgePassenger}>👤 乘客需求</span>
                <span style={styles.postTime}>{formatTime(listing.createdAt)}</span>
              </div>

              <div style={styles.route}>
                📍 {listing.route.pickup?.placeName} → {listing.route.dropoff?.placeName}
              </div>

              <div style={styles.cardInfo}>
                <span>🕐 {formatTime(listing.departureTime)}</span>
                <span>👥 {listing.passengerCount}位</span>
                <span>{listing.vehicleType === '7seater' ? '🚐 七人車' : '🚙 轎車'}</span>
                {listing.isCarpool && <span>🔄 可共乘</span>}
              </div>

              {listing.notes && (
                <div style={styles.notes}>📝 {listing.notes}</div>
              )}

              <div style={styles.contactBtn}>
                💬 查看並聯繫乘客
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
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    background: '#fff',
    borderBottom: '2px solid #f0e0d6',
  },
  backBtn: {
    fontSize: 22,
    background: 'none',
    border: 'none',
    color: '#e07b4c',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4a3728',
  },
  refreshBtn: {
    fontSize: 20,
    background: 'none',
    border: 'none',
    color: '#e07b4c',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  content: {
    padding: '18px',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#8b7355',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptySubtext: {
    fontSize: '14px',
    marginTop: '8px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    cursor: 'pointer',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  badgePassenger: {
    background: '#fff3e0',
    padding: '4px 10px',
    borderRadius: '12px',
    color: '#e07b4c',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  postTime: {
    fontSize: '12px',
    color: '#8b7355',
  },
  route: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#4a3728',
    marginBottom: '10px',
  },
  cardInfo: {
    display: 'flex',
    gap: '10px',
    fontSize: '13px',
    color: '#8b7355',
    flexWrap: 'wrap' as const,
  },
  notes: {
    marginTop: '10px',
    padding: '8px 12px',
    background: '#f5f5f5',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#666',
  },
  contactBtn: {
    marginTop: '12px',
    padding: '10px',
    background: '#e07b4c',
    color: '#fff',
    borderRadius: '8px',
    textAlign: 'center' as const,
    fontWeight: 'bold',
  },
}