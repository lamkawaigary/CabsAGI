// Cabs Carpool - App v7.0 (Cleaned)
// Version: 7.0 - Single BrowserRouter, clean routing

import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// ============ Driver Pages ============
const DriverHomePage = lazy(() => import('./pages/driver/DriverHomePage'))
const DriverTripsManager = lazy(() => import('./pages/driver/DriverTripsManager'))
const DriverBrowsePage = lazy(() => import('./pages/driver/DriverBrowsePage'))
const DriverSettingsPage = lazy(() => import('./pages/driver/DriverSettingsPage'))
const EditTripPage = lazy(() => import('./pages/driver/EditTripPage'))
const CreateTripPage = lazy(() => import('./pages/CreateTripPage'))

// ============ Passenger Pages ============
const PassengerHomePage = lazy(() => import('./pages/passenger/PassengerHomePage'))
const PassengerBrowsePage = lazy(() => import('./pages/passenger/PassengerBrowsePage'))
const MyTripsPage = lazy(() => import('./pages/passenger/MyTripsPage'))
const PassengerSettingsPage = lazy(() => import('./pages/passenger/PassengerSettingsPage'))
const FavoritePlacesPage = lazy(() => import('./pages/passenger/FavoritePlacesPage'))
const CreateRequestPage = lazy(() => import('./pages/passenger/CreateRequestPage'))

// ============ Shared Pages ============
const LandingPage = lazy(() => import('./pages/LandingPage'))
const RoleSelectionPage = lazy(() => import('./pages/RoleSelectionPage'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))
const ChatsListPage = lazy(() => import('./pages/ChatsListPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ListingDetailPage = lazy(() => import('./pages/ListingDetailPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const NotificationBanner = lazy(() => import('./components/NotificationBanner'))
const BottomNav = lazy(() => import('./components/BottomNav'))

// Debug/Test Pages (Development Only)

function Loading({ text = '載入中...' }: { text?: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#fff9f5' }}>
      <div style={{ textAlign: 'center', color: '#8b7355' }}>{text}</div>
    </div>
  )
}

function getRoleHome(role: string | undefined): string {
  if (role === 'admin') return '/admin'
  return role === 'driver' ? '/driver-home' : '/passenger-home'
}

// ============ Unauthenticated Routes ============
function UnauthenticatedRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// ============ Role Selection Route ============
function RoleSelectionRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RoleSelectionPage />} />
      <Route path="/role-selection" element={<RoleSelectionPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// ============ Driver Routes ============
function DriverRoutes() {
  const { currentUser } = useAuth()
  const homePath = getRoleHome('driver')
  
  return (
    <>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to={homePath} replace />} />
        <Route path="/home" element={<Navigate to={homePath} replace />} />
        
        {/* Driver Pages */}
        <Route path="/driver-home" element={<DriverHomePage />} />
        <Route path="/driver-trips" element={<DriverTripsManager />} />
        <Route path="/browse-requests" element={<DriverBrowsePage />} />
        <Route path="/driver-settings" element={<DriverSettingsPage />} />
        <Route path="/create-trip" element={<CreateTripPage />} />
        <Route path="/edit-trip/:tripId" element={<EditTripPage />} />
        
        {/* Shared Pages */}
        <Route path="/browse-trips" element={<PassengerBrowsePage />} />
        <Route path="/chats" element={<ChatsListPage />} />
        <Route path="/chat/:roomId" element={<ChatPage />} />
        <Route path="/listing/:listingId" element={<ListingDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Debug/Test */}
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to={homePath} replace />} />
      </Routes>
      <NotificationBanner currentUser={currentUser} />
      <BottomNav />
    </>
  )
}

// ============ Passenger Routes ============
function PassengerRoutes() {
  const { currentUser } = useAuth()
  const homePath = getRoleHome('passenger')
  
  return (
    <>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to={homePath} replace />} />
        <Route path="/home" element={<Navigate to={homePath} replace />} />
        
        {/* Passenger Pages */}
        <Route path="/passenger-home" element={<PassengerHomePage />} />
        <Route path="/my-trips" element={<MyTripsPage />} />
        <Route path="/passenger-settings" element={<PassengerSettingsPage />} />
        <Route path="/create-request" element={<CreateRequestPage />} />
        <Route path="/favorite-places" element={<FavoritePlacesPage />} />
        
        {/* Shared Pages */}
        <Route path="/browse-trips" element={<PassengerBrowsePage />} />
        <Route path="/chats" element={<ChatsListPage />} />
        <Route path="/chat/:roomId" element={<ChatPage />} />
        <Route path="/listing/:listingId" element={<ListingDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Debug/Test */}
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to={homePath} replace />} />
      </Routes>
      <NotificationBanner currentUser={currentUser} />
      <BottomNav />
    </>
  )
}

// ============ Admin Routes ============
function AdminRoutes() {
  const { currentUser } = useAuth()
  
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/home" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/chats" element={<ChatsListPage />} />
        <Route path="/chat/:roomId" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
      <NotificationBanner currentUser={currentUser} />
      <BottomNav />
    </>
  )
}

// ============ Main App Shell (Single BrowserRouter) ============
function AppShell() {
  const { loading, currentUser } = useAuth()
  const [renderer, setRenderer] = useState(0)

  // Force re-render when needed
  const refresh = () => setRenderer(r => r + 1)

  if (loading) {
    return <Loading text="載入中..." />
  }

  // No auth - show landing
  if (!currentUser) {
    return <UnauthenticatedRoutes />
  }

  // Auth but no role - role selection
  if (!currentUser.role) {
    return <RoleSelectionRoutes />
  }

  // Route by role
  const role = currentUser.role
  if (role === 'admin') {
    return <AdminRoutes />
  }
  if (role === 'driver') {
    return <DriverRoutes />
  }
  if (role === 'passenger') {
    return <PassengerRoutes />
  }

  // Fallback
  return <RoleSelectionRoutes />
}

export default function App() {
  return (
    <AuthProvider>
      {/* SINGLE BrowserRouter - all routing inside */}
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}