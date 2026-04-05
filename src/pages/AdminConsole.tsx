import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  assignOrderToDriverByAdmin,
  savePricingConfig,
  subscribeAdminOfficialRoutes,
  subscribeAdminOrders,
  subscribeAdminUsers,
  subscribePricingConfig,
  updateAdminOrderStatus,
  updateAdminUser,
  updateOfficialRouteStatus,
  upsertOfficialRoute,
  type AdminUserRecord,
  type PricingConfigRecord,
} from '../services/adminService'
import type {
  OfficialRouteRecord,
  OfficialRouteStatus,
  OrderRecord,
  OrderStatus,
} from '../services/orderService'
import { UI_TEXT } from '../constants/uiText'

type NoticeTone = 'ok' | 'error' | 'info'
type AdminTab = 'dashboard' | 'orders' | 'users' | 'routes' | 'pricing'

const noticeClassByTone = (tone: NoticeTone) => {
  if (tone === 'error') return 'ui-notice ui-notice-error'
  if (tone === 'ok') return 'ui-notice ui-notice-ok'
  return 'ui-notice ui-notice-info'
}

type RouteFormState = {
  id?: string
  pickup: string
  pickupLat: string
  pickupLng: string
  dropoff: string
  dropoffLat: string
  dropoffLng: string
  date: string
  totalSeats: string
  pricePerSeat: string
  charterPrice: string
  status: OfficialRouteStatus
}

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'pending',
  'accepted',
  'in_progress',
  'completed',
  'cancelled',
]
const OFFICIAL_ROUTE_STATUS_OPTIONS: OfficialRouteStatus[] = [
  'collecting',
  'confirmed',
  'dispatching',
  'active',
  'completed',
  'cancelled',
]

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待接單',
  accepted: '已接單',
  in_progress: '進行中',
  completed: '已完成',
  cancelled: '已取消',
}

const ROUTE_STATUS_LABELS: Record<OfficialRouteStatus, string> = {
  collecting: '拼位中',
  confirmed: '已成行',
  dispatching: '待派車',
  active: '進行中',
  completed: '已完成',
  cancelled: '已取消',
}

const EMPTY_ROUTE_FORM: RouteFormState = {
  pickup: '',
  pickupLat: '',
  pickupLng: '',
  dropoff: '',
  dropoffLat: '',
  dropoffLng: '',
  date: '',
  totalSeats: '6',
  pricePerSeat: '180',
  charterPrice: '1200',
  status: 'collecting',
}

const DEFAULT_PRICING_FORM: PricingConfigRecord = {
  activeSystem: 'distance',
  minSpend: 80,
  tier1Rate: 10,
  tier2Rate: 8,
  tier3Rate: 6,
  midnightSurcharge: 0,
  driverFeePercentage: 0.08,
  updatedAt: new Date(0).toISOString(),
}

