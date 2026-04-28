// Cabs Carpool - Role Selection Page
// 新用戶首次登入後選擇身份

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export default function RoleSelectionPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSelectRole = async (role: 'passenger' | 'driver') => {
    if (!currentUser?.id) return
    
    setLoading(true)
    setError('')
    
    try {
      await updateDoc(doc(db, 'users', currentUser.id), {
        role: role,
        updatedAt: new Date().toISOString(),
      })
      
      // Navigate based on role
      navigate(role === 'driver' ? '/driver-home' : '/passenger-home')
    } catch (err) {
      console.error('Error setting role:', err)
      setError('設定身份失敗，請重試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>🚗 Cabs</div>
      </header>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.icon}>👋</div>
        <h1 style={styles.title}>歡迎加入 Cabs</h1>
        <p style={styles.subtitle}>請選擇你的身份</p>

        {error && (
          <div style={styles.error}>{error}</div>
        )}

        {/* Role Selection Cards */}
        <div style={styles.cards}>
          {/* Passenger Option */}
          <button 
            style={{...styles.card, ...styles.cardLeft}}
            onClick={() => handleSelectRole('passenger')}
            disabled={loading}
          >
            <div style={styles.cardIcon}>👤</div>
            <div style={styles.cardTitle}>乘客</div>
            <div style={styles.cardDesc}>
              找尋司機行程<br/>
              發布乘車需求<br/>
              直接與司機聊天
            </div>
          </button>

          {/* Driver Option */}
          <button 
            style={{...styles.card, ...styles.cardRight}}
            onClick={() => handleSelectRole('driver')}
            disabled={loading}
          >
            <div style={styles.cardIcon}>🚗</div>
            <div style={styles.cardTitle}>司機</div>
            <div style={styles.cardDesc}>
              發布行程<br/>
              瀏覽乘客需求<br/>
              管理你的車隊
            </div>
          </button>
        </div>

        <p style={styles.hint}>
          你可以稍後在設定中更改身份
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#fff9f5',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: '#fff',
    borderBottom: '2px solid #f0e0d6',
  },
  logo: {
    fontSize: 20,
    fontWeight: 700,
    color: '#e07b4c',
  },
  content: {
    padding: '60px 24px',
    textAlign: 'center' as const,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: '#4a3728',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8b7355',
    marginBottom: 32,
  },
  error: {
    background: '#ffebee',
    color: '#c62828',
    padding: '12px 16px',
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 14,
  },
  cards: {
    display: 'flex',
    gap: 16,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    background: '#fff',
    border: '2px solid #f0e0d6',
    borderRadius: 20,
    padding: 24,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  cardLeft: {
    borderColor: '#e07b4c',
    background: 'linear-gradient(135deg, rgba(224,123,76,0.1), rgba(224,123,76,0.05))',
  },
  cardRight: {
    borderColor: '#f0e0d6',
  },
  cardIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#4a3728',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 13,
    color: '#8b7355',
    lineHeight: 1.6,
  },
  hint: {
    fontSize: 13,
    color: '#8b7355',
  },
}