import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MessageProvider } from './context/MessageContext'

const ShiftHome = lazy(() => import('./pages/ShiftHome'))
const PassengerDashboard = lazy(() => import('./pages/PassengerDashboard'))
const RouteDetail = lazy(() => import('./pages/RouteDetail'))
const BookingPage = lazy(() => import('./pages/BookingPage'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const ProfilePage = lazy(() => import('./pages/Profile'))
const AdminConsole = lazy(() => import('./pages/AdminConsole'))
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'))
const DriverLanding = lazy(() => import('./pages/DriverLanding'))
const ChatPage = lazy(() => import('./pages/ChatPage'))

function FullscreenLoading({ text }: { text: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f5f5' }}>
      <div style={{ textAlign: 'center', color: '#666' }}>{text}</div>
    </div>
  )
}

function getUserRole(role: string | undefined): 'admin' | 'driver' | 'passenger' {
  if (!role) return 'passenger'
  const normalized = role.toLowerCase()
  if (normalized.includes('admin')) return 'admin'
  if (normalized.includes('driver')) return 'driver'
  return 'passenger'
}

// Get the appropriate dashboard based on user role
function getDashboardPath(role: string | undefined): string {
  const userRole = getUserRole(role)
  switch (userRole) {
    case 'admin': return '/admin'
    case 'driver': return '/driver'
    default: return '/dashboard'
  }
}

function AppShell() {
  const { loading, currentUser } = useAuth()
  const userRole = currentUser ? getUserRole(currentUser.role) : null
  
  if (loading) return <FullscreenLoading text="驗證登入狀態中..." />

  return (
    <BrowserRouter>
      <Suspense fallback={<FullscreenLoading text="頁面載入中..." />}>
        <Routes>
          {/* Root path - redirect to appropriate dashboard based on role */}
          <Route path="/" element={
            currentUser 
              ? <Navigate to={getDashboardPath(currentUser.role)} replace />
              : <ShiftHome />
          } />
          
          {/* Driver page - accessible without login */}
          <Route path="/driver" element={
            currentUser 
              ? (userRole === 'driver' 
                  ? <DriverDashboard /> 
                  : <Navigate to={getDashboardPath(currentUser.role)} replace />)
              : <DriverLanding />
          } />

          {/* Auth required - route to appropriate dashboard based on role */}
          {currentUser && (
            <>
              <Route path="/dashboard" element={
                userRole === 'passenger' 
                  ? <PassengerDashboard /> 
                  : <Navigate to={getDashboardPath(currentUser.role)} replace />
              } />
              <Route path="/route/:routeId" element={
                userRole === 'passenger' 
                  ? <RouteDetail /> 
                  : <Navigate to={getDashboardPath(currentUser.role)} replace />
              } />
              <Route path="/booking/:shiftId" element={
                userRole === 'passenger' 
                  ? <BookingPage /> 
                  : <Navigate to={getDashboardPath(currentUser.role)} replace />
              } />
              <Route path="/my-bookings" element={
                userRole === 'passenger' 
                  ? <PassengerDashboard /> 
                  : <Navigate to={getDashboardPath(currentUser.role)} replace />
              } />
              <Route path="/messages" element={
                userRole === 'passenger' 
                  ? <MessagesPage /> 
                  : <Navigate to={getDashboardPath(currentUser.role)} replace />
              } />
              <Route path="/chat/:conversationId" element={
                currentUser ? <ChatPage /> : <Navigate to="/" replace />
              } />
              <Route path="/driver/chat/:conversationId" element={
                currentUser ? <ChatPage /> : <Navigate to="/driver" replace />
              } />
              <Route path="/profile" element={
                <ProfilePage />
              } />
              
              {/* Admin only */}
              <Route path="/admin" element={
                userRole === 'admin' 
                  ? <AdminConsole /> 
                  : <Navigate to={getDashboardPath(currentUser.role)} replace />
              } />
            </>
          )}

          {/* Catch all - route to appropriate place */}
          <Route path="*" element={
            currentUser 
              ? <Navigate to={getDashboardPath(currentUser.role)} replace />
              : <Navigate to="/" replace />
          } />
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
