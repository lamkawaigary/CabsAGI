// Cabs Carpool - Favorite Places Page
// 常用地點設定

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../../firebaseConfig'

interface Place {
  id: string
  name: string
  placeName: string
}

export default function FavoritePlacesPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [type, setType] = useState<'pickup' | 'dropoff'>('pickup')
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [newPlace, setNewPlace] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Determine type from URL or default
    const params = new URLSearchParams(window.location.search)
    const urlType = params.get('type')
    if (urlType === 'dropoff') setType('dropoff')
    
    loadPlaces()
  }, [])

  const loadPlaces = async () => {
    if (!currentUser?.id) return
    
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.id))
      if (userDoc.exists()) {
        const data = userDoc.data()
        const field = type === 'pickup' ? 'favoritePickups' : 'favoriteDropoffs'
        const savedPlaces = data[field] || []
        setPlaces(savedPlaces)
      }
    } catch (error) {
      console.error('Error loading places:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlace = async () => {
    if (!currentUser?.id || !newPlace.trim()) return
    
    try {
      setSaving(true)
      const field = type === 'pickup' ? 'favoritePickups' : 'favoriteDropoffs'
      const newPlaceObj = {
        id: Date.now().toString(),
        name: newPlace.trim(),
        placeName: newPlace.trim(),
      }
      
      const userRef = doc(db, 'users', currentUser.id)
      await updateDoc(userRef, {
        [field]: [...places, newPlaceObj]
      })
      
      setPlaces([...places, newPlaceObj])
      setNewPlace('')
    } catch (error) {
      console.error('Error adding place:', error)
      alert('添加失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePlace = async (placeId: string) => {
    if (!currentUser?.id) return
    
    try {
      setSaving(true)
      const field = type === 'pickup' ? 'favoritePickups' : 'favoriteDropoffs'
      const updatedPlaces = places.filter(p => p.id !== placeId)
      
      const userRef = doc(db, 'users', currentUser.id)
      await updateDoc(userRef, {
        [field]: updatedPlaces
      })
      
      setPlaces(updatedPlaces)
    } catch (error) {
      console.error('Error deleting place:', error)
      alert('刪除失敗')
    } finally {
      setSaving(false)
    }
  }

  const title = type === 'pickup' ? '常用上車地點' : '常用目的地'

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/passenger-settings')}>←</button>
        <div style={styles.title}>{title}</div>
        <div style={{width: 40}} />
      </header>

      {/* Type Toggle */}
      <div style={styles.toggle}>
        <button 
          style={{...styles.toggleBtn, ...(type === 'pickup' ? styles.toggleBtnActive : {})}}
          onClick={() => { setType('pickup'); setLoading(true); loadPlaces() }}
        >
          📍 上車地點
        </button>
        <button 
          style={{...styles.toggleBtn, ...(type === 'dropoff' ? styles.toggleBtnActive : {})}}
          onClick={() => { setType('dropoff'); setLoading(true); loadPlaces() }}
        >
          🏁 目的地
        </button>
      </div>

      {/* Add New Place */}
      <div style={styles.addSection}>
        <input
          style={styles.input}
          placeholder={`輸入新的${title}...`}
          value={newPlace}
          onChange={e => setNewPlace(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleAddPlace()}
        />
        <button 
          style={styles.addBtn}
          onClick={handleAddPlace}
          disabled={saving || !newPlace.trim()}
        >
          {saving ? '...' : '添加'}
        </button>
      </div>

      {/* Places List */}
      <div style={styles.list}>
        {loading ? (
          <div style={styles.empty}>載入中...</div>
        ) : places.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>📍</div>
            <div>暫時沒有儲存的地點</div>
            <div style={styles.emptySubtext}>添加常用地點方便快速發布需求</div>
          </div>
        ) : (
          places.map(place => (
            <div key={place.id} style={styles.placeItem}>
              <div style={styles.placeIcon}>📍</div>
              <div style={styles.placeName}>{place.placeName}</div>
              <button 
                style={styles.deleteBtn}
                onClick={() => handleDeletePlace(place.id)}
                disabled={saving}
              >
                ✕
              </button>
            </div>
          ))
        )}
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
  toggle: {
    display: 'flex',
    padding: 16,
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 12,
    border: '2px solid #f0e0d6',
    background: '#fff',
    fontSize: 14,
    fontWeight: 500,
    color: '#8b7355',
    cursor: 'pointer',
  },
  toggleBtnActive: {
    background: '#e07b4c',
    color: '#fff',
    borderColor: '#e07b4c',
  },
  addSection: {
    display: 'flex',
    padding: '0 16px 16px',
    gap: 8,
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: 15,
    border: '2px solid #f0e0d6',
    borderRadius: 12,
    background: '#fff',
    color: '#4a3728',
  },
  addBtn: {
    padding: '12px 20px',
    background: '#e07b4c',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  list: {
    padding: '0 16px',
  },
  placeItem: {
    display: 'flex',
    alignItems: 'center',
    background: '#fff',
    border: '2px solid #f0e0d6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  placeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  placeName: {
    flex: 1,
    fontSize: 15,
    color: '#4a3728',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#ffebee',
    color: '#c62828',
    border: 'none',
    fontSize: 14,
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    padding: 40,
    color: '#8b7355',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 8,
    color: '#8b7355',
  },
}
