// Cabs Carpool - Simplified Home Page v1.1
// 暖色珊瑚主題

import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>🚗 Cabs</div>
        <button style={styles.profileBtn} onClick={() => navigate('/my')}>
          👤
        </button>
      </header>

      {/* Hero Section */}
      <div style={styles.hero}>
        <div style={styles.heroIcon}>🚗</div>
        <h1 style={styles.heroTitle}>共乘出行</h1>
        <p style={styles.heroSubtitle}>
          找尋或發布共乘行程<br/>
          直接與司機/乘客聊天配對
        </p>
      </div>

      {/* Mode Selection */}
      <div style={styles.modes}>
        <button 
          style={styles.modeCard}
          onClick={() => navigate('/browse')}
        >
          <div style={styles.modeIcon}>👤</div>
          <div style={styles.modeTitle}>我要乘車</div>
          <div style={styles.modeSubtitle}>瀏覽司機行程</div>
        </button>

        <button 
          style={styles.modeCard}
          onClick={() => navigate('/browse')}
        >
          <div style={styles.modeIcon}>🚗</div>
          <div style={styles.modeTitle}>我要接人</div>
          <div style={styles.modeSubtitle}>瀏覽乘客需求</div>
        </button>
      </div>

      {/* Bottom Navigation */}
      <nav style={styles.bottomNav}>
        <button style={styles.navItemActive} onClick={() => navigate('/')}>
          首頁
        </button>
        <button style={styles.navItem} onClick={() => navigate('/browse')}>
          📍 瀏覽
        </button>
        <button style={styles.navItem} onClick={() => navigate('/my')}>
          👤 我的
        </button>
      </nav>
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
    fontSize: 20,
    fontWeight: 700,
    color: '#e07b4c',
  },
  loginBtn: {
    padding: '8px 16px',
    borderRadius: 20,
    border: '1px solid #e07b4c',
    background: '#fff',
    color: '#e07b4c',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
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
  hero: {
    textAlign: 'center',
    padding: '60px 24px 40px',
  },
  heroIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#4a3728',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#8b7355',
    lineHeight: 1.6,
  },
  modes: {
    padding: '0 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  modeCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 24px',
    background: '#fff',
    border: '2px solid #f0e0d6',
    borderRadius: 20,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#4a3728',
    marginBottom: 4,
  },
  modeSubtitle: {
    fontSize: 13,
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
    padding: '8px',
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
    padding: '8px',
    background: 'none',
    border: 'none',
    fontSize: 12,
    color: '#e07b4c',
    fontWeight: 600,
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: 20,
    padding: 32,
    margin: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#4a3728',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 14,
    color: '#8b7355',
    lineHeight: 1.8,
    marginBottom: 24,
  },
  modalBtn: {
    width: '100%',
    padding: 16,
    background: 'linear-gradient(135deg, #e07b4c, #c4623a)',
    color: '#fff',
    border: 'none',
    borderRadius: 16,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
