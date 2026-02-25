import { useMemo, useState, type CSSProperties } from 'react'
import { useAuth } from '../context/AuthContext'

type Mode = 'login' | 'register'
type LoginMethod = 'password' | 'otp'
type MessageType = 'success' | 'error' | 'neutral'

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
  padding: '13px 14px',
  borderRadius: '12px',
  border: '1px solid #d6dfd6',
  outline: 'none',
  fontSize: '14px',
  boxSizing: 'border-box',
  background: '#fcfefc',
}

export default function Landing() {
  const { loginWithPassword, sendOtp, verifyOtp, registerUser, resetPasswordByPhone } = useAuth()

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

  const canLogin = useMemo(() => !!loginInput && !!loginPassword && !loading, [loginInput, loginPassword, loading])
  const canSendOtp = useMemo(() => !!otpPhone && !loading, [otpPhone, loading])
  const canVerifyOtp = useMemo(() => !!otpCode && otpSent && !loading, [otpCode, otpSent, loading])
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

  return (
    <div style={shell}>
      <div style={card}>
        <section style={hero}>
          <div style={{ letterSpacing: '0.18em', fontSize: 12, opacity: 0.7, fontWeight: 700 }}>CABS MOBILITY CLOUD</div>
          <h1 style={{ marginTop: 18, marginBottom: 14, fontSize: 40, lineHeight: 1.1 }}>跨境商務出行<br />身份入口</h1>
          <p style={{ margin: 0, opacity: 0.86, fontSize: 15, lineHeight: 1.7 }}>
            沿用 P7S 核心認證流程，登入支援密碼與 OTP。可透過手機映射帳號執行重設密碼。
          </p>
          <div style={{ marginTop: 36, display: 'grid', gap: 10 }}>
            {['密碼登入: 電郵 / 手機號 / admin 別名', 'OTP 登入: 手機驗證碼', 'Reset Password: 手機映射 email 發送重設信'].map((item) => (
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
              style={{
                flex: 1,
                border: 0,
                borderRadius: 12,
                padding: '10px 12px',
                fontWeight: 700,
                background: mode === 'login' ? '#143b34' : '#eef2ee',
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
                background: mode === 'register' ? '#143b34' : '#eef2ee',
                color: mode === 'register' ? '#ecfff9' : '#355149',
                cursor: 'pointer',
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
                  style={{
                    flex: 1,
                    border: '1px solid #d2dfd4',
                    borderRadius: 10,
                    padding: '8px 10px',
                    fontWeight: 700,
                    background: loginMethod === 'password' ? '#e8f0eb' : '#fff',
                    color: '#284a41',
                    cursor: 'pointer',
                  }}
                >
                  密碼登入
                </button>
                <button
                  onClick={() => setLoginMethod('otp')}
                  style={{
                    flex: 1,
                    border: '1px solid #d2dfd4',
                    borderRadius: 10,
                    padding: '8px 10px',
                    fontWeight: 700,
                    background: loginMethod === 'otp' ? '#e8f0eb' : '#fff',
                    color: '#284a41',
                    cursor: 'pointer',
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
                      placeholder="手機號碼 / 電郵 / admin"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: '#5d6e65' }}>
                    手機登入可只輸入本地號碼，系統會自動套用所選區碼。
                  </div>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="密碼"
                    style={inputStyle}
                  />
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
                      style={{
                        border: 0,
                        borderRadius: 12,
                        padding: '13px 14px',
                        fontWeight: 700,
                        background: canSendOtp ? '#2b5d53' : '#ece9de',
                        color: canSendOtp ? '#ecfff9' : '#8f8a7a',
                        cursor: canSendOtp ? 'pointer' : 'not-allowed',
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
                        style={{
                          border: 0,
                          borderRadius: 12,
                          padding: '13px 14px',
                          fontWeight: 700,
                          background: canVerifyOtp ? '#f1b91f' : '#ece9de',
                          color: canVerifyOtp ? '#2f2a10' : '#8f8a7a',
                          cursor: canVerifyOtp ? 'pointer' : 'not-allowed',
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
                  style={{
                    width: '100%',
                    border: 0,
                    borderRadius: 10,
                    padding: '11px 12px',
                    fontWeight: 700,
                    background: !resetPhone || loading ? '#ece9de' : '#173d36',
                    color: !resetPhone || loading ? '#8f8a7a' : '#ecfff9',
                    cursor: !resetPhone || loading ? 'not-allowed' : 'pointer',
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
                {loading ? '建立中...' : '建立帳號'}
              </button>
            </div>
          )}

          <div
            style={{
              minHeight: 24,
              marginTop: 12,
              color: messageType === 'success' ? '#1c7d57' : messageType === 'error' ? '#a5483c' : '#5d6e65',
              fontSize: 13,
            }}
          >
            {message}
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: '#5d6e65' }}>
            提示: OTP 需要 Firebase Phone Auth 與 reCAPTCHA。
          </div>

          <div id="recaptcha-container" style={{ position: 'absolute', left: -9999, top: -9999 }} />
        </section>
      </div>
    </div>
  )
}
