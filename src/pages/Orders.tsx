import { useLocation } from 'react-router-dom'
import { usePassengerOrders } from '../hooks/usePassengerOrders'

type NoticeTone = 'ok' | 'error' | 'info'

interface PageNotice {
  text: string
  tone: NoticeTone
}

interface OrdersRouteState {
  notice?: PageNotice
}

export default function OrdersPage() {
  const location = useLocation()
  const { orders, loading, error } = usePassengerOrders()
  const routeState = (location.state as OrdersRouteState | null) || null
  const notice = routeState?.notice || null

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: 10 }}>
      <h2 style={{ margin: 0, color: '#1e4038' }}>我的訂單</h2>

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

      {loading ? (
        <div
          style={{
            background: '#fff',
            border: '1px solid #dce6dd',
            borderRadius: 14,
            padding: 24,
            textAlign: 'center',
            color: '#6f847d',
          }}
        >
          讀取訂單中...
        </div>
      ) : error ? (
        <div
          style={{
            background: '#fff2ef',
            border: '1px solid #edc2bb',
            borderRadius: 14,
            padding: 24,
            textAlign: 'center',
            color: '#9c3d31',
          }}
        >
          無法讀取 Firebase 訂單: {error}
        </div>
      ) : orders.length === 0 ? (
        <div
          style={{
            background: '#fff',
            border: '1px solid #dce6dd',
            borderRadius: 14,
            padding: 24,
            textAlign: 'center',
            color: '#6f847d',
          }}
        >
          未有與你帳號關聯的訂單記錄。
        </div>
      ) : (
        orders.map((order) => (
          <article
            key={order.id}
            style={{
              background: '#fff',
              border: '1px solid #dce6dd',
              borderRadius: 14,
              padding: 14,
              display: 'grid',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{order.id}</strong>
              <span
                style={{
                  background: '#f5f8f6',
                  border: '1px solid #d9e5dc',
                  color: '#2f5c4f',
                  borderRadius: 999,
                  padding: '2px 9px',
                  fontSize: 12,
                }}
              >
                {order.status}
              </span>
            </div>
            <div style={{ fontSize: 14, color: '#304f47' }}>
              {order.pickup}
              {' -> '}
              {order.dropoff}
            </div>
            <div style={{ fontSize: 13, color: '#5f746d' }}>
              {new Date(order.createdAtISO || order.createdAt || 0).toLocaleString()}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#24463e', fontWeight: 700 }}>
              <span>
                {Number(order.distance || 0).toFixed(1)} km / {order.duration} 分鐘
              </span>
              <span>HK${order.price}</span>
            </div>
          </article>
        ))
      )}
    </div>
  )
}
