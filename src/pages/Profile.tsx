import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProfilePage() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 10 }}>
      <h2 style={{ margin: 0, color: '#1e4038' }}>個人資料</h2>
      <div
        style={{
          background: '#fff',
          border: '1px solid #dce6dd',
          borderRadius: 14,
          padding: 14,
          display: 'grid',
          gap: 8,
        }}
      >
        <div style={{ fontSize: 14, color: '#355149' }}>姓名: {currentUser?.name}</div>
        <div style={{ fontSize: 14, color: '#355149' }}>電話: {currentUser?.phone || '未提供'}</div>
        <div style={{ fontSize: 14, color: '#355149' }}>帳號: {currentUser?.email}</div>
        <div style={{ fontSize: 14, color: '#355149' }}>積分: {currentUser?.points ?? 0}</div>

        <div style={{ borderTop: '1px solid #e4ebe4', marginTop: 6, paddingTop: 8, display: 'grid', gap: 7 }}>
          {['付款方式', '語言與地區', '通知設定', '幫助中心'].map((item) => (
            <button
              key={item}
              style={{
                border: '1px solid #dce6dd',
                background: '#fbfdfb',
                borderRadius: 10,
                padding: '9px 10px',
                textAlign: 'left',
                color: '#33524a',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {item}
            </button>
          ))}
        </div>

        <button
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          style={{
            marginTop: 8,
            border: 0,
            borderRadius: 10,
            background: '#1f473e',
            color: '#f1fff8',
            fontWeight: 700,
            padding: '11px 12px',
            cursor: loggingOut ? 'not-allowed' : 'pointer',
            opacity: loggingOut ? 0.7 : 1,
          }}
        >
          {loggingOut ? '登出中...' : '登出'}
        </button>
      </div>
    </div>
  )
}
