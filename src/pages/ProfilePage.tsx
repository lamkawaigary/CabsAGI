// Cabs Carpool - Profile Page v2.0
// Redesigned to match PassengerHome design style

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'
import { colors, radius } from '../styles/designSystem'
import BottomNav from '../components/BottomNav'

const Icon = ({ name, style = {} }: { name: string; style?: React.CSSProperties }) => (
  <span style={{
    fontFamily: "'Material Symbols Outlined'",
    fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
    fontSize: 20,
    ...style
  }}>{name}</span>
)

export default function ProfilePage() {
  const navigate = useNavigate()
  const { currentUser, logout, sendOtp, verifyOtp } = useAuth()
  
  // Nickname state
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  // Phone verification state
  const [showPhoneForm, setShowPhoneForm] = useState(false)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [verifySuccess, setVerifySuccess] = useState(false)

  useEffect(() => {
    if (currentUser?.name) {
      setName(currentUser.name)
    }
    // Auto-show phone form if phone not set
    if (!currentUser?.phone) {
      setShowPhoneForm(true)
    }
  }, [currentUser])

  const handleSaveNickname = async () => {
    if (!currentUser?.id || !name.trim()) {
      alert('請輸入暱稱')
      return
    }

    try {
      setSaving(true)
      await updateDoc(doc(db, 'users', currentUser.id), {
        name: name.trim(),
        updatedAt: new Date().toISOString()
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Error saving:', error)
      alert('儲存失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  const handleSendOtp = async () => {
    if (!phone || phone.length < 8) {
      setOtpError('請輸入有效電話號碼')
      return
    }
    
    setOtpError('')
    setSendingOtp(true)
    
    try {
      const result = await sendOtp('+852', phone)
      if (result.ok) {
        setOtpSent(true)
        setOtpError('')
      } else {
        setOtpError(result.message)
      }
    } catch (error) {
      setOtpError('發送驗證碼失敗')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setOtpError('請輸入6位驗證碼')
      return
    }
    
    setOtpError('')
    setVerifying(true)
    
    try {
      const result = await verifyOtp(otp)
      if (result.ok) {
        setVerifySuccess(true)
        setOtpError('')
        setShowPhoneForm(false)
      } else {
        setOtpError(result.message)
      }
    } catch (error) {
      setOtpError('驗證失敗，請檢查驗證碼')
    } finally {
      setVerifying(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.headerTitle}>👤 個人資料</h1>
            <p style={styles.headerSubtitle}>
              {currentUser?.role === 'driver' ? '🚗 司機' : currentUser?.role === 'admin' ? '⚙️ 管理員' : '👤 乘客'}
            </p>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {verifySuccess && (
        <div style={styles.successBanner}>
          ✅ 電話驗證成功！正在更新...
        </div>
      )}

      {/* Content */}
      <div style={styles.content}>
        {/* Avatar Card */}
        <div style={styles.card}>
          <div style={styles.avatar}>
            {name ? name.charAt(0).toUpperCase() : '?'}
          </div>
          <p style={styles.avatarHint}>這是你的頭像首字母</p>
        </div>

        {/* Nickname Form */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>🌟 暱稱</h3>
          <p style={styles.cardHint}>暱稱會在對話中顯示</p>
          
          <div style={styles.inputRow}>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="輸入暱稱"
              style={styles.input}
              maxLength={20}
            />
            <button
              onClick={handleSaveNickname}
              disabled={saving || !name.trim()}
              style={{
                ...styles.saveBtn,
                background: saved ? colors.success : colors.primary,
              }}
            >
              {saving ? '...' : saved ? '✓' : '儲存'}
            </button>
          </div>
        </div>

        {/* Phone Verification */}
        {showPhoneForm ? (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📱 電話驗證</h3>
            <p style={styles.cardHint}>驗證電話後，司機和乘客可以通過電話聯絡你</p>
            
            <label style={styles.label}>電話號碼</label>
            <div style={styles.phoneRow}>
              <span style={styles.phonePrefix}>+852</span>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="61234567"
                style={{...styles.input, flex: 1}}
                maxLength={12}
                disabled={otpSent}
              />
            </div>
            
            {otpError && <p style={styles.errorText}>{otpError}</p>}
            
            {!otpSent ? (
              <button
                onClick={handleSendOtp}
                disabled={sendingOtp || phone.length < 8}
                style={styles.primaryBtn}
              >
                {sendingOtp ? '發送中...' : '發送驗證碼'}
              </button>
            ) : (
              <>
                <label style={styles.label}>驗證碼</label>
                <div style={styles.inputRow}>
                  <input
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="6位驗證碼"
                    style={styles.input}
                    maxLength={6}
                  />
                  <button
                    onClick={handleVerifyOtp}
                    disabled={verifying || otp.length < 6}
                    style={styles.saveBtn}
                  >
                    {verifying ? '...' : '驗證'}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setOtpSent(false)
                    setOtp('')
                    setOtpError('')
                  }}
                  style={styles.textBtn}
                >
                  重新輸入電話號碼
                </button>
              </>
            )}
            
            <div id="recaptcha-container" />
          </div>
        ) : (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📱 電話驗證</h3>
            
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>電話</span>
              <span style={{
                ...styles.infoValue,
                color: currentUser?.phone ? colors.success : colors.textLight
              }}>
                {currentUser?.phone ? `✓ ${currentUser.phone}` : '未設定'}
              </span>
            </div>
            
            <button
              onClick={() => setShowPhoneForm(true)}
              style={styles.outlineBtn}
            >
              修改電話
            </button>
          </div>
        )}

        {/* Account Info */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📋 帳戶資料</h3>
          
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>電郵</span>
            <span style={styles.infoValue}>{currentUser?.email || '未設定'}</span>
          </div>
          
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>用戶ID</span>
            <span style={styles.infoValueMono}>
              {currentUser?.id?.slice(0, 12)}...
            </span>
          </div>
        </div>

        {/* Logout */}
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <Icon name="logout" style={{ fontSize: 18 }} />
          登出
        </button>
      </div>

      <BottomNav />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    paddingBottom: 80,
    background: '#fff9f5',
  },
  header: {
    background: colors.white,
    padding: '16px',
    borderBottom: `1px solid ${colors.border}`,
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    margin: '4px 0 0',
    fontSize: 13,
    color: colors.textSecondary,
  },
  successBanner: {
    background: colors.successBg,
    color: colors.success,
    padding: '12px 16px',
    textAlign: 'center',
    fontWeight: 600,
    fontSize: 14,
  },
  content: {
    padding: 16,
    display: 'grid',
    gap: 16,
  },
  card: {
    background: colors.white,
    borderRadius: radius.md,
    padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  cardTitle: {
    margin: '0 0 4px 0',
    fontSize: 16,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  cardHint: {
    margin: '0 0 16px 0',
    fontSize: 13,
    color: colors.textSecondary,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
    color: colors.white,
    display: 'grid',
    placeItems: 'center',
    fontSize: 32,
    fontWeight: 600,
    margin: '0 auto 8px',
  },
  avatarHint: {
    textAlign: 'center' as const,
    fontSize: 12,
    color: colors.textLight,
    margin: 0,
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 8,
    color: colors.textSecondary,
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    fontSize: 16,
    boxSizing: 'border-box' as const,
    color: colors.textPrimary,
  },
  phoneRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  phonePrefix: {
    padding: '12px 8px',
    background: colors.background,
    borderRadius: radius.sm,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    margin: '8px 0',
  },
  primaryBtn: {
    width: '100%',
    padding: '14px',
    background: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: radius.md,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '12px 20px',
    background: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: radius.sm,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  textBtn: {
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    fontSize: 13,
    cursor: 'pointer',
    marginTop: 12,
    textDecoration: 'underline',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.border}`,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 500,
    color: colors.textPrimary,
  },
  infoValueMono: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.textLight,
  },
  outlineBtn: {
    width: '100%',
    padding: '12px',
    background: colors.white,
    color: colors.primary,
    border: `2px solid ${colors.primary}`,
    borderRadius: radius.md,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 12,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '14px',
    background: colors.white,
    color: colors.error,
    border: `1px solid ${colors.error}`,
    borderRadius: radius.md,
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
  },
}