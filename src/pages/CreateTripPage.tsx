// Cabs Carpool - Create Trip Page v1.0
// 司機發佈行程頁面

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { tripService } from '../services/tripService'

export default function CreateTripPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(false)

  // Form fields
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [seats, setSeats] = useState(3)
  const [notes, setNotes] = useState('')

  const handleSubmit = async () => {
    if (!currentUser || !pickup || !dropoff || !date || !time) {
      alert('請填寫所有必填欄位')
      return
    }

    try {
      setLoading(true)
      const departureTime = `${date} ${time}`
      
      await tripService.create({
        driverId: currentUser.id,
        driverName: currentUser.name || '司機',
        driverPhone: currentUser.phone || '',
        pickup: { placeName: pickup, latitude: 0, longitude: 0 },
        dropoff: { placeName: dropoff, latitude: 0, longitude: 0 },
        departureTime,
        totalSeats: seats,
        notes,
      })

      alert('行程發佈成功！')
      navigate('/browse')
    } catch (error) {
      console.error('Error creating trip:', error)
      alert('發佈失敗，請重試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>←</button>
        <div style={styles.title}>🚗 發佈行程</div>
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
            {[1,2,3,4,5,6].map(n => (
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
          <div style={styles.hint}>7人車最多6位乘客</div>
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
          disabled={loading}
        >
          {loading ? '發佈中...' : '發佈行程'}
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
  hint: {
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
