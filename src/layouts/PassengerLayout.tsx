import { useMemo, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Icons from '../components/Icons'
import { useAuth } from '../context/AuthContext'

type NavItem = {
  path: '/home' | '/orders' | '/messages' | '/profile'
  label: string
  icon: ReactNode
}

const navItems: NavItem[] = [
  { path: '/home', label: '叫車', icon: <Icons.Home /> },
  { path: '/orders', label: '訂單', icon: <Icons.Clipboard /> },
  { path: '/messages', label: '訊息', icon: <Icons.Message /> },
  { path: '/profile', label: '我的', icon: <Icons.User /> },
]

export default function PassengerLayout() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const pageTitle = useMemo(() => {
    const active = navItems.find((item) => location.pathname.startsWith(item.path))
    return active?.label || '乘客中心'
  }, [location.pathname])

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
      setMenuOpen(false)
    }
  }

  const shellStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #f6faf7 0%, #eef5f4 50%, #f8f6ef 100%)',
    fontFamily: 'Avenir Next, SF Pro Display, Noto Sans TC, PingFang TC, sans-serif',
    paddingBottom: 86,
  } as const

  return (
    <main style={shellStyle}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(8px)',
          background: 'rgba(246,250,247,0.85)',
          borderBottom: '1px solid #dce6dd',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ letterSpacing: '0.12em', fontSize: 11, color: '#6a827a', fontWeight: 700 }}>CABS PASSENGER</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#1f4038' }}>{pageTitle} · {currentUser?.name}</div>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          style={{
            border: '1px solid #d3e0d6',
            borderRadius: 12,
            background: '#fff',
            width: 42,
            height: 42,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            color: '#245045',
          }}
        >
          <Icons.Menu />
        </button>
      </header>

      {menuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(10,20,16,0.34)' }}
          onClick={() => setMenuOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 290,
              background: '#fffefb',
              borderLeft: '1px solid #dae5dc',
              padding: 18,
              display: 'grid',
              gridTemplateRows: 'auto 1fr auto',
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#25473f' }}>功能菜單</div>
              <div style={{ fontSize: 12, color: '#6c7f79' }}>快速切換頁面與帳戶動作</div>
            </div>
            <div style={{ marginTop: 18, display: 'grid', gap: 8, alignContent: 'start' }}>
              {navItems.map((item) => {
                const active = location.pathname.startsWith(item.path)
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path)
                      setMenuOpen(false)
                    }}
                    style={{
                      border: '1px solid #d9e6dd',
                      background: active ? '#eaf4ef' : '#fff',
                      color: '#22443c',
                      padding: '10px 12px',
                      borderRadius: 10,
                      textAlign: 'left',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                )
              })}
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => {
                    navigate('/admin')
                    setMenuOpen(false)
                  }}
                  style={{
                    border: '1px solid #cadfd2',
                    background: '#eef6f1',
                    color: '#21443b',
                    padding: '10px 12px',
                    borderRadius: 10,
                    textAlign: 'left',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  管理後台
                </button>
              )}
            </div>
            <button
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              style={{
                border: 0,
                borderRadius: 10,
                background: '#1f473e',
                color: '#f1fff8',
                fontWeight: 700,
                padding: '11px 12px',
                cursor: loggingOut ? 'not-allowed' : 'pointer',
                opacity: loggingOut ? 0.6 : 1,
              }}
            >
              {loggingOut ? '登出中...' : '登出'}
            </button>
          </aside>
        </div>
      )}

      <section style={{ padding: '18px 16px' }}>
        <Outlet />
      </section>

      <nav
        style={{
          position: 'fixed',
          left: 10,
          right: 10,
          bottom: 10,
          borderRadius: 16,
          border: '1px solid #d6e0d8',
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(8px)',
          padding: '8px 10px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: 4,
          zIndex: 15,
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              textDecoration: 'none',
              borderRadius: 12,
              background: isActive ? '#e7f2ec' : 'transparent',
              color: isActive ? '#1f4f43' : '#678079',
              display: 'grid',
              justifyItems: 'center',
              gap: 3,
              padding: '7px 6px',
              fontSize: 11,
              fontWeight: 700,
            })}
          >
            <span style={{ width: 20, height: 20 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </main>
  )
}
