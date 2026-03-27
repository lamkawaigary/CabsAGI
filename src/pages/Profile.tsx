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
    <div className="ui-page" style={{ gap: 10 }}>
      <h2 className="ui-title">個人資料</h2>
      <div className="ui-card" style={{ padding: 14, display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 14, color: '#355149' }}>姓名: {currentUser?.name}</div>
        <div style={{ fontSize: 14, color: '#355149' }}>電話: {currentUser?.phone || '未提供'}</div>
        <div style={{ fontSize: 14, color: '#355149' }}>帳號: {currentUser?.email}</div>
        <div style={{ fontSize: 14, color: '#355149' }}>積分: {currentUser?.points ?? 0}</div>
        <div style={{ fontSize: 14, color: '#355149' }}>角色: {currentUser?.role || '-'}</div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            className="ui-btn ui-btn-secondary"
            style={{ textAlign: 'left' }}
          >
            打開管理後台
          </button>
        )}
        {currentUser?.role === 'driver' && (
          <button
            onClick={() => navigate('/driver')}
            className="ui-btn ui-btn-secondary"
            style={{ textAlign: 'left' }}
          >
            打開司機接單中心
          </button>
        )}

        <div style={{ borderTop: '1px solid #e4ebe4', marginTop: 6, paddingTop: 8, display: 'grid', gap: 7 }}>
          {['付款方式', '語言與地區', '通知設定', '幫助中心'].map((item) => (
            <button
              key={item}
              className="ui-btn ui-btn-outline"
              style={{ textAlign: 'left', fontWeight: 600, padding: '9px 10px' }}
            >
              {item}
            </button>
          ))}
        </div>

        <button
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="ui-btn ui-btn-primary"
          style={{ marginTop: 8, padding: '11px 12px', opacity: loggingOut ? 0.7 : 1 }}
        >
          {loggingOut ? '登出中...' : '登出'}
        </button>
      </div>
    </div>
  )
}
