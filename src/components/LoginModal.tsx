// Cabs Carpool - Login Modal v2.0
// 簡化登入流程：Google 或 電話 OTP 即時開戶

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess?: () => void
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const { loginWithGoogle, sendOtp, verifyOtp } = useAuth()
  
  const [mode, setMode] = useState<'google' | 'phone'>('google')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  // Cleanup recaptcha on close
  useEffect(() => {
    if (!isOpen) {
      setOtpSent(false)
      setMessage('')
      setPhone('')
      setOtp('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleGoogle = async () => {
    setLoading(true)
    setMessage('')
    try {
      const result = await loginWithGoogle()
      if (result.ok) {
        onLoginSuccess?.()
        onClose()
      } else {
        setMessage(result.message || '登入失敗')
      }
    } catch (error: any) {
      setMessage(error.message || 'Google 登入失敗')
    }
    setLoading(false)
  }

  const handleSendOtp = async () => {
    if (!phone || phone.length < 8) {
      setMessage('請輸入有效電話號碼')
      return
    }
    setLoading(true)
    setMessage('')
    
    const result = await sendOtp('852', phone.replace(/\s/g, ''))
    
    if (result.ok) {
      setMessage('驗證碼已發送')
      setOtpSent(true)
    } else {
      setMessage(result.message)
    }
    setLoading(false)
  }

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setMessage('請輸入 6 位驗證碼')
      return
    }
    setLoading(true)
    setMessage('')
    
    const result = await verifyOtp(otp)
    
    if (result.ok) {
      setMessage('驗證成功！')
      setTimeout(() => {
        onLoginSuccess?.()
        onClose()
      }, 1000)
    } else {
      setMessage(result.message)
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: '2px solid #f0e0d6',
    fontSize: '16px',
    boxSizing: 'border-box',
    marginBottom: '12px',
    color: '#4a3728',
  }

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    background: '#e07b4c',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={onClose} style={closeBtn}>✕</button>
        
        <h2 style={titleStyle}>開始使用 Cabs</h2>
        <p style={subtitleStyle}>選擇登入方式即可開戶</p>

        {/* Recaptcha container - invisible */}
        <div id="recaptcha-container" />

        {message && (
          <div style={{
            ...msgStyle, 
            background: message.includes('成功') || message.includes('已發送') ? '#e8f5e8' : '#ffebee', 
            color: message.includes('成功') || message.includes('已發送') ? '#5a9a5a' : '#c62828'
          }}>
            {message}
          </div>
        )}

        {/* Tab Toggle */}
        <div style={tabContainer}>
          <button 
            style={{...tab, ...(mode === 'google' ? tabActive : {})}}
            onClick={() => { setMode('google'); setMessage(''); setOtpSent(false); }}
          >
            Google
          </button>
          <button 
            style={{...tab, ...(mode === 'phone' ? tabActive : {})}}
            onClick={() => { setMode('phone'); setMessage(''); setOtpSent(false); }}
          >
            電話
          </button>
        </div>

        {mode === 'google' ? (
          <>
            <p style={descStyle}>
              一鍵 Google 帳戶登入<br/>
              <small>首次使用將自動建立帳戶</small>
            </p>
            <button onClick={handleGoogle} disabled={loading} style={btnPrimary}>
              {loading ? '連接中...' : '使用 Google 登入'}
            </button>
          </>
        ) : (
          <>
            {!otpSent ? (
              <>
                <p style={descStyle}>
                  輸入電話號碼<br/>
                  <small>我們會發送驗證碼到你的電話</small>
                </p>
                <input
                  type="tel"
                  placeholder="+852 xxxx xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={inputStyle}
                />
                <button onClick={handleSendOtp} disabled={loading || !phone} style={btnPrimary}>
                  {loading ? '發送中...' : '發送驗證碼'}
                </button>
              </>
            ) : (
              <>
                <p style={descStyle}>
                  輸入驗證碼<br/>
                  <small>驗證後自動開戶</small>
                </p>
                <input
                  type="text"
                  placeholder="請輸入 6 位驗證碼"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  style={inputStyle}
                />
                <button onClick={handleVerifyOtp} disabled={loading || !otp} style={btnPrimary}>
                  {loading ? '驗證中...' : '驗證並開戶'}
                </button>
                <button 
                  onClick={() => { setOtpSent(false); setOtp(''); setMessage(''); }} 
                  style={linkBtn}
                >
                  重新輸入電話號碼
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '20px'
}

const modalStyle: React.CSSProperties = {
  background: '#fff9f5', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px',
  maxHeight: '90vh', overflowY: 'auto', position: 'relative'
}

const closeBtn: React.CSSProperties = {
  position: 'absolute', top: '12px', right: '12px', border: 'none', background: 'transparent',
  fontSize: '24px', cursor: 'pointer', color: '#8b7355'
}

const titleStyle: React.CSSProperties = { 
  margin: '0 0 8px', 
  textAlign: 'center', 
  fontSize: '22px', 
  fontWeight: 700,
  color: '#4a3728',
}

const subtitleStyle: React.CSSProperties = {
  margin: '0 0 20px',
  textAlign: 'center',
  fontSize: '14px',
  color: '#8b7355',
}

const msgStyle: React.CSSProperties = { 
  padding: '10px', 
  borderRadius: '8px', 
  fontSize: '14px', 
  marginBottom: '16px', 
  textAlign: 'center' 
}

const tabContainer: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '20px',
}

const tab: React.CSSProperties = {
  flex: 1,
  padding: '12px',
  borderRadius: '10px',
  border: '2px solid #f0e0d6',
  background: '#fff',
  fontSize: '15px',
  fontWeight: 500,
  color: '#8b7355',
  cursor: 'pointer',
}

const tabActive: React.CSSProperties = {
  background: '#e07b4c',
  color: '#fff',
  borderColor: '#e07b4c',
}

const descStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '16px',
  fontSize: '14px',
  color: '#8b7355',
  lineHeight: 1.5,
}

const linkBtn: React.CSSProperties = { 
  background: 'none', 
  border: 'none', 
  color: '#e07b4c', 
  fontSize: '14px', 
  cursor: 'pointer', 
  marginTop: '12px',
  width: '100%',
}
