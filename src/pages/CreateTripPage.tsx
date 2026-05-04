// Cabs Carpool - Create Trip Page v3.0
// Improved UI with Design System

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listingService } from '../services/listingService'
import { colors, radius } from '../styles/designSystem'

export default function CreateTripPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(false)

  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [seats, setSeats] = useState(3)
  const [vehicleType, setVehicleType] = useState<'sedan' | '7seater'>('7seater')
  const [isCarpool, setIsCarpool] = useState(true)
  const [notes, setNotes] = useState('')

  // Quick presets
  const presets = [
    { label: '香港機場→深圳灣', pickup: '香港國際機場', dropoff: '深圳灣口岸' },
    { label: '機場→廣州', pickup: '香港國際機場', dropoff: '廣州白雲機場' },
    { label: '中環→羅湖', pickup: '中環', dropoff: '深圳羅湖' },
  ]

  const handleSubmit = async () => {
    if (!currentUser || !pickup || !dropoff || !date || !time) {
      alert('請填寫所有必填欄位')
      return
    }

    try {
      setLoading(true)
      const departureTime = new Date(`${date}T${time}`).toISOString()
      
      await listingService.create({
        type: 'driver_offer',
        initiatorId: currentUser.id,
        initiatorName: currentUser.name || '司機',
        initiatorPhone: currentUser.phone || '',
        pickup: { placeName: pickup, latitude: 0, longitude: 0 },
        dropoff: { placeName: dropoff, latitude: 0, longitude: 0 },
        departureTime,
        passengerCount: seats,
        vehicleType,
        isCarpool,
        notes,
      })

      alert('行程發佈成功！')
      navigate('/driver-home')
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
        <h1 style={styles.title}>🚗 發佈行程</h1>
        <div style={{ width: 40 }} />
      </header>

      {/* Content */}
      <div style={styles.content}>
        {/* Quick Presets */}
        <div style={styles.section}>
          <p style={styles.sectionLabel}>快速選擇路線</p>
          <div style={styles.presets}>
            {presets.map((preset, idx) => (
              <button
                key={idx}
                style={styles.presetBtn}
                onClick={() => {
                  setPickup(preset.pickup)
                  setDropoff(preset.dropoff)
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Route Card */}
        <div style={styles.card}>
          <div style={styles.field}>
            <label style={styles.label}>📍 上車地點</label>
            <input
              style={styles.input}
              placeholder="例如：香港國際機場"
              value={pickup}
              onChange={e => setPickup(e.target.value)}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>📍 目的地</label>
            <input
              style={styles.input}
              placeholder="例如：深圳灣口岸"
              value={dropoff}
              onChange={e => setDropoff(e.target.value)}
            />
          </div>
        </div>

        {/* Date & Time Row */}
        <div style={styles.row}>
          <div style={{...styles.field, flex: 1}}>
            <label style={styles.label}>📅 日期</label>
            <input
              style={styles.input}
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div style={{...styles.field, flex: 1}}>
            <label style={styles.label}>⏰ 時間</label>
            <input
              style={styles.input}
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>
        </div>

        {/* Seats Card */}
        <div style={styles.card}>
          <label style={styles.label}>💺 座位數</label>
          <div style={styles.seatSelector}>
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
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

        {/* Vehicle Type Card */}
        <div style={styles.card}>
          <label style={styles.label}>🚗 車型</label>
          <div style={styles.options}>
            <button
              style={{
                ...styles.optionBtn,
                ...(vehicleType === 'sedan' ? styles.optionBtnActive : {})
              }}
              onClick={() => setVehicleType('sedan')}
            >
              🚙 轎車
            </button>
            <button
              style={{
                ...styles.optionBtn,
                ...(vehicleType === '7seater' ? styles.optionBtnActive : {})
              }}
              onClick={() => setVehicleType('7seater')}
            >
              🚐 七人車
            </button>
          </div>
        </div>

        {/* Notes Card */}
        <div style={styles.card}>
          <label style={styles.label}>📝 備註（可選）</label>
          <textarea
            style={styles.textarea}
            placeholder="任何特別要求或備註..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <button
          style={styles.submitBtn}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '發佈中...' : '🚗 發佈行程'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: colors.background,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    background: colors.white,
    borderBottom: `1px solid ${colors.border}`,
  },
  backBtn: {
    fontSize: 22,
    background: 'none',
    border: 'none',
    color: colors.primary,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  content: {
    padding: 18,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    margin: '0 0 8px',
    fontSize: 13,
    fontWeight: 600,
    color: colors.textSecondary,
  },
  presets: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
  },
  presetBtn: {
    flexShrink: 0,
    padding: '8px 14px',
    background: colors.primaryLight,
    color: colors.primary,
    border: 'none',
    borderRadius: radius.full,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  card: {
    background: colors.white,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
  },
  field: {
    marginBottom: 12,
  },
  row: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: 12,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    fontSize: 15,
    boxSizing: 'border-box' as const,
  },
  seatSelector: {
    display: 'flex',
    gap: 8,
  },
  seatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    border: `2px solid ${colors.border}`,
    background: colors.white,
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  seatBtnActive: {
    border: `2px solid ${colors.primary}`,
    background: colors.primary,
    color: colors.white,
  },
  options: {
    display: 'flex',
    gap: 12,
  },
  optionBtn: {
    flex: 1,
    padding: 12,
    border: `2px solid ${colors.border}`,
    borderRadius: radius.sm,
    background: colors.white,
    fontSize: 14,
    cursor: 'pointer',
    color: colors.textSecondary,
  },
  optionBtnActive: {
    border: `2px solid ${colors.primary}`,
    background: colors.primaryLight,
    color: colors.primary,
  },
  textarea: {
    width: '100%',
    padding: 12,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    fontSize: 15,
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  submitBtn: {
    width: '100%',
    padding: 16,
    background: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: radius.md,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
}