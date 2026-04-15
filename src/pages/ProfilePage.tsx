// Cabs Carpool - Profile Page
// Version: 3.1
// 用戶可以設置暱稱和驗證電話

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

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
        // Update local user state - the AuthContext should handle this
        setShowPhoneForm(false)
        setOtpError('')
        alert('電話驗證成功！')
        // Force refresh
        window.location.reload()
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
        <button style={styles.backBtn} onClick={() => navigate(-1)}>←</button>
        <h1 style={styles.title}>個人資料</h1>
        <div style={{ width: 40 }} />
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Avatar */}
        <div style={styles.avatar}>
          {name ? name.charAt(0).toUpperCase() : '?'}
        </div>

        {/* Nickname Form */}
        <div style={styles.form}>
          <label style={styles.label}>暱稱 *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="輸入暱稱"
            style={styles.input}
            maxLength={20}
          />
          <p style={styles.hint}>暱稱會在對話中顯示，讓對方知道你在說什麼</p>

          <button
            onClick={handleSaveNickname}
            disabled={saving || !name.trim()}
            style={{
              ...styles.saveBtn,
              background: saving ? '#ccc' : saved ? '#2e7d32' : '#143b34',
            }}
          >
            {saving ? '儲存中...' : saved ? '✓ 已儲存' : '儲存'}
          </button>
        </div>

        {/* Phone Verification */}
        {showPhoneForm ? (
          <div style={styles.form}>
            <h3 style={styles.sectionTitle}>📱 電話驗證</h3>
            <p style={styles.sectionHint}>
              驗證電話後，司机和乘客可以通過電話聯絡你
            </p>
            
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
                style={styles.sendBtn}
              >
                {sendingOtp ? '發送中...' : '發送驗證碼'}
              </button>
            ) : (
              <>
                <label style={styles.label}>驗證碼</label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="輸入6位驗證碼"
                  style={styles.input}
                  maxLength={6}
                />
                <div style={styles.otpButtons}>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={verifying || otp.length < 6}
                    style={styles.verifyBtn}
                  >
                    {verifying ? '驗證中...' : '驗證'}
                  </button>
                  <button
                    onClick={() => {
                      setOtpSent(false)
                      setOtp('')
                      setOtpError('')
                    }}
                    style={styles.resendBtn}
                  >
                    重新輸入
                  </button>
                </div>
              </>
            )}
            
            <div id="recaptcha-container" />
          </div>
        ) : (
          <div style={styles.infoCard}>
            <h3 style={styles.infoTitle}>📱 電話驗證</h3>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>電話</span>
              <span style={styles.infoValue}>
                {currentUser?.phone ? `✓ ${currentUser.phone}` : '未設定'}
              </span>
            </div>
            <button
              onClick={() => setShowPhoneForm(true)}
              style={styles.editBtn}
            >
              修改電話
            </button>
          </div>
        )}

        {/* User Info */}
        <div style={styles.infoCard}>
          <h3 style={styles.infoTitle}>帳戶資料</h3>
          
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>電郵</span>
            <span style={styles.infoValue}>{currentUser?.email || '未設定'}</span>
          </div>
          
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>角色</span>
            <span style={styles.infoValue}>
              {currentUser?.role === 'driver' ? '🚗 司機' : 
               currentUser?.role === 'admin' ? '⚙️ 管理員' : '👤 乘客'}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button onClick={handleLogout} style={styles.logoutBtn}>
          登出
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: '#143b34',
    color: '#fff',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: 24,
    cursor: 'pointer',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
  },
  content: {
    padding: 20,
    display: 'grid',
    gap: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: '#143b34',
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    fontSize: 32,
    fontWeight: 600,
    margin: '0 auto',
  },
  form: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    margin: '0 0 8px',
    fontSize: 16,
    fontWeight: 600,
  },
  sectionHint: {
    fontSize: 13,
    color: '#666',
    margin: '0 0 16px',
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 16,
    boxSizing: 'border-box' as any,
  },
  phoneRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  phonePrefix: {
    padding: '12px 8px',
    background: '#f5f5f5',
    borderRadius: 8,
    fontSize: 16,
    color: '#666',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    margin: '8px 0 16px',
  },
  errorText: {
    fontSize: 13,
    color: '#c62828',
    margin: '8px 0',
  },
  saveBtn: {
    width: '100%',
    padding: '14px',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  sendBtn: {
    width: '100%',
    padding: '14px',
    background: '#1e56a3',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
  otpButtons: {
    display: 'flex',
    gap: 12,
    marginTop: 12,
  },
  verifyBtn: {
    flex: 1,
    padding: '14px',
    background: '#2e7d32',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  resendBtn: {
    padding: '14px 16px',
    background: '#fff',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  },
  infoCard: {
    background: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  infoTitle: {
    margin: '0 0 16px',
    fontSize: 15,
    fontWeight: 600,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 500,
  },
  editBtn: {
    width: '100%',
    padding: '10px',
    background: '#f5f5f5',
    color: '#1e56a3',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: 12,
  },
  logoutBtn: {
    width: '100%',
    padding: '14px',
    background: '#fff',
    color: '#c62828',
    border: '1px solid #c62828',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 500,
    cursor: 'pointer',
  },
}
