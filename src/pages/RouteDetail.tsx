import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { routeService, shiftService } from '../services/shiftService'
import type { Route, Shift } from '../types/shift'

const formatPrice = (price: number) => `HK$${price}`
const formatDuration = (minutes: number | undefined) => {
  if (!minutes) return '—'
  if (minutes < 60) return `${minutes}分鐘`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}小時${mins}分` : `${hours}小時`
}

const toDate = (raw: string) => {
  const asNum = Number(raw)
  const date = Number.isFinite(asNum) && asNum > 0 ? new Date(asNum) : new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatTime = (raw: string) => {
  const date = toDate(raw)
  if (!date) return '--:--'
  return date.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (raw: string) => {
  const date = toDate(raw)
  if (!date) return raw
  return date.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })
}

const dateKey = (raw: string) => {
  const date = toDate(raw)
  if (!date) return ''
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

const sceneLabelByType: Record<string, string> = {
  AIRPORT: '機場接送',
  EVENT: '演唱會散場',
  CROSS_BORDER: '跨境路線',
  THEME_PARK: '主題公園',
}

const statusChipByShift: Record<string, { label: string; bg: string; color: string }> = {
  OPEN: { label: '可加入', bg: '#e3f2fd', color: '#1e56a3' },
  SCHEDULED: { label: '可加入', bg: '#fff3cd', color: '#7a5a1a' },
  IN_PROGRESS: { label: '進行中', bg: '#d4edda', color: '#1a7a3a' },
  FULL: { label: '已滿', bg: '#eceff1', color: '#5f6368' },
  COMPLETED: { label: '已完成', bg: '#c8e6c9', color: '#2e7d32' },
  CANCELLED: { label: '已取消', bg: '#f8d7da', color: '#c62828' },
}

export default function RouteDetail() {
  const { routeId } = useParams<{ routeId: string }>()
  const navigate = useNavigate()
  const [route, setRoute] = useState<Route | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!routeId) return
    void loadData()
  }, [routeId])

  const loadData = async () => {
    if (!routeId) return
    try {
      setLoading(true)
      const [routeData, shiftsData] = await Promise.all([
        routeService.getById(routeId),
        shiftService.getByRoute(routeId),
      ])
      setRoute(routeData)
      setShifts(
        shiftsData.sort((a, b) => {
          const aTime = toDate(a.departureTime)?.getTime() || 0
          const bTime = toDate(b.departureTime)?.getTime() || 0
          return aTime - bTime
        }),
      )
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const dateOptions = useMemo(() => {
    const set = new Set<string>()
    shifts.forEach((shift) => {
      const key = dateKey(shift.departureTime)
      if (key) set.add(key)
    })
    return Array.from(set).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  }, [shifts])

  useEffect(() => {
    if (!dateOptions.length) return
    if (selectedDate && dateOptions.includes(selectedDate)) return
    setSelectedDate(dateOptions[0])
  }, [dateOptions, selectedDate])

  const shiftsOfDate = useMemo(() => {
    if (!selectedDate) return shifts
    return shifts.filter((shift) => dateKey(shift.departureTime) === selectedDate)
  }, [selectedDate, shifts])

  const bookableShifts = useMemo(
    () =>
      shiftsOfDate.filter(
        (shift) =>
          (shift.status === 'OPEN' || shift.status === 'SCHEDULED') && shift.availableSeats > 0,
      ),
    [shiftsOfDate],
  )

  const handleBooking = (shiftId: string) => {
    navigate(`/booking/${shiftId}`)
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>載入中...</div>
      </div>
    )
  }

  if (!route) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>路線不存在</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>
          ← 返回
        </button>
        <h1 style={styles.title}>{route.name}</h1>
      </header>

      <section style={styles.section}>
        <div style={styles.headlineRow}>
          <h2 style={styles.routeTitle}>{route.name}</h2>
          <span style={styles.sceneTag}>{sceneLabelByType[route.type] || '固定路線'}</span>
        </div>
        <div style={styles.routePathText}>
          {route.origin.name} {'->'} {route.destination.name}
        </div>
        <div style={styles.statsRow}>
          <span style={styles.statChip}>⏱ {formatDuration(route.duration)}</span>
          <span style={styles.statChip}>📍 {route.distance || 0} km</span>
          <span style={styles.statChip}>💰 {formatPrice(route.price)} / 位</span>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>選擇日期與班次</h2>
        <div style={styles.dateChips}>
          {dateOptions.length === 0 ? (
            <span style={styles.emptyInline}>暫無可預約日期</span>
          ) : (
            dateOptions.map((date) => (
              <button
                key={date}
                style={{ ...styles.dateChip, ...(selectedDate === date ? styles.dateChipActive : {}) }}
                onClick={() => setSelectedDate(date)}
              >
                {formatDate(date)}
              </button>
            ))
          )}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>可加入班次</h2>
        {bookableShifts.length === 0 ? (
          <div style={styles.empty}>此日期暫無可加入班次</div>
        ) : (
          <div style={styles.shiftsList}>
            {bookableShifts.map((shift) => {
              const status =
                statusChipByShift[shift.status] || { label: shift.status, bg: '#eceff1', color: '#5f6368' }
              return (
              <div key={shift.id} style={styles.shiftCard}>
                <div style={styles.shiftInfo}>
                  <div style={styles.shiftTime}>{formatTime(shift.departureTime)}</div>
                  <div style={styles.shiftMeta}>
                    <span>{formatDate(shift.departureTime)}</span>
                    <span>•</span>
                    <span>剩餘 {shift.availableSeats}/{shift.totalSeats} 位</span>
                  </div>
                  <span style={{ ...styles.statusChip, background: status.bg, color: status.color }}>
                    {status.label}
                  </span>
                </div>
                <div style={styles.shiftPrice}>
                  <span style={styles.shiftPriceValue}>{formatPrice(shift.price)}</span>
                </div>
                <button
                  style={styles.bookBtn}
                  onClick={() => handleBooking(shift.id)}
                >
                  加入班次
                </button>
              </div>
            )})}
          </div>
        )}
      </section>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f6f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif',
  },
  loading: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#6d7f78',
  },
  error: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#7f3f3f',
  },
  header: {
    padding: '14px 16px',
    background: '#fff',
    borderBottom: '1px solid #e3ebe6',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    padding: '8px 2px',
    border: 'none',
    background: 'transparent',
    color: '#1d4f43',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#1f3f38',
  },
  section: {
    padding: '12px',
    background: '#fff',
    margin: '10px 12px 0',
    borderRadius: 14,
    border: '1px solid #e1e9e4',
  },
  sectionTitle: {
    margin: '0 0 10px',
    fontSize: '15px',
    fontWeight: 700,
    color: '#27443c',
  },
  headlineRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  routeTitle: {
    margin: 0,
    fontSize: 16,
    color: '#203e36',
  },
  sceneTag: {
    fontSize: 11,
    color: '#41675c',
    border: '1px solid #d4e4dc',
    borderRadius: 999,
    background: '#f1f7f4',
    padding: '2px 8px',
    fontWeight: 700,
  },
  routePathText: {
    marginTop: 8,
    fontSize: 14,
    color: '#35534b',
    fontWeight: 600,
  },
  statsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  statChip: {
    fontSize: '12px',
    color: '#4e6c63',
    border: '1px solid #dce7e1',
    borderRadius: 999,
    padding: '4px 10px',
    background: '#fafdfb',
    fontWeight: 600,
  },
  dateChips: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 2,
  },
  dateChip: {
    whiteSpace: 'nowrap',
    border: '1px solid #d8e4de',
    borderRadius: 999,
    background: '#fff',
    color: '#4f6760',
    fontSize: 12,
    fontWeight: 700,
    padding: '6px 11px',
    cursor: 'pointer',
  },
  dateChipActive: {
    border: '1px solid #1e4f43',
    background: '#e9f5f0',
    color: '#1e4f43',
  },
  emptyInline: {
    fontSize: 12,
    color: '#7b8b86',
  },
  shiftsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  shiftCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #dce7e1',
    background: '#fcfefd',
  },
  shiftInfo: {
    flex: 1,
    display: 'grid',
    gap: 4,
  },
  shiftTime: {
    fontSize: '19px',
    fontWeight: 700,
    color: '#1e3f37',
  },
  shiftMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '13px',
    color: '#5e7770',
  },
  statusChip: {
    justifySelf: 'start',
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 999,
    padding: '2px 8px',
  },
  shiftPrice: {
    marginRight: '12px',
  },
  shiftPriceValue: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#1e4f43',
  },
  bookBtn: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: 'none',
    background: '#1e4f43',
    color: '#fff',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
  },
  empty: {
    padding: '16px 12px',
    textAlign: 'center',
    color: '#6d7f78',
    background: '#f8fbf9',
    border: '1px dashed #d5e1db',
    borderRadius: '12px',
    fontSize: 13,
  },
}
