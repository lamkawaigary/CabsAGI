import { useState } from 'react'

export default function App() {
  const [page, setPage] = useState('login')
  const [user, setUser] = useState<{name: string} | null>(null)
  
  const handleTestLogin = () => {
    setUser({ name: 'Test User' })
    setPage('home')
  }
  
  if (page === 'login') {
    return (
      <div style={{ minHeight: '100vh', padding: 40, background: '#f8f9fc', fontFamily: 'system-ui' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 32 }}>Cabs - 跨境商務出行</h1>
        <div style={{ maxWidth: 320, margin: '0 auto', background: 'white', padding: 24, borderRadius: 16 }}>
          <input placeholder="手機號碼" style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #ddd' }} />
          <input type="password" placeholder="密碼" style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #ddd' }} />
          <button onClick={handleTestLogin} style={{ width: '100%', padding: 14, background: '#667eea', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            登入
          </button>
          <button onClick={handleTestLogin} style={{ width: '100%', padding: 10, marginTop: 8, background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            測試登入
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div style={{ minHeight: '100vh', padding: 20, background: '#f8f9fc', fontFamily: 'system-ui' }}>
      <h1>歡迎 {user?.name || 'User'}!</h1>
      <p>Cabs 首頁開發中...</p>
    </div>
  )
}
