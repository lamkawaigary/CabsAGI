// Cabs Carpool - Admin Panel v2.0
// 管理員面板 - 完整功能

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebaseConfig'

type TabType = 'dashboard' | 'users' | 'chatRooms' | 'trips' | 'priceQuotes' | 'settings'

interface Stats {
  totalUsers: number
  totalTrips: number
  totalChatRooms: number
  totalPriceQuotes: number
  activeDrivers: number
  activePassengers: number
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalTrips: 0,
    totalChatRooms: 0,
    totalPriceQuotes: 0,
    activeDrivers: 0,
    activePassengers: 0,
  })

  // Data states
  const [users, setUsers] = useState<any[]>([])
  const [chatRooms, setChatRooms] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [priceQuotes, setPriceQuotes] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!currentUser) {
      navigate('/')
      return
    }
    if (currentUser.role !== 'admin') {
      alert('⚠️ 只有管理員可以訪問此頁面')
      navigate('/')
      return
    }
    loadAllData()
  }, [currentUser])

  const loadAllData = async () => {
    setLoading(true)
    try {
      // Load stats
      const [
        usersSnap, 
        tripsSnap, 
        chatRoomsSnap, 
        priceQuotesSnap
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'trips')),
        getDocs(collection(db, 'chatRooms')),
        getDocs(collection(db, 'priceQuotes')),
      ])

      const allUsers: any[] = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      
      setStats({
        totalUsers: usersSnap.size,
        totalTrips: tripsSnap.size,
        totalChatRooms: chatRoomsSnap.size,
        totalPriceQuotes: priceQuotesSnap.size,
        activeDrivers: allUsers.filter(u => u.role === 'driver').length,
        activePassengers: allUsers.filter(u => u.role === 'passenger').length,
      })

      setUsers(allUsers)
      setTrips(tripsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setChatRooms(chatRoomsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setPriceQuotes(priceQuotesSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteChatRoom = async (roomId: string) => {
    if (!confirm('⚠️ 確定要刪除這個聊天室？')) return
    setDeleting(roomId)
    try {
      await deleteDoc(doc(db, 'chatRooms', roomId))
      setChatRooms(prev => prev.filter(r => r.id !== roomId))
      updateStats('totalChatRooms', -1)
    } catch (err: any) {
      alert('❌ 刪除失敗: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  const deleteTrip = async (tripId: string) => {
    if (!confirm('⚠️ 確定要刪除這個行程？')) return
    setDeleting(tripId)
    try {
      await deleteDoc(doc(db, 'trips', tripId))
      setTrips(prev => prev.filter(t => t.id !== tripId))
      updateStats('totalTrips', -1)
    } catch (err: any) {
      alert('❌ 刪除失敗: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  const deleteAllChatRooms = async () => {
    if (!confirm('⚠️ 確定要刪除 ALL 聊天室？\n此操作不可撤銷！')) return
    if (!confirm('⚠️ 最後確認：刪除全部聊天室？')) return
    
    setLoading(true)
    try {
      for (const room of chatRooms) {
        await deleteDoc(doc(db, 'chatRooms', room.id))
      }
      setChatRooms([])
      updateStats('totalChatRooms', 0)
      alert('✅ 已刪除全部聊天室')
    } catch (err: any) {
      alert('❌ 刪除失敗: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      alert('✅ 已更新用戶角色')
    } catch (err: any) {
      alert('❌ 更新失敗: ' + err.message)
    }
  }

  const updateStats = (key: keyof Stats, delta: number) => {
    setStats(prev => ({
      ...prev,
      [key]: delta === 0 ? 0 : prev[key] + delta
    }))
  }

  const formatDate = (iso?: string) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleString('zh-TW')
  }

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredTrips = trips.filter(t =>
    t.route?.pickup?.placeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.route?.dropoff?.placeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.driverName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && !stats.totalUsers) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}>⏳ 載入中...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>←</button>
        <h1 style={styles.title}>🔧 管理員面板</h1>
        <div style={{display: 'flex', gap: 8}}>
          <button style={styles.refreshBtn} onClick={loadAllData}>🔄</button>
          <button 
            style={styles.logoutBtn}
            onClick={async () => {
              const { signOut } = await import('firebase/auth')
              const { auth } = await import('../../firebaseConfig')
              await signOut(auth)
              navigate('/')
            }}
          >
            登出
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard} onClick={() => setActiveTab('users')}>
          <div style={styles.statNumber}>{stats.totalUsers}</div>
          <div style={styles.statLabel}>👥 總用戶</div>
          <div style={styles.statSub}>司機 {stats.activeDrivers} | 乘客 {stats.activePassengers}</div>
        </div>
        <div style={styles.statCard} onClick={() => setActiveTab('trips')}>
          <div style={styles.statNumber}>{stats.totalTrips}</div>
          <div style={styles.statLabel}>🚗 總行程</div>
        </div>
        <div style={styles.statCard} onClick={() => setActiveTab('chatRooms')}>
          <div style={styles.statNumber}>{stats.totalChatRooms}</div>
          <div style={styles.statLabel}>💬 聊天室</div>
        </div>
        <div style={styles.statCard} onClick={() => setActiveTab('priceQuotes')}>
          <div style={styles.statNumber}>{stats.totalPriceQuotes}</div>
          <div style={styles.statLabel}>💰 報價</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['dashboard', 'users', 'chatRooms', 'trips', 'priceQuotes', 'settings'] as TabType[]).map(tab => (
          <button
            key={tab}
            style={{...styles.tab, ...(activeTab === tab ? styles.activeTab : {})}}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'dashboard' && '📊'}
            {tab === 'users' && '👥'}
            {tab === 'chatRooms' && '💬'}
            {tab === 'trips' && '🚗'}
            {tab === 'priceQuotes' && '💰'}
            {tab === 'settings' && '⚙️'}
            {' '}{tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      {(activeTab !== 'dashboard' && activeTab !== 'settings') && (
        <div style={styles.searchBar}>
          <input
            style={styles.searchInput}
            placeholder={`搜尋 ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {/* Content */}
      <div style={styles.content}>
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div style={styles.dashboardGrid}>
            <div style={styles.dashCard}>
              <h3 style={styles.dashTitle}>📊 系統概覽</h3>
              <div style={styles.dashRow}>
                <span>總用戶</span>
                <span style={styles.dashValue}>{stats.totalUsers}</span>
              </div>
              <div style={styles.dashRow}>
                <span>司機</span>
                <span style={styles.dashValue}>{stats.activeDrivers}</span>
              </div>
              <div style={styles.dashRow}>
                <span>乘客</span>
                <span style={styles.dashValue}>{stats.activePassengers}</span>
              </div>
              <div style={styles.dashRow}>
                <span>行程</span>
                <span style={styles.dashValue}>{stats.totalTrips}</span>
              </div>
              <div style={styles.dashRow}>
                <span>聊天室</span>
                <span style={styles.dashValue}>{stats.totalChatRooms}</span>
              </div>
              <div style={styles.dashRow}>
                <span>報價</span>
                <span style={styles.dashValue}>{stats.totalPriceQuotes}</span>
              </div>
            </div>
            <div style={styles.dashCard}>
              <h3 style={styles.dashTitle}>⚡ 快速操作</h3>
              <button style={styles.actionBtn} onClick={deleteAllChatRooms}>
                🗑️ 清除全部聊天室
              </button>
              <button style={styles.actionBtn} onClick={loadAllData}>
                🔄 刷新數據
              </button>
            </div>
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div style={styles.list}>
            {filteredUsers.length === 0 ? (
              <div style={styles.empty}>沒有用戶</div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={styles.userAvatar}>{user.name?.charAt(0) || '?'}</div>
                    <div style={styles.userInfo}>
                      <div style={styles.userName}>{user.name}</div>
                      <div style={styles.userEmail}>{user.email}</div>
                    </div>
                    <select
                      style={styles.roleSelect}
                      value={user.role || 'passenger'}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                    >
                      <option value="passenger">乘客</option>
                      <option value="driver">司機</option>
                      <option value="admin">管理員</option>
                    </select>
                  </div>
                  <div style={styles.cardBody}>
                    <div style={styles.row}>
                      <span style={styles.label}>電話：</span>
                      <span>{user.phone || '-'}</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.label}>積分：</span>
                      <span>{user.points || 0}</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.label}>狀態：</span>
                      <span style={{
                        ...styles.badge,
                        background: user.status === 'ACTIVE' ? '#e8f5e8' : '#fff3e0'
                      }}>
                        {user.status || 'ACTIVE'}
                      </span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.label}>創建：</span>
                      <span>{formatDate(user.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Chat Rooms */}
        {activeTab === 'chatRooms' && (
          <div style={styles.list}>
            <div style={styles.bulkActions}>
              <button style={styles.dangerBtn} onClick={deleteAllChatRooms}>
                🗑️ 刪除全部聊天室
              </button>
            </div>
            {chatRooms.length === 0 ? (
              <div style={styles.empty}>沒有聊天室</div>
            ) : (
              chatRooms.map(room => (
                <div key={room.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span style={styles.cardId}>{room.id.slice(0, 12)}...</span>
                    <span style={styles.badge}>{room.roomType}</span>
                  </div>
                  <div style={styles.cardBody}>
                    <div style={styles.row}>
                      <span style={styles.label}>路線：</span>
                      <span>{room.topicPickup} → {room.topicDropoff}</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.label}>參與者：</span>
                      <span>{room.participants?.map((p: any) => p.name).join(', ') || '-'}</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.label}>創建：</span>
                      <span>{formatDate(room.createdAt)}</span>
                    </div>
                  </div>
                  <div style={styles.cardActions}>
                    <button 
                      style={styles.deleteBtn}
                      onClick={() => deleteChatRoom(room.id)}
                      disabled={deleting === room.id}
                    >
                      {deleting === room.id ? '刪除中...' : '🗑️ 刪除'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Trips */}
        {activeTab === 'trips' && (
          <div style={styles.list}>
            {filteredTrips.length === 0 ? (
              <div style={styles.empty}>沒有行程</div>
            ) : (
              filteredTrips.map(trip => (
                <div key={trip.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span style={styles.cardId}>{trip.id.slice(0, 12)}...</span>
                    <span style={{
                      ...styles.badge,
                      background: trip.status === 'OPEN' ? '#e8f5e8' : '#f5f5f5'
                    }}>
                      {trip.status}
                    </span>
                  </div>
                  <div style={styles.cardBody}>
                    <div style={styles.row}>
                      <span style={styles.label}>路線：</span>
                      <span>{trip.route?.pickup?.placeName || trip.pickup} → {trip.route?.dropoff?.placeName || trip.dropoff}</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.label}>司機：</span>
                      <span>{trip.driverName}</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.label}>時間：</span>
                      <span>{trip.departureTime}</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.label}>座位：</span>
                      <span>{trip.totalSeats}</span>
                    </div>
                  </div>
                  <div style={styles.cardActions}>
                    <button 
                      style={styles.deleteBtn}
                      onClick={() => deleteTrip(trip.id)}
                      disabled={deleting === trip.id}
                    >
                      {deleting === trip.id ? '刪除中...' : '🗑️ 刪除'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Price Quotes */}
        {activeTab === 'priceQuotes' && (
          <div style={styles.list}>
            {priceQuotes.length === 0 ? (
              <div style={styles.empty}>沒有報價</div>
            ) : (
              priceQuotes.map(quote => (
                <div key={quote.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <span style={styles.cardId}>{quote.id.slice(0, 12)}...</span>
                    <span style={{
                      ...styles.badge,
                      ...(quote.status === 'pending' ? styles.pendingBadge : {}),
                      ...(quote.status === 'accepted' ? styles.acceptedBadge : {}),
                    }}>
                      {quote.status}
                    </span>
                  </div>
                  <div style={styles.cardBody}>
                    <div style={styles.row}>
                      <span style={styles.label}>報價者：</span>
                      <span>{quote.oderName} ({quote.oderRole})</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.label}>類型：</span>
                      <span>{quote.type === 'offer' ? '報價' : '還價'}</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.label}>每位：</span>
                      <span style={styles.priceHighlight}>HK$ {quote.pricePerSeat}</span>
                    </div>
                    {quote.tunnelFee > 0 && (
                      <div style={styles.row}>
                        <span style={styles.label}>隧道費：</span>
                        <span>HK$ {quote.tunnelFee}</span>
                      </div>
                    )}
                    {quote.waitingTime > 0 && (
                      <div style={styles.row}>
                        <span style={styles.label}>等候：</span>
                        <span>{quote.waitingTime} 分鐘</span>
                      </div>
                    )}
                    <div style={styles.row}>
                      <span style={styles.label}>創建：</span>
                      <span>{formatDate(quote.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div style={styles.settingsList}>
            <div style={styles.settingsSection}>
              <h3 style={styles.settingsTitle}>🔒 安全設置</h3>
              <div style={styles.settingsItem}>
                <span>管理員角色保護</span>
                <span style={styles.settingsValue}>✅ 已啟用</span>
              </div>
            </div>
            <div style={styles.settingsSection}>
              <h3 style={styles.settingsTitle}>📊 數據管理</h3>
              <div style={styles.settingsItem}>
                <span>Firebase 項目</span>
                <span style={styles.settingsValue}>cabs-agi-a779f</span>
              </div>
              <div style={styles.settingsItem}>
                <span>最後更新</span>
                <span style={styles.settingsValue}>{new Date().toLocaleString('zh-TW')}</span>
              </div>
            </div>
            <div style={styles.settingsSection}>
              <h3 style={styles.settingsTitle}>⚠️ 危險操作</h3>
              <button style={styles.dangerBtn}>
                🗑️ 刪除全部數據（需確認）
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: '#fff',
    borderBottom: '1px solid #ddd',
  },
  backBtn: {
    fontSize: 24,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#333',
  },
  refreshBtn: {
    fontSize: 20,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  logoutBtn: {
    fontSize: 13,
    padding: '6px 12px',
    background: '#ffebee',
    color: '#c62828',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    padding: 16,
    background: '#fff',
  },
  statCard: {
    background: '#fff9f5',
    borderRadius: 12,
    padding: 16,
    textAlign: 'center',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'border-color 0.2s',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 700,
    color: '#e07b4c',
  },
  statLabel: {
    fontSize: 14,
    color: '#4a3728',
    marginTop: 4,
  },
  statSub: {
    fontSize: 11,
    color: '#8b7355',
    marginTop: 4,
  },
  tabs: {
    display: 'flex',
    background: '#fff',
    borderBottom: '1px solid #ddd',
    overflowX: 'auto',
  },
  tab: {
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    fontSize: 13,
    cursor: 'pointer',
    color: '#666',
    whiteSpace: 'nowrap',
  },
  activeTab: {
    color: '#e07b4c',
    borderBottom: '3px solid #e07b4c',
  },
  searchBar: {
    padding: '12px 16px',
    background: '#fff',
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px',
    border: '2px solid #f0e0d6',
    borderRadius: 10,
    fontSize: 14,
    boxSizing: 'border-box',
  },
  content: {
    padding: 16,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  empty: {
    textAlign: 'center',
    padding: 40,
    color: '#999',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardId: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
  },
  badge: {
    fontSize: 11,
    padding: '4px 8px',
    borderRadius: 4,
    background: '#e07b4c',
    color: '#fff',
  },
  pendingBadge: {
    background: '#fff3e0',
    color: '#e07b4c',
  },
  acceptedBadge: {
    background: '#e8f5e8',
    color: '#5a9a5a',
  },
  cardBody: {
    marginBottom: 12,
  },
  row: {
    display: 'flex',
    fontSize: 13,
    marginBottom: 6,
  },
  label: {
    color: '#999',
    minWidth: 60,
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  deleteBtn: {
    padding: '8px 16px',
    background: '#ffebee',
    color: '#c62828',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
  },
  bulkActions: {
    marginBottom: 16,
  },
  dangerBtn: {
    padding: '10px 16px',
    background: '#c62828',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#f0e0d6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 600,
    color: '#4a3728',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
  },
  userEmail: {
    fontSize: 12,
    color: '#999',
  },
  roleSelect: {
    padding: '6px 10px',
    border: '2px solid #f0e0d6',
    borderRadius: 8,
    fontSize: 13,
    background: '#fff',
    cursor: 'pointer',
  },
  priceHighlight: {
    fontSize: 16,
    fontWeight: 700,
    color: '#e07b4c',
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  dashCard: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  dashTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
    marginBottom: 16,
  },
  dashRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  dashValue: {
    fontWeight: 600,
    color: '#333',
  },
  actionBtn: {
    width: '100%',
    padding: '12px',
    background: '#fff3e0',
    color: '#e07b4c',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 8,
  },
  settingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  settingsSection: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
    marginBottom: 16,
  },
  settingsItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    color: '#666',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  settingsValue: {
    color: '#333',
    fontWeight: 500,
  },
}