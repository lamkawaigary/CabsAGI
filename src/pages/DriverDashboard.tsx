import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  acceptOrderAsDriver,
  advanceOrderStatusAsDriver,
  subscribeDriverOrderPool,
  subscribeDriverOrders,
  type OrderRecord,
} from '../services/orderService'
import { UI_TEXT } from '../constants/uiText'

type NoticeTone = 'ok' | 'error' | 'info'

const noticeClassByTone = (tone: NoticeTone) => {
  if (tone === 'error') return 'ui-notice ui-notice-error'
  if (tone === 'ok') return 'ui-notice ui-notice-ok'
  return 'ui-notice ui-notice-info'
}

const statusLabelByOrderStatus: Record<string, string> = {
  pending: '待接單',
  accepted: '已接單',
  in_progress: '進行中',
  completed: '已完成',
  cancelled: '已取消',
}

export default function DriverDashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Determine active tab from URL
  const activeTab: 'pool' | 'mine' = location.pathname === '/driver/orders' ? 'mine' : 'pool'

  const [online] = useState(true)
  const [poolOrders, setPoolOrders] = useState<OrderRecord[]>([])
  const [myOrders, setMyOrders] = useState<OrderRecord[]>([])
  const [loadingPool, setLoadingPool] = useState(true)
  const [loadingMine, setLoadingMine] = useState(true)
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; tone: NoticeTone } | null>(null)

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
      <div className="ui-card" style={{ maxWidth: 680, margin: '40px auto', display: 'grid', gap: 10 }}>
        <strong style={{ color: '#29473f' }}>此頁僅供司機使用</strong>
        <div style={{ fontSize: 13, color: '#5d746d' }}>目前登入身份為：{currentUser.role}</div>
        <button
          onClick={() => navigate('/home')}
          className="ui-btn ui-btn-primary"
        >
          返回首頁
        </button>
      </div>
    )
  }

  const activePoolCount = poolOrders.length
  const activeMineCount = myOrders.filter(
    (order) => order.status === 'accepted' || order.status === 'in_progress',
  ).length
  const completedMineCount = myOrders.filter((order) => order.status === 'completed').length

  return (
    <div style={{ padding: '0 0 80px 0' }}>
      <main style={{ display: 'grid', gap: 12 }}>
        <section
          style={{
            borderRadius: 18,
            border: '1px solid rgba(31, 191, 144, 0.25)',
            background: 'linear-gradient(135deg, #1f3b49 0%, #2a4f63 100%)',
            color: '#eafff7',
            padding: '16px 14px',
            boxShadow: '0 16px 32px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.9 }}>司機工作台</div>
          <h2 style={{ margin: '4px 0 0', fontSize: 21, lineHeight: 1.25, fontWeight: 800 }}>
            先處理當前行程，再接新單
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5, color: 'rgba(234,255,247,0.92)' }}>
            你可在公海快速接單，並在「我的行程」持續推進狀態。
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <span style={{ fontSize: 12, borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', padding: '4px 10px', fontWeight: 700 }}>
              公海可接 {activePoolCount}
            </span>
            <span style={{ fontSize: 12, borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', padding: '4px 10px', fontWeight: 700 }}>
              進行中 {activeMineCount}
            </span>
            <span style={{ fontSize: 12, borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', padding: '4px 10px', fontWeight: 700 }}>
              已完成 {completedMineCount}
            </span>
          </div>
        </section>

        {notice && (
          <div className={noticeClassByTone(notice.tone)}>
            {notice.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate('/driver')}
            className={`ui-btn ui-btn-tab ${activeTab === 'pool' ? 'active' : ''}`}
            style={{ padding: '9px 12px' }}
          >
            訂單公海
          </button>
          <button
            onClick={() => navigate('/driver/orders')}
            className={`ui-btn ui-btn-tab ${activeTab === 'mine' ? 'active' : ''}`}
            style={{ padding: '9px 12px' }}
          >
            我的行程
          </button>
        </div>

        {activeTab === 'pool' ? (
          loadingPool ? (
            <div className="ui-empty-state" style={{ fontSize: 13, padding: 16 }}>{UI_TEXT.loading.driverPool}</div>
          ) : !online ? (
            <div className="ui-empty-state" style={{ fontSize: 13, padding: 16 }}>你已設為休息中，暫停顯示接單池。</div>
          ) : poolOrders.length === 0 ? (
            <div className="ui-empty-state" style={{ fontSize: 13, padding: 16 }}>{UI_TEXT.empty.driverPool}</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {poolOrders.map((order) => {
                const orderType = order.orderType || (order.isOfficial ? 'official_route' : 'charter')
                return (
                  <article
                    key={order.id || `${order.passengerId}-${order.createdAt}`}
                    className="ui-card"
                    style={{ padding: 12, display: 'grid', gap: 6, boxShadow: '0 8px 18px rgba(14, 64, 54, 0.06)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ color: '#27483f' }}>{order.id}</strong>
                      <span
                        className="ui-pill"
                        style={{ fontSize: 11, padding: '2px 8px', background: '#eef7f2', borderColor: '#d4e4db', color: '#2f5c4f' }}
                      >
                        {orderType === 'official_route' ? '官方班次' : '包車點對點'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#37564e' }}>
                      {order.pickup} {'->'} {order.dropoff}
                    </div>
                    <div style={{ fontSize: 12, color: '#60766f', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span>建立: {order.createdAtISO || order.createdAt || '-'}</span>
                      <span>乘客: {order.passengerName || order.passengerId}</span>
                      <span>人數: {order.passengersCount || 1}</span>
                      <span>HK${order.price}</span>
                    </div>
                    <button
                      onClick={() => void handleAcceptOrder(order)}
                      disabled={!order.id || processingOrderId === order.id}
                      className="ui-btn ui-btn-primary"
                      style={{ justifySelf: 'start', padding: '8px 12px' }}
                    >
                      {processingOrderId === order.id ? '接單中...' : '一鍵接單'}
                    </button>
                  </article>
                )
              })}
            </div>
          )
        ) : loadingMine ? (
          <div className="ui-empty-state" style={{ fontSize: 13, padding: 16 }}>{UI_TEXT.loading.driverMine}</div>
        ) : myOrders.length === 0 ? (
          <div className="ui-empty-state" style={{ fontSize: 13, padding: 16 }}>{UI_TEXT.empty.driverMine}</div>
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

              return (
                <article
                  key={order.id || `${order.passengerId}-${order.createdAt}`}
                  className="ui-card"
                  style={{ padding: 12, display: 'grid', gap: 6, boxShadow: '0 8px 18px rgba(14, 64, 54, 0.06)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#27483f' }}>{order.id}</strong>
                    <span
                      className="ui-pill"
                      style={{ fontSize: 11, padding: '2px 8px', background: '#f5f8f6', color: '#2f5c4f' }}
                    >
                      {statusLabelByOrderStatus[order.status] || statusLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#37564e' }}>
                    {order.pickup} {'->'} {order.dropoff}
                  </div>
                  <div style={{ fontSize: 12, color: '#60766f', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>乘客: {order.passengerName || order.passengerId}</span>
                    <span>人數: {order.passengersCount || 1}</span>
                    <span>車資: HK${order.price}</span>
                    <span>建立: {order.createdAtISO || order.createdAt || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {nextAction && (
                      <button
                        onClick={() => void handleAdvanceStatus(order, nextAction.status)}
                        disabled={!order.id || processingOrderId === order.id}
                        className="ui-btn ui-btn-primary"
                        style={{ padding: '8px 12px' }}
                      >
                        {processingOrderId === order.id ? '處理中...' : nextAction.label}
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => void handleAdvanceStatus(order, 'cancelled')}
                        disabled={!order.id || processingOrderId === order.id}
                        className="ui-btn ui-btn-danger"
                        style={{ padding: '8px 12px' }}
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
