// Cabs Carpool - My Page v1.2
// 暖色珊瑚主題 + 登入功能

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoginModal from '../components/LoginModal'

export default function MyPage() {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  // Guest view (not logged in)
  if (!currentUser) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.title}>👤 我的</div>
          <div style={{width: 40}} />
        </header>

        <div style={styles.guestSection}>
          <div style={styles.guestIcon}>👤</div>
          <h2 style={styles.guestTitle}>登入以使用完整功能</h2>
          <p style={styles.guestText}>
            登入後可以：<br/>
            • 發布行程或需求<br/>
            • 加入聊天配對<br/>
            • 確認共乘
          </p>
          <button 
            style={styles.loginBtn}
            onClick={() => setShowLoginModal(true)}
          >
            登入 / 註冊
          </button>
        </div>

        {/* Bottom Navigation */}
        <nav style={styles.bottomNav}>
          <button style={styles.navItem} onClick={() => navigate('/')}>
            首頁
          </button>
          <button style={styles.navItem} onClick={() => navigate('/browse')}>
            📍 瀏览
          </button>
          <button style={styles.navItemActive} onClick={() => navigate('/my')}>
            👤 我的
          </button>
        </nav>

        {/* Login Modal */}
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => setShowLoginModal(false)}
        />
      </div>
    )
  }

  // Logged in view
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.title}>👤 我的</div>
        <div style={{width: 40}} />
      </header>

      {/* User Profile */}
      <div style={styles.profileSection}>
        <div style={styles.avatar}>
          {currentUser.name?.charAt(0) || '?'}
        </div>
        <div style={styles.userName}>{currentUser.name || '用户'}</div>
        <div style={styles.userPhone}>{currentUser.phone || '未设定电话'}</div>
      </div>

      {/* Quick Links */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>快捷操作</div>
        <div style={styles.menuItem} onClick={() => navigate('/browse')}>
          <span>📍 浏览行程</span>
          <span style={styles.arrow}>›</span>
        </div>
        <div style={styles.menuItem} onClick={() => navigate('/trips')}>
          <span>🚗 我的行程</span>
          <span style={styles.arrow}>›</span>
        </div>
      </div>

      {/* Settings */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>设定</div>
        <div style={styles.menuItem}>
          <span>✏️ 编辑昵称</span>
          <span style={styles.arrow}>›</span>
        </div>
        <div style={styles.menuItem}>
          <span>🔄 切换为司机模式</span>
          <span style={styles.arrow}>›</span>
        </div>
        <div style={{...styles.menuItem, ...styles.logoutItem}} onClick={handleLogout}>
          <span>🚪 登出</span>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav style={styles.bottomNav}>
        <button style={styles.navItem} onClick={() => navigate('/')}>
          首页
        </button>
        <button style={styles.navItem} onClick={() => navigate('/browse')}>
          📍 浏览
        </button>
        <button style={styles.navItemActive} onClick={() => navigate('/my')}>
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
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    background: '#fff',
    borderBottom: '2px solid #f0e0d6',
  },
  title: {
    fontSize: 17,
    fontWeight: 600,
    color: '#4a3728',
  },
  // Guest
  guestSection: {
    textAlign: 'center' as const,
    padding: '60px 24px',
  },
  guestIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#4a3728',
    marginBottom: 12,
  },
  guestText: {
    fontSize: 14,
    color: '#8b7355',
    lineHeight: 1.8,
    marginBottom: 24,
  },
  loginBtn: {
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
  // Profile
  profileSection: {
    background: 'linear-gradient(135deg, #e07b4c, #c4623a)',
    padding: 36,
    textAlign: 'center' as const,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    color: '#fff',
    margin: '0 auto 14px',
  },
  userName: {
    fontSize: 22,
    fontWeight: 600,
    color: '#fff',
  },
  userPhone: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },
  // Sections
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
  menuItem: {
    background: '#fff',
    border: '2px solid #f0e0d6',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 15,
    color: '#4a3728',
    cursor: 'pointer',
  },
  arrow: {
    color: '#8b7355',
    fontSize: 18,
  },
  logoutItem: {
    color: '#c62828',
    marginTop: 16,
  },
  // Bottom Nav
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
    flexDirection: 'column' as const,
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
}
