// Cabs Carpool - Trips Page v1.0
// 暖色珊瑚主題

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tripService, requestService } from '../services/tripService'
import { useAuth } from '../context/AuthContext'

export default function TripsPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [_trips, setTrips] = useState<any[]>([])
  const [_requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentUser) {
      loadUserTrips()
    }
  }, [currentUser])

  const loadUserTrips = async () => {
    try {
      setLoading(true)
      const [myTrips, myRequests] = await Promise.all([
        currentUser?.role === 'driver' 
          ? tripService.getByDriver(currentUser.id)
          : Promise.resolve([]),
        currentUser?.role === 'passenger'
          ? requestService.getByPassenger(currentUser.id)
          : Promise.resolve([])
      ])
      setTrips(myTrips || [])
      setRequests(myRequests || [])
    } catch (error) {
      console.error('Error loading:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChat = (_item: any) => {
    if (!currentUser) {
      alert('請先登入')
      return
    }
    navigate('/chat/demo')
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>←</button>
        <div style={styles.title}>🚗 我的行程</div>
        <div style={{width: 40}} />
      </header>

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.empty}>載入中...</div>
        ) : (
          <>
            {/* Active Trips */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>進行中的行程</div>
              
              {/* Demo card - confirmed */}
              <div style={styles.tripCard}>
                <div style={styles.tripHeader}>
                  <div style={styles.tripRoute}>📍 香港國際機場 → 深圳灣口岸</div>
                  <span style={styles.badgeConfirmed}>✅ 已確認</span>
                </div>
                <div style={styles.tripDetails}>
                  <div>🕐 <strong>4月20日 14:00</strong></div>
                  <div>👤 司機：張先生</div>
                  <div>💰 <strong>$280 × 2位 = $560</strong></div>
                </div>
                <div style={styles.tripActions}>
                  <button style={styles.chatBtn} onClick={() => handleChat(null)}>
                    💬 聯絡司機
                  </button>
                </div>
              </div>

              {/* Demo card - pending */}
              <div style={styles.tripCard}>
                <div style={styles.tripHeader}>
                  <div style={styles.tripRoute}>📍 迪士尼 → 落馬洲</div>
                  <span style={styles.badgePending}>⏳ 等待中</span>
                </div>
                <div style={styles.tripDetails}>
                  <div>🕐 <strong>4月21日 09:00</strong></div>
                  <div>👤 司機：李小姐</div>
                  <div>💰 <strong>$300 × 1位 = $300</strong></div>
                </div>
                <div style={styles.tripActions}>
                  <button style={styles.chatBtn} onClick={() => handleChat(null)}>
                    💬 聯絡司機
                  </button>
                  <button style={styles.cancelBtn}>
                    取消
                  </button>
                </div>
              </div>
            </div>

            {/* Past Trips */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>歷史記錄</div>
              
              <div style={{...styles.tripCard, opacity: 0.7}}>
                <div style={styles.tripHeader}>
                  <div style={styles.tripRoute}>📍 澳門 → 香港機場</div>
                  <span style={styles.badgeDone}>✓ 已完成</span>
                </div>
                <div style={styles.tripDetails}>
                  <div>4月15日 08:00 · 王司機</div>
                  <div style={{color: '#5a9a5a'}}>+$700 已收款</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#fff9f5',
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
  },
  title: {
    fontSize: 17,
    fontWeight: 600,
    color: '#4a3728',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#e07b4c',
    marginBottom: 12,
    letterSpacing: 1,
  },
  tripCard: {
    background: '#fff',
    border: '2px solid #f0e0d6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  tripHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripRoute: {
    fontSize: 16,
    fontWeight: 600,
    color: '#4a3728',
  },
  badgeConfirmed: {
    background: '#c8e6c9',
    color: '#2e7d32',
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
  },
  badgePending: {
    background: '#fff3e0',
    color: '#e65100',
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
  },
  badgeDone: {
    background: '#eceff1',
    color: '#546e7a',
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
  },
  tripDetails: {
    fontSize: 13,
    color: '#8b7355',
    lineHeight: 1.8,
    marginBottom: 12,
  },
  tripActions: {
    display: 'flex',
    gap: 8,
  },
  chatBtn: {
    flex: 1,
    padding: '10px 16px',
    background: '#e07b4c',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '10px 16px',
    background: '#ffebee',
    color: '#c62828',
    border: 'none',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center' as const,
    padding: 40,
    color: '#8b7355',
  },
}
