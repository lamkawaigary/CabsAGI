import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProfilePage() {
  const { currentUser, logout, sendOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [phone, setPhone] = useState(currentUser?.phone.replace(/^\+?\d{2,3}/, '') || '')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState('')

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
    if (!phone.trim()) {
      setVerifyMessage('請輸入手機號碼')
      return
    }
    setVerifying(true)
    setVerifyMessage('')
    try {
      const result = await sendOtp('852', phone)
      if (!result.ok) {
        setVerifyMessage(result.message)
        return
      }
      setOtpSent(true)
      setVerifyMessage('驗證碼已發送')
    } finally {
      setVerifying(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setVerifyMessage('請輸入驗證碼')
      return
    }
    setVerifyingOtp(true)
    setVerifyMessage('')
    try {
      const result = await verifyOtp(otp)
      if (!result.ok) {
        setVerifyMessage(result.message)
        return
      }
      setVerifyMessage('電話驗證成功，頁面將刷新')
      window.location.reload()
    } finally {
      setVerifyingOtp(false)
    }
  }

  return (
    <div className="ui-page" style={{ gap: 10 }}>
      <h2 className="ui-title">個人資料</h2>
      <div className="ui-card" style={{ padding: 14, display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 14, color: '#355149' }}>姓名: {currentUser?.name}</div>
        <div style={{ fontSize: 14, color: '#355149' }}>
          電話: {currentUser?.phone || '未提供'}{' '}
          <span
            style={{
              marginLeft: 8,
              fontSize: 12,
              fontWeight: 700,
              color: currentUser?.phoneVerified ? '#1a7a3a' : '#9f4236',
            }}
          >
            {currentUser?.phoneVerified ? '已驗證' : '未驗證'}
          </span>
        </div>

        {!currentUser?.phoneVerified && (
          <div className="ui-card-muted" style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, color: '#355149', fontWeight: 700 }}>電話驗證</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="輸入手機號碼（852）"
                className="ui-input"
                disabled={otpSent}
              />
              <button
                onClick={() => void handleSendOtp()}
                disabled={verifying || otpSent}
                className="ui-btn ui-btn-outline"
                style={{ whiteSpace: 'nowrap' }}
              >
                {verifying ? '發送中...' : '發送碼'}
              </button>
            </div>
            {otpSent && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="輸入 OTP"
                  maxLength={6}
                  className="ui-input"
                />
                <button
                  onClick={() => void handleVerifyOtp()}
                  disabled={verifyingOtp}
                  className="ui-btn ui-btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {verifyingOtp ? '驗證中...' : '確認驗證'}
                </button>
              </div>
            )}
            {verifyMessage && (
              <div style={{ fontSize: 12, color: verifyMessage.includes('成功') ? '#1a7a3a' : '#9f4236' }}>
                {verifyMessage}
              </div>
            )}
          </div>
        )}
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
