import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  STATIC_LOCATIONS,
  calculatePrice,
  calculateRoute,
  searchLocation,
  type LocationRecord,
  type RouteResult,
} from '../services/mapService'
import { useAuth } from '../context/AuthContext'
import {
  createOrder,
  joinOfficialRoute,
  subscribeOfficialRoutes,
  type OfficialRouteRecord,
  type OfficialRouteStatus,
} from '../services/orderService'

const TencentMap = lazy(() => import('../components/map/TencentMap'))

type QuoteView = {
  total: number
  distance: string
  duration: number
  tollsTotal: number
}

type NoticeTone = 'ok' | 'error' | 'info'

type BookingMode = 'charter' | 'official_route'
type CharterVehicleType = 'standard' | 'luxury' | 'van'
type CharterRoutePreset = {
  id: string
  label: string
  pickupLocationId: string
  dropoffLocationId: string
  note: string
}

type SearchState = {
  query: string
  items: LocationRecord[]
  open: boolean
  searched: boolean
}

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

const CHARTER_STEPS = ['選擇服務與路線', '計算預估車資', '確認下單']

const CHARTER_ROUTE_PRESETS: CharterRoutePreset[] = [
  {
    id: 'central-hkg',
    label: '中環 -> 機場',
    pickupLocationId: 'central',
    dropoffLocationId: 'hkg',
    note: '商務客常用',
  },
  {
    id: 'hkg-szw',
    label: '機場 -> 深圳灣口岸',
    pickupLocationId: 'hkg',
    dropoffLocationId: 'szw',
    note: '跨境熱門',
  },
  {
    id: 'tst-lmg',
    label: '尖沙咀 -> 落馬洲',
    pickupLocationId: 'tst',
    dropoffLocationId: 'lmg',
    note: '拼商務行程',
  },
]

const getStaticLocation = (id: string): LocationRecord | null => {
  const found = STATIC_LOCATIONS.find((location) => location.id === id)
  if (!found) return null
  return { ...found, source: 'local' }
}

