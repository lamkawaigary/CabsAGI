// Cabs Carpool - Create Request Page v2.0
// Updated to use unified listingService

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { listingService } from '../../services/listingService'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebaseConfig'

interface Place {
  id: string
  name: string
  placeName: string
}

export default function CreateRequestPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPickupList, setShowPickupList] = useState(false)
  const [showDropoffList, setShowDropoffList] = useState(false)

  // Form fields
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [notes, setNotes] = useState('')
  
  // Vehicle type & ride type
  const [vehicleType, setVehicleType] = useState<'sedan' | '7seater'>('sedan')
  const [isCarpool, setIsCarpool] = useState(true)  // true = 共乘, false = 包車
  
  // Get max seats based on vehicle type
  const maxSeats = vehicleType === 'sedan' ? 4 : 6

  // Favorite places
  const [pickupPlaces, setPickupPlaces] = useState<Place[]>([])
  const [dropoffPlaces, setDropoffPlaces] = useState<Place[]>([])

  useEffect(() => {
    loadFavoritePlaces()
  }, [])

  const loadFavoritePlaces = async () => {
    if (!currentUser?.id) return
    
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.id))
      if (userDoc.exists()) {
        const data = userDoc.data()
        setPickupPlaces(data.favoritePickups || [])
        setDropoffPlaces(data.favoriteDropoffs || [])
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    }
  }

  const handleSubmit = async () => {
    if (!currentUser || !pickup || !dropoff || !date || !time) {
      alert('請填寫所有必填欄位')
      return
    }

    try {
      setLoading(true)
      const departureTime = new Date(`${date}T${time}`).toISOString()
      
      await listingService.create({
        type: 'passenger_request',  // This is a passenger requesting a ride
        initiatorId: currentUser.id,
        initiatorName: currentUser.name || '乘客',
        initiatorPhone: currentUser.phone || '',
        pickup: { placeName: pickup, latitude: 0, longitude: 0 },
        dropoff: { placeName: dropoff, latitude: 0, longitude: 0 },
        departureTime,
        passengerCount: passengers,
        vehicleType,
        isCarpool,
        notes,
      })

      alert('需求發布成功！')
      navigate('/passenger-home')
    } catch (error) {
      console.error('Error creating request:', error)
      alert('發布失敗，請重試')
    } finally {
      setLoading(false)
    }
  }

  const selectPickup = (placeName: string) => {
    setPickup(placeName)
    setShowPickupList(false)
  }

  const selectDropoff = (placeName: string) => {
    setDropoff(placeName)
    setShowDropoffList(false)
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>←</button>
        <div style={styles.title}>📋 發布需求</div>
        <div style={{width: 40}} />
      </header>

      {/* Form */}
      <div style={styles.form}>
        {/* Pickup */}
        <div style={styles.field}>
          <label style={styles.label}>上車地點 📍</label>
          <div style={styles.inputWrapper}>
            <input
              style={styles.input}
              placeholder="例如：香港國際機場"
              value={pickup}
              onChange={e => setPickup(e.target.value)}
              onFocus={() => setShowPickupList(true)}
            />
            {pickupPlaces.length > 0 && (
              <button 
                style={styles.favBtn}
                onClick={() => setShowPickupList(!showPickupList)}
                type="button"
              >
                ★
              </button>
            )}
          </div>
          {showPickupList && pickupPlaces.length > 0 && (
            <div style={styles.favList}>
              {pickupPlaces.map(place => (
                <div 
                  key={place.id} 
                  style={styles.favItem}
                  onClick={() => selectPickup(place.placeName)}
                >
                  📍 {place.placeName}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dropoff */}
        <div style={styles.field}>
          <label style={styles.label}>目的地 🏁</label>
          <div style={styles.inputWrapper}>
            <input
              style={styles.input}
              placeholder="例如：深圳灣口岸"
              value={dropoff}
              onChange={e => setDropoff(e.target.value)}
              onFocus={() => setShowDropoffList(true)}
            />
            {dropoffPlaces.length > 0 && (
              <button 
                style={styles.favBtn}
                onClick={() => setShowDropoffList(!showDropoffList)}
                type="button"
              >
                ★
              </button>
            )}
          </div>
          {showDropoffList && dropoffPlaces.length > 0 && (
            <div style={styles.favList}>
              {dropoffPlaces.map(place => (
                <div 
                  key={place.id} 
                  style={styles.favItem}
                  onClick={() => selectDropoff(place.placeName)}
                >
                  🏁 {place.placeName}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date & Time */}
        <div style={styles.row}>
          <div style={styles.fieldHalf}>
            <label style={styles.label}>日期 📅</label>
            <input
              style={styles.input}
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div style={styles.fieldHalf}>
            <label style={styles.label}>時間 🕐</label>
            <input
              style={styles.input}
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>
        </div>

        {/* Vehicle Type */}
        <div style={styles.field}>
          <label style={styles.label}>車輛類型 🚗</label>
          <div style={styles.toggleRow}>
            <button
              type="button"
              style={{
                ...styles.toggleBtn,
                ...(vehicleType === 'sedan' ? styles.toggleBtnActive : {})
              }}
              onClick={() => {
                setVehicleType('sedan')
                if (passengers > 4) setPassengers(4)
              }}
            >
              🚙 轎車（最多4位）
            </button>
            <button
              type="button"
              style={{
                ...styles.toggleBtn,
                ...(vehicleType === '7seater' ? styles.toggleBtnActive : {})
              }}
              onClick={() => {
                setVehicleType('7seater')
                if (passengers > 7) setPassengers(7)
              }}
            >
              🚐 7人車（最多6位）
            </button>
          </div>
        </div>

        {/* Ride Type (共乘/包車) */}
        <div style={styles.field}>
          <label style={styles.label}>行程類型 🚗</label>
          <div style={styles.toggleRow}>
            <button
              type="button"
              style={{
                ...styles.toggleBtn,
                ...(isCarpool ? styles.toggleBtnActive : {})
              }}
              onClick={() => setIsCarpool(true)}
            >
              👥 共乘
            </button>
            <button
              type="button"
              style={{
                ...styles.toggleBtn,
                ...(!isCarpool ? styles.toggleBtnActive : {})
              }}
              onClick={() => setIsCarpool(false)}
            >
              🚐 包車
            </button>
          </div>
          <div style={styles.toggleHint}>
            {isCarpool 
              ? '💡 共乘：與其他乘客分享，降低成本' 
              : '💡 包車：專屬車輛，靈活出發'}
          </div>
        </div>

        {/* Passengers */}
        <div style={styles.field}>
          <label style={styles.label}>乘客人數 👥</label>
          <div style={styles.seatSelector}>
            {Array.from({ length: maxSeats }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                style={{
                  ...styles.seatBtn,
                  ...(passengers === n ? styles.seatBtnActive : {})
                }}
                onClick={() => setPassengers(n)}
                type="button"
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={styles.field}>
          <label style={styles.label}>備註（可選）📝</label>
          <textarea
            style={styles.textarea}
            placeholder="行程備註、特殊要求等..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Submit */}
        <button
          style={styles.submitBtn}
          onClick={handleSubmit}
          disabled={loading}
          type="button"
        >
          {loading ? '發布中...' : '發布需求'}
        </button>
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
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  fieldHalf: {
    flex: 1,
  },
  row: {
    display: 'flex',
    gap: 12,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#8b7355',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative' as const,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 15,
    border: '2px solid #f0e0d6',
    borderRadius: 12,
    background: '#fff',
    color: '#4a3728',
    boxSizing: 'border-box',
  },
  favBtn: {
    position: 'absolute' as const,
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#fff9f5',
    border: '2px solid #f0e0d6',
    color: '#e07b4c',
    fontSize: 16,
    cursor: 'pointer',
  },
  favList: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    border: '2px solid #f0e0d6',
    borderRadius: 12,
    marginTop: 4,
    zIndex: 10,
    maxHeight: 200,
    overflowY: 'auto' as const,
  },
  favItem: {
    padding: '12px 16px',
    fontSize: 14,
    color: '#4a3728',
    cursor: 'pointer',
    borderBottom: '1px solid #f0e0d6',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 15,
    border: '2px solid #f0e0d6',
    borderRadius: 12,
    background: '#fff',
    color: '#4a3728',
    boxSizing: 'border-box',
    resize: 'none' as const,
  },
  seatSelector: {
    display: 'flex',
    gap: 8,
  },
  seatBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    border: '2px solid #f0e0d6',
    background: '#fff',
    fontSize: 16,
    fontWeight: 500,
    color: '#8b7355',
    cursor: 'pointer',
  },
  seatBtnActive: {
    background: '#e07b4c',
    color: '#fff',
    borderColor: '#e07b4c',
  },
  toggleRow: {
    display: 'flex',
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    padding: '14px 16px',
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
  toggleHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#8b7355',
  },
  submitBtn: {
    width: '100%',
    padding: 16,
    background: 'linear-gradient(135deg, #e07b4c, #c4623a)',
    color: '#fff',
    border: 'none',
    borderRadius: 16,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 20,
  },
}
