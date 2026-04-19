// Cabs Carpool - App (Simplified v2)
// Version: 4.0

import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

const HomePage = lazy(() => import('./pages/HomePage'))
const BrowsePage = lazy(() => import('./pages/BrowsePage'))
const MyPage = lazy(() => import('./pages/MyPage'))
const TripsPage = lazy(() => import('./pages/TripsPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))


function Loading({ text = '載入中...' }: { text?: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f5f5' }}>
      <div style={{ textAlign: 'center', color: '#666' }}>{text}</div>
    </div>
  )
}

function AppShell() {
  const { loading } = useAuth()
  
  if (loading) return <Loading text="驗證中..." />

  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Root - Home Page */}
          <Route path="/" element={<HomePage />} />
          
          {/* Browse - trips or requests */}
          <Route path="/browse" element={<BrowsePage />} />
          
          {/* My - profile page */}
          <Route path="/my" element={<MyPage />} />
          
          {/* Trips - user's trips */}
          <Route path="/trips" element={<TripsPage />} />
          
          {/* Chat */}
          <Route path="/chat/:roomId" element={<ChatPage />} />
          
          {/* Profile */}
          <Route path="/profile" element={<ProfilePage />} />
          
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
