import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Icons from '../components/Icons'
import { useAuth } from '../context/AuthContext'

type DriverNavItem = {
  path: '/driver' | '/driver/orders' | '/driver/messages' | '/driver/profile'
  label: string
  icon: ReactNode
}

const driverNavItems: DriverNavItem[] = [
  { path: '/driver', label: '接單', icon: <Icons.Clipboard /> },
  { path: '/driver/orders', label: '行程', icon: <Icons.Car /> },
  { path: '/driver/messages', label: '訊息', icon: <Icons.Message /> },
  { path: '/driver/profile', label: '我的', icon: <Icons.User /> },
]

export default function DriverLayout() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const pageTitle = useMemo(() => {
    const active = driverNavItems.find((item) => location.pathname.startsWith(item.path))
    return active?.label || '司機中心'
  }, [location.pathname])
  const activeIndex = Math.max(
    1,
    driverNavItems.findIndex((item) => location.pathname.startsWith(item.path)) + 1,
  )

  useEffect(() => {
    if (!menuOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeydown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [menuOpen])

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
    background: 'linear-gradient(160deg, #1a2332 0%, #2d3d4f 50%, #1f3d4f 100%)',
    fontFamily: 'Avenir Next, SF Pro Display, Noto Sans TC, PingFang TC, sans-serif',
    paddingBottom: 'calc(86px + env(safe-area-inset-bottom, 0px))',
    color: '#f3fff8',
  } as const

  const headerStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backdropFilter: 'blur(8px)',
    background: 'rgba(26,35,50,0.9)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    padding: '14px 18px',
    paddingTop: 'max(14px, env(safe-area-inset-top, 0px))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as const

  const menuButtonStyle = {
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.08)',
    width: 42,
    height: 42,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    color: '#f3fff8',
  } as const

  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    textDecoration: 'none',
    borderRadius: 12,
    background: isActive ? 'rgba(31,191,144,0.2)' : 'transparent',
    color: isActive ? '#1fbf90' : 'rgba(243,255,248,0.5)',
    display: 'grid',
    justifyItems: 'center',
    gap: 3,
    padding: '7px 6px',
    fontSize: 11,
    fontWeight: 700,
    transition: 'all 0.2s ease',
  })

  return (
    <main style={shellStyle}>
      <header style={{ ...headerStyle, paddingTop: 'max(18px, env(safe-area-inset-top, 0px))' }}>
        <div>
          <div style={{ letterSpacing: '0.12em', fontSize: 11, color: 'rgba(243,255,248,0.5)', fontWeight: 700 }}>CABS DRIVER</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#f3fff8' }}>{pageTitle} · {currentUser?.name}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(243,255,248,0.72)' }}>
            專注接單、行程與即時訊息處理
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                borderRadius: 999,
                border: '1px solid rgba(31,191,144,0.35)',
                background: 'rgba(31,191,144,0.16)',
                padding: '3px 8px',
                fontWeight: 700,
                color: '#c7ffed',
              }}
            >
              目前分頁 {activeIndex}/{driverNavItems.length}
            </span>
          </div>
        </div>
        <button type="button" aria-label="開啟司機功能菜單" onClick={() => setMenuOpen(true)} style={menuButtonStyle}>
          <Icons.Menu />
        </button>
      </header>

      {menuOpen && (
        <div
          role="presentation"
          aria-label="關閉司機功能菜單遮罩"
          style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(10,20,16,0.5)' }}
          onClick={() => setMenuOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="司機功能菜單"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 290,
              background: '#1a2332',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              padding: 18,
              display: 'grid',
              gridTemplateRows: 'auto 1fr auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#f3fff8' }}>司機功能菜單</div>
                <div style={{ fontSize: 12, color: 'rgba(243,255,248,0.5)' }}>快速切換與帳戶動作</div>
              </div>
              <button
                type="button"
                aria-label="關閉司機功能菜單"
                onClick={() => setMenuOpen(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#f3fff8',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <Icons.X />
              </button>
            </div>
            <div style={{ marginTop: 18, display: 'grid', gap: 8, alignContent: 'start' }}>
              {driverNavItems.map((item) => {
                const active = location.pathname.startsWith(item.path)
                return (
                  <button
                    type="button"
                    key={item.path}
                    onClick={() => {
                      navigate(item.path)
                      setMenuOpen(false)
                    }}
                    style={{
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: active ? 'rgba(31,191,144,0.15)' : 'rgba(255,255,255,0.05)',
                      color: active ? '#1fbf90' : '#f3fff8',
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
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              style={{
                border: 0,
                borderRadius: 10,
                background: '#dc3545',
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
          left: 16,
          right: 16,
          bottom: 'max(10px, env(safe-area-inset-bottom, 0px))',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(26,35,50,0.98)',
          backdropFilter: 'blur(12px)',
          padding: '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: 4,
          zIndex: 15,
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        }}
      >
        {driverNavItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            end={item.path === '/driver'}
            style={({ isActive }) => ({
              ...navLinkStyle({ isActive }),
              background: isActive ? 'rgba(31,191,144,0.25)' : 'transparent',
              color: isActive ? '#1fbf90' : 'rgba(243,255,248,0.5)',
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
