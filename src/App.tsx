// Cabs Carpool - App (Simplified Chat-Centric)
// Version: 3.0

import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

const ShiftHome = lazy(() => import('./pages/ShiftHome'))
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'))
const DriverLanding = lazy(() => import('./pages/DriverLanding'))
const PassengerHome = lazy(() => import('./pages/PassengerHome'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))


function Loading({ text = '載入中...' }: { text?: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f5f5' }}>
      <div style={{ textAlign: 'center', color: '#666' }}>{text}</div>
    </div>
  )
}

function getUserRole(role: string | undefined): 'admin' | 'driver' | 'passenger' {
  if (!role) return 'passenger'
  const normalized = role.toLowerCase()
  if (normalized === 'driver') return 'driver'
  if (normalized === 'admin' || normalized.startsWith('admin')) return 'admin'
  return 'passenger'
}

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
  
  if (loading) return <Loading text="驗證中..." />

  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Root - redirect to role-based dashboard */}
          <Route path="/" element={
            currentUser 
              ? <Navigate to={getDashboardPath(currentUser.role)} replace />
              : <ShiftHome />
          } />
          
          {/* Driver routes */}
          <Route path="/driver" element={
            currentUser 
              ? (userRole === 'driver' ? <DriverDashboard /> : <Navigate to={getDashboardPath(currentUser.role)} replace />)
              : <DriverLanding />
          } />
          
          {/* Passenger routes */}
          <Route path="/dashboard" element={
            currentUser 
              ? (userRole === 'passenger' ? <PassengerHome /> : <Navigate to={getDashboardPath(currentUser.role)} replace />)
              : <Navigate to="/" replace />
          } />
          
          {/* Chat */}
          <Route path="/chat/:roomId" element={
            currentUser 
              ? <ChatPage />
              : <Navigate to="/" replace />
          } />
          
          {/* Profile */}
          <Route path="/profile" element={
            currentUser 
              ? <ProfilePage />
              : <Navigate to="/" replace />
          } />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
