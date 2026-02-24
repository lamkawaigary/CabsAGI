import Landing from './pages/Landing'
import PassengerHome from './pages/PassengerHome'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MessageProvider } from './context/MessageContext'

function AppShell() {
  const { currentUser, loading } = useAuth()

  if (loading) {
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
          驗證登入狀態中...
          <style>{'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg);} }'}</style>
        </div>
      </div>
    )
  }

  return currentUser ? <PassengerHome /> : <Landing />
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
