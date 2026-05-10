// Cabs Carpool - Create Trip Page v7.0
// Unified: FIXED (司機發車) & NEGOTIATED (乘客搵車)

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { tripService } from '../services/tripService'
import { colors, radius } from '../styles/designSystem'
import type { PricingMode } from '../types/trip'

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

// ============ Date Picker ============
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
            <div style={pickerStyles.dateNum}>{date.getDate()}</div>
            <div style={pickerStyles.dateMonth}>
              {date.toLocaleDateString('zh-TW', { month: 'short' })}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ============ Time Picker ============
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
    marginTop: 8,
    background: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
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
  dateDay: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  dateNum: { fontSize: 18, fontWeight: 700, color: colors.textPrimary },
  dateMonth: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  timeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    maxHeight: 200,
    overflowY: 'auto' as const,
    padding: 4,
    marginTop: 8,
    background: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
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

// ============ Main Component ============
export default function CreateTripPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  
  // Step: 1 = choose mode, 2 = fill form
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [pricingMode, setPricingMode] = useState<PricingMode>('FIXED')
  
  // Form fields
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [vehicleType, setVehicleType] = useState<'sedan' | '7seater'>('7seater')
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('12:00')
  const [seats, setSeats] = useState(3)
  const [pricePerSeat, setPricePerSeat] = useState('')
  const [tunnelFee, setTunnelFee] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const maxSeats = vehicleType === 'sedan' ? 4 : 6

  // Quick presets
  const presets = [
    { label: '機場→深圳灣', pickup: '香港國際機場', dropoff: '深圳灣口岸' },
    { label: '機場→廣州', pickup: '香港國際機場', dropoff: '廣州白雲機場' },
    { label: '中環→羅湖', pickup: '中環', dropoff: '深圳羅湖' },
  ]

  const handleSubmit = async () => {
    if (!currentUser || !pickup || !dropoff || !date || !time) {
      alert('請填寫上下車地點、日期和時間')
      return
    }

    if (pricingMode === 'FIXED' && (!pricePerSeat || Number(pricePerSeat) <= 0)) {
      alert('請填寫每位價格')
      return
    }

    try {
      setLoading(true)
      const departureTime = new Date(`${date}T${time}`).toISOString()
      
      // Determine role based on pricing mode
      const initiatorRole = pricingMode === 'FIXED' ? 'driver' : 'passenger'
      
      const tripId = await tripService.create({
        pricingMode,
        initiatorRole,
        initiatorId: currentUser.id,
        initiatorName: currentUser.name || (pricingMode === 'FIXED' ? '司機' : '乘客'),
        initiatorPhone: currentUser.phone || '',
        pickup: { placeName: pickup, latitude: 0, longitude: 0 },
        dropoff: { placeName: dropoff, latitude: 0, longitude: 0 },
        departureTime,
        vehicleType,
        totalSeats: seats,
        pricePerSeat: pricingMode === 'FIXED' ? Number(pricePerSeat) : undefined,
        tunnelFee: tunnelFee ? Number(tunnelFee) : undefined,
        notes,
        tags,
      })
      console.log('[CreateTripPage] Trip created successfully! ID:', tripId)
      alert(pricingMode === 'FIXED' ? '行程發佈成功！' : '需求已發佈，等待司機報價！')
      navigate(pricingMode === 'FIXED' ? '/driver-home' : '/passenger-home')
    } catch (error) {
      console.error('Error creating trip:', error)
      alert('發佈失敗，請重試')
    } finally {
      setLoading(false)
    }
  }

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '選擇日期'
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })
  }

  // ============ Step 1: Choose Mode ============
  if (step === 1) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div>
              <h1 style={styles.headerTitle}>🚗 發佈行程</h1>
              <p style={styles.headerSubtitle}>選擇發起方式</p>
            </div>
            <button onClick={() => navigate(-1)} style={styles.backBtn}>
              <Icon name="close" style={{ fontSize: 24 }} />
            </button>
          </div>
        </div>

        <div style={styles.form}>
          {/* FIXED Mode Card */}
          <div
            style={{
              ...styles.modeCard,
              ...(pricingMode === 'FIXED' ? styles.modeCardSelected : {})
            }}
            onClick={() => setPricingMode('FIXED')}
          >
            <div style={styles.modeIcon}>🚗</div>
            <h3 style={styles.modeTitle}>我要發車</h3>
            <p style={styles.modeDesc}>司機身份，填寫固定每位價格</p>
            <div style={styles.modeBadge}>
              <span className="badge badge-fixed">FIXED 定價</span>
            </div>
            <ul style={styles.modeFeatures}>
              <li>✅ 自行設定每位價格</li>
              <li>✅ 乘客直接加入</li>
              <li>✅ 流程簡單快速</li>
            </ul>
          </div>

          {/* NEGOTIATED Mode Card */}
          <div
            style={{
              ...styles.modeCard,
              ...(pricingMode === 'NEGOTIATED' ? styles.modeCardSelected : {})
            }}
            onClick={() => setPricingMode('NEGOTIATED')}
          >
            <div style={styles.modeIcon}>👤</div>
            <h3 style={styles.modeTitle}>我需要車</h3>
            <p style={styles.modeDesc}>乘客身份，等待司機報價</p>
            <div style={styles.modeBadge}>
              <span className="badge badge-negotiated">協商定價</span>
            </div>
            <ul style={styles.modeFeatures}>
              <li>⏳ 等待司機加入</li>
              <li>💬 可協商價格</li>
              <li>✅ 接受後確認行程</li>
            </ul>
          </div>

          <button
            style={styles.submitBtn}
            onClick={() => setStep(2)}
            type="button"
          >
            繼續
            <Icon name="arrow_forward" style={{ fontSize: 18 }} />
          </button>
        </div>
      </div>
    )
  }

  // ============ Step 2: Fill Form ============
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setStep(1)} style={styles.backBtn}>
              <Icon name="arrow_back" style={{ fontSize: 24 }} />
            </button>
            <div>
              <h1 style={styles.headerTitle}>
                {pricingMode === 'FIXED' ? '🚗 發佈行程' : '👤 發佈需求'}
              </h1>
              <p style={styles.headerSubtitle}>
                {pricingMode === 'FIXED' ? '讓乘客找到你' : '等待司機報價'}
              </p>
            </div>
          </div>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <Icon name="close" style={{ fontSize: 24 }} />
          </button>
        </div>
        
        {/* Mode indicator */}
        <div style={styles.modeIndicator}>
          <span className={`badge ${pricingMode === 'FIXED' ? 'badge-fixed' : 'badge-negotiated'}`}>
            {pricingMode === 'FIXED' ? '固定價格模式' : '協商價格模式'}
          </span>
        </div>
      </div>

      <div style={styles.form}>
        {/* Quick Presets */}
        <div style={styles.card}>
          <p style={styles.presetLabel}>快速選擇路線</p>
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
            <label style={styles.label}>
              <Icon name="near_me" style={{ fontSize: 16, color: colors.success }} />
              {' '}上車地點
            </label>
            <input
              style={styles.input}
              placeholder="例如：香港國際機場"
              value={pickup}
              onChange={e => setPickup(e.target.value)}
            />
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
            />
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
              onClick={() => { setVehicleType('sedan'); if (seats > 4) setSeats(4) }}
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
              onClick={() => { setVehicleType('7seater'); if (seats > 6) setSeats(6) }}
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
              onClick={() => { setShowDatePicker(!showDatePicker); setShowTimePicker(false) }}
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
              onClick={() => { setShowTimePicker(!showTimePicker); setShowDatePicker(false) }}
            >
              {time}
              <Icon name={showTimePicker ? "expand_less" : "expand_more"} style={{ fontSize: 18 }} />
            </button>
            {showTimePicker && (
              <TimePicker value={time} onChange={(t) => { setTime(t); setShowTimePicker(false) }} />
            )}
          </div>
        </div>

        {/* Seats */}
        <div style={styles.card}>
          <label style={styles.label}>
            <Icon name="airline_seat_recline_normal" style={{ fontSize: 16 }} />
            {pricingMode === 'FIXED' ? ' ' : ' '}座位數
          </label>
          <div style={styles.seatSelector}>
            {Array.from({ length: maxSeats }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
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

        {/* Price Section - Only for FIXED mode */}
        {pricingMode === 'FIXED' && (
          <div style={{ ...styles.card, background: colors.primaryLight, border: `2px solid ${colors.primary}` }}>
            <label style={styles.label}>
              <Icon name="payments" style={{ fontSize: 16 }} />
              {' '}每位價格（必填）
            </label>
            <div style={styles.priceInputWrapper}>
              <span style={styles.priceCurrency}>HK$</span>
              <input
                style={styles.priceInput}
                type="number"
                placeholder="0"
                value={pricePerSeat}
                onChange={e => setPricePerSeat(e.target.value)}
                min="1"
              />
              <span style={styles.priceUnit}>/ 位</span>
            </div>
            <div style={styles.tunnelFeeRow}>
              <label style={{ ...styles.label, marginBottom: 0 }}>隧道費（可選）</label>
              <input
                style={{ ...styles.input, width: 120 }}
                type="number"
                placeholder="0"
                value={tunnelFee}
                onChange={e => setTunnelFee(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* NEGOTIATED mode notice */}
        {pricingMode === 'NEGOTIATED' && (
          <div style={{ ...styles.card, background: '#fff3e0', border: `2px dashed #e65100` }}>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 40 }}>⏳</div>
              <h3 style={{ fontSize: 14, marginTop: 8, color: '#e65100' }}>等待司機報價</h3>
              <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                司機加入聊天室後將向你報價，你可選擇接受或拒絕
              </p>
            </div>
          </div>
        )}

        {/* Tags */}
        <div style={styles.card}>
          <label style={styles.label}>
            <Icon name="label" style={{ fontSize: 16 }} />
            {' '}標籤（可選）
          </label>
          <p style={styles.tagHint}>選擇適合的標籤，讓行程更容易被找到</p>
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
            placeholder="任何特別要求或備註..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <button
          style={{
            ...styles.submitBtn,
            background: loading ? colors.textLight : colors.primary,
          }}
          onClick={handleSubmit}
          disabled={loading}
          type="button"
        >
          <Icon name={pricingMode === 'FIXED' ? 'directions_car' : 'search'} style={{ fontSize: 18 }} />
          {' '}
          {loading ? '發佈中...' : (pricingMode === 'FIXED' ? '發佈行程' : '發佈需求')}
        </button>
      </div>
    </div>
  )
}

// ============ Styles ============
const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: colors.background },
  header: { background: colors.white, padding: '16px', borderBottom: `1px solid ${colors.border}` },
  headerContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { margin: 0, fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitle: { margin: '4px 0 0', fontSize: 13, color: colors.textSecondary },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: radius.sm, color: colors.textSecondary },
  form: { padding: 16, paddingBottom: 120 },
  card: { background: colors.white, borderRadius: radius.md, padding: 16, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  field: { marginBottom: 12, position: 'relative' as const },
  label: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: colors.textSecondary, marginBottom: 8 },
  input: { width: '100%', padding: '12px 16px', fontSize: 15, border: `1px solid ${colors.border}`, borderRadius: radius.sm, background: colors.white, color: colors.textPrimary, boxSizing: 'border-box' as const },
  presets: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 },
  presetLabel: { margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: colors.textSecondary },
  presetBtn: { flexShrink: 0, padding: '8px 14px', background: colors.primaryLight, color: colors.primary, border: 'none', borderRadius: radius.full, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' as const },
  vehicleSelector: { display: 'flex', gap: 12 },
  vehicleBtn: { flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4, padding: '16px 12px', border: `2px solid ${colors.border}`, borderRadius: radius.md, background: colors.white, color: colors.textSecondary, cursor: 'pointer' },
  vehicleBtnActive: { border: `2px solid ${colors.primary}`, background: colors.primaryLight, color: colors.primary },
  vehicleHint: { fontSize: 11, color: colors.textLight },
  pickerToggle: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: `1px solid ${colors.border}`, borderRadius: radius.sm, background: colors.white, color: colors.textPrimary, fontSize: 15, cursor: 'pointer' },
  seatSelector: { display: 'flex', gap: 8 },
  seatBtn: { width: 44, height: 44, borderRadius: 22, border: `2px solid ${colors.border}`, background: colors.white, color: colors.textSecondary, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  seatBtnActive: { border: `2px solid ${colors.primary}`, background: colors.primary, color: colors.white },
  tagHint: { margin: '0 0 12px 0', fontSize: 12, color: colors.textLight },
  tagGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: 8 },
  tagBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', borderRadius: radius.full, border: `2px solid ${colors.border}`, background: colors.white, color: colors.textSecondary, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  tagBtnActive: { border: `2px solid ${colors.primary}`, background: colors.primaryLight, color: colors.primary },
  textarea: { width: '100%', padding: 12, fontSize: 15, border: `1px solid ${colors.border}`, borderRadius: radius.sm, background: colors.white, color: colors.textPrimary, resize: 'none' as const, fontFamily: 'inherit', boxSizing: 'border-box' as const },
  submitBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 16, background: colors.primary, color: colors.white, border: 'none', borderRadius: radius.md, fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  
  // Mode selection
  modeIndicator: { marginTop: 12, textAlign: 'center' },
  modeCard: { background: colors.white, borderRadius: radius.md, padding: 24, marginBottom: 16, border: `2px solid ${colors.border}`, cursor: 'pointer', transition: 'all 0.2s' },
  modeCardSelected: { border: `2px solid ${colors.primary}`, background: '#fff8f5' },
  modeIcon: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  modeTitle: { fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 8, color: colors.textPrimary },
  modeDesc: { fontSize: 13, textAlign: 'center', color: colors.textSecondary, marginBottom: 12 },
  modeBadge: { textAlign: 'center', marginBottom: 12 },
  modeFeatures: { fontSize: 13, color: colors.textSecondary, paddingLeft: 20, margin: 0 },
  
  // Price input
  priceInputWrapper: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  priceCurrency: { fontSize: 18, fontWeight: 600, color: colors.primary },
  priceInput: { flex: 1, padding: '12px 16px', fontSize: 24, fontWeight: 700, border: `2px solid ${colors.primary}`, borderRadius: radius.sm, background: colors.white, color: colors.primary, textAlign: 'center' as const },
  priceUnit: { fontSize: 14, color: colors.textSecondary },
  tunnelFeeRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
}
