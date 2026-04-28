import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'

type Mode = 'login' | 'register'

const regionOptions = [
  { label: '+852', value: '852' },
  { label: '+86', value: '86' },
  { label: '+853', value: '853' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: '12px',
  border: '1px solid #d6dfd6',
  outline: 'none',
  fontSize: '14px',
  boxSizing: 'border-box',
  background: '#fcfefc',
}

export default function DriverLanding() {
  const { loginWithPassword, loginWithGoogle, registerUser, currentUser } = useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'neutral'>('neutral')

  const [loginInput, setLoginInput] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginRegionCode, setLoginRegionCode] = useState('852')

  const [name, setName] = useState('')
  const [regionCode, setRegionCode] = useState('852')
  const [phone, setPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const canLogin = useMemo(() => !!loginInput && !!loginPassword && !loading, [loginInput, loginPassword, loading])
  const canRegister = useMemo(
    () => !!name && !!phone && !!regPassword && regPassword === confirmPassword && !loading,
    [name, phone, regPassword, confirmPassword, loading],
  )

  const setResult = (ok: boolean, text: string) => {
    setMessage(text)
    setMessageType(ok ? 'success' : 'error')
  }

  const handleLogin = async () => {
    setLoading(true)
    setMessage('')
    const result = await loginWithPassword(loginInput, loginPassword, loginRegionCode)
    setResult(result.ok, result.message)
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setMessage('')
    const result = await loginWithGoogle()
    setResult(result.ok, result.message)
    setLoading(false)
  }

  const handleRegister = async () => {
    if (regPassword !== confirmPassword) {
      setResult(false, '兩次密碼不一致')
      return
    }

    setLoading(true)
    setMessage('')
    // Register as driver directly
    const result = await registerUser({ 
      regionCode, 
      phone, 
      password: regPassword, 
      name,
      role: 'driver' // Force driver role
    })
    setResult(result.ok, result.message)
    setLoading(false)
  }

  // Redirect if already logged in and is driver
  if (currentUser?.role === 'driver') {
    window.location.href = '/driver'
    return null
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a3d32 0%, #2d5a4a 50%, #1a3d32 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Avenir Next, SF Pro Display, Noto Sans TC, PingFang TC, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#fffefb',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
      }}>
        {/* Header */}
        <div style={{
          padding: '32px 28px',
          background: 'linear-gradient(165deg, #173d36 0%, #224e45 100%)',
          color: '#f8fff8',
          textAlign: 'center',
        }}>
          <div style={{ letterSpacing: '0.18em', fontSize: 11, opacity: 0.7, fontWeight: 700, marginBottom: 8 }}>
            CABS AGI
          </div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.2 }}>
            司機專區
          </h1>
          <p style={{ margin: '12px 0 0', opacity: 0.8, fontSize: 13, lineHeight: 1.5 }}>
            登入或註冊成為 CabsAGI 司機
          </p>
        </div>

        {/* Back to Passenger */}
        <div style={{ padding: '12px 28px', background: '#f4f7f4', borderBottom: '1px solid #e8e2d6' }}>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              background: 'none',
              border: 'none',
              color: '#284a41',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 0,
            }}
          >
            ← 返回乘客入口
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '28px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <button
              onClick={() => setMode('login')}
              style={{
                flex: 1,
                border: 0,
                borderRadius: 12,
                padding: '10px 12px',
                fontWeight: 700,
                background: mode === 'login' ? '#e07b4c' : '#eef2ee',
                color: mode === 'login' ? '#ecfff9' : '#355149',
                cursor: 'pointer',
              }}
            >
              登入
            </button>
            <button
              onClick={() => setMode('register')}
              style={{
                flex: 1,
                border: 0,
                borderRadius: 12,
                padding: '10px 12px',
                fontWeight: 700,
                background: mode === 'register' ? '#e07b4c' : '#eef2ee',
                color: mode === 'register' ? '#ecfff9' : '#355149',
                cursor: 'pointer',
              }}
            >
              註冊
            </button>
          </div>

          {mode === 'login' ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8 }}>
                <select 
                  value={loginRegionCode} 
                  onChange={(e) => setLoginRegionCode(e.target.value)} 
                  style={inputStyle}
                >
                  {regionOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="手機號碼 / 電郵"
                  style={inputStyle}
                />
              </div>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="密碼"
                style={inputStyle}
              />
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  border: '1px solid #d2dfd4',
                  borderRadius: 12,
                  padding: '11px 14px',
                  fontWeight: 600,
                  background: '#fff',
                  color: '#284a41',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                使用 Google 登入
              </button>
              <button
                onClick={handleLogin}
                disabled={!canLogin}
                style={{
                  marginTop: 4,
                  border: 0,
                  borderRadius: 12,
                  padding: '13px 14px',
                  fontWeight: 700,
                  background: canLogin ? '#f1b91f' : '#ece9de',
                  color: canLogin ? '#2f2a10' : '#8f8a7a',
                  cursor: canLogin ? 'pointer' : 'not-allowed',
                }}
              >
                {loading ? '登入中...' : '登入'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ padding: '12px', background: '#fff3cd', borderRadius: 10, border: '1px solid #ffeeba' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#856404', marginBottom: 4 }}>
                  ⚠️ 司機須知
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#856404', lineHeight: 1.5 }}>
                  <li>需要提交 KYC 文件（身份證、駕駛執照）</li>
                  <li>需要通過背景審查</li>
                  <li>審批後才能開始接單</li>
                </ul>
              </div>
              <input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="姓名" 
                style={inputStyle} 
              />
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8 }}>
                <select 
                  value={regionCode} 
                  onChange={(e) => setRegionCode(e.target.value)} 
                  style={inputStyle}
                >
                  {regionOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="手機號碼" 
                  style={inputStyle} 
                />
              </div>
              <input 
                type="password" 
                value={regPassword} 
                onChange={(e) => setRegPassword(e.target.value)} 
                placeholder="密碼" 
                style={inputStyle} 
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="確認密碼"
                style={inputStyle}
              />
              <button
                onClick={handleRegister}
                disabled={!canRegister}
                style={{
                  marginTop: 4,
                  border: 0,
                  borderRadius: 12,
                  padding: '13px 14px',
                  fontWeight: 700,
                  background: canRegister ? '#2b5d53' : '#ece9de',
                  color: canRegister ? '#ecfff9' : '#8f8a7a',
                  cursor: canRegister ? 'pointer' : 'not-allowed',
                }}
              >
                {loading ? '建立中...' : '註冊成為司機'}
              </button>
            </div>
          )}

          <div style={{
            minHeight: 20,
            marginTop: 12,
            color: messageType === 'success' ? '#1c7d57' : messageType === 'error' ? '#a5483c' : '#5d6e65',
            fontSize: 13,
            textAlign: 'center',
          }}>
            {message}
          </div>
        </div>
      </div>
    </div>
  )
}
