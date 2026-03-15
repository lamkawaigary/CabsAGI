import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Role display mapping
const roleLabels: Record<string, { label: string; color: string; bg: string }> = {
  passenger: { label: '乘客', color: '#1e56a3', bg: '#e6f0ff' },
  driver: { label: '司機', color: '#1a7a3a', bg: '#e6f7ed' },
  admin: { label: '管理員', color: '#7a1a5a', bg: '#f7e6f0' },
}

function getRoleDisplay(role: string | undefined) {
  if (!role) return { label: '未設定', color: '#666', bg: '#f0f0f0' }
  return roleLabels[role.toLowerCase()] || { label: role, color: '#666', bg: '#f0f0f0' }
}

export default function ProfilePage() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const roleDisplay = getRoleDisplay(currentUser?.role)

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
        
        {/* Role Display */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 10,
          marginTop: 4 
        }}>
          <span style={{ fontSize: 14, color: '#355149' }}>身份:</span>
          <span style={{ 
            display: 'inline-flex',
            padding: '4px 12px', 
            borderRadius: 20, 
            fontSize: 13, 
            fontWeight: 700,
            color: roleDisplay.color,
            background: roleDisplay.bg,
          }}>
            {roleDisplay.label}
          </span>
        </div>

        {/* KYC Status for drivers */}
        {currentUser?.role === 'driver' && (
          <div style={{ 
            fontSize: 13, 
            color: currentUser?.kycStatus === 'approved' ? '#1a7a3a' : '#7a5a1a',
            background: currentUser?.kycStatus === 'approved' ? '#e6f7ed' : '#fff3cd',
            padding: '8px 12px',
            borderRadius: 8,
            marginTop: 4,
          }}>
            KYC 狀態: {currentUser?.kycStatus === 'approved' ? '✅ 已通過' : 
                       currentUser?.kycStatus === 'pending' ? '⏳ 審批中' : 
                       '❌ 未提交'}
          </div>
        )}

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            style={{
              border: '1px solid #cadfd2',
              borderRadius: 10,
              background: '#eef6f1',
              color: '#24473f',
              fontWeight: 800,
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            打開管理後台
          </button>
        )}
        {currentUser?.role === 'driver' && (
          <button
            onClick={() => navigate('/driver')}
            style={{
              border: '1px solid #cfdde4',
              borderRadius: 10,
              background: '#edf5f8',
              color: '#234a59',
              fontWeight: 800,
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            打開司機接單中心
          </button>
        )}

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
