import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MessageProvider } from './context/MessageContext'

const ShiftHome = lazy(() => import('./pages/ShiftHome'))
const Landing = lazy(() => import('./pages/Landing'))
const RouteDetail = lazy(() => import('./pages/RouteDetail'))
const BookingPage = lazy(() => import('./pages/BookingPage'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const ProfilePage = lazy(() => import('./pages/Profile'))
const AdminConsole = lazy(() => import('./pages/AdminConsole'))
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'))

function FullscreenLoading({ text }: { text: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f5f5' }}>
      <div style={{ textAlign: 'center', color: '#666' }}>{text}</div>
    </div>
  )
}

function normalizeRole(role: string | undefined): string {
  if (!role) return 'passenger'
  const normalized = role.toLowerCase()
  if (normalized.includes('admin')) return 'admin'
  if (normalized.includes('driver')) return 'driver'
  return 'passenger'
}

function AppShell() {
  const { loading, currentUser } = useAuth()
  
  if (loading) return <FullscreenLoading text="驗證登入狀態中..." />

  return (
    <BrowserRouter>
      <Suspense fallback={<FullscreenLoading text="頁面載入中..." />}>
        <Routes>
          {/* public */}
          <Route path="/" element={<ShiftHome />} />
          <Route path="/login" element={currentUser ? <Navigate to="/" replace /> : <Landing />} />

          {/* auth required */}
          <Route path="/route/:routeId" element={currentUser ? <RouteDetail /> : <Navigate to="/login" />} />
          <Route path="/booking/:shiftId" element={currentUser ? <BookingPage /> : <Navigate to="/login" />} />
          <Route path="/my-bookings" element={currentUser ? <ShiftHome /> : <Navigate to="/login" />} />
          <Route path="/messages" element={currentUser ? <MessagesPage /> : <Navigate to="/login" />} />
          <Route path="/profile" element={currentUser ? <ProfilePage /> : <Navigate to="/login" />} />
          
          {/* admin */}
          <Route path="/admin" element={currentUser && normalizeRole(currentUser.role) === 'admin' ? <AdminConsole /> : <Navigate to="/" />} />
          
          {/* driver */}
          <Route path="/driver" element={currentUser && normalizeRole(currentUser.role) === 'driver' ? <DriverDashboard /> : <Navigate to="/" />} />

          {/* catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MessageProvider>
        <AppShell />
      </MessageProvider>
    </AuthProvider>
  )
}
