import { useMemo, useState, type CSSProperties } from 'react'
import { useAuth } from '../context/AuthContext'
import RoleSelectionModal from '../components/RoleSelectionModal'

type Mode = 'login' | 'register'
type LoginMethod = 'password' | 'otp'
type MessageType = 'success' | 'error' | 'neutral'

const messageClassByType = (messageType: MessageType) => {
  if (messageType === 'success') return 'ui-notice ui-notice-ok'
  if (messageType === 'error') return 'ui-notice ui-notice-error'
  return 'ui-notice'
}

const regionOptions = [
  { label: '+852', value: '852' },
  { label: '+86', value: '86' },
  { label: '+853', value: '853' },
]

const loginRegionOptions = [
  { label: '+852', value: '852' },
  { label: '+86', value: '86' },
]

const shell: CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(circle at 0% 0%, #ffe7bf 0%, #ffe7bf 20%, transparent 40%), radial-gradient(circle at 100% 100%, #c8ffe7 0%, #c8ffe7 18%, transparent 42%), linear-gradient(140deg, #f6f2eb 0%, #f1f7ff 55%, #f3fff7 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  fontFamily: 'Avenir Next, SF Pro Display, Noto Sans TC, PingFang TC, sans-serif',
}

const card: CSSProperties = {
  width: '100%',
  maxWidth: '980px',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  background: '#fffefb',
  borderRadius: '28px',
  overflow: 'hidden',
  boxShadow: '0 24px 60px rgba(25, 40, 35, 0.16)',
  border: '1px solid #e8e2d6',
}

const hero: CSSProperties = {
  padding: '48px',
  background: 'linear-gradient(165deg, #173d36 0%, #224e45 62%, #2f6257 100%)',
  color: '#f8fff8',
}

const panel: CSSProperties = { padding: '32px 28px', background: '#fffefb' }

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 42,
  padding: '10px 12px',
  borderRadius: 'var(--ui-radius-md)',
  border: '1px solid var(--ui-border)',
  outline: 'none',
  fontSize: '14px',
  boxSizing: 'border-box',
  background: '#fcfefc',
}

