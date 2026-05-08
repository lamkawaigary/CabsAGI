// Cabs Carpool - Driver Settings Page v1.1
// 司機設定頁面 + 刪除帳戶

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import BottomNav from '../../components/BottomNav'

export default function DriverSettingsPage() {
  const navigate = useNavigate()
  const { currentUser, logout, deleteAccount } = useAuth()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError('')
    
    const result = await deleteAccount()
    
    if (result.ok) {
      navigate('/')
    } else {
      setDeleteError(result.message)
      setDeleting(false)
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/driver-home')}>←</button>
        <div style={styles.title}>⚙️ 設定</div>
        <div style={{width: 40}} />
      </header>

      {/* User Profile */}
      <div style={styles.profileSection}>
        <div style={styles.avatar}>
          {currentUser?.name?.charAt(0) || '?'}
        </div>
        <div style={styles.userName}>{currentUser?.name || '司機'}</div>
        <div style={styles.userRole}>🚗 司機</div>
      </div>

      {/* Settings */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>帳戶設定</div>
        
        <div style={styles.menuItem} onClick={() => navigate('/profile')}>
          <span>✏️ 編輯暱稱</span>
          <span style={styles.arrow}>›</span>
        </div>
        
        <div style={styles.menuItem} onClick={() => navigate('/profile')}>
          <span>📱 電話驗證</span>
          <span style={styles.arrow}>›</span>
        </div>
      </div>

      {/* Driver Specific */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>司機設定</div>
        
        <div style={styles.menuItem}>
          <span>🚗 車輛資料</span>
          <span style={styles.arrow}>›</span>
        </div>
        
        <div style={styles.menuItem}>
          <span>📍 常用路線</span>
          <span style={styles.arrow}>›</span>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>危險區域</div>
        
        <div style={{...styles.menuItem, ...styles.logoutItem}} onClick={handleLogout}>
          <span>🚪 登出</span>
        </div>
        
        <div 
          style={{...styles.menuItem, ...styles.deleteItem}} 
          onClick={() => setShowDeleteModal(true)}
        >
          <span>🗑️ 刪除帳戶</span>
        </div>
      </div>

      <BottomNav />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalIcon}>⚠️</div>
            <h2 style={styles.modalTitle}>刪除帳戶</h2>
            <p style={styles.modalText}>
              確定要刪除你的帳戶嗎？<br/>
              <strong>此操作無法撤銷</strong>，你將失去：
            </p>
            <ul style={styles.modalList}>
              <li>所有行程記錄</li>
              <li>聊天記錄</li>
              <li>個人設定</li>
            </ul>
            
            {deleteError && (
              <div style={styles.modalError}>{deleteError}</div>
            )}
            
            <div style={styles.modalButtons}>
              <button 
                style={styles.modalCancel}
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                取消
              </button>
              <button 
                style={styles.modalConfirm}
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#fff9f5',
    paddingBottom: 80, // Space for BottomNav
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    background: '#fff',
    borderBottom: '2px solid #f0e0d6',
  },
  backBtn: {
    fontSize: 22,
    background: 'none',
    border: 'none',
    color: '#e07b4c',
    cursor: 'pointer',
  },
  title: {
    fontSize: 17,
    fontWeight: 600,
    color: '#4a3728',
  },
  profileSection: {
    background: 'linear-gradient(135deg, #e07b4c, #c4623a)',
    padding: 36,
    textAlign: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    color: '#fff',
    margin: '0 auto 14px',
  },
  userName: {
    fontSize: 22,
    fontWeight: 600,
    color: '#fff',
  },
  userRole: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  section: {
    padding: 20,
    paddingBottom: 90, // Extra space for BottomNav
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#e07b4c',
    marginBottom: 12,
    letterSpacing: 1,
  },
  menuItem: {
    background: '#fff',
    border: '2px solid #f0e0d6',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 15,
    color: '#4a3728',
    cursor: 'pointer',
  },
  arrow: {
    color: '#8b7355',
    fontSize: 18,
  },
  logoutItem: {
    color: '#8b7355',
  },
  deleteItem: {
    color: '#c62828',
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    background: '#fff',
    padding: '10px 0',
    borderTop: '2px solid #f0e0d6',
    zIndex: 100,
  },
  navItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '6px 2px',
    background: 'none',
    border: 'none',
    fontSize: 11,
    color: '#8b7355',
    cursor: 'pointer',
  },
  navItemActive: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '6px 2px',
    background: 'none',
    border: 'none',
    fontSize: 11,
    color: '#e07b4c',
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    textAlign: 'center',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#4a3728',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#8b7355',
    lineHeight: 1.6,
    marginBottom: 12,
  },
  modalList: {
    textAlign: 'left',
    fontSize: 13,
    color: '#8b7355',
    marginBottom: 16,
    paddingLeft: 20,
  },
  modalError: {
    background: '#ffebee',
    color: '#c62828',
    padding: '10px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
  },
  modalButtons: {
    display: 'flex',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    padding: '12px',
    background: '#fff',
    color: '#8b7355',
    border: '2px solid #f0e0d6',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  modalConfirm: {
    flex: 1,
    padding: '12px',
    background: '#c62828',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}