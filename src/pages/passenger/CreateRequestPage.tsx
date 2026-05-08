// Cabs Carpool - Create Request Page v5.0
// Custom date/time picker + Vehicle type selector

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { requestService } from '../../services/tripService'
import { chatService } from '../../services/chatService'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebaseConfig'
import { colors, radius } from '../../styles/designSystem'

// ============ TAGS ============
const TAGS = ['演唱會', '迪士尼', '機場', '口岸', '商務', '婚禮', '體育賽事', '其他']

const getTagIcon = (tag: string) => {
  switch (tag) {
    case '演唱會': return '🎵'
    case '迪士尼': return '🏰'
    case '機場': return '✈️'
    case '口岸': return '🚪'
    case '商務': return '💼'
    case '婚禮': return '💒'
    case '體育賽事': return '⚽'
    default: return '🏷️'
  }
}

const Icon = ({ name, style = {} }: { name: string; style?: React.CSSProperties }) => (
  <span style={{
    fontFamily: "'Material Symbols Outlined'",
    fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
    fontSize: 20,
    ...style
  }}>{name}</span>
)

interface Place {
  id: string
  name: string
  placeName: string
}

// Date picker component
const DatePicker = ({ value, onChange }: { value: string; onChange: (d: string) => void }) => {
  const today = new Date()
  const dates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    return date
  })

  return (
    <div style={pickerStyles.grid}>
      {dates.map(date => {
        const dateStr = date.toISOString().split('T')[0]
        const isSelected = value === dateStr
        return (
          <button
            key={dateStr}
            type="button"
            style={{
              ...pickerStyles.dateBtn,
              ...(isSelected ? pickerStyles.dateBtnSelected : {})
            }}
            onClick={() => onChange(dateStr)}
          >
            <div style={pickerStyles.dateDay}>
              {date.toLocaleDateString('zh-TW', { weekday: 'short' })}
            </div>
            <div style={pickerStyles.dateNum}>
              {date.getDate()}
            </div>
            <div style={pickerStyles.dateMonth}>
              {date.toLocaleDateString('zh-TW', { month: 'short' })}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// Time picker component
const TimePicker = ({ value, onChange }: { value: string; onChange: (t: string) => void }) => {
  const times = Array.from({ length: 24 * 2 }, (_, i) => {
    const hour = Math.floor(i / 2)
    const minute = (i % 2) * 30
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  })

  return (
    <div style={pickerStyles.timeGrid}>
      {times.map(time => (
        <button
          key={time}
          type="button"
          style={{
            ...pickerStyles.timeBtn,
            ...(value === time ? pickerStyles.timeBtnSelected : {})
          }}
          onClick={() => onChange(time)}
        >
          {time}
        </button>
      ))}
    </div>
  )
}

const pickerStyles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 8,
    maxHeight: 200,
    overflowY: 'auto' as const,
    padding: 4,
  },
  dateBtn: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '8px 4px',
    border: `2px solid ${colors.border}`,
    borderRadius: radius.sm,
    background: colors.white,
    cursor: 'pointer',
    fontSize: 12,
  },
  dateBtnSelected: {
    border: `2px solid ${colors.primary}`,
    background: colors.primary,
    color: colors.white,
  },
  dateDay: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dateNum: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  dateMonth: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    maxHeight: 200,
    overflowY: 'auto' as const,
    padding: 4,
  },
  timeBtn: {
    padding: '10px 8px',
    border: `2px solid ${colors.border}`,
    borderRadius: radius.sm,
    background: colors.white,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  timeBtnSelected: {
    border: `2px solid ${colors.primary}`,
    background: colors.primary,
    color: colors.white,
  },
}

export default function CreateRequestPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPickupList, setShowPickupList] = useState(false)
  const [showDropoffList, setShowDropoffList] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [vehicleType, setVehicleType] = useState<'sedan' | '7seater'>('7seater')

  // Form fields
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('12:00')
  const [passengers, setPassengers] = useState(1)
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // Favorite places
  const [pickupPlaces, setPickupPlaces] = useState<Place[]>([])
  const [dropoffPlaces, setDropoffPlaces] = useState<Place[]>([])

  // Max passengers based on vehicle type
  const maxPassengers = vehicleType === 'sedan' ? 4 : 6

  useEffect(() => {
    loadFavoritePlaces()
    // Set default date to today
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
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
      alert('請填寫上下車地點、日期和時間')
      return
    }

    try {
      setLoading(true)
      const departureDate = `${date} ${time}`
      
      // Create request
      const requestId = await requestService.create({
        passengerId: currentUser.id,
        passengerName: currentUser.name || '乘客',
        passengerPhone: currentUser.phone || '',
        pickup: { placeName: pickup, latitude: 0, longitude: 0 },
        dropoff: { placeName: dropoff, latitude: 0, longitude: 0 },
        departureDate,
        passengerCount: passengers,
        notes,
        tags,
        vehicleType,
      })
      
      // Create chat room
      await chatService.createRequestChatRoom({
        requestId,
        passengerId: currentUser.id,
        passengerName: currentUser.name || '乘客',
        passengerPhone: currentUser.phone || '',
        pickup,
        dropoff,
        departureDate,
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

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '選擇日期'
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.headerTitle}>📋 發布需求</h1>
            <p style={styles.headerSubtitle}>讓司機找到你</p>
          </div>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <Icon name="close" style={{ fontSize: 24 }} />
          </button>
        </div>
      </div>

      {/* Form */}
      <div style={styles.form}>
        {/* Pickup & Dropoff */}
        <div style={styles.card}>
          <div style={styles.field}>
            <label style={styles.label}>
              <Icon name="near_me" style={{ fontSize: 16, color: colors.success }} />
              {' '}上車地點
            </label>
            <input
              style={styles.input}
              placeholder="例如：香港國際機場"
              value={pickup}
              onChange={e => setPickup(e.target.value)}
              onFocus={() => setShowPickupList(true)}
            />
            {showPickupList && pickupPlaces.length > 0 && (
              <div style={styles.favList}>
                {pickupPlaces.map(place => (
                  <div key={place.id} style={styles.favItem} onClick={() => selectPickup(place.placeName)}>
                    <Icon name="place" style={{ fontSize: 16, color: colors.success }} />
                    {' '}{place.placeName}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              <Icon name="place" style={{ fontSize: 16, color: colors.primary }} />
              {' '}目的地
            </label>
            <input
              style={styles.input}
              placeholder="例如：深圳灣口岸"
              value={dropoff}
              onChange={e => setDropoff(e.target.value)}
              onFocus={() => setShowDropoffList(true)}
            />
            {showDropoffList && dropoffPlaces.length > 0 && (
              <div style={styles.favList}>
                {dropoffPlaces.map(place => (
                  <div key={place.id} style={styles.favItem} onClick={() => selectDropoff(place.placeName)}>
                    <Icon name="place" style={{ fontSize: 16, color: colors.primary }} />
                    {' '}{place.placeName}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Type */}
        <div style={styles.card}>
          <label style={styles.label}>
            <Icon name="directions_car" style={{ fontSize: 16 }} />
            {' '}車型
          </label>
          <div style={styles.vehicleSelector}>
            <button
              type="button"
              style={{
                ...styles.vehicleBtn,
                ...(vehicleType === 'sedan' ? styles.vehicleBtnActive : {})
              }}
              onClick={() => {
                setVehicleType('sedan')
                if (passengers > 4) setPassengers(4)
              }}
            >
              <Icon name="directions_car" style={{ fontSize: 24 }} />
              <span>轎車</span>
              <span style={styles.vehicleHint}>最多4位</span>
            </button>
            <button
              type="button"
              style={{
                ...styles.vehicleBtn,
                ...(vehicleType === '7seater' ? styles.vehicleBtnActive : {})
              }}
              onClick={() => {
                setVehicleType('7seater')
                if (passengers > 6) setPassengers(6)
              }}
            >
              <Icon name="airport_shuttle" style={{ fontSize: 24 }} />
              <span>七人車</span>
              <span style={styles.vehicleHint}>最多6位</span>
            </button>
          </div>
        </div>

        {/* Date */}
        <div style={styles.card}>
          <div style={styles.field}>
            <label style={styles.label}>
              <Icon name="calendar_today" style={{ fontSize: 16 }} />
              {' '}出發日期
            </label>
            <button
              type="button"
              style={styles.pickerToggle}
              onClick={() => {
                setShowDatePicker(!showDatePicker)
                setShowTimePicker(false)
              }}
            >
              {formatDisplayDate(date)}
              <Icon name={showDatePicker ? "expand_less" : "expand_more"} style={{ fontSize: 18 }} />
            </button>
            {showDatePicker && (
              <DatePicker value={date} onChange={(d) => { setDate(d); setShowDatePicker(false) }} />
            )}
          </div>
        </div>

        {/* Time */}
        <div style={styles.card}>
          <div style={styles.field}>
            <label style={styles.label}>
              <Icon name="schedule" style={{ fontSize: 16 }} />
              {' '}出發時間
            </label>
            <button
              type="button"
              style={styles.pickerToggle}
              onClick={() => {
                setShowTimePicker(!showTimePicker)
                setShowDatePicker(false)
              }}
            >
              {time}
              <Icon name={showTimePicker ? "expand_less" : "expand_more"} style={{ fontSize: 18 }} />
            </button>
            {showTimePicker && (
              <TimePicker value={time} onChange={(t) => { setTime(t); setShowTimePicker(false) }} />
            )}
          </div>
        </div>

        {/* Passengers */}
        <div style={styles.card}>
          <label style={styles.label}>
            <Icon name="group" style={{ fontSize: 16 }} />
            {' '}乘客人數（{vehicleType === 'sedan' ? '轎車最多4位' : '七人車最多6位'}）
          </label>
          <div style={styles.seatSelector}>
            {Array.from({ length: maxPassengers }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
                style={{
                  ...styles.seatBtn,
                  ...(passengers === n ? styles.seatBtnActive : {})
                }}
                onClick={() => setPassengers(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div style={styles.card}>
          <label style={styles.label}>
            <Icon name="label" style={{ fontSize: 16 }} />
            {' '}標籤（可選）
          </label>
          <p style={styles.tagHint}>選擇適合的標籤，讓司機更容易找到你的需求</p>
          <div style={styles.tagGrid}>
            {TAGS.map(tag => {
              const isSelected = tags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  style={{
                    ...styles.tagBtn,
                    ...(isSelected ? styles.tagBtnActive : {})
                  }}
                  onClick={() => {
                    if (isSelected) {
                      setTags(tags.filter(t => t !== tag))
                    } else {
                      setTags([...tags, tag])
                    }
                  }}
                >
                  {getTagIcon(tag)} {tag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div style={styles.card}>
          <label style={styles.label}>
            <Icon name="notes" style={{ fontSize: 16 }} />
            {' '}備註（可選）
          </label>
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
          style={{
            ...styles.submitBtn,
            background: loading ? colors.textLight : colors.primary,
          }}
          onClick={handleSubmit}
          disabled={loading}
          type="button"
        >
          <Icon name="send" style={{ fontSize: 18 }} />
          {' '}
          {loading ? '發布中...' : '發布需求'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: colors.background,
    paddingBottom: 100,
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
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 8,
    borderRadius: radius.sm,
    color: colors.textSecondary,
  },
  form: {
    padding: 16,
  },
  card: {
    background: colors.white,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  field: {
    marginBottom: 12,
    position: 'relative' as const,
  },
  row: {
    display: 'flex',
    gap: 12,
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 15,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    background: colors.white,
    color: colors.textPrimary,
    boxSizing: 'border-box' as const,
  },
  favList: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    background: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    marginTop: 4,
    zIndex: 20,
    maxHeight: 200,
    overflowY: 'auto' as const,
  },
  favItem: {
    padding: '12px 16px',
    fontSize: 14,
    color: colors.textPrimary,
    cursor: 'pointer',
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  vehicleSelector: {
    display: 'flex',
    gap: 12,
  },
  vehicleBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
    padding: '16px 12px',
    border: `2px solid ${colors.border}`,
    borderRadius: radius.md,
    background: colors.white,
    color: colors.textSecondary,
    cursor: 'pointer',
  },
  vehicleBtnActive: {
    border: `2px solid ${colors.primary}`,
    background: colors.primaryLight,
    color: colors.primary,
  },
  vehicleHint: {
    fontSize: 11,
    color: colors.textLight,
  },
  pickerToggle: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    background: colors.white,
    color: colors.textPrimary,
    fontSize: 15,
    cursor: 'pointer',
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
  tagHint: {
    margin: '0 0 12px 0',
    fontSize: 12,
    color: colors.textLight,
  },
  tagGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  tagBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 14px',
    borderRadius: radius.full,
    border: `2px solid ${colors.border}`,
    background: colors.white,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  tagBtnActive: {
    border: `2px solid ${colors.primary}`,
    background: colors.primaryLight,
    color: colors.primary,
  },
  textarea: {
    width: '100%',
    padding: 12,
    fontSize: 15,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    background: colors.white,
    color: colors.textPrimary,
    boxSizing: 'border-box' as const,
    resize: 'none' as const,
    fontFamily: 'inherit',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: 16,
    background: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: radius.md,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
}