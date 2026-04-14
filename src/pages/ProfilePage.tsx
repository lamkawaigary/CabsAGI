// Cabs Carpool - Profile Page
// Version: 3.0
// 用戶可以設置/修改暱稱

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (currentUser?.name) {
      setName(currentUser.name)
    }
  }, [currentUser])

  const handleSave = async () => {
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

        {/* Form */}
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
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{
              ...styles.saveBtn,
              background: saving ? '#ccc' : saved ? '#2e7d32' : '#143b34',
            }}
          >
            {saving ? '儲存中...' : saved ? '✓ 已儲存' : '儲存'}
          </button>
        </div>

        {/* User Info */}
        <div style={styles.infoCard}>
          <h3 style={styles.infoTitle}>帳戶資料</h3>
          
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>電話</span>
            <span style={styles.infoValue}>{currentUser?.phone || '未設定'}</span>
          </div>
          
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
  hint: {
    fontSize: 12,
    color: '#666',
    margin: '8px 0 16px',
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
