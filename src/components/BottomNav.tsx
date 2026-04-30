// Cabs Carpool - Consistent Bottom Navigation
// 所有頁面使用相同的底部導航

import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser } = useAuth()
  
  if (!currentUser) return null
  
  const role = currentUser.role
  
  // Define nav items based on role
  // 司機流程：行程 → 需求 → 聊天 → 設定
  const navItems = role === 'driver' ? [
    { path: '/driver-trips', label: '🚗 行程', icon: '🚗' },
    { path: '/browse-requests', label: '📋 需求', icon: '📋' },
    { path: '/chats', label: '💬 聊天', icon: '💬' },
    { path: '/driver-settings', label: '⚙️', icon: '⚙️' },
  ] : [
    { path: '/passenger-home', label: '🔍 找車', icon: '🔍' },
    { path: '/my-requests', label: '📋 需求', icon: '📋' },
    { path: '/chats', label: '💬 聊天', icon: '💬' },
    { path: '/passenger-settings', label: '⚙️', icon: '⚙️' },
  ]
  
  // Check if current path matches nav item
  const isActive = (path: string) => {
    if (path === '/driver-trips' && location.pathname === '/driver-trips') return true
    if (path === '/driver-home' && location.pathname === '/driver-home') return true
    if (path === '/passenger-home' && location.pathname === '/passenger-home') return true
    return location.pathname.startsWith(path)
  }
  
  return (
    <nav style={styles.nav}>
      {navItems.map((item) => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          style={{
            ...styles.navItem,
            ...(isActive(item.path) ? styles.navItemActive : {})
          }}
        >
          
          <span style={styles.label}>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    background: '#fff',
    borderTop: '2px solid #f0e0d6',
    padding: '8px 0',
    paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
    zIndex: 100,
  },
  navItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#8b7355',
    gap: 4,
  },
  navItemActive: {
    color: '#e07b4c',
    fontWeight: 600,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: 11,
  },
}