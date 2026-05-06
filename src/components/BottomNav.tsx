import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const isDriver = currentUser?.role === 'driver'

  const driverTabs = [
    { path: '/driver-home', icon: 'home', label: '首頁' },
    { path: '/browse-requests', icon: 'search', label: '找需求' },
    { path: '/create-trip', icon: 'add_location_alt', label: '發車' },
    { path: '/chats', icon: 'chat_bubble', label: '收件箱' },
    { path: '/profile', icon: 'account_circle', label: '個人' },
  ]

  const passengerTabs = [
    { path: '/passenger-home', icon: 'explore', label: '探索' },
    { path: '/my-trips', icon: 'directions_car', label: '行程' },
    { path: '/create-request', icon: 'add_box', label: '發佈' },
    { path: '/chats', icon: 'chat_bubble', label: '收件箱' },
    { path: '/profile', icon: 'account_circle', label: '個人' },
  ]

  const tabs = isDriver ? driverTabs : passengerTabs

  return (
    <nav style={{ 
      position: 'fixed', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      display: 'flex', 
      justifyContent: 'space-around', 
      alignItems: 'center', 
      padding: '8px 0 24px', 
      background: 'rgba(255,255,255,0.95)', 
      backdropFilter: 'blur(12px)', 
      borderTop: '1px solid #d8c3ad', 
      zIndex: 50, 
      borderRadius: '2rem 2rem 0 0', 
      boxShadow: '0 -8px 30px rgba(29,78,216,0.06)' 
    }}>
      {tabs.map(tab => {
        const active = location.pathname === tab.path
        return (
          <button 
            key={tab.path} 
            onClick={() => navigate(tab.path)} 
            style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: 4, 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              padding: '8px 4px', 
              borderRadius: '1rem' 
            }}
          >
            <span style={{ 
              fontFamily: "'Material Symbols Outlined'", 
              fontSize: 24, 
              color: active ? '#f59e0b' : '#5f5f59', 
              fontVariationSettings: active 
                ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" 
                : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" 
            }}>{tab.icon}</span>
            <span style={{ 
              fontSize: 10, 
              fontWeight: 600, 
              letterSpacing: '0.05em', 
              color: '#5f5f59', 
              marginTop: 2 
            }}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}