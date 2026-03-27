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
  const { currentUser, logout, sendOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  
  // Phone verification state
  const [verifying, setVerifying] = useState(false)
  const [phone, setPhone] = useState(currentUser?.phone || '')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [verifyingPhone, setVerifyingPhone] = useState(false)
  const [message, setMessage] = useState('')

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

  const handleSendOtp = async () => {
    if (!phone) {
      setMessage('請輸入手機號碼')
      return
    }
    setVerifying(true)
    setMessage('')
    try {
      const result = await sendOtp('852', phone)
      if (result.ok) {
        setOtpSent(true)
        setMessage('驗證碼已發送')
      } else {
        setMessage(result.message)
      }
    } finally {
      setVerifying(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp) {
      setMessage('請輸入驗證碼')
      return
    }
    setVerifyingPhone(true)
    setMessage('')
    try {
      const result = await verifyOtp(otp)
      if (result.ok) {
        setMessage('電話驗證成功！')
        // Reload the page to get updated user data
        window.location.reload()
      } else {
        setMessage(result.message)
      }
    } finally {
      setVerifyingPhone(false)
    }
  }

  return (
    <div className="ui-page" style={{ gap: 10 }}>
      <h2 className="ui-title">個人資料</h2>
      <div className="ui-card" style={{ padding: 14, display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 14, color: '#355149' }}>姓名: {currentUser?.name}</div>
        
        {/* Phone & Verification Status */}
        <div style={{ 
          background: currentUser?.phoneVerified ? '#e6f7ed' : '#fff8e6',
          border: `1px solid ${currentUser?.phoneVerified ? '#b8e6c9' : '#ffe0b2'}`,
          borderRadius: 10,
          padding: 12,
          display: 'grid',
          gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: '#355149' }}>電話: {currentUser?.phone || '未提供'}</span>
            {currentUser?.phoneVerified && (
              <span style={{ 
                fontSize: 12, 
                color: '#1a7a3a', 
                background: '#b8e6c9',
                padding: '2px 8px',
                borderRadius: 10,
                fontWeight: 600,
              }}>
                ✅ 已驗證
              </span>
            )}
          </div>
          
          {!currentUser?.phoneVerified && (
            <>
              <div style={{ display: 'grid', gap: 6 }}>
                <input
                  type="tel"
                  placeholder="輸入手機號碼 (e.g. 12345678)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  disabled={otpSent}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    fontSize: 14,
                  }}
                />
                {otpSent && (
                  <input
                    type="text"
                    placeholder="輸入驗證碼"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #ddd',
                      fontSize: 14,
                    }}
                  />
                )}
              </div>
              
              <div style={{ display: 'flex', gap: 8 }}>
                {!otpSent ? (
                  <button
                    onClick={handleSendOtp}
                    disabled={verifying}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #1e56a3',
                      background: '#fff',
                      color: '#1e56a3',
                      fontWeight: 600,
                      cursor: verifying ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {verifying ? '發送中...' : '發送驗證碼'}
                  </button>
                ) : (
                  <button
                    onClick={handleVerifyOtp}
                    disabled={verifyingPhone}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #1a7a3a',
                      background: '#1a7a3a',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: verifyingPhone ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {verifyingPhone ? '驗證中...' : '確認驗證'}
                  </button>
                )}
                {otpSent && (
                  <button
                    onClick={() => { setOtpSent(false); setOtp(''); setMessage(''); }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #999',
                      background: '#fff',
                      color: '#666',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    取消
                  </button>
                )}
              </div>
              
              {message && (
                <div style={{ 
                  fontSize: 13, 
                  color: message.includes('成功') ? '#1a7a3a' : '#c62828',
                  textAlign: 'center',
                }}>
                  {message}
                </div>
              )}
            </>
          )}
        </div>

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
