import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TencentMap from '../components/map/TencentMap'
import { calculatePrice, calculateRoute, searchLocation, type LocationRecord, type RouteResult } from '../services/mapService'
import { useAuth } from '../context/AuthContext'
import {
  createOrder,
  joinOfficialRoute,
  subscribeOfficialRoutes,
  type OfficialRouteRecord,
  type OfficialRouteStatus,
} from '../services/orderService'

type QuoteView = {
  total: number
  distance: string
  duration: number
  tollsTotal: number
}

type BookingMode = 'charter' | 'official_route'
type CharterVehicleType = 'standard' | 'luxury' | 'van'

const CHARTER_VEHICLES: {
  id: CharterVehicleType
  label: string
  multiplier: number
  note: string
}[] = [
  { id: 'standard', label: '經濟轎車', multiplier: 1, note: '1-3 人' },
  { id: 'luxury', label: '豪華轎車', multiplier: 1.4, note: '商務舒適' },
  { id: 'van', label: '保姆車', multiplier: 1.75, note: '多人行李' },
]

const OFFICIAL_ROUTE_STATUS_LABELS: Record<OfficialRouteStatus, string> = {
  collecting: '拼位中',
  confirmed: '已成行',
  dispatching: '待派車',
  active: '進行中',
  completed: '已完成',
  cancelled: '已取消',
}

const parseDateTime = (raw: string) => {
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleString()
}

