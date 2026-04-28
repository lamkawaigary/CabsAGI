import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Role display mapping
const roleLabels: Record<string, { label: string; color: string; bg: string }> = {
  passenger: { label: '乘客', color: '#e07b4c', bg: '#e6f0ff' },
  driver: { label: '司機', color: '#1a7a3a', bg: '#e6f7ed' },
  admin: { label: '管理員', color: '#7a1a5a', bg: '#f7e6f0' },
}

function getRoleDisplay(role: string | undefined) {
  if (!role) return { label: '未設定', color: '#666', bg: '#f0f0f0' }
  return roleLabels[role.toLowerCase()] || { label: role, color: '#666', bg: '#f0f0f0' }
}

export default function ProfilePage() {
  const { currentUser, logout, triggerPhoneVerification, confirmPhoneVerification } = useAuth()
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
      const result = await triggerPhoneVerification('852', phone)
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
      const result = await confirmPhoneVerification(otp)
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
    <div className="ui-page" style={{ gap: 10, paddingBottom: 18 }}>
      <section style={styles.heroCard}>
        <div style={styles.heroEyebrow}>個人中心</div>
        <h2 style={styles.heroTitle}>{currentUser?.name || '未命名用戶'}</h2>
        <p style={styles.heroSubtitle}>集中管理電話驗證、身份資料與常用設定。</p>
      </section>

      <section className="ui-card" style={styles.panelCard}>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>帳號</span>
          <span style={styles.infoValue}>{currentUser?.email || '未提供'}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>積分</span>
          <span style={styles.infoValue}>{currentUser?.points ?? 0}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>身份</span>
          <span
            style={{
              display: 'inline-flex',
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              color: roleDisplay.color,
              background: roleDisplay.bg,
            }}
          >
            {roleDisplay.label}
          </span>
        </div>
        {currentUser?.role === 'driver' && (
          <div
            style={{
              fontSize: 13,
              color: currentUser?.kycStatus === 'approved' ? '#1a7a3a' : '#7a5a1a',
              background: currentUser?.kycStatus === 'approved' ? '#e6f7ed' : '#fff3cd',
              padding: '8px 12px',
              borderRadius: 8,
              marginTop: 2,
            }}
          >
            KYC 狀態:{' '}
            {currentUser?.kycStatus === 'approved'
              ? '✅ 已通過'
              : currentUser?.kycStatus === 'pending'
                ? '⏳ 審批中'
                : '❌ 未提交'}
          </div>
        )}
      </section>

      <section
        className="ui-card"
        style={{
          ...styles.panelCard,
          background: currentUser?.phoneVerified ? '#f4fbf7' : '#fffaf1',
          border: `1px solid ${currentUser?.phoneVerified ? '#cfe9db' : '#f4dbb3'}`,
        }}
      >
        <div style={styles.phoneHead}>
          <span style={styles.infoLabel}>電話驗證</span>
          {currentUser?.phoneVerified ? (
            <span style={styles.verifiedBadge}>✅ 已驗證</span>
          ) : (
            <span style={styles.unverifiedBadge}>未驗證</span>
          )}
        </div>
        <div style={{ fontSize: 14, color: '#355149' }}>電話: {currentUser?.phone || '未提供'}</div>

        {!currentUser?.phoneVerified && (
          <>
            <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
              <input
                type="tel"
                placeholder="輸入手機號碼 (e.g. 12345678)"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                disabled={otpSent}
                className="ui-input"
                style={{ fontSize: 14 }}
              />
              {otpSent && (
                <input
                  type="text"
                  placeholder="輸入驗證碼"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="ui-input"
                  style={{ fontSize: 14 }}
                />
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {!otpSent ? (
                <button
                  onClick={handleSendOtp}
                  disabled={verifying}
                  className="ui-btn ui-btn-outline"
                  style={{ flex: 1 }}
                >
                  {verifying ? '發送中...' : '發送驗證碼'}
                </button>
              ) : (
                <button
                  onClick={handleVerifyOtp}
                  disabled={verifyingPhone}
                  className="ui-btn ui-btn-primary"
                  style={{ flex: 1 }}
                >
                  {verifyingPhone ? '驗證中...' : '確認驗證'}
                </button>
              )}
              {otpSent && (
                <button
                  onClick={() => {
                    setOtpSent(false)
                    setOtp('')
                    setMessage('')
                  }}
                  className="ui-btn ui-btn-outline"
                >
                  取消
                </button>
              )}
            </div>

            {message && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: message.includes('成功') ? '#1a7a3a' : '#c62828',
                  textAlign: 'center',
                }}
              >
                {message}
              </div>
            )}
          </>
        )}
      </section>

      {(currentUser?.role === 'admin' || currentUser?.role === 'driver') && (
        <section className="ui-card" style={styles.panelCard}>
          <h3 style={styles.panelTitle}>快捷入口</h3>
          <div style={{ display: 'grid', gap: 8 }}>
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
          </div>
        </section>
      )}

      <section className="ui-card" style={styles.panelCard}>
        <h3 style={styles.panelTitle}>常用設定</h3>
        <div style={{ display: 'grid', gap: 7 }}>
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
      </section>

      <button
        onClick={() => void handleLogout()}
        disabled={loggingOut}
        className="ui-btn ui-btn-primary"
        style={{ marginTop: 4, padding: '12px 14px', opacity: loggingOut ? 0.7 : 1 }}
      >
        {loggingOut ? '登出中...' : '登出'}
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  heroCard: {
    borderRadius: 18,
    border: '1px solid rgba(30, 79, 67, 0.12)',
    background: 'linear-gradient(135deg, #1e4f43 0%, #2b6a5a 100%)',
    color: '#fff',
    padding: '16px 14px',
    boxShadow: '0 16px 32px rgba(30, 79, 67, 0.18)',
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: 700,
    opacity: 0.9,
  },
  heroTitle: {
    margin: '4px 0 0',
    fontSize: 21,
    lineHeight: 1.25,
    fontWeight: 800,
  },
  heroSubtitle: {
    margin: '8px 0 0',
    fontSize: 13,
    lineHeight: 1.5,
    color: 'rgba(255,255,255,0.92)',
  },
  panelCard: {
    padding: 12,
    borderRadius: 14,
    border: '1px solid #dfe9e4',
    boxShadow: '0 10px 20px rgba(14, 64, 54, 0.06)',
    display: 'grid',
    gap: 8,
  },
  panelTitle: {
    margin: 0,
    fontSize: 14,
    color: '#27443c',
    fontWeight: 800,
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: '#5f7b72',
    fontWeight: 700,
  },
  infoValue: {
    fontSize: 14,
    color: '#1f3f38',
    fontWeight: 700,
  },
  phoneHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  verifiedBadge: {
    fontSize: 12,
    color: '#1a7a3a',
    background: '#d2eddd',
    padding: '3px 8px',
    borderRadius: 999,
    fontWeight: 700,
  },
  unverifiedBadge: {
    fontSize: 12,
    color: '#7a5a1a',
    background: '#fff1d9',
    padding: '3px 8px',
    borderRadius: 999,
    fontWeight: 700,
  },
}
