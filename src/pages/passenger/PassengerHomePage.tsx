// Cabs Carpool - Passenger Home Page v1.0
// 乘客專屬首頁

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import BottomNav from '../../components/BottomNav'

export default function PassengerHomePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>🔍 找車</div>
        <button style={styles.profileBtn} onClick={() => navigate('/passenger-settings')}>
          👤
        </button>
      </header>

      {/* Welcome */}
      <div style={styles.welcome}>
        <div style={styles.welcomeIcon}>👤</div>
        <h1 style={styles.welcomeTitle}>你好，{currentUser?.name || '乘客'}</h1>
        <p style={styles.welcomeSubtitle}>找車或發布乘車需求</p>
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>快捷操作</div>
        
        <button style={styles.actionCard} onClick={() => navigate('/create-request')}>
          <div style={styles.actionIcon}>📋</div>
          <div style={styles.actionContent}>
            <div style={styles.actionTitle}>發布需求</div>
            <div style={styles.actionSubtitle}>讓司機主動聯絡你</div>
          </div>
          <span style={styles.arrow}>›</span>
        </button>

        <button style={styles.actionCard} onClick={() => navigate('/browse-trips')}>
          <div style={styles.actionIcon}>🚗</div>
          <div style={styles.actionContent}>
            <div style={styles.actionTitle}>瀏覽行程</div>
            <div style={styles.actionSubtitle}>找尋合適的司機行程</div>
          </div>
          <span style={styles.arrow}>›</span>
        </button>

        <button style={styles.actionCard} onClick={() => navigate('/my-requests')}>
          <div style={styles.actionIcon}>📋</div>
          <div style={styles.actionContent}>
            <div style={styles.actionTitle}>我的需求</div>
            <div style={styles.actionSubtitle}>查看已發布的需求</div>
          </div>
          <span style={styles.arrow}>›</span>
        </button>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: '#fff',
    borderBottom: '2px solid #f0e0d6',
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    color: '#e07b4c',
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'rgba(224,123,76,0.15)',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
  },
  welcome: {
    textAlign: 'center',
    padding: '40px 24px',
    background: 'linear-gradient(135deg, #e07b4c, #c4623a)',
    color: '#fff',
  },
  welcomeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#e07b4c',
    marginBottom: 12,
    letterSpacing: 1,
  },
  actionCard: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    background: '#fff',
    border: '2px solid #f0e0d6',
    borderRadius: 16,
    marginBottom: 12,
    cursor: 'pointer',
    textAlign: 'left',
  },
  actionIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#4a3728',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#8b7355',
  },
  arrow: {
    fontSize: 20,
    color: '#8b7355',
  },
  bottomNav: {
    position: 'fixed',
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
    flexDirection: 'column',
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
    flexDirection: 'column',
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
