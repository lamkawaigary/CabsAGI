import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MessageProvider } from './context/MessageContext'

const Landing = lazy(() => import('./pages/Landing'))
const PassengerHome = lazy(() => import('./pages/PassengerHome'))
const OrdersPage = lazy(() => import('./pages/Orders'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const ProfilePage = lazy(() => import('./pages/Profile'))
const AdminConsole = lazy(() => import('./pages/AdminConsole'))
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'))
const PassengerLayout = lazy(() => import('./layouts/PassengerLayout'))
const DriverLayout = lazy(() => import('./layouts/DriverLayout'))

function FullscreenLoading({ text }: { text: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(150deg, #f2f1e8 0%, #edf5f1 100%)',
        fontFamily: 'Avenir Next, SF Pro Display, Noto Sans TC, PingFang TC, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', color: '#2b4f46' }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: '3px solid #bfd6ca',
            borderTopColor: '#1f4f44',
            margin: '0 auto 10px',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        {text}
        <style>{'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg);} }'}</style>
      </div>
    </div>
  )
}

function RequireAuth() {
  const { currentUser } = useAuth()
  return currentUser ? <Outlet /> : <Navigate to="/login" replace />
}

const normalizeRole = (role: string | undefined) => {
  if (!role) return 'passenger'
  const normalized = role.trim().toLowerCase()
  if (normalized === 'driver' || normalized.startsWith('driver')) return 'driver'
  if (normalized === 'admin' || normalized.startsWith('admin') || normalized.includes('admin_')) {
    return 'admin'
  }
  if (normalized === 'passenger' || normalized.startsWith('passenger')) return 'passenger'
  return 'passenger'
}

function RequireAdmin() {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  return normalizeRole(currentUser.role) === 'admin' ? <Outlet /> : <Navigate to="/home" replace />
}

function RequireDriver() {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  return normalizeRole(currentUser.role) === 'driver' ? <Outlet /> : <Navigate to="/home" replace />
}

const getDefaultAuthPath = (role: string | undefined) => {
  const normalized = normalizeRole(role)
  if (normalized === 'admin') return '/admin'
  if (normalized === 'driver') return '/driver'
  return '/home'
}

function PublicOnly() {
  const { currentUser } = useAuth()
  return currentUser ? <Navigate to={getDefaultAuthPath(currentUser.role)} replace /> : <Outlet />
}

function CatchAllRedirect() {
  const { currentUser } = useAuth()
  return <Navigate to={currentUser ? getDefaultAuthPath(currentUser.role) : '/login'} replace />
}

function AppShell() {
  const { loading } = useAuth()
  if (loading) return <FullscreenLoading text="驗證登入狀態中..." />

  return (
    <BrowserRouter>
      <Suspense fallback={<FullscreenLoading text="頁面載入中..." />}>
        <Routes>
          <Route element={<PublicOnly />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Landing />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<PassengerLayout />}>
              <Route path="/home" element={<PassengerHome />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminConsole />} />
            </Route>
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<RequireDriver />}>
              <Route element={<DriverLayout />}>
                <Route path="/driver" element={<DriverDashboard />} />
                <Route path="/driver/orders" element={<DriverDashboard />} />
                <Route path="/driver/messages" element={<MessagesPage />} />
                <Route path="/driver/profile" element={<ProfilePage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<CatchAllRedirect />} />
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
