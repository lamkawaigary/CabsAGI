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

type NoticeTone = 'ok' | 'error' | 'info'

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
      <div style={{ maxWidth: 680, margin: '40px auto', background: '#fff', border: '1px solid #dce6dd', borderRadius: 14, padding: 16, display: 'grid', gap: 10 }}>
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
    <div style={{ padding: '0 0 80px 0' }}>
      <main style={{ display: 'grid', gap: 12 }}>
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

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate('/driver')}
            style={{
              border: 0,
              borderRadius: 10,
              padding: '9px 12px',
              fontWeight: 800,
              background: activeTab === 'pool' ? '#1f4f43' : '#ecf2ef',
              color: activeTab === 'pool' ? '#effff7' : '#33584d',
              cursor: 'pointer',
            }}
          >
            訂單公海
          </button>
          <button
            onClick={() => navigate('/driver/orders')}
            style={{
              border: 0,
              borderRadius: 10,
              padding: '9px 12px',
              fontWeight: 800,
              background: activeTab === 'mine' ? '#1f4f43' : '#ecf2ef',
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
                      borderRadius: 14,
                      padding: 12,
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ color: '#27483f' }}>{order.id}</strong>
                      <span
                        style={{
                          border: '1px solid #d9e5dc',
                          borderRadius: 999,
                          padding: '2px 8px',
                          fontSize: 11,
                          color: '#31564b',
                          background: '#f8fbf9',
                        }}
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
                      style={{
                        justifySelf: 'start',
                        border: 0,
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontWeight: 700,
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

              return (
                <article
                  key={order.id || `${order.passengerId}-${order.createdAt}`}
                  style={{
                    background: '#fff',
                    border: '1px solid #dce6dd',
                    borderRadius: 14,
                    padding: 12,
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#27483f' }}>{order.id}</strong>
                    <span
                      style={{
                        border: '1px solid #d9e5dc',
                        borderRadius: 999,
                        padding: '2px 8px',
                        fontSize: 11,
                        color: '#31564b',
                        background: '#f8fbf9',
                      }}
                    >
                      {statusLabel}
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
                        style={{
                          border: 0,
                          borderRadius: 10,
                          padding: '8px 12px',
                          fontWeight: 700,
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
                          border: '1px solid #e0d1cc',
                          borderRadius: 10,
                          padding: '8px 12px',
                          fontWeight: 700,
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
