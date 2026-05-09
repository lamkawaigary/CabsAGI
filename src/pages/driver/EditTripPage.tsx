// Cabs Carpool - Edit Trip Page
// 司機編輯行程

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { tripService } from '../../services/tripService'

export default function EditTripPage() {
  const navigate = useNavigate()
  const { tripId } = useParams()
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [seats, setSeats] = useState(3)
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadTrip()
  }, [tripId])

  const loadTrip = async () => {
    if (!tripId) return
    
    try {
      const trip = await tripService.getById(tripId)
      if (trip) {
        const tripData = trip as any
        setPickup(tripData.route?.pickup?.placeName || tripData.pickup || '')
        setDropoff(tripData.route?.dropoff?.placeName || tripData.dropoff || '')
        
        // Parse date and time from departureTime
        if (tripData.departureTime) {
          const [d, t] = tripData.departureTime.split(' ')
          setDate(d || '')
          setTime(t || '')
        }
        
        setSeats(tripData.totalSeats || 3)
        setPrice(tripData.pricePerSeat || tripData.price || '')
        setNotes(tripData.notes || '')
      }
    } catch (error) {
      console.error('Error loading trip:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!currentUser || !tripId || !pickup || !dropoff || !date || !time) {
      alert('請填寫所有必填欄位')
      return
    }

    try {
      setSaving(true)
      const departureTime = `${date} ${time}`
      
      await tripService.update(tripId, {
        route: {
          pickup: { placeName: pickup, latitude: 0, longitude: 0 },
          dropoff: { placeName: dropoff, latitude: 0, longitude: 0 },
        },
        departureTime,
        totalSeats: seats,
        pricePerSeat: Number(price) || 0,
        notes,
      } as any)

      alert('行程已更新！')
      navigate('/driver-trips')
    } catch (error) {
      console.error('Error updating trip:', error)
      alert('更新失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>載入中...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/driver-trips')}>←</button>
        <div style={styles.title}>✏️ 編輯行程</div>
        <div style={{width: 40}} />
      </header>

      {/* Form */}
      <div style={styles.form}>
        {/* Pickup */}
        <div style={styles.field}>
          <label style={styles.label}>上車地點 📍</label>
          <input
            style={styles.input}
            placeholder="例如：香港國際機場"
            value={pickup}
            onChange={e => setPickup(e.target.value)}
          />
        </div>

        {/* Dropoff */}
        <div style={styles.field}>
          <label style={styles.label}>目的地 📍</label>
          <input
            style={styles.input}
            placeholder="例如：深圳灣口岸"
            value={dropoff}
            onChange={e => setDropoff(e.target.value)}
          />
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

        {/* Seats */}
        <div style={styles.field}>
          <label style={styles.label}>座位數量 💺</label>
          <div style={styles.seatSelector}>
            {[1,2,3,4,5,6,7].map(n => (
              <button
                key={n}
                style={{
                  ...styles.seatBtn,
                  ...(seats === n ? styles.seatBtnActive : {})
                }}
                onClick={() => setSeats(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div style={styles.field}>
          <label style={styles.label}>每位價格 💰</label>
          <input
            style={styles.input}
            type="number"
            placeholder="例如：280"
            value={price}
            onChange={e => setPrice(e.target.value)}
          />
        </div>

        {/* Notes */}
        <div style={styles.field}>
          <label style={styles.label}>備註（可選）📝</label>
          <textarea
            style={styles.textarea}
            placeholder="行程備註、要求等..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Submit */}
        <button
          style={styles.submitBtn}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? '儲存中...' : '儲存更改'}
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
  loading: {
    textAlign: 'center',
    padding: 40,
    color: '#8b7355',
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
  textarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 15,
    border: '2px solid #f0e0d6',
    borderRadius: 12,
    background: '#fff',
    color: '#4a3728',
    boxSizing: 'border-box',
    resize: 'none',
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