const toBookingDateTimeISO = (dateStr: string, timeStr: string) => {
  if (!dateStr && !timeStr) return new Date().toISOString()
  const safeDate = dateStr || new Date().toISOString().slice(0, 10)
  const safeTime = timeStr || '00:00'
  const parsed = new Date(`${safeDate}T${safeTime}`)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function LocationInput({
  label,
  accent,
  value,
  onPick,
}: {
  label: string
  accent: string
  value: LocationRecord | null
  onPick: (v: LocationRecord | null) => void
}) {
  const [query, setQuery] = useState(() => value?.name || '')
  const [items, setItems] = useState<LocationRecord[]>([])
  const [open, setOpen] = useState(false)
  const [searched, setSearched] = useState(false)

  const runSearch = async (q: string) => {
    setQuery(q)
    setSearched(true)
    if (!q.trim()) {
      setItems([])
      setOpen(false)
      onPick(null)
      return
    }
    const result = await searchLocation(q)
    setItems(result)
    setOpen(true)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#4b665f', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #dce6dd', background: '#fbfdfb', borderRadius: 12, padding: '12px 12px' }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: accent }} />
        <input
          value={query}
          onChange={(e) => void runSearch(e.target.value)}
          onFocus={() => setOpen(items.length > 0)}
          placeholder="請輸入地點（AI建議）"
          style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', fontSize: 14 }}
        />
      </div>
      {open && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 8, marginTop: 6, background: '#fff', border: '1px solid #dce6dd', borderRadius: 12, boxShadow: '0 10px 24px rgba(29, 54, 46, 0.12)', maxHeight: 220, overflow: 'auto' }}>
          {items.length > 0 ? (
            items.map((item) => (
              <button
                key={`${item.id}-${item.lat}`}
                onClick={() => {
                  onPick(item)
                  setQuery(item.name)
                  setOpen(false)
                }}
                style={{ width: '100%', textAlign: 'left', border: 0, background: 'transparent', cursor: 'pointer', padding: '10px 12px', borderBottom: '1px solid #f2f4f2' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#213f38' }}>{item.name}</div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: item.source === 'ai' ? '#1f4f43' : '#746d56',
                      background: item.source === 'ai' ? '#e5f3ec' : '#f4f1e5',
                      border: item.source === 'ai' ? '1px solid #c7e3d5' : '1px solid #e3dcc5',
                      borderRadius: 999,
                      padding: '2px 7px',
                    }}
                  >
                    {item.source === 'ai' ? 'AI' : '本地'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#758780' }}>{item.address}</div>
              </button>
            ))
          ) : (
            <div style={{ padding: '10px 12px', fontSize: 12, color: '#758780' }}>
              {searched ? '未找到建議地址，請換關鍵字。' : '開始輸入以獲取地址建議。'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PassengerHome() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [bookingMode, setBookingMode] = useState<BookingMode>('charter')

  const [pickup, setPickup] = useState<LocationRecord | null>(null)
  const [dropoff, setDropoff] = useState<LocationRecord | null>(null)
  const [quote, setQuote] = useState<QuoteView | null>(null)
  const [routeInfo, setRouteInfo] = useState<RouteResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [charterPassengers, setCharterPassengers] = useState(1)
  const [vehicleType, setVehicleType] = useState<CharterVehicleType>('standard')

  const [officialRoutes, setOfficialRoutes] = useState<OfficialRouteRecord[]>([])
  const [loadingOfficialRoutes, setLoadingOfficialRoutes] = useState(false)
  const [officialError, setOfficialError] = useState<string | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [officialSeats, setOfficialSeats] = useState(1)
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'error' | 'info' } | null>(null)

  const bookingReady = useMemo(() => !!pickup && !!dropoff, [pickup, dropoff])
  const selectedVehicle = useMemo(
    () => CHARTER_VEHICLES.find((item) => item.id === vehicleType) || CHARTER_VEHICLES[0],
    [vehicleType],
  )
  const selectedOfficialRoute = useMemo(
    () => officialRoutes.find((route) => route.id === selectedRouteId) || null,
    [officialRoutes, selectedRouteId],
  )
  const selectedOfficialAvailableSeats = useMemo(() => {
    if (!selectedOfficialRoute) return 0
    return Math.max(0, selectedOfficialRoute.totalSeats - selectedOfficialRoute.occupiedSeats)
  }, [selectedOfficialRoute])
  const selectedOfficialSeats = useMemo(() => {
    if (selectedOfficialAvailableSeats === 0) return 0
    return Math.max(1, Math.min(officialSeats, selectedOfficialAvailableSeats))
  }, [officialSeats, selectedOfficialAvailableSeats])

  const quoteWithVehicle = useMemo<QuoteView | null>(() => {
    if (!quote) return null
    return {
      ...quote,
      total: Math.round(quote.total * selectedVehicle.multiplier),
    }
  }, [quote, selectedVehicle.multiplier])

  const officialPickup = useMemo<LocationRecord | null>(() => {
    if (!selectedOfficialRoute) return null
    if (!selectedOfficialRoute.pickupLat || !selectedOfficialRoute.pickupLng) return null
    return {
      id: `official-${selectedOfficialRoute.id}-pickup`,
      name: selectedOfficialRoute.pickup,
      address: selectedOfficialRoute.pickup,
      lat: selectedOfficialRoute.pickupLat,
      lng: selectedOfficialRoute.pickupLng,
      keywords: ['official'],
      source: 'local',
    }
  }, [selectedOfficialRoute])

  const officialDropoff = useMemo<LocationRecord | null>(() => {
    if (!selectedOfficialRoute) return null
    if (!selectedOfficialRoute.dropoffLat || !selectedOfficialRoute.dropoffLng) return null
    return {
      id: `official-${selectedOfficialRoute.id}-dropoff`,
      name: selectedOfficialRoute.dropoff,
      address: selectedOfficialRoute.dropoff,
      lat: selectedOfficialRoute.dropoffLat,
      lng: selectedOfficialRoute.dropoffLng,
      keywords: ['official'],
      source: 'local',
    }
  }, [selectedOfficialRoute])

  useEffect(() => {
    queueMicrotask(() => {
      setLoadingOfficialRoutes(true)
      setOfficialError(null)
    })
    const unsubscribe = subscribeOfficialRoutes(
      (routes) => {
        setOfficialRoutes(routes)
        setLoadingOfficialRoutes(false)
        setSelectedRouteId((prev) => {
          if (prev && routes.some((item) => item.id === prev)) return prev
          return routes[0]?.id || null
        })
      },
      (err) => {
        setOfficialError(err.message)
        setLoadingOfficialRoutes(false)
      },
    )
    return () => unsubscribe()
  }, [])

  const refreshQuote = async () => {
    if (!pickup || !dropoff) return
    setCalculating(true)
    try {
      const route = await calculateRoute(pickup, dropoff)
      const pricing = calculatePrice(route)
      setRouteInfo(route)
      setQuote(pricing)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知錯誤'
      setNotice({ text: `計算路線失敗: ${message}`, tone: 'error' })
    } finally {
      setCalculating(false)
    }
  }

  const placeCharterOrderNow = async (usedQuote: QuoteView) => {
    if (!currentUser || !pickup || !dropoff) return

    await createOrder({
      pickup: pickup.name,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoff: dropoff.name,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      price: usedQuote.total,
      distance: Number(usedQuote.distance),
      duration: usedQuote.duration,
      tollFee: usedQuote.tollsTotal,
      passengerId: currentUser.id,
      passengerName: currentUser.name,
      orderType: 'charter',
      passengersCount: charterPassengers,
      vehicleType,
      bookingDateTime: toBookingDateTimeISO(bookingDate, bookingTime),
    })

    navigate('/orders', {
      state: {
        notice: {
          text: '包車訂單已建立，已同步到你的 Firebase 訂單列表。',
          tone: 'ok',
        },
      },
    })
    setPickup(null)
    setDropoff(null)
    setQuote(null)
    setRouteInfo(null)
  }

  const placeCharterOrder = async () => {
    if (!pickup || !dropoff || !currentUser) return
    setPlacingOrder(true)

    try {
      let nextRoute = routeInfo
      let nextQuote = quoteWithVehicle

      if (!nextRoute || !nextQuote) {
        nextRoute = await calculateRoute(pickup, dropoff)
        const baseQuote = calculatePrice(nextRoute)
        nextQuote = {
          ...baseQuote,
          total: Math.round(baseQuote.total * selectedVehicle.multiplier),
        }
        setRouteInfo(nextRoute)
        setQuote(baseQuote)
      }

      await placeCharterOrderNow(nextQuote)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知錯誤'
      setNotice({ text: `建立訂單失敗: ${message}`, tone: 'error' })
    } finally {
      setPlacingOrder(false)
    }
  }

  const placeOfficialRouteOrder = async () => {
    if (!currentUser || !selectedOfficialRoute || !selectedRouteId) return
    if (selectedOfficialSeats < 1) {
      setNotice({ text: '此班次已沒有可用座位。', tone: 'error' })
      return
    }

    setPlacingOrder(true)
    try {
      await joinOfficialRoute({
        routeId: selectedRouteId,
        seats: selectedOfficialSeats,
        passengerId: currentUser.id,
        passengerName: currentUser.name,
      })
      navigate('/orders', {
        state: {
          notice: {
            text: '官方班次已預訂成功，請到訂單頁查看狀態。',
            tone: 'ok',
          },
        },
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知錯誤'
      setNotice({ text: `預訂官方班次失敗: ${message}`, tone: 'error' })
    } finally {
      setPlacingOrder(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 960, margin: '0 auto' }}>
      <div
        style={{
          background: '#fff',
          border: '1px solid #dce6dd',
          borderRadius: 14,
          padding: 8,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
        }}
      >
        <button
          onClick={() => setBookingMode('charter')}
          style={{
            border: 0,
            borderRadius: 10,
            padding: '10px 12px',
            fontWeight: 800,
            background: bookingMode === 'charter' ? '#1f4f43' : '#eef4f1',
            color: bookingMode === 'charter' ? '#f2fff7' : '#32584d',
            cursor: 'pointer',
          }}
        >
          包車點對點
        </button>
        <button
          onClick={() => setBookingMode('official_route')}
          style={{
            border: 0,
            borderRadius: 10,
            padding: '10px 12px',
            fontWeight: 800,
            background: bookingMode === 'official_route' ? '#1f4f43' : '#eef4f1',
            color: bookingMode === 'official_route' ? '#f2fff7' : '#32584d',
            cursor: 'pointer',
          }}
        >
          官方班次
        </button>
      </div>

      {notice && (
        <div
          style={{
            borderRadius: 10,
            padding: '10px 12px',
            border:
              notice.tone === 'error'
                ? '1px solid #edc2bb'
                : notice.tone === 'ok'
                  ? '1px solid #c3dfcf'
                  : '1px solid #d8e2da',
            background:
              notice.tone === 'error'
                ? '#fff0ec'
                : notice.tone === 'ok'
                  ? '#eff9f2'
                  : '#f5f8f5',
            color: notice.tone === 'error' ? '#9c3d31' : '#2c5a4f',
          }}
        >
          {notice.text}
        </div>
      )}

      <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid #dce6dd', background: '#fff' }}>
        <TencentMap
          pickup={bookingMode === 'charter' ? pickup : officialPickup}
          dropoff={bookingMode === 'charter' ? dropoff : officialDropoff}
          routePath={
            bookingMode === 'charter'
              ? routeInfo?.path
              : officialPickup && officialDropoff
                ? [
                    { lat: officialPickup.lat, lng: officialPickup.lng },
                    { lat: officialDropoff.lat, lng: officialDropoff.lng },
                  ]
                : undefined
          }
          height="280px"
        />
      </div>

      {bookingMode === 'charter' ? (
        <div
          style={{
            background: '#fff',
            border: '1px solid #dce6dd',
            borderRadius: 16,
            padding: 14,
            display: 'grid',
            gap: 10,
          }}
        >
          <div
            style={{
              borderRadius: 10,
              background: '#f7faf8',
              border: '1px solid #dce6dd',
              padding: 10,
              display: 'grid',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#36534b' }}>包車選項</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                type="date"
                value={bookingDate}
                onChange={(event) => setBookingDate(event.target.value)}
                style={{
                  border: '1px solid #dce6dd',
                  borderRadius: 10,
                  padding: '9px 10px',
                  outline: 'none',
                  fontSize: 13,
                }}
              />
              <input
                type="time"
                value={bookingTime}
                onChange={(event) => setBookingTime(event.target.value)}
                style={{
                  border: '1px solid #dce6dd',
                  borderRadius: 10,
                  padding: '9px 10px',
                  outline: 'none',
                  fontSize: 13,
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#45645a' }}>乘客人數</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => setCharterPassengers((prev) => Math.max(1, prev - 1))}
                  style={{
                    width: 30,
                    height: 30,
                    border: '1px solid #cfddd4',
                    borderRadius: 8,
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 800,
                  }}
                >
                  -
                </button>
                <strong style={{ minWidth: 28, textAlign: 'center' }}>{charterPassengers}</strong>
                <button
                  onClick={() => setCharterPassengers((prev) => Math.min(6, prev + 1))}
                  style={{
                    width: 30,
                    height: 30,
                    border: '1px solid #cfddd4',
                    borderRadius: 8,
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 800,
                  }}
                >
                  +
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {CHARTER_VEHICLES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setVehicleType(item.id)}
                  style={{
                    border: item.id === vehicleType ? '1px solid #1f4f43' : '1px solid #dce6dd',
                    borderRadius: 10,
                    background: item.id === vehicleType ? '#e9f4ef' : '#fff',
                    color: '#24453d',
                    cursor: 'pointer',
                    padding: '8px 8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#688079' }}>{item.note}</div>
                </button>
              ))}
            </div>
          </div>

          <LocationInput
            key={pickup?.id ?? 'pickup-empty'}
            label="上車地點"
            accent="#2e8b6d"
            value={pickup}
            onPick={(v) => {
              setPickup(v)
              setQuote(null)
              setRouteInfo(null)
            }}
          />
          <LocationInput
            key={dropoff?.id ?? 'dropoff-empty'}
            label="目的地"
            accent="#df5f4a"
            value={dropoff}
            onPick={(v) => {
              setDropoff(v)
              setQuote(null)
              setRouteInfo(null)
            }}
          />

          {(pickup || dropoff) && (
            <div
              style={{
                borderRadius: 10,
                background: '#f7faf8',
                border: '1px solid #dce6dd',
                padding: '10px 11px',
                display: 'grid',
                gap: 6,
              }}
            >
              {pickup && (
                <div style={{ fontSize: 12, color: '#38564d' }}>
                  上車座標: {pickup.lat.toFixed(6)}, {pickup.lng.toFixed(6)}
                </div>
              )}
              {dropoff && (
                <div style={{ fontSize: 12, color: '#38564d' }}>
                  下車座標: {dropoff.lat.toFixed(6)}, {dropoff.lng.toFixed(6)}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => void refreshQuote()}
              disabled={!bookingReady || calculating}
              style={{
                flex: 1,
                border: 0,
                borderRadius: 12,
                padding: '12px 12px',
                fontWeight: 800,
                background: bookingReady ? '#f0bf2a' : '#e9e8e1',
                color: bookingReady ? '#2e2a12' : '#8a8679',
                cursor: bookingReady ? 'pointer' : 'not-allowed',
              }}
            >
              {calculating ? '計算中...' : '計算包車路線與車資'}
            </button>
            <button
              onClick={() => void placeCharterOrder()}
              disabled={!bookingReady || placingOrder}
              style={{
                flex: 1,
                border: 0,
                borderRadius: 12,
                padding: '12px 12px',
                fontWeight: 800,
                background: bookingReady ? '#1e4f43' : '#e9e8e1',
                color: bookingReady ? '#effff7' : '#8a8679',
                cursor: bookingReady ? 'pointer' : 'not-allowed',
              }}
            >
              {placingOrder ? '建立中...' : '確認包車'}
            </button>
          </div>

          {quoteWithVehicle && routeInfo && (
            <div
              style={{
                borderRadius: 12,
                background: '#f5f9f6',
                border: '1px solid #dde8df',
                padding: 12,
                display: 'grid',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: '#5c7068' }}>距離</span>
                <strong>{quoteWithVehicle.distance} km</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: '#5c7068' }}>車程</span>
                <strong>{quoteWithVehicle.duration} 分鐘</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: '#5c7068' }}>附加費</span>
                <strong>HK${quoteWithVehicle.tollsTotal}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#5c7068' }}>車型加成</span>
                <strong>{selectedVehicle.label} x {selectedVehicle.multiplier}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#5c7068' }}>路徑來源</span>
                <strong>{routeInfo.hasRealPath ? 'Tencent Driving API' : 'Fallback 估算'}</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 18,
                  borderTop: '1px solid #d6e3da',
                  paddingTop: 8,
                }}
              >
                <span style={{ color: '#1f3f38', fontWeight: 700 }}>預估包車總價</span>
                <strong style={{ color: '#1e4f43' }}>HK${quoteWithVehicle.total}</strong>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            background: '#fff',
            border: '1px solid #dce6dd',
            borderRadius: 16,
            padding: 14,
            display: 'grid',
            gap: 10,
          }}
        >
          <div
            style={{
              borderRadius: 10,
              background: '#f7faf8',
              border: '1px solid #dce6dd',
              padding: 10,
              fontSize: 12,
              color: '#41625a',
            }}
          >
            官方班次為固定路線拼位服務，可先選班次再選乘坐人數。
          </div>

          {loadingOfficialRoutes ? (
            <div style={{ fontSize: 13, color: '#688079' }}>讀取官方班次中...</div>
          ) : officialError ? (
            <div
              style={{
                borderRadius: 10,
                border: '1px solid #edc2bb',
                background: '#fff0ec',
                padding: '10px 12px',
                color: '#9c3d31',
                fontSize: 13,
              }}
            >
              官方班次讀取失敗: {officialError}
            </div>
          ) : officialRoutes.length === 0 ? (
            <div style={{ fontSize: 13, color: '#688079' }}>目前未有可預訂官方班次，請稍後再試。</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {officialRoutes.map((route) => {
                const availableSeats = Math.max(0, route.totalSeats - route.occupiedSeats)
                const selected = route.id === selectedRouteId
                return (
                  <button
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    style={{
                      border: selected ? '1px solid #1f4f43' : '1px solid #dce6dd',
                      borderRadius: 12,
                      background: selected ? '#ecf7f2' : '#fff',
                      padding: 10,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <strong style={{ color: '#28473f' }}>
                        {route.pickup} {'->'} {route.dropoff}
                      </strong>
                      <span
                        style={{
                          fontSize: 11,
                          borderRadius: 999,
                          padding: '2px 8px',
                          background: '#f3f8f5',
                          border: '1px solid #d8e5dc',
                          color: '#44665d',
                        }}
                      >
                        {OFFICIAL_ROUTE_STATUS_LABELS[route.status]}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#58736b' }}>{parseDateTime(route.date)}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4c675f' }}>
                      <span>
                        座位: {route.occupiedSeats}/{route.totalSeats}（餘 {availableSeats}）
                      </span>
                      <span>每位 HK${route.pricePerSeat}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {selectedOfficialRoute && (
            <div
              style={{
                borderRadius: 12,
                border: '1px solid #dce6dd',
                background: '#f7faf8',
                padding: 12,
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#2a4b42' }}>已選班次</strong>
                <span style={{ fontSize: 12, color: '#5a746d' }}>{parseDateTime(selectedOfficialRoute.date)}</span>
              </div>
              <div style={{ fontSize: 13, color: '#35544b' }}>
                {selectedOfficialRoute.pickup} {'->'} {selectedOfficialRoute.dropoff}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#47645c' }}>預訂座位數</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => setOfficialSeats((prev) => Math.max(1, prev - 1))}
                    disabled={selectedOfficialSeats <= 1}
                    style={{
                      width: 30,
                      height: 30,
                      border: '1px solid #cfddd4',
                      borderRadius: 8,
                      background: selectedOfficialSeats <= 1 ? '#eef2ef' : '#fff',
                      color: selectedOfficialSeats <= 1 ? '#9ca9a3' : '#2e4c43',
                      cursor: selectedOfficialSeats <= 1 ? 'not-allowed' : 'pointer',
                      fontWeight: 800,
                    }}
                  >
                    -
                  </button>
                  <strong style={{ minWidth: 30, textAlign: 'center' }}>{selectedOfficialSeats || 0}</strong>
                  <button
                    onClick={() =>
                      setOfficialSeats((prev) =>
                        Math.min(Math.max(1, selectedOfficialAvailableSeats), prev + 1),
                      )
                    }
                    disabled={
                      selectedOfficialAvailableSeats === 0 ||
                      selectedOfficialSeats >= selectedOfficialAvailableSeats
                    }
                    style={{
                      width: 30,
                      height: 30,
                      border: '1px solid #cfddd4',
                      borderRadius: 8,
                      background:
                        selectedOfficialAvailableSeats === 0 ||
                        selectedOfficialSeats >= selectedOfficialAvailableSeats
                          ? '#eef2ef'
                          : '#fff',
                      color:
                        selectedOfficialAvailableSeats === 0 ||
                        selectedOfficialSeats >= selectedOfficialAvailableSeats
                          ? '#9ca9a3'
                          : '#2e4c43',
                      cursor:
                        selectedOfficialAvailableSeats === 0 ||
                        selectedOfficialSeats >= selectedOfficialAvailableSeats
                          ? 'not-allowed'
                          : 'pointer',
                      fontWeight: 800,
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: '#4f6962' }}>預估總價</span>
                <strong style={{ color: '#1f4f43' }}>
                  HK${Math.max(0, Math.round(selectedOfficialRoute.pricePerSeat * selectedOfficialSeats))}
                </strong>
              </div>
              <button
                onClick={() => void placeOfficialRouteOrder()}
                disabled={placingOrder || selectedOfficialSeats < 1}
                style={{
                  border: 0,
                  borderRadius: 12,
                  padding: '12px 12px',
                  fontWeight: 800,
                  background: placingOrder || selectedOfficialSeats < 1 ? '#e9e8e1' : '#1e4f43',
                  color: placingOrder || selectedOfficialSeats < 1 ? '#8a8679' : '#effff7',
                  cursor: placingOrder || selectedOfficialSeats < 1 ? 'not-allowed' : 'pointer',
                }}
              >
                {placingOrder ? '建立中...' : '確認預訂官方班次'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
