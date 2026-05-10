// Cabs Carpool - App (Separated Driver/Passenger)
// Version: 6.0

import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// ============ Driver Pages ============
const DriverHomePage = lazy(() => import('./pages/driver/DriverHomePage'))
const DriverTripsManager = lazy(() => import('./pages/driver/DriverTripsManager'))
const DriverBrowsePage = lazy(() => import('./pages/driver/DriverBrowsePage'))
const DriverSettingsPage = lazy(() => import('./pages/driver/DriverSettingsPage'))
const EditTripPage = lazy(() => import('./pages/driver/EditTripPage'))

// ============ Passenger Pages ============
const PassengerHomePage = lazy(() => import('./pages/passenger/PassengerHomePage'))
const PassengerBrowsePage = lazy(() => import('./pages/passenger/PassengerBrowsePage'))
const PassengerRequestsPage = lazy(() => import('./pages/passenger/PassengerRequestsPage'))
const MyTripsPage = lazy(() => import('./pages/passenger/MyTripsPage'))
const PassengerSettingsPage = lazy(() => import('./pages/passenger/PassengerSettingsPage'))
const FavoritePlacesPage = lazy(() => import('./pages/passenger/FavoritePlacesPage'))
const CreateRequestPage = lazy(() => import('./pages/passenger/CreateRequestPage'))

// ============ Shared Pages ============
const LandingPage = lazy(() => import('./pages/LandingPage'))
const RoleSelectionPage = lazy(() => import('./pages/RoleSelectionPage'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))
const ChatsListPage = lazy(() => import('./pages/ChatsListPage'))
const CreateTripPage = lazy(() => import('./pages/CreateTripPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ListingDetailPage = lazy(() => import('./pages/ListingDetailPage'))
const TestFirestoreWrite = lazy(() => import('./pages/TestFirestoreWrite'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const NotificationBanner = lazy(() => import('./components/NotificationBanner'))
const BottomNav = lazy(() => import('./components/BottomNav'))


function Loading({ text = '載入中...' }: { text?: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#fff9f5' }}>
      <div style={{ textAlign: 'center', color: '#8b7355' }}>{text}</div>
    </div>
  )
}

// Helper to get role-based home path
function getRoleHome(role: string | undefined): string {
  if (role === 'admin') return '/admin'  // Admin goes to admin dashboard
  return role === 'driver' ? '/driver-home' : '/passenger-home'
}

function AppShell() {
  const { loading, currentUser } = useAuth()
  
  // Add small delay for auth to settle
  if (loading) {
    return <Loading text="載入中..." />
  }

  // If not logged in, only allow landing, profile, and chats
  if (!currentUser) {
    return (
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/test-firestore" element={<TestFirestoreWrite />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    )
  }

  // Logged in - use role-based routing
  const userRole = currentUser.role
  
  // If no role selected yet, go to role selection
  if (!userRole) {
    return (
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<RoleSelectionPage />} />
            <Route path="/role-selection" element={<RoleSelectionPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    )
  }
  
  const homePath = getRoleHome(userRole)

  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Root - go to role home */}
          <Route path="/" element={<Navigate to={homePath} replace />} />
          <Route path="/home" element={<Navigate to={homePath} replace />} />
          
          {/* Driver only routes */}
          {userRole === 'driver' && (
            <>
              <Route path="/driver-home" element={<DriverHomePage />} />
              <Route path="/driver-trips" element={<DriverTripsManager />} />
              <Route path="/browse-requests" element={<DriverBrowsePage />} />
              <Route path="/driver-settings" element={<DriverSettingsPage />} />
              <Route path="/create-trip" element={<CreateTripPage />} />
              <Route path="/edit-trip/:tripId" element={<EditTripPage />} />
            </>
          )}
          
          {/* Passenger only routes */}
          {userRole === 'passenger' && (
            <>
              <Route path="/passenger-home" element={<PassengerHomePage />} />
              <Route path="/browse-trips" element={<PassengerBrowsePage />} />
              <Route path="/my-trips" element={<MyTripsPage />} />
              <Route path="/passenger-settings" element={<PassengerSettingsPage />} />
              <Route path="/create-request" element={<CreateRequestPage />} />
              <Route path="/favorite-places" element={<FavoritePlacesPage />} />
            </>
          )}
          
          {/* Shared routes */}
          <Route path="/chats" element={<ChatsListPage />} />
          <Route path="/chat/:roomId" element={<ChatPage />} />
          <Route path="/listing/:listingId" element={<ListingDetailPage />} />
          <Route path="/test-firestore" element={<TestFirestoreWrite />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          
          {/* Catch all - go to role home */}
          <Route path="*" element={<Navigate to={homePath} replace />} />
        </Routes>
        
        {/* Notification Banner */}
        <NotificationBanner currentUser={currentUser} />
        
        {/* Consistent Bottom Navigation */}
        <BottomNav />
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
