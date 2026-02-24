import { useState } from 'react'

export default function AppTest() {
  const [page, setPage] = useState<'login' | 'home'>('login')

  if (page === 'login') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '360px', background: 'white', padding: '32px 28px', borderRadius: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px', color: 'white', fontWeight: 'bold' }}>C</div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px' }}>Cabs</h1>
            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>跨境商務出行</p>
          </div>
          <button 
            onClick={() => setPage('home')}
            style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}
          >
            進入首頁
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>首頁</h1>
        <button onClick={() => setPage('login')} style={{ padding: '12px 24px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          返回登入
        </button>
      </div>
    </div>
  )
}
