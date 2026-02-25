import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import TencentMap from '../components/map/TencentMap'
import Icons from '../components/Icons'
import { calculatePrice, calculateRoute, searchLocation, type LocationRecord, type RouteResult } from '../services/mapService'
import { useAuth } from '../context/AuthContext'
import { createOrder, subscribePassengerOrders, type OrderRecord } from '../services/orderService'
import Messages from './Messages'

type TabKey = 'home' | 'orders' | 'messages' | 'profile'

type QuoteView = {
  total: number
  distance: string
  duration: number
  tollsTotal: number
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
  const { currentUser, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const [menuOpen, setMenuOpen] = useState(false)

  const [pickup, setPickup] = useState<LocationRecord | null>(null)
  const [dropoff, setDropoff] = useState<LocationRecord | null>(null)
  const [quote, setQuote] = useState<QuoteView | null>(null)
  const [routeInfo, setRouteInfo] = useState<RouteResult | null>(null)
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'error' | 'info' } | null>(null)

  const bookingReady = useMemo(() => !!pickup && !!dropoff, [pickup, dropoff])

  useEffect(() => {
    if (!currentUser?.id) {
      setOrders([])
      setOrdersLoading(false)
      setOrdersError(null)
      return
    }

    setOrdersLoading(true)
    setOrdersError(null)
    const unsub = subscribePassengerOrders(
      currentUser.id,
      (next) => {
        setOrders(next)
        setOrdersLoading(false)
      },
      (error) => {
        setOrdersError(error.message || '讀取訂單失敗')
        setOrdersLoading(false)
      },
    )
    return () => unsub()
  }, [currentUser?.id])

  const refreshQuote = async () => {
    if (!pickup || !dropoff) return
    setCalculating(true)
    const route = await calculateRoute(pickup, dropoff)
    const pricing = calculatePrice(route)
    setRouteInfo(route)
    setQuote(pricing)
    setCalculating(false)
  }

  const placeOrderNow = async (usedQuote: QuoteView) => {
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
    })

    setNotice({ text: '訂單已建立，已同步到你的 Firebase 訂單列表。', tone: 'ok' })
    setActiveTab('orders')
    setPickup(null)
    setDropoff(null)
    setQuote(null)
    setRouteInfo(null)
  }

  const placeOrder = async () => {
    if (!pickup || !dropoff || !currentUser) return
    setPlacingOrder(true)

    try {
      let nextRoute = routeInfo
      let nextQuote = quote

      if (!nextRoute || !nextQuote) {
        nextRoute = await calculateRoute(pickup, dropoff)
        nextQuote = calculatePrice(nextRoute)
        setRouteInfo(nextRoute)
        setQuote(nextQuote)
      }

      await placeOrderNow(nextQuote)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知錯誤'
      setNotice({ text: `建立訂單失敗: ${message}`, tone: 'error' })
    } finally {
      setPlacingOrder(false)
    }
  }

  const shell: CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #f6faf7 0%, #eef5f4 50%, #f8f6ef 100%)',
    fontFamily: 'Avenir Next, SF Pro Display, Noto Sans TC, PingFang TC, sans-serif',
    paddingBottom: 86,
  }

  return (
    <main style={shell}>
      <header style={{ position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(8px)', background: 'rgba(246,250,247,0.85)', borderBottom: '1px solid #dce6dd', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ letterSpacing: '0.12em', fontSize: 11, color: '#6a827a', fontWeight: 700 }}>CABS PASSENGER</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#1f4038' }}>歡迎，{currentUser?.name}</div>
        </div>
        <button onClick={() => setMenuOpen(true)} style={{ border: '1px solid #d3e0d6', borderRadius: 12, background: '#fff', width: 42, height: 42, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#245045' }}>
          <Icons.Menu />
        </button>
      </header>

      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(10,20,16,0.34)' }} onClick={() => setMenuOpen(false)}>
          <aside onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 290, background: '#fffefb', borderLeft: '1px solid #dae5dc', padding: 18, display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#25473f' }}>功能菜單</div>
              <div style={{ fontSize: 12, color: '#6c7f79' }}>快速切換頁面與帳戶動作</div>
            </div>
            <div style={{ marginTop: 18, display: 'grid', gap: 8, alignContent: 'start' }}>
              {[
                { key: 'home', label: '地圖叫車' },
                { key: 'orders', label: '我的訂單' },
                { key: 'messages', label: '訊息中心' },
                { key: 'profile', label: '個人資料' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveTab(item.key as TabKey)
                    setMenuOpen(false)
                  }}
                  style={{ border: '1px solid #d9e6dd', background: activeTab === item.key ? '#eaf4ef' : '#fff', color: '#22443c', padding: '10px 12px', borderRadius: 10, textAlign: 'left', fontWeight: 700, cursor: 'pointer' }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button onClick={() => void logout()} style={{ border: 0, borderRadius: 10, background: '#1f473e', color: '#f1fff8', fontWeight: 700, padding: '11px 12px', cursor: 'pointer' }}>
              登出
            </button>
          </aside>
        </div>
      )}

      <section style={{ padding: '18px 16px' }}>
        {notice && (
          <div style={{ maxWidth: 960, margin: '0 auto 12px', borderRadius: 10, padding: '10px 12px', border: notice.tone === 'error' ? '1px solid #edc2bb' : notice.tone === 'ok' ? '1px solid #c3dfcf' : '1px solid #d8e2da', background: notice.tone === 'error' ? '#fff0ec' : notice.tone === 'ok' ? '#eff9f2' : '#f5f8f5', color: notice.tone === 'error' ? '#9c3d31' : '#2c5a4f' }}>
            {notice.text}
          </div>
        )}

        {activeTab === 'home' && (
          <div style={{ display: 'grid', gap: 14, maxWidth: 960, margin: '0 auto' }}>
            <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid #dce6dd', background: '#fff' }}>
              <TencentMap pickup={pickup} dropoff={dropoff} routePath={routeInfo?.path} height="280px" />
            </div>

            <div style={{ background: '#fff', border: '1px solid #dce6dd', borderRadius: 16, padding: 14, display: 'grid', gap: 10 }}>
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
                <div style={{ borderRadius: 10, background: '#f7faf8', border: '1px solid #dce6dd', padding: '10px 11px', display: 'grid', gap: 6 }}>
                  {pickup && <div style={{ fontSize: 12, color: '#38564d' }}>上車座標: {pickup.lat.toFixed(6)}, {pickup.lng.toFixed(6)}</div>}
                  {dropoff && <div style={{ fontSize: 12, color: '#38564d' }}>下車座標: {dropoff.lat.toFixed(6)}, {dropoff.lng.toFixed(6)}</div>}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => void refreshQuote()}
                  disabled={!bookingReady || calculating}
                  style={{ flex: 1, border: 0, borderRadius: 12, padding: '12px 12px', fontWeight: 800, background: bookingReady ? '#f0bf2a' : '#e9e8e1', color: bookingReady ? '#2e2a12' : '#8a8679', cursor: bookingReady ? 'pointer' : 'not-allowed' }}
                >
                  {calculating ? '計算中...' : '計算路線與車資'}
                </button>
                <button
                  onClick={() => void placeOrder()}
                  disabled={!bookingReady || placingOrder}
                  style={{ flex: 1, border: 0, borderRadius: 12, padding: '12px 12px', fontWeight: 800, background: bookingReady ? '#1e4f43' : '#e9e8e1', color: bookingReady ? '#effff7' : '#8a8679', cursor: bookingReady ? 'pointer' : 'not-allowed' }}
                >
                  {placingOrder ? '建立中...' : '確認叫車'}
                </button>
              </div>

              {quote && routeInfo && (
                <div style={{ borderRadius: 12, background: '#f5f9f6', border: '1px solid #dde8df', padding: 12, display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span style={{ color: '#5c7068' }}>距離</span><strong>{quote.distance} km</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span style={{ color: '#5c7068' }}>車程</span><strong>{quote.duration} 分鐘</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span style={{ color: '#5c7068' }}>附加費</span><strong>HK${quote.tollsTotal}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: '#5c7068' }}>路徑來源</span><strong>{routeInfo.hasRealPath ? 'Tencent Driving API' : 'Fallback 估算'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, borderTop: '1px solid #d6e3da', paddingTop: 8 }}><span style={{ color: '#1f3f38', fontWeight: 700 }}>預估總價</span><strong style={{ color: '#1e4f43' }}>HK${quote.total}</strong></div>

                  <div style={{ marginTop: 6, borderTop: '1px dashed #ccdbd1', paddingTop: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#335149', marginBottom: 6 }}>途經收費點 / 關卡</div>
                    {routeInfo.checkpoints.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#5f746d' }}>暫未識別收費點或關卡</div>
                    ) : (
                      <div style={{ display: 'grid', gap: 4 }}>
                        {routeInfo.checkpoints.map((cp) => (
                          <div key={cp.id} style={{ fontSize: 12, color: '#355149', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{cp.type === 'border' ? '關卡' : '收費點'}: {cp.name}</span>
                            <span>{cp.fee !== undefined ? `HK$${cp.fee}` : '-'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 10 }}>
            <h2 style={{ margin: 0, color: '#1e4038' }}>我的訂單</h2>
            {ordersLoading ? (
              <div style={{ background: '#fff', border: '1px solid #dce6dd', borderRadius: 14, padding: 24, textAlign: 'center', color: '#6f847d' }}>讀取訂單中...</div>
            ) : ordersError ? (
              <div style={{ background: '#fff2ef', border: '1px solid #edc2bb', borderRadius: 14, padding: 24, textAlign: 'center', color: '#9c3d31' }}>
                無法讀取 Firebase 訂單: {ordersError}
              </div>
            ) : orders.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid #dce6dd', borderRadius: 14, padding: 24, textAlign: 'center', color: '#6f847d' }}>未有與你帳號關聯的訂單記錄。</div>
            ) : (
              orders.map((order) => (
                <article key={order.id} style={{ background: '#fff', border: '1px solid #dce6dd', borderRadius: 14, padding: 14, display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{order.id}</strong>
                    <span style={{ background: '#f5f8f6', border: '1px solid #d9e5dc', color: '#2f5c4f', borderRadius: 999, padding: '2px 9px', fontSize: 12 }}>{order.status}</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#304f47' }}>{order.pickup}{' -> '}{order.dropoff}</div>
                  <div style={{ fontSize: 13, color: '#5f746d' }}>{new Date(order.createdAtISO || order.createdAt || 0).toLocaleString()}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#24463e', fontWeight: 700 }}>
                    <span>{Number(order.distance || 0).toFixed(1)} km / {order.duration} 分鐘</span>
                    <span>HK${order.price}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {activeTab === 'messages' && <Messages orders={orders} />}

        {activeTab === 'profile' && (
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 10 }}>
            <h2 style={{ margin: 0, color: '#1e4038' }}>個人資料</h2>
            <div style={{ background: '#fff', border: '1px solid #dce6dd', borderRadius: 14, padding: 14, display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 14, color: '#355149' }}>姓名: {currentUser?.name}</div>
              <div style={{ fontSize: 14, color: '#355149' }}>電話: {currentUser?.phone || '未提供'}</div>
              <div style={{ fontSize: 14, color: '#355149' }}>帳號: {currentUser?.email}</div>
              <div style={{ fontSize: 14, color: '#355149' }}>積分: {currentUser?.points ?? 0}</div>
              <div style={{ borderTop: '1px solid #e4ebe4', marginTop: 6, paddingTop: 8, display: 'grid', gap: 7 }}>
                {['付款方式', '語言與地區', '通知設定', '幫助中心'].map((item) => (
                  <button key={item} style={{ border: '1px solid #dce6dd', background: '#fbfdfb', borderRadius: 10, padding: '9px 10px', textAlign: 'left', color: '#33524a', fontWeight: 600, cursor: 'pointer' }}>{item}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <nav style={{ position: 'fixed', left: 10, right: 10, bottom: 10, borderRadius: 16, border: '1px solid #d6e0d8', background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(8px)', padding: '8px 10px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, zIndex: 15 }}>
        {[
          { key: 'home', label: '叫車', icon: <Icons.Home /> },
          { key: 'orders', label: '訂單', icon: <Icons.Clipboard /> },
          { key: 'messages', label: '訊息', icon: <Icons.Message /> },
          { key: 'profile', label: '我的', icon: <Icons.User /> },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key as TabKey)}
            style={{
              border: 0,
              borderRadius: 12,
              background: activeTab === item.key ? '#e7f2ec' : 'transparent',
              color: activeTab === item.key ? '#1f4f43' : '#678079',
              display: 'grid',
              justifyItems: 'center',
              gap: 3,
              padding: '7px 6px',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <span style={{ width: 20, height: 20 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </main>
  )
}
