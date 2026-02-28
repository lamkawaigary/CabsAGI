import { type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import Icons from '../components/Icons'

type DriverNavItem = {
  path: '/driver' | '/driver/messages'
  label: string
  icon: ReactNode
}

const driverNavItems: DriverNavItem[] = [
  { path: '/driver', label: '接單中心', icon: <Icons.Car /> },
  { path: '/driver/messages', label: '司機訊息', icon: <Icons.Message /> },
]

export default function DriverLayout() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(86px + env(safe-area-inset-bottom))' }}>
      <Outlet />
      <nav
        style={{
          position: 'fixed',
          left: 10,
          right: 10,
          bottom: 10,
          borderRadius: 16,
          border: '1px solid #cfddd6',
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(8px)',
          padding: '8px 10px',
          display: 'grid',
          gridTemplateColumns: `repeat(${driverNavItems.length},1fr)`,
          gap: 4,
          zIndex: 35,
        }}
      >
        {driverNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              textDecoration: 'none',
              borderRadius: 12,
              background: isActive ? '#e3f3eb' : 'transparent',
              color: isActive ? '#1f4f43' : '#678079',
              display: 'grid',
              justifyItems: 'center',
              gap: 3,
              padding: '7px 6px',
              fontSize: 11,
              fontWeight: 800,
            })}
          >
            <span style={{ width: 20, height: 20 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
