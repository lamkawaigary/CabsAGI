import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  acceptOrderAsDriver,
  advanceOrderStatusAsDriver,
  subscribeDriverOrderPool,
  subscribeDriverOrders,
  type OrderRecord,
} from '../services/orderService'

type DriverTab = 'pool' | 'mine'
type NoticeTone = 'ok' | 'error' | 'info'

const formatDateTime = (raw: string | undefined) => {
  if (!raw) return '-'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString()
}

const isSameDay = (raw: string | undefined, now: Date) => {
  if (!raw) return false
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return false
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export default function DriverDashboard() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<DriverTab>('pool')
  const [online, setOnline] = useState(true)
  const [poolOrders, setPoolOrders] = useState<OrderRecord[]>([])
  const [myOrders, setMyOrders] = useState<OrderRecord[]>([])
  const [loadingPool, setLoadingPool] = useState(true)
  const [loadingMine, setLoadingMine] = useState(true)
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [notice, setNotice] = useState<{ text: string; tone: NoticeTone } | null>(null)
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1024 : window.innerWidth,
  )

  useEffect(() => {
    if (!currentUser?.id) return

    setLoadingPool(true)
    setLoadingMine(true)

    const unsubPool = subscribeDriverOrderPool(
      (orders) => {
        setPoolOrders(orders)
        setLoadingPool(false)
      },
      (error) => {
        setNotice({ text: `讀取接單池失敗: ${error.message}`, tone: 'error' })
        setLoadingPool(false)
      },
    )
    const unsubMine = subscribeDriverOrders(
      currentUser.id,
      (orders) => {
        setMyOrders(orders)
        setLoadingMine(false)
      },
      (error) => {
        setNotice({ text: `讀取我的行程失敗: ${error.message}`, tone: 'error' })
        setLoadingMine(false)
      },
    )

    return () => {
      unsubPool()
      unsubMine()
    }
  }, [currentUser?.id])

  useEffect(() => {
    const onResize = () => {
      setViewportWidth(window.innerWidth)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const summary = useMemo(() => {
    const now = new Date()
    const todayCompleted = myOrders.filter(
      (order) => order.status === 'completed' && isSameDay(order.completedAt || order.updatedAt, now),
    )
    const todayRevenue = todayCompleted.reduce((sum, order) => sum + Number(order.price || 0), 0)
    const activeTrips = myOrders.filter(
      (order) => order.status === 'accepted' || order.status === 'in_progress',
    ).length

    return {
      poolCount: poolOrders.length,
      activeTrips,
      todayCompleted: todayCompleted.length,
      todayRevenue,
    }
  }, [myOrders, poolOrders.length])

  const isMobile = viewportWidth < 780

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  const handleAcceptOrder = async (order: OrderRecord) => {
    if (!currentUser?.id || !order.id) return
    setProcessingOrderId(order.id)
    try {
      await acceptOrderAsDriver({
        orderId: order.id,
        driverId: currentUser.id,
        driverName: currentUser.name,
      })
      setNotice({ text: `已成功接單 ${order.id}`, tone: 'ok' })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知錯誤'
      setNotice({ text: `接單失敗: ${message}`, tone: 'error' })
    } finally {
      setProcessingOrderId(null)
    }
  }

  const handleAdvanceStatus = async (
    order: OrderRecord,
    toStatus: 'in_progress' | 'completed' | 'cancelled',
  ) => {
    if (!currentUser?.id || !order.id) return
    setProcessingOrderId(order.id)
    try {
      await advanceOrderStatusAsDriver({
        orderId: order.id,
        driverId: currentUser.id,
        toStatus,
      })
      const label =
        toStatus === 'in_progress' ? '開始行程' : toStatus === 'completed' ? '完成行程' : '取消行程'
      setNotice({ text: `訂單 ${order.id} 已${label}`, tone: 'ok' })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知錯誤'
      setNotice({ text: `更新狀態失敗: ${message}`, tone: 'error' })
    } finally {
      setProcessingOrderId(null)
    }
  }

  if (!currentUser) {
    return null
  }

  if (currentUser.role !== 'driver') {
    return (
      <div
        style={{
          maxWidth: 680,
          margin: isMobile ? '20px 12px' : '40px auto',
          background: '#fff',
          border: '1px solid #dce6dd',
          borderRadius: 14,
          padding: 16,
          display: 'grid',
          gap: 10,
        }}
      >
        <strong style={{ color: '#29473f' }}>此頁僅供司機使用</strong>
        <div style={{ fontSize: 13, color: '#5d746d' }}>目前登入身份為：{currentUser.role}</div>
        <button
          onClick={() => navigate('/home')}
          style={{
            border: 0,
            borderRadius: 10,
            padding: '10px 12px',
            fontWeight: 700,
            background: '#1f4f43',
            color: '#effff7',
            cursor: 'pointer',
          }}
        >
          返回首頁
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #edf4f2 0%, #f6f8f6 45%, #f3f6f4 100%)',
        paddingBottom: 'calc(94px + env(safe-area-inset-bottom))',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          borderBottom: '1px solid rgba(214,227,220,0.9)',
          backdropFilter: 'blur(10px)',
          background: 'linear-gradient(95deg, rgba(47,61,79,0.95) 0%, rgba(53,95,106,0.95) 48%, rgba(45,122,102,0.95) 100%)',
          color: '#f3fff8',
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            padding: isMobile ? '12px 12px 10px' : '14px 16px 12px',
            display: 'grid',
            gap: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.14em', opacity: 0.82, fontWeight: 700 }}>
                CABS DRIVER DASHBOARD
              </div>
              <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 900 }}>
                司機接單中心 · {currentUser.name}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
              <button
                onClick={() => navigate('/driver/messages')}
                style={{
                  flex: isMobile ? 1 : 'none',
                  minHeight: 42,
                  border: '1px solid rgba(255,255,255,0.35)',
                  borderRadius: 11,
                  background: 'rgba(255,255,255,0.11)',
                  color: '#f3fff8',
                  fontWeight: 800,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
              >
                訊息中心
              </button>
              <button
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                style={{
                  flex: isMobile ? 1 : 'none',
                  minHeight: 42,
                  border: '1px solid rgba(255,255,255,0.35)',
                  borderRadius: 11,
                  background: loggingOut ? 'rgba(255,255,255,0.12)' : '#ffffff',
                  color: loggingOut ? '#f3fff8' : '#27483f',
                  fontWeight: 800,
                  padding: '8px 12px',
                  cursor: loggingOut ? 'not-allowed' : 'pointer',
                }}
              >
                {loggingOut ? '登出中...' : '登出'}
              </button>
            </div>
          </div>

          <div
            style={{
              display: isMobile ? 'flex' : 'grid',
              gridTemplateColumns: isMobile ? undefined : 'repeat(4,minmax(120px,1fr))',
              gap: 8,
              overflowX: isMobile ? 'auto' : 'visible',
              paddingBottom: isMobile ? 2 : 0,
            }}
          >
            {[
              { label: '接單池', value: summary.poolCount },
              { label: '進行中', value: summary.activeTrips },
              { label: '今日完成', value: summary.todayCompleted },
              { label: '今日收入', value: `HK$${summary.todayRevenue}` },
            ].map((item) => (
              <article
                key={item.label}
                style={{
                  minWidth: isMobile ? 132 : undefined,
                  border: '1px solid rgba(255,255,255,0.26)',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.1)',
                  padding: '9px 10px',
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.82, fontWeight: 700 }}>{item.label}</div>
                <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 900 }}>{item.value}</div>
              </article>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.24)',
              background: 'rgba(255,255,255,0.07)',
              padding: '8px 10px',
            }}
          >
            <button
              onClick={() => setOnline((prev) => !prev)}
              style={{
                minHeight: 36,
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 999,
                background: online ? '#1fbf90' : '#a8afb2',
                color: '#fff',
                fontWeight: 800,
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              {online ? '接單中' : '休息中'}
            </button>
            <span style={{ fontSize: 12, opacity: 0.9 }}>
              {online ? '你目前會接收待接訂單' : '已暫停接收新訂單（仍可管理我的行程）'}
            </span>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: isMobile ? '12px' : '16px',
          display: 'grid',
          gap: 12,
        }}
      >
        {notice && (
          <div
            style={{
              borderRadius: 12,
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

        <div
          style={{
            position: 'sticky',
            top: isMobile ? 112 : 128,
            zIndex: 9,
            background: 'rgba(243,247,245,0.88)',
            backdropFilter: 'blur(6px)',
            border: '1px solid #dce6dd',
            borderRadius: 14,
            padding: 4,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 4,
          }}
        >
          <button
            onClick={() => setActiveTab('pool')}
            style={{
              minHeight: 42,
              border: 0,
              borderRadius: 10,
              padding: '9px 12px',
              fontWeight: 800,
              background: activeTab === 'pool' ? '#1f4f43' : 'transparent',
              color: activeTab === 'pool' ? '#effff7' : '#33584d',
              cursor: 'pointer',
            }}
          >
            訂單公海
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            style={{
              minHeight: 42,
              border: 0,
              borderRadius: 10,
              padding: '9px 12px',
              fontWeight: 800,
              background: activeTab === 'mine' ? '#1f4f43' : 'transparent',
              color: activeTab === 'mine' ? '#effff7' : '#33584d',
              cursor: 'pointer',
            }}
          >
            我的行程
          </button>
        </div>

        {activeTab === 'pool' ? (
          loadingPool ? (
            <div style={{ fontSize: 13, color: '#6e827c' }}>讀取接單池中...</div>
          ) : !online ? (
            <div style={{ fontSize: 13, color: '#6e827c' }}>你已設為休息中，暫停顯示接單池。</div>
          ) : poolOrders.length === 0 ? (
            <div style={{ fontSize: 13, color: '#6e827c' }}>目前沒有可接訂單。</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {poolOrders.map((order) => {
                const orderType = order.orderType || (order.isOfficial ? 'official_route' : 'charter')
                return (
                  <article
                    key={order.id || `${order.passengerId}-${order.createdAt}`}
                    style={{
                      background: '#fff',
                      border: '1px solid #dce6dd',
                      borderRadius: 16,
                      padding: isMobile ? 12 : 14,
                      display: 'grid',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(29,53,44,0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ color: '#27483f' }}>{order.id}</strong>
                      <span
                        style={{
                          border: '1px solid #d9e5dc',
                          borderRadius: 999,
                          padding: '3px 9px',
                          fontSize: 11,
                          color: '#31564b',
                          background: '#f8fbf9',
                        }}
                      >
                        {orderType === 'official_route' ? '官方班次' : '包車點對點'}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: '#2b4e44', lineHeight: 1.4, fontWeight: 700 }}>
                      {order.pickup} {'->'} {order.dropoff}
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile
                          ? 'repeat(2,minmax(0,1fr))'
                          : 'repeat(auto-fit,minmax(160px,1fr))',
                        gap: 6,
                        fontSize: 12,
                        color: '#60766f',
                      }}
                    >
                      <span>建立: {formatDateTime(order.createdAtISO || order.createdAt)}</span>
                      <span>乘客: {order.passengerName || order.passengerId}</span>
                      <span>人數: {order.passengersCount || 1}</span>
                      <span>車資: HK${order.price}</span>
                    </div>
                    <button
                      onClick={() => void handleAcceptOrder(order)}
                      disabled={!order.id || processingOrderId === order.id}
                      style={{
                        width: isMobile ? '100%' : 'fit-content',
                        minHeight: 44,
                        border: 0,
                        borderRadius: 11,
                        padding: '8px 14px',
                        fontWeight: 800,
                        background:
                          !order.id || processingOrderId === order.id ? '#e8e8e4' : '#1f4f43',
                        color:
                          !order.id || processingOrderId === order.id ? '#8d8a80' : '#effff7',
                        cursor:
                          !order.id || processingOrderId === order.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {processingOrderId === order.id ? '接單中...' : '一鍵接單'}
                    </button>
                  </article>
                )
              })}
            </div>
          )
        ) : loadingMine ? (
          <div style={{ fontSize: 13, color: '#6e827c' }}>讀取我的行程中...</div>
        ) : myOrders.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6e827c' }}>你目前沒有已接訂單。</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {myOrders.map((order) => {
              const statusLabel =
                order.status === 'pending'
                  ? '待接單'
                  : order.status === 'accepted'
                    ? '已接單'
                    : order.status === 'in_progress'
                      ? '進行中'
                      : order.status === 'completed'
                        ? '已完成'
                        : '已取消'
              const nextAction =
                order.status === 'accepted'
                  ? { label: '開始行程', status: 'in_progress' as const }
                  : order.status === 'in_progress'
                    ? { label: '完成行程', status: 'completed' as const }
                    : null
              const canCancel = order.status === 'accepted'
              const statusTone =
                order.status === 'completed'
                  ? '#2f8f64'
                  : order.status === 'cancelled'
                    ? '#a34f45'
                    : order.status === 'in_progress'
                      ? '#355f9e'
                      : '#31564b'

              return (
                <article
                  key={order.id || `${order.passengerId}-${order.createdAt}`}
                  style={{
                    background: '#fff',
                    border: '1px solid #dce6dd',
                    borderRadius: 16,
                    padding: isMobile ? 12 : 14,
                    display: 'grid',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(29,53,44,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#27483f' }}>{order.id}</strong>
                    <span
                      style={{
                        border: `1px solid ${statusTone}33`,
                        borderRadius: 999,
                        padding: '3px 9px',
                        fontSize: 11,
                        color: statusTone,
                        background: `${statusTone}14`,
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#2b4e44', lineHeight: 1.4, fontWeight: 700 }}>
                    {order.pickup} {'->'} {order.dropoff}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile
                        ? 'repeat(2,minmax(0,1fr))'
                        : 'repeat(auto-fit,minmax(160px,1fr))',
                      gap: 6,
                      fontSize: 12,
                      color: '#60766f',
                    }}
                  >
                    <span>乘客: {order.passengerName || order.passengerId}</span>
                    <span>人數: {order.passengersCount || 1}</span>
                    <span>車資: HK${order.price}</span>
                    <span>建立: {formatDateTime(order.createdAtISO || order.createdAt)}</span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gap: 8,
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit,minmax(160px,1fr))',
                    }}
                  >
                    {nextAction && (
                      <button
                        onClick={() => void handleAdvanceStatus(order, nextAction.status)}
                        disabled={!order.id || processingOrderId === order.id}
                        style={{
                          minHeight: 44,
                          border: 0,
                          borderRadius: 11,
                          padding: '9px 12px',
                          fontWeight: 800,
                          background:
                            !order.id || processingOrderId === order.id ? '#e8e8e4' : '#1f4f43',
                          color:
                            !order.id || processingOrderId === order.id ? '#8d8a80' : '#effff7',
                          cursor:
                            !order.id || processingOrderId === order.id
                              ? 'not-allowed'
                              : 'pointer',
                        }}
                      >
                        {processingOrderId === order.id ? '處理中...' : nextAction.label}
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => void handleAdvanceStatus(order, 'cancelled')}
                        disabled={!order.id || processingOrderId === order.id}
                        style={{
                          minHeight: 44,
                          border: '1px solid #e0d1cc',
                          borderRadius: 11,
                          padding: '9px 12px',
                          fontWeight: 800,
                          background: '#fff5f1',
                          color: '#9f4236',
                          cursor:
                            !order.id || processingOrderId === order.id
                              ? 'not-allowed'
                              : 'pointer',
                          opacity: !order.id || processingOrderId === order.id ? 0.6 : 1,
                        }}
                      >
                        取消行程
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
