import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess?: () => void
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const { loginWithPassword, loginWithGoogle } = useAuth()
  
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loginInput, setLoginInput] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (!isOpen) return null

  const handleLogin = async () => {
    if (!loginInput || !loginPassword) return
    setLoading(true)
    setMessage('')
    const result = await loginWithPassword(loginInput, loginPassword)
    setMessage(result.message)
    if (result.ok) {
      onLoginSuccess?.()
      onClose()
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setLoading(true)
    setMessage('')
    const result = await loginWithGoogle()
    setMessage(result.message)
    if (result.ok) {
      onLoginSuccess?.()
      onClose()
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
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

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={onClose} style={closeBtn}>✕</button>
        
        <h2 style={titleStyle}>{mode === 'login' ? '登入 CabsAGI' : '註冊新帳戶'}</h2>

        {message && (
          <div style={{...msgStyle, background: message.includes('成功') ? '#d4edda' : '#f8d7da', color: message.includes('成功') ? '#155724' : '#721c24'}}>
            {message}
          </div>
        )}

        {mode === 'login' ? (
          <>
            <input
              type="text"
              placeholder="手機號碼 / 電郵"
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
            <button onClick={handleLogin} disabled={loading || !loginInput || !loginPassword} style={btnPrimary}>
              {loading ? '登入中...' : '登入'}
            </button>
            
            <button onClick={handleGoogle} disabled={loading} style={{...btnPrimary, background: '#fff', color: '#333', border: '1px solid #ddd', marginTop: '12px'}}>
              Google 登入
            </button>

            <p style={{textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#666'}}>
              未有帳戶？ <button onClick={() => setMode('register')} style={linkBtn}>立即註冊</button>
            </p>
          </>
        ) : (
          <>
            <input type="text" placeholder="姓名" style={inputStyle} />
            <input type="tel" placeholder="手機號碼" style={inputStyle} />
            <input type="password" placeholder="密碼（6位或以上）" style={inputStyle} />
            <button onClick={() => {}} disabled={loading} style={btnPrimary}>
              {loading ? '註冊中...' : '註冊'}
            </button>
            <p style={{textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#666'}}>
              已有帳戶？ <button onClick={() => setMode('login')} style={linkBtn}>立即登入</button>
            </p>
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
  background: '#fff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px',
  maxHeight: '90vh', overflowY: 'auto', position: 'relative'
}

const closeBtn: React.CSSProperties = {
  position: 'absolute', top: '12px', right: '12px', border: 'none', background: 'transparent',
  fontSize: '24px', cursor: 'pointer', color: '#666'
}

const titleStyle: React.CSSProperties = { margin: '0 0 20px', textAlign: 'center', fontSize: '20px', fontWeight: 600 }

const msgStyle: React.CSSProperties = { padding: '10px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }

const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#143b34', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }
