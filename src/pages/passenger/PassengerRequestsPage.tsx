// Cabs Carpool - Passenger Requests Page v1.0
// 乘客管理自己的需求

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestService } from '../../services/tripService'
import { useAuth } from '../../context/AuthContext'
import BottomNav from '../../components/BottomNav'

export default function PassengerRequestsPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
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

  const handleChat = () => {
    if (!currentUser) {
      navigate('/profile')
      return
    }
    navigate('/chats')
  }

  const handleEdit = (req: any) => {
    // Navigate to edit page with request ID
    // For now, we'll use a simple prompt to edit notes
    const newNotes = prompt('修改備註：', req.notes || '')
    if (newNotes !== null) {
      // Update via requestService.update if available
      // For now, just reload
      loadUserRequests()
    }
  }

  const getPickup = (req: any) => req.pickup?.placeName || req.pickup || '未知'
  const getDropoff = (req: any) => req.dropoff?.placeName || req.dropoff || '未知'

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/passenger-home')}>←</button>
        <div style={styles.title}>📋 我的需求</div>
        <button style={styles.addBtn} onClick={() => navigate('/create-request')}>+</button>
      </header>

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.empty}>載入中...</div>
        ) : requests.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>📋</div>
            <div>暫時沒有需求</div>
            <div style={styles.emptySubtext}>發布你的第一個乘車需求吧！</div>
            <button 
              style={styles.createBtn}
              onClick={() => navigate('/create-request')}
            >
              + 發布需求
            </button>
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} style={styles.tripCard}>
              <div style={styles.tripHeader}>
                <div style={styles.tripRoute}>
                  📍 {getPickup(req)} → {getDropoff(req)}
                </div>
                <span style={req.status === 'OPEN' ? styles.badgeOpen : styles.badgeDone}>
                  {req.status === 'OPEN' ? '🟢 開放中' : '✓ 已關閉'}
                </span>
              </div>
              <div style={styles.tripDetails}>
                <div>🕐 <strong>{req.departureDate || '時間待定'}</strong></div>
                <div>👥 {req.passengerCount || 1} 位</div>
                <div>感興趣的司機：{req.interestedDrivers?.length || 0} 位</div>
                {req.notes && <div>📝 {req.notes}</div>}
              </div>
              <div style={styles.tripActions}>
                <button style={styles.editBtn} onClick={() => handleEdit(req)}>
                  ✏️ 編輯
                </button>
                <button style={styles.chatBtn} onClick={handleChat}>
                  💬 聊天
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#e07b4c',
    color: '#fff',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
  },
  content: {
    padding: 16,
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
    flex: 1,
  },
  badgeOpen: {
    background: '#e8f5e8',
    color: '#e07b4c',
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
  editBtn: {
    padding: '10px 16px',
    background: '#f5f5f5',
    color: '#666',
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 20,
    color: '#8b7355',
  },
  createBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #e07b4c, #c4623a)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  bottomNav: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    background: '#fff',
    padding: '10px 0',
    borderTop: '2px solid #f0e0d6',
    zIndex: 100,
  },
  navItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
    padding: '6px 2px',
    background: 'none',
    border: 'none',
    fontSize: 12,
    color: '#8b7355',
    cursor: 'pointer',
  },
  navItemActive: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
    padding: '6px 2px',
    background: 'none',
    border: 'none',
    fontSize: 12,
    color: '#e07b4c',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
