import { useLocation } from 'react-router-dom'
import { usePassengerOrders } from '../hooks/usePassengerOrders'
import { UI_TEXT } from '../constants/uiText'

type NoticeTone = 'ok' | 'error' | 'info'

interface PageNotice {
  text: string
  tone: NoticeTone
}

interface OrdersRouteState {
  notice?: PageNotice
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: '待接單',
  accepted: '已接單',
  in_progress: '進行中',
  completed: '已完成',
  cancelled: '已取消',
}

const ORDER_STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending: { background: '#fff3cd', color: '#7a5a1a' },
  accepted: { background: '#d6ebff', color: '#e07b4c' },
  in_progress: { background: '#d4edda', color: '#1a7a3a' },
  completed: { background: '#c8e6c9', color: '#e07b4c' },
  cancelled: { background: '#f8d7da', color: '#c62828' },
}

const noticeClassByTone = (tone: NoticeTone) => {
  if (tone === 'error') return 'ui-notice ui-notice-error'
  if (tone === 'ok') return 'ui-notice ui-notice-ok'
  return 'ui-notice ui-notice-info'
}

const formatDateTime = (raw: string | undefined) => {
  if (!raw) return ''
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleString()
}

export default function OrdersPage() {
  const location = useLocation()
  const { orders, loading, error } = usePassengerOrders()
  const routeState = (location.state as OrdersRouteState | null) || null
  const notice = routeState?.notice || null
  const activeOrders = orders.filter((order) => ['pending', 'accepted', 'in_progress'].includes(order.status)).length
  const finishedOrders = orders.filter((order) => ['completed', 'cancelled'].includes(order.status)).length

  return (
    <div className="ui-page" style={{ gap: 10, paddingBottom: 18 }}>
      <section style={styles.heroCard}>
        <div style={styles.heroEyebrow}>我的訂單</div>
        <h2 style={styles.heroTitle}>查看行程進度與派車狀態</h2>
        <p style={styles.heroSubtitle}>包含官方班次與包車訂單，按時間追蹤每段行程。</p>
        <div style={styles.heroStats}>
          <span style={styles.heroStat}>全部訂單 {orders.length}</span>
          <span style={styles.heroStat}>進行中 {activeOrders}</span>
          <span style={styles.heroStat}>已完成 {finishedOrders}</span>
        </div>
      </section>

      {notice && (
        <div className={noticeClassByTone(notice.tone)}>
          {notice.text}
        </div>
      )}

      {loading ? (
        <div className="ui-empty-state">
          {UI_TEXT.loading.orders}
        </div>
      ) : error ? (
        <div className="ui-empty-state ui-notice-error">
          {UI_TEXT.error.readOrders}: {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="ui-empty-state">
          {UI_TEXT.empty.orders}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {orders.map((order) => (
            <article
              key={order.id}
              className="ui-card ui-card-interactive"
              style={{ padding: 14, display: 'grid', gap: 7, borderRadius: 14, boxShadow: '0 10px 20px rgba(14, 64, 54, 0.06)' }}
            >
              {(() => {
                const statusStyle = ORDER_STATUS_STYLES[order.status] || {
                  background: '#f5f8f6',
                  color: '#2f5c4f',
                }
                const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status
                return (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ color: '#23443c' }}>{order.id}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    className="ui-pill"
                    style={{ background: '#eef7f2', borderColor: '#d4e4db', color: '#2f5c4f', fontWeight: 700 }}
                  >
                    {order.orderType === 'official_route' || order.isOfficial ? '官方班次' : '包車點對點'}
                  </span>
                  <span
                    className="ui-pill"
                    style={statusStyle}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
                )
              })()}
              <div style={{ fontSize: 14, color: '#304f47', fontWeight: 700 }}>
                {order.pickup}
                {' -> '}
                {order.dropoff}
              </div>
              <div style={{ fontSize: 12, color: '#6a8179' }}>
                建立時間: {new Date(order.createdAtISO || order.createdAt || 0).toLocaleString()}
              </div>
              {order.bookingDateTime && (
                <div style={{ fontSize: 12, color: '#60756d' }}>
                  用車時間: {formatDateTime(order.bookingDateTime)}
                </div>
              )}
              {(order.passengersCount || order.officialRouteId) && (
                <div style={{ fontSize: 12, color: '#60756d', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {order.passengersCount && <span>乘客: {order.passengersCount} 人</span>}
                  {order.officialRouteId && <span>班次: {order.officialRouteId}</span>}
                </div>
              )}
              {(order.driverName || order.driverId) && (
                <div style={{ fontSize: 12, color: '#60756d' }}>
                  司機: {order.driverName || order.driverId}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#24463e', fontWeight: 800 }}>
                <span>
                  {Number(order.distance || 0).toFixed(1)} km / {order.duration} 分鐘
                </span>
                <span>HK${order.price}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  heroCard: {
    borderRadius: 18,
    border: '1px solid rgba(30, 79, 67, 0.12)',
    background: 'linear-gradient(135deg, #1e4f43 0%, #2b6a5a 100%)',
    color: '#fff',
    padding: '16px 14px',
    boxShadow: '0 16px 32px rgba(30, 79, 67, 0.18)',
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: 700,
    opacity: 0.9,
  },
  heroTitle: {
    margin: '4px 0 0',
    fontSize: 21,
    lineHeight: 1.25,
    fontWeight: 800,
  },
  heroSubtitle: {
    margin: '8px 0 0',
    fontSize: 13,
    lineHeight: 1.5,
    color: 'rgba(255,255,255,0.92)',
  },
  heroStats: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  heroStat: {
    fontSize: 12,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.12)',
    padding: '4px 10px',
    fontWeight: 700,
  },
}
