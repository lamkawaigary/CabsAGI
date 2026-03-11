import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess?: () => void
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const { loginWithPassword, loginWithGoogle, sendOtp, verifyOtp, registerUser, resetPasswordByPhone } = useAuth()
  
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [loginType, setLoginType] = useState<'password' | 'otp'>('password')
  
  // Login fields
  const [loginInput, setLoginInput] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  
  // OTP fields
  const [otpRegion, setOtpRegion] = useState('852')
  const [otpPhone, setOtpPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  
  // Register fields
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regRegionCode, setRegRegionCode] = useState('852')
  
  // Forgot password
  const [forgotPhone, setForgotPhone] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  if (!isOpen) return null

  const handleLogin = async () => {
    setLoading(true)
    setMessage('')
    const result = await loginWithPassword(loginInput, loginPassword)
    setMessage(result.message)
    setMessageType(result.ok ? 'success' : 'error')
    if (result.ok) {
      onLoginSuccess?.()
      onClose()
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setMessage('')
    const result = await loginWithGoogle()
    setMessage(result.message)
    setMessageType(result.ok ? 'success' : 'error')
    if (result.ok) {
      onLoginSuccess?.()
      onClose()
    }
    setLoading(false)
  }

  const handleSendOtp = async () => {
    setLoading(true)
    const result = await sendOtp(otpRegion, otpPhone)
    setMessage(result.message)
    setMessageType(result.ok ? 'success' : 'error')
    if (result.ok) setOtpSent(true)
    setLoading(false)
  }

  const handleVerifyOtp = async () => {
    setLoading(true)
    const result = await verifyOtp(otpCode)
    setMessage(result.message)
    setMessageType(result.ok ? 'success' : 'error')
    if (result.ok) {
      onLoginSuccess?.()
      onClose()
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    setLoading(true)
    const result = await registerUser({ 
      regionCode: regRegionCode, 
      phone: regPhone, 
      password: regPassword, 
      name: regName 
    })
    setMessage(result.message)
    setMessageType(result.ok ? 'success' : 'error')
    if (result.ok) {
      onLoginSuccess?.()
      onClose()
    }
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    setLoading(true)
    const result = await resetPasswordByPhone(forgotPhone, forgotEmail)
    setMessage(result.message)
    setMessageType(result.ok ? 'success' : 'error')
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '16px',
    boxSizing: 'border-box',
    marginBottom: '12px'
  }

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    background: '#143b34',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1
  }

  const btnSecondary: React.CSSProperties = {
    ...btnPrimary,
    background: '#fff',
    color: '#143b34',
    border: '1px solid #143b34'
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={onClose} style={closeBtn}>✕</button>
        
        <h2 style={titleStyle}>
          {mode === 'login' ? '登入' : mode === 'register' ? '註冊' : '忘記密碼'}
        </h2>

        {message && (
          <div style={{
            ...msgStyle,
            background: messageType === 'success' ? '#d4edda' : '#f8d7da',
            color: messageType === 'success' ? '#155724' : '#721c24'
          }}>
            {message}
          </div>
        )}

        {mode === 'login' && (
          <>
            {/* Login Type Toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                onClick={() => setLoginType('password')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: loginType === 'password' ? '2px solid #143b34' : '1px solid #ddd',
                  background: loginType === 'password' ? '#f8f9f8' : '#fff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                密碼登入
              </button>
              <button
                onClick={() => setLoginType('otp')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: loginType === 'otp' ? '2px solid #143b34' : '1px solid #ddd',
                  background: loginType === 'otp' ? '#f8f9f8' : '#fff',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                OTP 登入
              </button>
            </div>

            {loginType === 'password' ? (
              <>
                <input
                  type="text"
                  placeholder="手機號碼 / 電郵 / admin"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="password"
                  placeholder="密碼"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={inputStyle}
                />
                <button onClick={handleLogin} disabled={loading} style={btnPrimary}>
                  {loading ? '登入中...' : '登入'}
                </button>
                
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  style={{ ...btnSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  使用 Google 登入
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '14px' }}>
                  <button onClick={() => setMode('register')} style={linkBtn}>註冊新帳戶</button>
                  <button onClick={() => setMode('forgot')} style={linkBtn}>忘記密碼？</button>
                </div>
              </>
            ) : (
              <>
                {!otpSent ? (
                  <>
                    <select
                      value={otpRegion}
                      onChange={(e) => setOtpRegion(e.target.value)}
                      style={{ ...inputStyle, marginBottom: '12px' }}
                    >
                      <option value="852">+852 香港</option>
                      <option value="86">+86 內地</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="手機號碼"
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value)}
                      style={inputStyle}
                    />
                    <button onClick={handleSendOtp} disabled={loading || !otpPhone} style={btnPrimary}>
                      {loading ? '發送中...' : '發送驗證碼'}
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="請輸入 OTP"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      style={inputStyle}
                    />
                    <button onClick={handleVerifyOtp} disabled={loading || !otpCode} style={btnPrimary}>
                      {loading ? '驗證中...' : '確認登入'}
                    </button>
                    <button onClick={() => setOtpSent(false)} style={{ ...linkBtn, marginTop: '12px' }}>
                      返回
                    </button>
                  </>
                )}
                <button onClick={() => setMode('register')} style={{ ...linkBtn, marginTop: '16px' }}>
                  註冊新帳戶
                </button>
              </>
            )}
          </>
        )}

        {mode === 'register' && (
          <>
            <input
              type="text"
              placeholder="姓名"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={regRegionCode}
                onChange={(e) => setRegRegionCode(e.target.value)}
                style={{ ...inputStyle, width: '100px', marginBottom: '12px' }}
              >
                <option value="852">+852</option>
                <option value="86">+86</option>
              </select>
              <input
                type="tel"
                placeholder="手機號碼"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                style={{ ...inputStyle, flex: 1, marginBottom: '12px' }}
              />
            </div>
            <input
              type="password"
              placeholder="密碼（至少6位）"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              style={inputStyle}
            />
            <button onClick={handleRegister} disabled={loading || !regName || !regPhone || !regPassword} style={btnPrimary}>
              {loading ? '註冊中...' : '註冊'}
            </button>
            <button onClick={() => setMode('login')} style={{ ...linkBtn, marginTop: '16px' }}>
              已有帳戶？登入
            </button>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <input
              type="tel"
              placeholder="註冊既手機號碼"
              value={forgotPhone}
              onChange={(e) => setForgotPhone(e.target.value)}
              style={inputStyle}
            />
            <input
              type="email"
              placeholder="電郵（可選）"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              style={inputStyle}
            />
            <button onClick={handleForgotPassword} disabled={loading || !forgotPhone} style={btnPrimary}>
              {loading ? '處理中...' : '發送重設連結'}
            </button>
            <button onClick={() => setMode('login')} style={{ ...linkBtn, marginTop: '16px' }}>
              返回登入
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px'
}

const modalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '16px',
  padding: '24px',
  width: '100%',
  maxWidth: '400px',
  maxHeight: '90vh',
  overflowY: 'auto',
  position: 'relative'
}

const closeBtn: React.CSSProperties = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  border: 'none',
  background: 'transparent',
  fontSize: '24px',
  cursor: 'pointer',
  color: '#666'
}

const titleStyle: React.CSSProperties = {
  margin: '0 0 20px',
  textAlign: 'center',
  fontSize: '22px',
  fontWeight: 600
}

const msgStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: '8px',
  fontSize: '14px',
  marginBottom: '16px',
  textAlign: 'center'
}

const linkBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#143b34',
  fontSize: '14px',
  cursor: 'pointer',
  textDecoration: 'underline'
}