export default function Landing() {
  const { loginWithPassword, loginWithGoogle, sendOtp, verifyOtp, registerUser, resetPasswordByPhone, currentUser, needsRoleSelection, setNeedsRoleSelection } = useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<MessageType>('neutral')

  const [loginInput, setLoginInput] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginRegionCode, setLoginRegionCode] = useState('852')

  const [otpRegionCode, setOtpRegionCode] = useState('852')
  const [otpPhone, setOtpPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const [name, setName] = useState('')
  const [regionCode, setRegionCode] = useState('852')
  const [phone, setPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [resetRegionCode, setResetRegionCode] = useState('852')
  const [resetPhone, setResetPhone] = useState('')

  const selectedLoginRegionLabel =
    loginRegionOptions.find((option) => option.value === loginRegionCode)?.label || '+852'
  const loginPhoneExample = useMemo(
    () => (loginRegionCode === '86' ? '13800138000' : '61234567'),
    [loginRegionCode],
  )
  const loginInputPlaceholder = useMemo(
    () => `手機號碼（例如 ${loginPhoneExample}）/ 電郵 / admin`,
    [loginPhoneExample],
  )
  const canLogin = useMemo(() => !!loginInput && !!loginPassword && !loading, [loginInput, loginPassword, loading])
  const canSendOtp = useMemo(() => !!otpPhone && !loading, [otpPhone, loading])
  const canVerifyOtp = useMemo(() => !!otpCode && otpSent && !loading, [otpCode, otpSent, loading])
  const canRegister = useMemo(
    () => !!name && !!phone && !!regPassword && regPassword === confirmPassword && !loading,
    [name, phone, regPassword, confirmPassword, loading],
  )
  const loginAutoHint = useMemo(() => {
    if (loginMethod !== 'password') return ''
    const trimmed = loginInput.trim()
    if (!trimmed) return ''

    const lower = trimmed.toLowerCase()
    if (['glam', 'gary', 'lamgary', 'admin'].includes(lower)) {
      return '已偵測管理員別名，將使用 admin 帳號登入。'
    }

    if (trimmed.includes('@')) {
      return '已偵測電郵格式，將使用電郵登入。'
    }

    const digits = trimmed.replace(/\D/g, '')
    if (!digits) return ''

    if (trimmed.startsWith('+')) {
      return `已偵測完整國碼手機：+${digits}`
    }

    return `將自動套用區碼 ${selectedLoginRegionLabel}，登入手機帳號：${selectedLoginRegionLabel}${digits}`
  }, [loginMethod, loginInput, selectedLoginRegionLabel])

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

  const handleSendOtp = async () => {
    setLoading(true)
    setMessage('')
    const result = await sendOtp(otpRegionCode, otpPhone)
    setResult(result.ok, result.message)
    setOtpSent(result.ok)
    setLoading(false)
  }

  const handleVerifyOtp = async () => {
    setLoading(true)
    setMessage('')
    const result = await verifyOtp(otpCode)
    setResult(result.ok, result.message)
    if (result.ok) {
      setOtpCode('')
      setOtpSent(false)
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    if (regPassword !== confirmPassword) {
      setResult(false, '兩次密碼不一致')
      return
    }

    setLoading(true)
    setMessage('')
    const result = await registerUser({ regionCode, phone, password: regPassword, name })
    setResult(result.ok, result.message)
    setLoading(false)
  }

  const handleResetPassword = async () => {
    setLoading(true)
    setMessage('')
    const result = await resetPasswordByPhone(resetRegionCode, resetPhone)
    setResult(result.ok, result.message)
    setLoading(false)
  }

  // Driver flow - navigate to driver login/register
  const handleDriverClick = () => {
    window.location.href = '/driver'
  }

  return (
    <div style={shell}>
      <div style={card}>
        <section style={hero}>
          <div style={{ letterSpacing: '0.18em', fontSize: 12, opacity: 0.7, fontWeight: 700 }}>CABS MOBILITY CLOUD</div>
          <h1 style={{ marginTop: 18, marginBottom: 14, fontSize: 40, lineHeight: 1.1 }}>跨境商務出行<br />身份入口</h1>
          <p style={{ margin: 0, opacity: 0.86, fontSize: 15, lineHeight: 1.7 }}>
            沿用 P7S 核心認證流程，登入支援密碼與 OTP。重設密碼改為發送安全郵件連結。
          </p>
          <div style={{ marginTop: 36, display: 'grid', gap: 10 }}>
            {['密碼登入: 電郵 / 手機號 / admin 別名', 'OTP 登入: 手機驗證碼', 'Reset Password: 手機映射 email 發送重設信（安全流程）'].map((item) => (
              <div key={item} style={{ fontSize: 13, background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, padding: '10px 12px' }}>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section style={panel}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <button
              onClick={() => setMode('login')}
              className={`ui-btn ui-btn-tab ${mode === 'login' ? 'active' : ''}`}
              style={{
                flex: 1,
              }}
            >
              登入
            </button>
            <button
              onClick={() => setMode('register')}
              className={`ui-btn ui-btn-tab ${mode === 'register' ? 'active' : ''}`}
              style={{
                flex: 1,
              }}
            >
              註冊
            </button>
          </div>

          {mode === 'login' ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  onClick={() => setLoginMethod('password')}
                  className="ui-btn ui-btn-outline"
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontWeight: 700,
                    background: loginMethod === 'password' ? '#e8f0eb' : '#fff',
                    color: '#284a41',
                  }}
                >
                  密碼登入
                </button>
                <button
                  onClick={() => setLoginMethod('otp')}
                  className="ui-btn ui-btn-outline"
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontWeight: 700,
                    background: loginMethod === 'otp' ? '#e8f0eb' : '#fff',
                    color: '#284a41',
                  }}
                >
                  OTP 登入
                </button>
              </div>

              {loginMethod === 'password' ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8 }}>
                    <select value={loginRegionCode} onChange={(e) => setLoginRegionCode(e.target.value)} style={inputStyle}>
                      {loginRegionOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      placeholder={loginInputPlaceholder}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: '#5d6e65' }}>
                    手機登入可只輸入本地號碼。當前區碼 {selectedLoginRegionLabel}，例如 {loginPhoneExample}。
                  </div>
                  {loginAutoHint && (
                    <div
                      style={{
                        fontSize: 12,
                        color: '#2b5d53',
                        background: '#edf8f2',
                        border: '1px solid #cfe7dc',
                        borderRadius: 10,
                        padding: '8px 10px',
                      }}
                    >
                      {loginAutoHint}
                    </div>
                  )}
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
                    {loading ? '處理中...' : '使用 Google 登入'}
                  </button>
                  <button
                    onClick={handleLogin}
                    disabled={!canLogin}
                    className="ui-btn ui-btn-accent"
                    style={{
                      marginTop: 4,
                      padding: '13px 14px',
                      fontWeight: 700,
                      background: canLogin ? '#f1b91f' : '#ece9de',
                      color: canLogin ? '#2f2a10' : '#8f8a7a',
                    }}
                  >
                    {loading ? '登入中...' : '登入 Cabs'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8 }}>
                    <select value={otpRegionCode} onChange={(e) => setOtpRegionCode(e.target.value)} style={inputStyle}>
                      {regionOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <input value={otpPhone} onChange={(e) => setOtpPhone(e.target.value)} placeholder="手機號碼" style={inputStyle} />
                  </div>
                  {!otpSent ? (
                    <button
                      onClick={handleSendOtp}
                      disabled={!canSendOtp}
                      className="ui-btn ui-btn-primary"
                      style={{
                        padding: '13px 14px',
                        fontWeight: 700,
                        background: canSendOtp ? '#2b5d53' : '#ece9de',
                        color: canSendOtp ? '#ecfff9' : '#8f8a7a',
                      }}
                    >
                      {loading ? '發送中...' : '發送驗證碼'}
                    </button>
                  ) : (
                    <>
                      <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="請輸入 OTP" style={inputStyle} />
                      <button
                        onClick={handleVerifyOtp}
                        disabled={!canVerifyOtp}
                        className="ui-btn ui-btn-accent"
                        style={{
                          padding: '13px 14px',
                          fontWeight: 700,
                          background: canVerifyOtp ? '#f1b91f' : '#ece9de',
                          color: canVerifyOtp ? '#2f2a10' : '#8f8a7a',
                        }}
                      >
                        {loading ? '驗證中...' : '確認 OTP 登入'}
                      </button>
                    </>
                  )}
                </div>
              )}

              <div style={{ marginTop: 14, padding: '12px', borderRadius: 12, background: '#f4f7f4', border: '1px solid #dde6dd' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#355149', marginBottom: 8 }}>忘記密碼</div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8, marginBottom: 8 }}>
                  <select value={resetRegionCode} onChange={(e) => setResetRegionCode(e.target.value)} style={inputStyle}>
                    {regionOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input value={resetPhone} onChange={(e) => setResetPhone(e.target.value)} placeholder="註冊手機號碼" style={inputStyle} />
                </div>
                <button
                  onClick={handleResetPassword}
                  disabled={!resetPhone || loading}
                  className="ui-btn ui-btn-primary"
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    fontWeight: 700,
                    background: !resetPhone || loading ? '#ece9de' : '#173d36',
                    color: !resetPhone || loading ? '#8f8a7a' : '#ecfff9',
                  }}
                >
                  {loading ? '提交中...' : '發送重設密碼郵件'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="姓名" style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8 }}>
                <select value={regionCode} onChange={(e) => setRegionCode(e.target.value)} style={inputStyle}>
                  {regionOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="手機號碼" style={inputStyle} />
              </div>
              <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="密碼" style={inputStyle} />
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
                className="ui-btn ui-btn-primary"
                style={{
                  marginTop: 4,
                  padding: '13px 14px',
                  fontWeight: 700,
                  background: canRegister ? '#2b5d53' : '#ece9de',
                  color: canRegister ? '#ecfff9' : '#8f8a7a',
                }}
              >
                {loading ? '建立中...' : '建立帳號'}
              </button>
            </div>
          )}

          <div style={{ minHeight: 24, marginTop: 12 }}>
            {message ? (
              <div className={messageClassByType(messageType)} style={{ fontSize: 13 }}>
                {message}
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: '#5d6e65' }}>
            提示: OTP 需要 Firebase Phone Auth 與 reCAPTCHA。
          </div>

          <div id="recaptcha-container" style={{ position: 'absolute', left: -9999, top: -9999 }} />
        </section>

        {/* Driver Section - Separate flow for drivers */}
        <section style={{ padding: '24px 28px', background: '#f8f7f4', borderTop: '1px solid #e8e2d6' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#8a8478', marginBottom: 8, fontWeight: 600, letterSpacing: '0.1em' }}>
              司機專區
            </div>
            <button
              onClick={handleDriverClick}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                border: '1px solid #d2dfd4',
                borderRadius: 12,
                padding: '12px 24px',
                fontWeight: 700,
                background: '#fff',
                color: '#284a41',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 17h8M8 17a2 2 0 11-4 0 2 2 0 014 0zM16 17a2 2 0 104 0 2 2 0 00-4 0zM3 9h13a2 2 0 012 2v3H3V9zm13 0V6a2 2 0 00-2-2H5a2 2 0 00-2 2v3" />
              </svg>
              司機登入 / 註冊
            </button>
            <div style={{ fontSize: 11, color: '#9a948a', marginTop: 8 }}>
              需要完成 KYC 審批才能接單
            </div>
          </div>
        </section>
      </div>

      {/* Role Selection Modal for new users */}
      <RoleSelectionModal
        isOpen={needsRoleSelection && !!currentUser}
        onComplete={(role) => {
          setNeedsRoleSelection(false)
          // Redirect based on role
          if (role === 'driver') {
            window.location.href = '/driver'
          } else {
            window.location.href = '/dashboard'
          }
        }}
      />
    </div>
  )
}