const parseNumber = (value: string, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

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

export default function AdminConsole() {
  const { currentUser, logout, resetPasswordByPhone } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [notice, setNotice] = useState<{ text: string; tone: NoticeTone } | null>(null)

  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [routes, setRoutes] = useState<OfficialRouteRecord[]>([])
  const [pricing, setPricing] = useState<PricingConfigRecord>(DEFAULT_PRICING_FORM)
  const [pricingForm, setPricingForm] = useState<PricingConfigRecord>(DEFAULT_PRICING_FORM)

  const [loadingOrders, setLoadingOrders] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingRoutes, setLoadingRoutes] = useState(true)
  const [loadingPricing, setLoadingPricing] = useState(true)

  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all')
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'charter' | 'official_route'>('all')
  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<string, OrderStatus>>({})
  const [orderDriverDrafts, setOrderDriverDrafts] = useState<Record<string, string>>({})
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  const [userSearch, setUserSearch] = useState('')
  const [userRoleDrafts, setUserRoleDrafts] = useState<Record<string, AdminUserRecord['role']>>({})
  const [userPointsDrafts, setUserPointsDrafts] = useState<Record<string, string>>({})
  const [userStatusDrafts, setUserStatusDrafts] = useState<Record<string, string>>({})
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [resettingPasswordId, setResettingPasswordId] = useState<string | null>(null)

  const [routeForm, setRouteForm] = useState<RouteFormState>(EMPTY_ROUTE_FORM)
  const [routeStatusDrafts, setRouteStatusDrafts] = useState<Record<string, OfficialRouteStatus>>({})
  const [savingRoute, setSavingRoute] = useState(false)
  const [updatingRouteId, setUpdatingRouteId] = useState<string | null>(null)

  const [savingPricing, setSavingPricing] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setLoadingOrders(true)
      setLoadingUsers(true)
      setLoadingRoutes(true)
      setLoadingPricing(true)
    })

    const unsubOrders = subscribeAdminOrders(
      (nextOrders) => {
        setOrders(nextOrders)
        setLoadingOrders(false)
      },
      (error) => {
        setNotice({ text: `${UI_TEXT.error.readOrders}: ${error.message}`, tone: 'error' })
        setLoadingOrders(false)
      },
    )
    const unsubUsers = subscribeAdminUsers(
      (nextUsers) => {
        setUsers(nextUsers)
        setLoadingUsers(false)
      },
      (error) => {
        setNotice({ text: `${UI_TEXT.error.readUsers}: ${error.message}`, tone: 'error' })
        setLoadingUsers(false)
      },
    )
    const unsubRoutes = subscribeAdminOfficialRoutes(
      (nextRoutes) => {
        setRoutes(nextRoutes)
        setLoadingRoutes(false)
      },
      (error) => {
        setNotice({ text: `${UI_TEXT.error.readRoutes}: ${error.message}`, tone: 'error' })
        setLoadingRoutes(false)
      },
    )
    const unsubPricing = subscribePricingConfig(
      (nextPricing) => {
        setPricing(nextPricing)
        setPricingForm(nextPricing)
        setLoadingPricing(false)
      },
      (error) => {
        setNotice({ text: `${UI_TEXT.error.readPricing}: ${error.message}`, tone: 'error' })
        setLoadingPricing(false)
      },
    )

    return () => {
      unsubOrders()
      unsubUsers()
      unsubRoutes()
      unsubPricing()
    }
  }, [])

  const summary = useMemo(() => {
    const now = new Date()
    const pendingOrders = orders.filter((order) => order.status === 'pending').length
    const todayOrders = orders.filter((order) => isSameDay(order.createdAtISO || order.createdAt, now)).length
    const todayRevenue = orders
      .filter(
        (order) =>
          order.status === 'completed' && isSameDay(order.createdAtISO || order.createdAt, now),
      )
      .reduce((sum, order) => sum + Number(order.price || 0), 0)
    const totalRevenue = orders
      .filter((order) => order.status === 'completed')
      .reduce((sum, order) => sum + Number(order.price || 0), 0)
    const adminCount = users.filter((user) => user.role === 'admin').length
    const activeOfficialRoutes = routes.filter((route) =>
      ['collecting', 'confirmed', 'dispatching', 'active'].includes(route.status),
    ).length

    return {
      pendingOrders,
      todayOrders,
      todayRevenue,
      totalRevenue,
      totalUsers: users.length,
      adminCount,
      activeOfficialRoutes,
    }
  }, [orders, users, routes])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (orderFilter !== 'all' && order.status !== orderFilter) return false
      if (orderTypeFilter !== 'all') {
        const orderType = order.orderType || (order.isOfficial ? 'official_route' : 'charter')
        if (orderType !== orderTypeFilter) return false
      }
      return true
    })
  }, [orders, orderFilter, orderTypeFilter])

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return users
    return users.filter((user) => {
      const text = `${user.name} ${user.phone} ${user.email} ${user.id}`.toLowerCase()
      return text.includes(q)
    })
  }, [users, userSearch])

  const driverUsers = useMemo(() => users.filter((user) => user.role === 'driver'), [users])

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

  const handleUpdateOrderStatus = async (order: OrderRecord) => {
    if (!order.id) return
    const nextStatus = orderStatusDrafts[order.id] || order.status
    if (nextStatus === order.status) {
      setNotice({ text: '訂單狀態未改動', tone: 'info' })
      return
    }

    setUpdatingOrderId(order.id)
    try {
      await updateAdminOrderStatus({
        orderId: order.id,
        status: nextStatus,
        fromStatus: order.status,
      })
      setNotice({ text: `訂單 ${order.id} 已更新為 ${STATUS_LABELS[nextStatus]}`, tone: 'ok' })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知錯誤'
      setNotice({ text: `更新訂單失敗: ${message}`, tone: 'error' })
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleAssignDriver = async (order: OrderRecord) => {
    if (!order.id) return
    const draftDriverId = orderDriverDrafts[order.id] || order.driverId || ''
    if (!draftDriverId) {
      setNotice({ text: '請先選擇要派送的司機', tone: 'error' })
      return
    }
    const driver = driverUsers.find((item) => item.id === draftDriverId)
    if (!driver) {
      setNotice({ text: '司機資料不存在，請重新選擇', tone: 'error' })
      return
    }

    setUpdatingOrderId(order.id)
    try {
      await assignOrderToDriverByAdmin({
        orderId: order.id,
        driverId: driver.id,
        driverName: driver.name,
      })
      setOrderStatusDrafts((prev) => ({ ...prev, [order.id as string]: 'accepted' }))
      setNotice({
        text: `訂單 ${order.id} 已派給司機 ${driver.name || driver.id}`,
        tone: 'ok',
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知錯誤'
      setNotice({ text: `派單失敗: ${message}`, tone: 'error' })
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleSaveUser = async (user: AdminUserRecord) => {
    const role = userRoleDrafts[user.id] || user.role
    const points = parseNumber(userPointsDrafts[user.id] ?? String(user.points), user.points)
    const status = userStatusDrafts[user.id] || user.status || 'ACTIVE'
    const roleChanged = role !== user.role
    const pointsChanged = points !== user.points
    const statusChanged = status !== (user.status || 'ACTIVE')
    if (!roleChanged && !pointsChanged && !statusChanged) {
      setNotice({ text: '用戶資料未改動', tone: 'info' })
      return
    }

    setSavingUserId(user.id)
    try {
      await updateAdminUser({
        userId: user.id,
        role,
        points,
        status,
      })
      setNotice({ text: `已更新用戶 ${user.name || user.id}`, tone: 'ok' })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知錯誤'
      setNotice({ text: `更新用戶失敗: ${message}`, tone: 'error' })
    } finally {
      setSavingUserId(null)
    }
  }

  const handleResetPassword = async (user: AdminUserRecord) => {
    if (!user.phone) {
      setNotice({ text: '該用戶沒有電話', tone: 'error' })
      return
    }
    setResettingPasswordId(user.id)
    try {
      const result = await resetPasswordByPhone('852', user.phone)
      setNotice({ text: result.message, tone: result.ok ? 'ok' : 'error' })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知錯誤'
      setNotice({ text: `重設密碼失敗: ${message}`, tone: 'error' })
    } finally {
      setResettingPasswordId(null)
    }
  }

  const handleEditRoute = (route: OfficialRouteRecord) => {
    const toDateInputValue = (() => {
      const date = new Date(route.date)
      if (Number.isNaN(date.getTime())) return ''
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      return local.toISOString().slice(0, 16)
    })()

    setRouteForm({
      id: route.id,
      pickup: route.pickup,
      pickupLat: String(route.pickupLat),
      pickupLng: String(route.pickupLng),
      dropoff: route.dropoff,
      dropoffLat: String(route.dropoffLat),
      dropoffLng: String(route.dropoffLng),
      date: toDateInputValue,
      totalSeats: String(route.totalSeats),
      pricePerSeat: String(route.pricePerSeat),
      charterPrice: String(route.charterPrice),
      status: route.status,
    })
    setActiveTab('routes')
  }

  const handleResetRouteForm = () => {
    setRouteForm(EMPTY_ROUTE_FORM)
  }

  const handleSubmitRouteForm = async () => {
    if (!routeForm.pickup.trim() || !routeForm.dropoff.trim()) {
      setNotice({ text: '請先填寫上車地點與目的地', tone: 'error' })
      return
    }
    if (!routeForm.date) {
      setNotice({ text: '請填寫班次時間', tone: 'error' })
      return
    }

    const payload = {
      id: routeForm.id,
      pickup: routeForm.pickup.trim(),
      pickupLat: parseNumber(routeForm.pickupLat, 0),
      pickupLng: parseNumber(routeForm.pickupLng, 0),
      dropoff: routeForm.dropoff.trim(),
      dropoffLat: parseNumber(routeForm.dropoffLat, 0),
      dropoffLng: parseNumber(routeForm.dropoffLng, 0),
      date: new Date(routeForm.date).toISOString(),
      totalSeats: Math.max(1, Math.round(parseNumber(routeForm.totalSeats, 6))),
      pricePerSeat: Math.max(0, parseNumber(routeForm.pricePerSeat, 0)),
      charterPrice: Math.max(0, parseNumber(routeForm.charterPrice, 0)),
      status: routeForm.status,
    }

    setSavingRoute(true)
    try {
      await upsertOfficialRoute(payload)
      setNotice({ text: routeForm.id ? '官方班次已更新' : '官方班次已建立', tone: 'ok' })
      handleResetRouteForm()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知錯誤'
      setNotice({ text: `保存班次失敗: ${message}`, tone: 'error' })
    } finally {
      setSavingRoute(false)
    }
  }

  const handleUpdateRouteStatus = async (route: OfficialRouteRecord) => {
    const nextStatus = routeStatusDrafts[route.id] || route.status
    if (nextStatus === route.status) {
      setNotice({ text: '班次狀態未改動', tone: 'info' })
      return
    }
    setUpdatingRouteId(route.id)
    try {
      await updateOfficialRouteStatus({ routeId: route.id, status: nextStatus })
      setNotice({ text: `班次 ${route.id} 已更新`, tone: 'ok' })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知錯誤'
      setNotice({ text: `更新班次失敗: ${message}`, tone: 'error' })
    } finally {
      setUpdatingRouteId(null)
    }
  }

  const handleSavePricing = async () => {
    setSavingPricing(true)
    try {
      await savePricingConfig({
        activeSystem: pricingForm.activeSystem,
        minSpend: parseNumber(String(pricingForm.minSpend), pricing.minSpend),
        tier1Rate: parseNumber(String(pricingForm.tier1Rate), pricing.tier1Rate),
        tier2Rate: parseNumber(String(pricingForm.tier2Rate), pricing.tier2Rate),
        tier3Rate: parseNumber(String(pricingForm.tier3Rate), pricing.tier3Rate),
        midnightSurcharge: parseNumber(
          String(pricingForm.midnightSurcharge),
          pricing.midnightSurcharge,
        ),
        driverFeePercentage: parseNumber(
          String(pricingForm.driverFeePercentage),
          pricing.driverFeePercentage,
        ),
      })
      setNotice({ text: '定價設定已保存', tone: 'ok' })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知錯誤'
      setNotice({ text: `保存定價設定失敗: ${message}`, tone: 'error' })
    } finally {
      setSavingPricing(false)
    }
  }

  const renderDashboardTab = () => (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
        {[
          { label: '待接訂單', value: summary.pendingOrders, tone: '#8942FE' },
          { label: '今日訂單', value: summary.todayOrders, tone: '#377dff' },
          { label: '今日收入', value: `HK$${summary.todayRevenue}`, tone: '#11845b' },
          { label: '總收入', value: `HK$${summary.totalRevenue}`, tone: '#d17b1f' },
          { label: '總用戶數', value: summary.totalUsers, tone: '#6f4db8' },
          { label: '管理員數', value: summary.adminCount, tone: '#2b5f87' },
          { label: '進行中班次', value: summary.activeOfficialRoutes, tone: '#1f7a68' },
        ].map((card) => (
          <article
            key={card.label}
            className="ui-card"
            style={{ padding: '12px 14px', display: 'grid', gap: 6 }}
          >
            <div style={{ fontSize: 12, color: '#647a73', fontWeight: 700 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: card.tone }}>{card.value}</div>
          </article>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
        <section className="ui-card" style={{ padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', color: '#27483f' }}>最新訂單</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id || `${order.passengerId}-${order.createdAt}`}
                className="ui-card-muted"
                style={{ padding: '8px 9px', display: 'grid', gap: 4 }}
              >
                <strong style={{ fontSize: 12 }}>{order.id}</strong>
                <div style={{ fontSize: 12, color: '#3d5c54' }}>
                  {order.pickup} {'->'} {order.dropoff}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#60756d' }}>
                  <span>{STATUS_LABELS[order.status]}</span>
                  <span>HK${order.price}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ui-card" style={{ padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', color: '#27483f' }}>最新官方班次</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {routes.slice(0, 5).map((route) => (
              <div
                key={route.id}
                className="ui-card-muted"
                style={{ padding: '8px 9px', display: 'grid', gap: 4 }}
              >
                <strong style={{ fontSize: 12 }}>{route.id}</strong>
                <div style={{ fontSize: 12, color: '#3d5c54' }}>
                  {route.pickup} {'->'} {route.dropoff}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#60756d' }}>
                  <span>{ROUTE_STATUS_LABELS[route.status]}</span>
                  <span>
                    {route.occupiedSeats}/{route.totalSeats} 位
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )

  const renderOrdersTab = () => (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="ui-row">
        <select
          value={orderFilter}
          onChange={(event) => setOrderFilter(event.target.value as 'all' | OrderStatus)}
          className="ui-input"
          style={{ minHeight: 36, width: 'auto', padding: '8px 10px' }}
        >
          <option value="all">全部狀態</option>
          {ORDER_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <select
          value={orderTypeFilter}
          onChange={(event) =>
            setOrderTypeFilter(event.target.value as 'all' | 'charter' | 'official_route')
          }
          className="ui-input"
          style={{ minHeight: 36, width: 'auto', padding: '8px 10px' }}
        >
          <option value="all">全部類型</option>
          <option value="charter">包車點對點</option>
          <option value="official_route">官方班次</option>
        </select>
      </div>

      {loadingOrders ? (
        <div className="ui-empty-state" style={{ fontSize: 13, padding: 16 }}>{UI_TEXT.loading.orders}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="ui-empty-state" style={{ fontSize: 13, padding: 16 }}>{UI_TEXT.empty.orders}</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filteredOrders.map((order) => {
            const draftStatus = order.id ? orderStatusDrafts[order.id] || order.status : order.status
            const orderType = order.orderType || (order.isOfficial ? 'official_route' : 'charter')
            const draftDriverId = order.id ? orderDriverDrafts[order.id] || order.driverId || '' : ''
            return (
              <article
                key={order.id || `${order.passengerId}-${order.createdAt}`}
                className="ui-card ui-clickable-surface"
                style={{ padding: 12, display: 'grid', gap: 6 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ color: '#27483f' }}>{order.id}</strong>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="ui-pill" style={{ fontSize: 11, padding: '2px 8px', background: '#f2f8f4' }}>
                      {orderType === 'official_route' ? '官方班次' : '包車點對點'}
                    </span>
                    <span className="ui-pill" style={{ fontSize: 11, padding: '2px 8px' }}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#37564e' }}>
                  {order.pickup} {'->'} {order.dropoff}
                </div>
                <div style={{ fontSize: 12, color: '#657b74' }}>
                  建立: {formatDateTime(order.createdAtISO || order.createdAt)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#516962', flexWrap: 'wrap', gap: 8 }}>
                  <span>
                    {Number(order.distance || 0).toFixed(1)} km / {order.duration} 分鐘 / HK${order.price}
                  </span>
                  <span>
                    {order.passengerName} ({order.passengerId})
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#60766f' }}>
                  司機: {order.driverName ? `${order.driverName} (${order.driverId || '-'})` : '未派單'}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={draftStatus}
                    onChange={(event) => {
                      if (!order.id) return
                      setOrderStatusDrafts((prev) => ({
                        ...prev,
                        [order.id as string]: event.target.value as OrderStatus,
                      }))
                    }}
                    className="ui-input"
                    style={{ minHeight: 34, width: 'auto', padding: '7px 10px' }}
                  >
                    {ORDER_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void handleUpdateOrderStatus(order)}
                    disabled={!order.id || updatingOrderId === order.id}
                    className="ui-btn ui-btn-primary"
                    style={{ padding: '8px 12px' }}
                  >
                    {updatingOrderId === order.id ? '更新中...' : '更新狀態'}
                  </button>
                  <select
                    value={draftDriverId}
                    onChange={(event) => {
                      if (!order.id) return
                      setOrderDriverDrafts((prev) => ({
                        ...prev,
                        [order.id as string]: event.target.value,
                      }))
                    }}
                    className="ui-input"
                    style={{ minHeight: 34, width: 'auto', padding: '7px 10px' }}
                  >
                    <option value="">選擇司機</option>
                    {driverUsers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name || driver.id}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void handleAssignDriver(order)}
                    disabled={
                      !order.id ||
                      !draftDriverId ||
                      updatingOrderId === order.id ||
                      order.status !== 'pending'
                    }
                    className="ui-btn ui-btn-secondary"
                    style={{ padding: '8px 12px' }}
                  >
                    {updatingOrderId === order.id ? '派單中...' : '派單給司機'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderUsersTab = () => (
    <div style={{ display: 'grid', gap: 12 }}>
      <input
        value={userSearch}
        onChange={(event) => setUserSearch(event.target.value)}
        placeholder="搜尋用戶名稱 / 電話 / Email / UID"
        className="ui-input"
      />

      {loadingUsers ? (
        <div className="ui-empty-state" style={{ fontSize: 13, padding: 16 }}>{UI_TEXT.loading.users}</div>
      ) : filteredUsers.length === 0 ? (
        <div className="ui-empty-state" style={{ fontSize: 13, padding: 16 }}>{UI_TEXT.empty.users}</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filteredUsers.map((user) => {
            const roleDraft = userRoleDrafts[user.id] || user.role
            const pointsDraft = userPointsDrafts[user.id] ?? String(user.points)
            const statusDraft = userStatusDrafts[user.id] || user.status || 'ACTIVE'
            return (
              <article
                key={user.id}
                className="ui-card ui-clickable-surface"
                style={{ padding: 12, display: 'grid', gap: 6 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ color: '#27483f' }}>{user.name || '未命名用戶'}</strong>
                  <span style={{ fontSize: 11, color: '#6a8179' }}>{user.id}</span>
                </div>
                <div style={{ fontSize: 12, color: '#526d64' }}>
                  {user.phone || '(無電話)'} · {user.email || '(無 email)'}
                </div>
                <div style={{ fontSize: 12, color: '#6a8179' }}>
                  建立時間: {formatDateTime(user.createdAt)}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    value={roleDraft}
                    onChange={(event) =>
                      setUserRoleDrafts((prev) => ({
                        ...prev,
                        [user.id]: event.target.value as AdminUserRecord['role'],
                      }))
                    }
                    className="ui-input"
                    style={{ minHeight: 34, width: 'auto', padding: '7px 10px' }}
                  >
                    <option value="passenger">乘客</option>
                    <option value="driver">司機</option>
                    <option value="admin">管理員</option>
                  </select>
                  <select
                    value={statusDraft}
                    onChange={(event) =>
                      setUserStatusDrafts((prev) => ({
                        ...prev,
                        [user.id]: event.target.value,
                      }))
                    }
                    className="ui-input"
                    style={{ minHeight: 34, width: 'auto', padding: '7px 10px' }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="BANNED">BANNED</option>
                  </select>
                  <input
                    type="number"
                    value={pointsDraft}
                    onChange={(event) =>
                      setUserPointsDrafts((prev) => ({
                        ...prev,
                        [user.id]: event.target.value,
                      }))
                    }
                    className="ui-input"
                    style={{ width: 120, minHeight: 34, padding: '7px 10px' }}
                  />
                  <button
                    onClick={() => void handleSaveUser(user)}
                    disabled={savingUserId === user.id}
                    className="ui-btn ui-btn-primary"
                    style={{ padding: '8px 12px' }}
                  >
                    {savingUserId === user.id ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={() => void handleResetPassword(user)}
                    disabled={!user.phone || resettingPasswordId === user.id}
                    className="ui-btn ui-btn-outline"
                    style={{ padding: '8px 12px' }}
                  >
                    {resettingPasswordId === user.id ? '發送中...' : '發送重設郵件'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderRoutesTab = () => (
    <div style={{ display: 'grid', gap: 12 }}>
      <section
        className="ui-card"
        style={{ padding: 12, display: 'grid', gap: 8 }}
      >
        <h3 style={{ margin: 0, color: '#27483f' }}>
          {routeForm.id ? '編輯官方班次' : '新增官方班次'}
        </h3>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))' }}>
          <input
            value={routeForm.pickup}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, pickup: event.target.value }))}
            placeholder="上車地點"
            className="ui-input"
          />
          <input
            value={routeForm.dropoff}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, dropoff: event.target.value }))}
            placeholder="目的地"
            className="ui-input"
          />
          <input
            type="datetime-local"
            value={routeForm.date}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, date: event.target.value }))}
            className="ui-input"
          />
          <select
            value={routeForm.status}
            onChange={(event) =>
              setRouteForm((prev) => ({ ...prev, status: event.target.value as OfficialRouteStatus }))
            }
            className="ui-input"
          >
            {OFFICIAL_ROUTE_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {ROUTE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <input
            value={routeForm.pickupLat}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, pickupLat: event.target.value }))}
            placeholder="上車緯度"
            className="ui-input"
          />
          <input
            value={routeForm.pickupLng}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, pickupLng: event.target.value }))}
            placeholder="上車經度"
            className="ui-input"
          />
          <input
            value={routeForm.dropoffLat}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, dropoffLat: event.target.value }))}
            placeholder="下車緯度"
            className="ui-input"
          />
          <input
            value={routeForm.dropoffLng}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, dropoffLng: event.target.value }))}
            placeholder="下車經度"
            className="ui-input"
          />
          <input
            type="number"
            min={1}
            value={routeForm.totalSeats}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, totalSeats: event.target.value }))}
            placeholder="總座位"
            className="ui-input"
          />
          <input
            type="number"
            min={0}
            value={routeForm.pricePerSeat}
            onChange={(event) =>
              setRouteForm((prev) => ({ ...prev, pricePerSeat: event.target.value }))
            }
            placeholder="每位價格"
            className="ui-input"
          />
          <input
            type="number"
            min={0}
            value={routeForm.charterPrice}
            onChange={(event) =>
              setRouteForm((prev) => ({ ...prev, charterPrice: event.target.value }))
            }
            placeholder="整車價格"
            className="ui-input"
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => void handleSubmitRouteForm()}
            disabled={savingRoute}
            className="ui-btn ui-btn-primary"
            style={{ padding: '9px 14px' }}
          >
            {savingRoute ? '保存中...' : routeForm.id ? '更新班次' : '建立班次'}
          </button>
          <button
            onClick={handleResetRouteForm}
            className="ui-btn ui-btn-outline"
            style={{ padding: '9px 14px' }}
          >
            清空
          </button>
        </div>
      </section>

      {loadingRoutes ? (
        <div className="ui-empty-state" style={{ fontSize: 13, padding: 16 }}>{UI_TEXT.loading.routes}</div>
      ) : routes.length === 0 ? (
        <div className="ui-empty-state" style={{ fontSize: 13, padding: 16 }}>{UI_TEXT.empty.routes}</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {routes.map((route) => {
            const draftStatus = routeStatusDrafts[route.id] || route.status
            const availableSeats = Math.max(0, route.totalSeats - route.occupiedSeats)
            return (
              <article
                key={route.id}
                className="ui-card ui-clickable-surface"
                style={{ padding: 12, display: 'grid', gap: 6 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ color: '#27483f' }}>{route.id}</strong>
                  <span className="ui-pill" style={{ fontSize: 11, padding: '2px 8px' }}>
                    {ROUTE_STATUS_LABELS[route.status]}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#37564e' }}>
                  {route.pickup} {'->'} {route.dropoff}
                </div>
                <div style={{ fontSize: 12, color: '#657b74' }}>班次時間: {formatDateTime(route.date)}</div>
                <div style={{ fontSize: 12, color: '#516962', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>
                    座位: {route.occupiedSeats}/{route.totalSeats}（餘 {availableSeats}）
                  </span>
                  <span>
                    每位 HK${route.pricePerSeat} / 整車 HK${route.charterPrice}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={draftStatus}
                    onChange={(event) =>
                      setRouteStatusDrafts((prev) => ({
                        ...prev,
                        [route.id]: event.target.value as OfficialRouteStatus,
                      }))
                    }
                    className="ui-input"
                    style={{ minHeight: 34, width: 'auto', padding: '7px 10px' }}
                  >
                    {OFFICIAL_ROUTE_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {ROUTE_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void handleUpdateRouteStatus(route)}
                    disabled={updatingRouteId === route.id}
                    className="ui-btn ui-btn-primary"
                    style={{ padding: '8px 12px' }}
                  >
                    {updatingRouteId === route.id ? '更新中...' : '更新狀態'}
                  </button>
                  <button
                    onClick={() => handleEditRoute(route)}
                    className="ui-btn ui-btn-outline"
                    style={{ padding: '8px 12px' }}
                  >
                    編輯
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderPricingTab = () => (
    <div style={{ display: 'grid', gap: 12 }}>
      {loadingPricing ? (
        <div className="ui-empty-state" style={{ fontSize: 13, padding: 16 }}>{UI_TEXT.loading.pricing}</div>
      ) : (
        <section className="ui-card" style={{ padding: 12, display: 'grid', gap: 10, maxWidth: 760 }}>
          <h3 style={{ margin: 0, color: '#27483f' }}>定價設定</h3>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#556f67' }}>
              計價系統
              <select
                value={pricingForm.activeSystem}
                onChange={(event) =>
                  setPricingForm((prev) => ({
                    ...prev,
                    activeSystem: event.target.value as PricingConfigRecord['activeSystem'],
                  }))
                }
                className="ui-input"
              >
                <option value="distance">distance</option>
                <option value="matrix">matrix</option>
                <option value="fixed-point">fixed-point</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#556f67' }}>
              最低消費
              <input
                type="number"
                value={pricingForm.minSpend}
                onChange={(event) =>
                  setPricingForm((prev) => ({ ...prev, minSpend: parseNumber(event.target.value, 0) }))
                }
                className="ui-input"
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#556f67' }}>
              10-50km 單價
              <input
                type="number"
                value={pricingForm.tier1Rate}
                onChange={(event) =>
                  setPricingForm((prev) => ({ ...prev, tier1Rate: parseNumber(event.target.value, 0) }))
                }
                className="ui-input"
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#556f67' }}>
              50-100km 單價
              <input
                type="number"
                value={pricingForm.tier2Rate}
                onChange={(event) =>
                  setPricingForm((prev) => ({ ...prev, tier2Rate: parseNumber(event.target.value, 0) }))
                }
                className="ui-input"
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#556f67' }}>
              100km+ 單價
              <input
                type="number"
                value={pricingForm.tier3Rate}
                onChange={(event) =>
                  setPricingForm((prev) => ({ ...prev, tier3Rate: parseNumber(event.target.value, 0) }))
                }
                className="ui-input"
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#556f67' }}>
              午夜附加費
              <input
                type="number"
                value={pricingForm.midnightSurcharge}
                onChange={(event) =>
                  setPricingForm((prev) => ({
                    ...prev,
                    midnightSurcharge: parseNumber(event.target.value, 0),
                  }))
                }
                className="ui-input"
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#556f67' }}>
              司機平台費比率
              <input
                type="number"
                step={0.01}
                value={pricingForm.driverFeePercentage}
                onChange={(event) =>
                  setPricingForm((prev) => ({
                    ...prev,
                    driverFeePercentage: parseNumber(event.target.value, 0),
                  }))
                }
                className="ui-input"
              />
            </label>
          </div>

          <div style={{ fontSize: 12, color: '#60766f' }}>
            最後更新: {formatDateTime(pricing.updatedAt)}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => void handleSavePricing()}
              disabled={savingPricing}
              className="ui-btn ui-btn-primary"
              style={{ padding: '9px 14px' }}
            >
              {savingPricing ? '保存中...' : '保存設定'}
            </button>
          </div>
        </section>
      )}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7f5' }}>
      <header
        style={{
          padding: '14px 16px 16px',
          borderBottom: '1px solid #dce6dd',
          background: 'linear-gradient(90deg, #273037 0%, #2e453e 48%, #36584e 100%)',
          color: '#f3fff8',
          display: 'grid',
          gap: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', opacity: 0.78, fontWeight: 700 }}>CABS ADMIN CONSOLE</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>後台管理中心 · {currentUser?.name}</div>
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.9 }}>
              一站式管理訂單、用戶、班次與計價策略
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/home')}
              className="ui-btn ui-btn-outline"
              style={{
                borderColor: 'rgba(255,255,255,0.35)',
                background: 'rgba(255,255,255,0.1)',
                color: '#f3fff8',
                padding: '8px 12px',
              }}
            >
              乘客前台
            </button>
            <button
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="ui-btn ui-btn-outline"
              style={{
                borderColor: 'rgba(255,255,255,0.35)',
                background: loggingOut ? 'rgba(255,255,255,0.12)' : '#ffffff',
                color: loggingOut ? '#f3fff8' : '#27483f',
                padding: '8px 12px',
              }}
            >
              {loggingOut ? '登出中...' : '登出'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 12,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.12)',
              padding: '4px 10px',
              fontWeight: 700,
            }}
          >
            待接訂單 {summary.pendingOrders}
          </span>
          <span
            style={{
              fontSize: 12,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.12)',
              padding: '4px 10px',
              fontWeight: 700,
            }}
          >
            今日訂單 {summary.todayOrders}
          </span>
          <span
            style={{
              fontSize: 12,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.12)',
              padding: '4px 10px',
              fontWeight: 700,
            }}
          >
            進行中班次 {summary.activeOfficialRoutes}
          </span>
        </div>

        <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'dashboard', label: '儀表板' },
            { key: 'orders', label: '訂單管理' },
            { key: 'users', label: '用戶管理' },
            { key: 'routes', label: '官方班次' },
            { key: 'pricing', label: '價格設定' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key as AdminTab)}
              className={`ui-btn ui-btn-tab ${activeTab === item.key ? 'active' : ''}`}
              style={{
                border: '1px solid rgba(255,255,255,0.26)',
                borderRadius: 999,
                background: activeTab === item.key ? '#ffffff' : 'rgba(255,255,255,0.08)',
                color: activeTab === item.key ? '#27483f' : '#f0fff8',
                fontSize: 12,
                padding: '7px 12px',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: 16, display: 'grid', gap: 12 }}>
        {notice && (
          <div className={noticeClassByTone(notice.tone)}>
            {notice.text}
          </div>
        )}

        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'orders' && renderOrdersTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'routes' && renderRoutesTab()}
        {activeTab === 'pricing' && renderPricingTab()}
      </main>
    </div>
  )
}