function LocationInput({
  label,
  accent,
  state,
  onQueryChange,
  onOpen,
  onClose,
  onPick,
}: {
  label: string
  accent: string
  state: SearchState
  onQueryChange: (query: string) => void
  onOpen: () => void
  onClose: () => void
  onPick: (v: LocationRecord | null) => void
}) {
  const { query, items, open, searched } = state

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#4b665f', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #dce6dd', background: '#fbfdfb', borderRadius: 12, padding: '12px 12px' }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: accent }} />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={onOpen}
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
                  onQueryChange(item.name)
                  onClose()
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
  const [notice, setNotice] = useState<{ text: string; tone: NoticeTone } | null>(null)
  const [pickupSearch, setPickupSearch] = useState<SearchState>({
    query: '',
    items: [],
    open: false,
    searched: false,
  })
  const [dropoffSearch, setDropoffSearch] = useState<SearchState>({
    query: '',
    items: [],
    open: false,
    searched: false,
  })
  const searchCacheRef = useRef<Map<string, LocationRecord[]>>(new Map())
  const pickupSearchRequestIdRef = useRef(0)
  const dropoffSearchRequestIdRef = useRef(0)

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
  const charterStep = useMemo(() => {
    if (!pickup || !dropoff) return 1
    if (!quoteWithVehicle || !routeInfo) return 2
    return 3
  }, [pickup, dropoff, quoteWithVehicle, routeInfo])
  const activePresetId = useMemo(() => {
    if (!pickup || !dropoff) return null
    return (
      CHARTER_ROUTE_PRESETS.find(
        (preset) =>
          preset.pickupLocationId === pickup.id &&
          preset.dropoffLocationId === dropoff.id,
      )?.id || null
    )
  }, [pickup, dropoff])

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

  useEffect(() => {
    if (!notice || notice.tone === 'error') return undefined
    const timeoutId = window.setTimeout(() => {
      setNotice((current) => (current?.text === notice.text ? null : current))
    }, 3600)
    return () => window.clearTimeout(timeoutId)
  }, [notice])

  useEffect(() => {
    if (!pickup && pickupSearch.query) {
      setPickupSearch((prev) => ({ ...prev, query: '' }))
    }
  }, [pickup, pickupSearch.query])

  useEffect(() => {
    if (!dropoff && dropoffSearch.query) {
      setDropoffSearch((prev) => ({ ...prev, query: '' }))
    }
  }, [dropoff, dropoffSearch.query])

  const runLocationSearch = useCallback(async (
    rawQuery: string,
    setState: React.Dispatch<React.SetStateAction<SearchState>>,
    requestRef: React.MutableRefObject<number>,
  ) => {
    const query = rawQuery.trim()
    if (!query) {
      setState((prev) => ({ ...prev, items: [], open: false, searched: false }))
      return
    }

    setState((prev) => ({ ...prev, searched: true }))

    if (searchCacheRef.current.has(query)) {
      const cached = searchCacheRef.current.get(query) || []
      setState((prev) => ({ ...prev, items: cached, open: true }))
      return
    }

    const requestId = ++requestRef.current
    const result = await searchLocation(query)
    if (requestId !== requestRef.current) return
    searchCacheRef.current.set(query, result)
    setState((prev) => ({ ...prev, items: result, open: true }))
  }, [])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void runLocationSearch(
        pickupSearch.query,
        setPickupSearch,
        pickupSearchRequestIdRef,
      )
    }, 240)
    return () => window.clearTimeout(timerId)
  }, [pickupSearch.query, runLocationSearch])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void runLocationSearch(
        dropoffSearch.query,
        setDropoffSearch,
        dropoffSearchRequestIdRef,
      )
    }, 240)
    return () => window.clearTimeout(timerId)
  }, [dropoffSearch.query, runLocationSearch])

  const clearCharterEstimate = () => {
    setQuote(null)
    setRouteInfo(null)
  }

  const applyRoutePreset = (preset: CharterRoutePreset) => {
    const nextPickup = getStaticLocation(preset.pickupLocationId)
    const nextDropoff = getStaticLocation(preset.dropoffLocationId)
    if (!nextPickup || !nextDropoff) {
      setNotice({ text: '熱門路線資料不完整，請手動選擇地點。', tone: 'error' })
      return
    }

    setPickup(nextPickup)
    setDropoff(nextDropoff)
    clearCharterEstimate()
    setNotice({ text: `已套用熱門路線：${preset.label}`, tone: 'info' })
  }

  const swapStops = () => {
    if (!pickup || !dropoff) return
    setPickup(dropoff)
    setDropoff(pickup)
    clearCharterEstimate()
    setNotice({ text: '已交換上車與目的地，請重新計算車資。', tone: 'info' })
  }

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
    clearCharterEstimate()
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

      {bookingMode === 'charter' && (
        <div
          style={{
            borderRadius: 14,
            border: '1px solid #d7e4db',
            background: 'linear-gradient(145deg, #f9fcfa 0%, #f3f8f5 100%)',
            padding: 12,
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <strong style={{ color: '#1f4f43', fontSize: 14 }}>包車預約流程</strong>
            <span style={{ fontSize: 12, color: '#5a746d' }}>目前步驟 {charterStep}/3</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {CHARTER_STEPS.map((step, index) => {
              const reached = index + 1 <= charterStep
              return (
                <div
                  key={step}
                  style={{
                    borderRadius: 10,
                    border: reached ? '1px solid #bfdccf' : '1px solid #dde9e2',
                    background: reached ? '#eaf6f0' : '#fff',
                    color: reached ? '#1f4f43' : '#688079',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '8px 10px',
                  }}
                >
                  {index + 1}. {step}
                </div>
              )
            })}
          </div>
        </div>
      )}

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
                  : '1px solid #c8d7f5',
            background:
              notice.tone === 'error'
                ? '#fff0ec'
                : notice.tone === 'ok'
                  ? '#eff9f2'
                  : '#edf4ff',
            color: notice.tone === 'error' ? '#9c3d31' : notice.tone === 'ok' ? '#2c5a4f' : '#2d4f7d',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            style={{
              border: 0,
              borderRadius: 8,
              padding: '5px 9px',
              fontSize: 12,
              background: 'rgba(255,255,255,0.7)',
              color: '#3a5850',
              cursor: 'pointer',
            }}
          >
            關閉
          </button>
        </div>
      )}

      <div
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid #dce6dd',
          background: '#fff',
          marginBottom: 12,
          minHeight: 'clamp(260px, 50vh, 540px)',
        }}
      >
        <Suspense
          fallback={
            <div
              style={{
                height: 'clamp(260px, 50vh, 540px)',
                display: 'grid',
                placeItems: 'center',
                color: '#5f7770',
                fontSize: 13,
                background: '#f8fbf9',
              }}
            >
              地圖載入中...
            </div>
          }
        >
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
            height="clamp(260px, 50vh, 540px)"
          />
        </Suspense>
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

          <div
            style={{
              borderRadius: 10,
              border: '1px solid #dce6dd',
              background: '#f9fcfa',
              padding: 10,
              display: 'grid',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#36534b' }}>熱門快速路線</div>
              <span style={{ fontSize: 11, color: '#638079' }}>一鍵帶入上車/目的地</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              {CHARTER_ROUTE_PRESETS.map((preset) => {
                const selected = activePresetId === preset.id
                return (
                  <button
                    type="button"
                    key={preset.id}
                    onClick={() => applyRoutePreset(preset)}
                    style={{
                      border: selected ? '1px solid #1f4f43' : '1px solid #dce6dd',
                      borderRadius: 10,
                      background: selected ? '#eaf4ef' : '#fff',
                      padding: '9px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: '#2f4f46',
                      display: 'grid',
                      gap: 3,
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>{preset.label}</strong>
                    <span style={{ fontSize: 11, color: '#678079' }}>{preset.note}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <LocationInput
            label="上車地點"
            accent="#2e8b6d"
            state={pickupSearch}
            onQueryChange={(query) => {
              setPickupSearch((prev) => ({ ...prev, query }))
              if (!query.trim()) {
                setPickup(null)
                clearCharterEstimate()
              }
            }}
            onOpen={() => {
              setPickupSearch((prev) => ({
                ...prev,
                open: prev.items.length > 0,
              }))
            }}
            onClose={() => {
              setPickupSearch((prev) => ({ ...prev, open: false }))
            }}
            onPick={(v) => {
              setPickup(v)
              setPickupSearch((prev) => ({
                ...prev,
                query: v?.name || '',
              }))
              clearCharterEstimate()
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={swapStops}
              disabled={!pickup || !dropoff}
              style={{
                border: '1px solid #d1ded5',
                borderRadius: 999,
                padding: '7px 12px',
                background: !pickup || !dropoff ? '#f0f3f1' : '#fff',
                color: !pickup || !dropoff ? '#90a19a' : '#2f564a',
                cursor: !pickup || !dropoff ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              交換上下車地點
            </button>
          </div>
          <LocationInput
            label="目的地"
            accent="#df5f4a"
            state={dropoffSearch}
            onQueryChange={(query) => {
              setDropoffSearch((prev) => ({ ...prev, query }))
              if (!query.trim()) {
                setDropoff(null)
                clearCharterEstimate()
              }
            }}
            onOpen={() => {
              setDropoffSearch((prev) => ({
                ...prev,
                open: prev.items.length > 0,
              }))
            }}
            onClose={() => {
              setDropoffSearch((prev) => ({ ...prev, open: false }))
            }}
            onPick={(v) => {
              setDropoff(v)
              setDropoffSearch((prev) => ({
                ...prev,
                query: v?.name || '',
              }))
              clearCharterEstimate()
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
