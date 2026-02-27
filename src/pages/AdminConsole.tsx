import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  assignOrderToDriverByAdmin,
  executeAdminPointOperation,
  savePricingConfig,
  subscribeAdminOfficialRoutes,
  subscribeAdminOrders,
  subscribePlatformPointBalance,
  subscribePointLedger,
  subscribeAdminUsers,
  subscribePricingConfig,
  updateAdminOrderStatus,
  updateAdminUser,
  updateOfficialRouteStatus,
  upsertOfficialRoute,
  type AdminUserRecord,
  type PointLedgerRecord,
  type PointOperationType,
  type PricingConfigRecord,
} from '../services/adminService'
import type {
  OfficialRouteRecord,
  OfficialRouteStatus,
  OrderRecord,
  OrderStatus,
} from '../services/orderService'
import {
  markConversationAsRead,
  sendTextMessage,
  subscribeAllMessages,
  SUPPORT_SYSTEM_ID,
  type MessageRecord,
} from '../services/messageService'

type NoticeTone = 'ok' | 'error' | 'info'
type AdminTab = 'dashboard' | 'orders' | 'users' | 'routes' | 'pricing' | 'points' | 'support'

type SupportThreadCategory = 'support' | 'order'

type SupportThread = {
  id: string
  category: SupportThreadCategory
  orderId: string | null
  supportPartnerId?: string
  participantIds: string[]
  title: string
  subtitle: string
  time: string
  unreadForSupport: number
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

const POINT_OPERATION_LABELS: Record<PointOperationType, string> = {
  distribute: '平台發放至用戶',
  reclaim: '由用戶回收到平台',
  mint: '平台增發點數',
  burn: '平台銷毀點數',
}

const POINT_OPERATION_OPTIONS: PointOperationType[] = ['distribute', 'reclaim', 'mint', 'burn']

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

const parseInteger = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.round(parsed))
}

const formatDateTime = (raw: string | undefined) => {
  if (!raw) return '-'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString()
}

const getMessagePreview = (message: MessageRecord) => {
  if (message.type === 'IMAGE') return '📷 圖片'
  if (!message.content) return '(無內容)'
  return message.content
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
  const { currentUser, logout } = useAuth()
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
  const [userStatusDrafts, setUserStatusDrafts] = useState<Record<string, string>>({})
  const [savingUserId, setSavingUserId] = useState<string | null>(null)

  const [routeForm, setRouteForm] = useState<RouteFormState>(EMPTY_ROUTE_FORM)
  const [routeStatusDrafts, setRouteStatusDrafts] = useState<Record<string, OfficialRouteStatus>>({})
  const [savingRoute, setSavingRoute] = useState(false)
  const [updatingRouteId, setUpdatingRouteId] = useState<string | null>(null)

  const [savingPricing, setSavingPricing] = useState(false)

  const [loadingPlatformPoints, setLoadingPlatformPoints] = useState(true)
  const [loadingPointLogs, setLoadingPointLogs] = useState(true)
  const [platformPoints, setPlatformPoints] = useState(0)
  const [pointLogs, setPointLogs] = useState<PointLedgerRecord[]>([])
  const [pointActionType, setPointActionType] = useState<PointOperationType>('distribute')
  const [pointTargetUserId, setPointTargetUserId] = useState('')
  const [pointAmountDraft, setPointAmountDraft] = useState('100')
  const [pointOrderIdDraft, setPointOrderIdDraft] = useState('')
  const [pointNoteDraft, setPointNoteDraft] = useState('')
  const [processingPointAction, setProcessingPointAction] = useState(false)

  const [loadingSupportMessages, setLoadingSupportMessages] = useState(true)
  const [supportMessages, setSupportMessages] = useState<MessageRecord[]>([])
  const [supportFilter, setSupportFilter] = useState<'all' | SupportThreadCategory>('all')
  const [supportSearch, setSupportSearch] = useState('')
  const [activeSupportThreadId, setActiveSupportThreadId] = useState<string | null>(null)
  const [supportReplyDraft, setSupportReplyDraft] = useState('')
  const [supportReplyTargetDrafts, setSupportReplyTargetDrafts] = useState<Record<string, string>>({})
  const [sendingSupportReply, setSendingSupportReply] = useState(false)

  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setLoadingOrders(true)
      setLoadingUsers(true)
      setLoadingRoutes(true)
      setLoadingPricing(true)
      setLoadingPlatformPoints(true)
      setLoadingPointLogs(true)
      setLoadingSupportMessages(true)
    })

    const unsubOrders = subscribeAdminOrders(
      (nextOrders) => {
        setOrders(nextOrders)
        setLoadingOrders(false)
      },
      (error) => {
        setNotice({ text: `讀取訂單失敗: ${error.message}`, tone: 'error' })
        setLoadingOrders(false)
      },
    )
    const unsubUsers = subscribeAdminUsers(
      (nextUsers) => {
        setUsers(nextUsers)
        setLoadingUsers(false)
      },
      (error) => {
        setNotice({ text: `讀取用戶失敗: ${error.message}`, tone: 'error' })
        setLoadingUsers(false)
      },
    )
    const unsubRoutes = subscribeAdminOfficialRoutes(
      (nextRoutes) => {
        setRoutes(nextRoutes)
        setLoadingRoutes(false)
      },
      (error) => {
        setNotice({ text: `讀取官方班次失敗: ${error.message}`, tone: 'error' })
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
        setNotice({ text: `讀取定價設定失敗: ${error.message}`, tone: 'error' })
        setLoadingPricing(false)
      },
    )
    const unsubPlatformPoints = subscribePlatformPointBalance(
      (nextPoints) => {
        setPlatformPoints(nextPoints)
        setLoadingPlatformPoints(false)
      },
      (error) => {
        setNotice({ text: `讀取平台點數失敗: ${error.message}`, tone: 'error' })
        setLoadingPlatformPoints(false)
      },
    )
    const unsubPointLedger = subscribePointLedger(
      (nextLogs) => {
        setPointLogs(nextLogs)
        setLoadingPointLogs(false)
      },
      (error) => {
        setNotice({ text: `讀取點數台帳失敗: ${error.message}`, tone: 'error' })
        setLoadingPointLogs(false)
      },
    )
    const unsubSupportMessages = subscribeAllMessages(
      (rows) => {
        setSupportMessages(rows)
        setLoadingSupportMessages(false)
      },
      (error) => {
        setNotice({ text: `讀取客服訊息失敗: ${error.message}`, tone: 'error' })
        setLoadingSupportMessages(false)
      },
    )

    return () => {
      unsubOrders()
      unsubUsers()
      unsubRoutes()
      unsubPricing()
      unsubPlatformPoints()
      unsubPointLedger()
      unsubSupportMessages()
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
  const pointTargetUsers = useMemo(
    () => users.filter((user) => user.role === 'passenger' || user.role === 'driver'),
    [users],
  )
  const userNameById = useMemo(() => {
    const map = new Map<string, string>()
    users.forEach((user) => {
      map.set(user.id, user.name || user.id)
    })
    return map
  }, [users])

  const supportThreads = useMemo<SupportThread[]>(() => {
    const map = new Map<string, SupportThread>()
    supportMessages.forEach((message) => {
      const timestamp = Number.isNaN(new Date(message.timestamp).getTime())
        ? new Date(0).toISOString()
        : message.timestamp
      const unreadInc = message.receiverId === SUPPORT_SYSTEM_ID && !message.isRead ? 1 : 0
      const preview = getMessagePreview(message)

      if (message.orderId) {
        const key = `order::${message.orderId}`
        const existing = map.get(key)
        const participantSet = new Set<string>(existing?.participantIds || [])
        if (message.senderId && message.senderId !== 'ALL') participantSet.add(message.senderId)
        if (message.receiverId && message.receiverId !== 'ALL') participantSet.add(message.receiverId)
        const participantIds = Array.from(participantSet)
        const participantText = participantIds
          .filter((id) => id !== SUPPORT_SYSTEM_ID)
          .map((id) => userNameById.get(id) || id.slice(0, 8))
          .join(' / ')
        const orderTitle = `訂單 ${message.orderId}`
        const subtitle = participantText ? `${participantText} · ${preview}` : preview

        if (!existing) {
          map.set(key, {
            id: key,
            category: 'order',
            orderId: message.orderId,
            participantIds,
            title: orderTitle,
            subtitle,
            time: timestamp,
            unreadForSupport: unreadInc,
          })
          return
        }

        existing.participantIds = participantIds
        if (new Date(timestamp).getTime() >= new Date(existing.time).getTime()) {
          existing.subtitle = subtitle
          existing.time = timestamp
        }
        existing.unreadForSupport += unreadInc
        return
      }

      const isSupportConversation =
        message.senderId === SUPPORT_SYSTEM_ID || message.receiverId === SUPPORT_SYSTEM_ID
      if (!isSupportConversation) return

      const partnerId =
        message.senderId === SUPPORT_SYSTEM_ID ? message.receiverId : message.senderId
      if (!partnerId || partnerId === SUPPORT_SYSTEM_ID || partnerId === 'ALL') return

      const key = `support::${partnerId}`
      const existing = map.get(key)
      const partnerName = userNameById.get(partnerId) || `用戶 ${partnerId.slice(0, 8)}`
      if (!existing) {
        map.set(key, {
          id: key,
          category: 'support',
          orderId: null,
          supportPartnerId: partnerId,
          participantIds: [partnerId, SUPPORT_SYSTEM_ID],
          title: `${partnerName} · 客服`,
          subtitle: preview,
          time: timestamp,
          unreadForSupport: unreadInc,
        })
        return
      }

      if (new Date(timestamp).getTime() >= new Date(existing.time).getTime()) {
        existing.subtitle = preview
        existing.time = timestamp
      }
      existing.unreadForSupport += unreadInc
    })

    return Array.from(map.values()).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  }, [supportMessages, userNameById])

  const filteredSupportThreads = useMemo(() => {
    const q = supportSearch.trim().toLowerCase()
    return supportThreads.filter((thread) => {
      if (supportFilter !== 'all' && thread.category !== supportFilter) return false
      if (!q) return true
      const searchable = `${thread.title} ${thread.subtitle} ${thread.orderId || ''} ${thread.participantIds.join(' ')} ${thread.id}`.toLowerCase()
      return searchable.includes(q)
    })
  }, [supportThreads, supportFilter, supportSearch])

  const activeSupportThread = useMemo(
    () => supportThreads.find((thread) => thread.id === activeSupportThreadId) || null,
    [supportThreads, activeSupportThreadId],
  )

  const activeSupportMessages = useMemo(() => {
    if (!activeSupportThread) return []

    return supportMessages
      .filter((message) => {
        if (activeSupportThread.category === 'support') {
          const partnerId = activeSupportThread.supportPartnerId
          if (!partnerId) return false
          if (message.orderId) return false
          return (
            (message.senderId === SUPPORT_SYSTEM_ID && message.receiverId === partnerId) ||
            (message.senderId === partnerId && message.receiverId === SUPPORT_SYSTEM_ID)
          )
        }
        return message.orderId === activeSupportThread.orderId
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [activeSupportThread, supportMessages])

  const supportReplyTargets = useMemo(() => {
    if (!activeSupportThread) return []
    if (activeSupportThread.category === 'support') {
      return activeSupportThread.supportPartnerId ? [activeSupportThread.supportPartnerId] : []
    }

    const targetSet = new Set<string>(
      activeSupportThread.participantIds.filter((id) => id && id !== SUPPORT_SYSTEM_ID && id !== 'ALL'),
    )
    activeSupportMessages.forEach((message) => {
      if (message.senderId && message.senderId !== SUPPORT_SYSTEM_ID && message.senderId !== 'ALL') {
        targetSet.add(message.senderId)
      }
      if (message.receiverId && message.receiverId !== SUPPORT_SYSTEM_ID && message.receiverId !== 'ALL') {
        targetSet.add(message.receiverId)
      }
    })
    return Array.from(targetSet)
  }, [activeSupportThread, activeSupportMessages])

  const supportUnreadCount = useMemo(
    () => supportMessages.filter((message) => message.receiverId === SUPPORT_SYSTEM_ID && !message.isRead).length,
    [supportMessages],
  )

  useEffect(() => {
    if (!activeSupportThreadId) return
    const exists = supportThreads.some((thread) => thread.id === activeSupportThreadId)
    if (!exists) {
      setActiveSupportThreadId(null)
      setSupportReplyDraft('')
    }
  }, [activeSupportThreadId, supportThreads])

  useEffect(() => {
    if (!activeSupportThread || supportReplyTargets.length === 0) return
    setSupportReplyTargetDrafts((prev) => {
      if (prev[activeSupportThread.id]) return prev
      return {
        ...prev,
        [activeSupportThread.id]: supportReplyTargets[0],
      }
    })
  }, [activeSupportThread, supportReplyTargets])

  useEffect(() => {
    if (!activeSupportThread) return

    const markThreadAsRead = async () => {
      try {
        if (activeSupportThread.category === 'support' && activeSupportThread.supportPartnerId) {
          await markConversationAsRead({
            currentUserId: SUPPORT_SYSTEM_ID,
            partnerId: activeSupportThread.supportPartnerId,
            orderId: null,
          })
          return
        }

        if (activeSupportThread.category === 'order' && activeSupportThread.orderId) {
          const partners = activeSupportThread.participantIds.filter((id) => id && id !== SUPPORT_SYSTEM_ID)
          await Promise.all(
            partners.map((partnerId) =>
              markConversationAsRead({
                currentUserId: SUPPORT_SYSTEM_ID,
                partnerId,
                orderId: activeSupportThread.orderId,
              }),
            ),
          )
        }
      } catch {
        // non-blocking for admin inbox display
      }
    }

    void markThreadAsRead()
  }, [activeSupportThread])

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
    const status = userStatusDrafts[user.id] || user.status || 'ACTIVE'
    const roleChanged = role !== user.role
    const statusChanged = status !== (user.status || 'ACTIVE')
    if (!roleChanged && !statusChanged) {
      setNotice({ text: '用戶資料未改動', tone: 'info' })
      return
    }

    setSavingUserId(user.id)
    try {
      await updateAdminUser({
        userId: user.id,
        role,
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

  const handleSubmitPointAction = async () => {
    if (!currentUser?.id) {
      setNotice({ text: '尚未登入，無法執行點數操作', tone: 'error' })
      return
    }

    const amount = parseInteger(pointAmountDraft)
    if (amount <= 0) {
      setNotice({ text: '請輸入正整數點數', tone: 'error' })
      return
    }

    const needTargetUser = pointActionType === 'distribute' || pointActionType === 'reclaim'
    if (needTargetUser && !pointTargetUserId) {
      setNotice({ text: '此操作需要指定目標用戶', tone: 'error' })
      return
    }

    setProcessingPointAction(true)
    try {
      await executeAdminPointOperation({
        type: pointActionType,
        amount,
        operatorId: currentUser.id,
        operatorName: currentUser.name || currentUser.id,
        targetUserId: needTargetUser ? pointTargetUserId : undefined,
        orderId: pointOrderIdDraft.trim() || undefined,
        note: pointNoteDraft.trim() || undefined,
      })
      setNotice({ text: `點數操作完成：${POINT_OPERATION_LABELS[pointActionType]}`, tone: 'ok' })
      setPointAmountDraft('100')
      setPointOrderIdDraft('')
      setPointNoteDraft('')
      if (!needTargetUser) setPointTargetUserId('')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知錯誤'
      setNotice({ text: `點數操作失敗: ${message}`, tone: 'error' })
    } finally {
      setProcessingPointAction(false)
    }
  }

  const handleOpenSupportThread = (thread: SupportThread) => {
    setActiveSupportThreadId(thread.id)
    setSupportReplyDraft('')
    if (thread.category === 'support' && thread.supportPartnerId) {
      setSupportReplyTargetDrafts((prev) => ({
        ...prev,
        [thread.id]: thread.supportPartnerId,
      }))
    }
  }

  const handleSendSupportReply = async () => {
    if (!activeSupportThread) {
      setNotice({ text: '請先選擇對話', tone: 'error' })
      return
    }
    if (!supportReplyDraft.trim()) {
      setNotice({ text: '請先輸入訊息內容', tone: 'error' })
      return
    }
    if (!currentUser?.id) {
      setNotice({ text: '尚未登入，無法發送訊息', tone: 'error' })
      return
    }

    const receiverId =
      supportReplyTargetDrafts[activeSupportThread.id] ||
      supportReplyTargets[0] ||
      activeSupportThread.supportPartnerId ||
      ''
    if (!receiverId) {
      setNotice({ text: '此對話沒有可回覆的對象', tone: 'error' })
      return
    }

    setSendingSupportReply(true)
    try {
      await sendTextMessage({
        senderId: SUPPORT_SYSTEM_ID,
        realSenderId: currentUser.id,
        senderName: `客服 ${currentUser.name || currentUser.id}`,
        receiverId,
        content: supportReplyDraft.trim(),
        orderId: activeSupportThread.orderId || undefined,
      })
      setSupportReplyDraft('')
      setNotice({ text: '客服訊息已送出', tone: 'ok' })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知錯誤'
      setNotice({ text: `發送客服訊息失敗: ${message}`, tone: 'error' })
    } finally {
      setSendingSupportReply(false)
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
            style={{
              background: '#fff',
              border: '1px solid #dce6dd',
              borderRadius: 14,
              padding: '12px 14px',
              display: 'grid',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 12, color: '#647a73', fontWeight: 700 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: card.tone }}>{card.value}</div>
          </article>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
        <section style={{ background: '#fff', border: '1px solid #dce6dd', borderRadius: 14, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', color: '#27483f' }}>最新訂單</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id || `${order.passengerId}-${order.createdAt}`}
                style={{
                  border: '1px solid #e3ebe4',
                  borderRadius: 10,
                  padding: '8px 9px',
                  display: 'grid',
                  gap: 4,
                }}
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

        <section style={{ background: '#fff', border: '1px solid #dce6dd', borderRadius: 14, padding: 12 }}>
          <h3 style={{ margin: '0 0 8px', color: '#27483f' }}>最新官方班次</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {routes.slice(0, 5).map((route) => (
              <div
                key={route.id}
                style={{
                  border: '1px solid #e3ebe4',
                  borderRadius: 10,
                  padding: '8px 9px',
                  display: 'grid',
                  gap: 4,
                }}
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
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select
          value={orderFilter}
          onChange={(event) => setOrderFilter(event.target.value as 'all' | OrderStatus)}
          style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '8px 10px', background: '#fff' }}
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
          style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '8px 10px', background: '#fff' }}
        >
          <option value="all">全部類型</option>
          <option value="charter">包車點對點</option>
          <option value="official_route">官方班次</option>
        </select>
      </div>

      {loadingOrders ? (
        <div style={{ fontSize: 13, color: '#6e827c' }}>讀取訂單中...</div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ fontSize: 13, color: '#6e827c' }}>沒有符合條件的訂單</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filteredOrders.map((order) => {
            const draftStatus = order.id ? orderStatusDrafts[order.id] || order.status : order.status
            const orderType = order.orderType || (order.isOfficial ? 'official_route' : 'charter')
            const draftDriverId = order.id ? orderDriverDrafts[order.id] || order.driverId || '' : ''
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ color: '#27483f' }}>{order.id}</strong>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ border: '1px solid #d9e5dc', borderRadius: 999, padding: '2px 8px', fontSize: 11, color: '#31564b', background: '#f2f8f4' }}>
                      {orderType === 'official_route' ? '官方班次' : '包車點對點'}
                    </span>
                    <span style={{ border: '1px solid #d9e5dc', borderRadius: 999, padding: '2px 8px', fontSize: 11, color: '#31564b', background: '#f8fbf9' }}>
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
                    style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '7px 10px', background: '#fff' }}
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
                    style={{
                      border: 0,
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontWeight: 700,
                      background: !order.id || updatingOrderId === order.id ? '#e8e8e4' : '#1f4f43',
                      color: !order.id || updatingOrderId === order.id ? '#8d8a80' : '#effff7',
                      cursor: !order.id || updatingOrderId === order.id ? 'not-allowed' : 'pointer',
                    }}
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
                    style={{
                      border: '1px solid #dce6dd',
                      borderRadius: 10,
                      padding: '7px 10px',
                      background: '#fff',
                    }}
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
                    style={{
                      border: 0,
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontWeight: 700,
                      background:
                        !order.id ||
                        !draftDriverId ||
                        updatingOrderId === order.id ||
                        order.status !== 'pending'
                          ? '#e8e8e4'
                          : '#355f9e',
                      color:
                        !order.id ||
                        !draftDriverId ||
                        updatingOrderId === order.id ||
                        order.status !== 'pending'
                          ? '#8d8a80'
                          : '#f2f7ff',
                      cursor:
                        !order.id ||
                        !draftDriverId ||
                        updatingOrderId === order.id ||
                        order.status !== 'pending'
                          ? 'not-allowed'
                          : 'pointer',
                    }}
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
        style={{
          border: '1px solid #dce6dd',
          borderRadius: 10,
          padding: '9px 10px',
          outline: 'none',
          background: '#fff',
        }}
      />

      {loadingUsers ? (
        <div style={{ fontSize: 13, color: '#6e827c' }}>讀取用戶中...</div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ fontSize: 13, color: '#6e827c' }}>沒有符合條件的用戶</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filteredUsers.map((user) => {
            const roleDraft = userRoleDrafts[user.id] || user.role
            const statusDraft = userStatusDrafts[user.id] || user.status || 'ACTIVE'
            return (
              <article
                key={user.id}
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
                  <strong style={{ color: '#27483f' }}>{user.name || '未命名用戶'}</strong>
                  <span style={{ fontSize: 11, color: '#6a8179' }}>{user.id}</span>
                </div>
                <div style={{ fontSize: 12, color: '#526d64' }}>
                  {user.phone || '(無電話)'} · {user.email || '(無 email)'}
                </div>
                <div style={{ fontSize: 12, color: '#6a8179' }}>
                  建立時間: {formatDateTime(user.createdAt)}
                </div>
                <div style={{ fontSize: 12, color: '#5c726b' }}>
                  目前點數: <strong>{user.points}</strong>（請到「點數中心」操作）
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
                    style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '7px 10px', background: '#fff' }}
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
                    style={{
                      border: '1px solid #dce6dd',
                      borderRadius: 10,
                      padding: '7px 10px',
                      background: '#fff',
                    }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="BANNED">BANNED</option>
                  </select>
                  <button
                    onClick={() => void handleSaveUser(user)}
                    disabled={savingUserId === user.id}
                    style={{
                      border: 0,
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontWeight: 700,
                      background: savingUserId === user.id ? '#e8e8e4' : '#1f4f43',
                      color: savingUserId === user.id ? '#8d8a80' : '#effff7',
                      cursor: savingUserId === user.id ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {savingUserId === user.id ? '保存中...' : '保存'}
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
        style={{
          background: '#fff',
          border: '1px solid #dce6dd',
          borderRadius: 14,
          padding: 12,
          display: 'grid',
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0, color: '#27483f' }}>
          {routeForm.id ? '編輯官方班次' : '新增官方班次'}
        </h3>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))' }}>
          <input
            value={routeForm.pickup}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, pickup: event.target.value }))}
            placeholder="上車地點"
            style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
          />
          <input
            value={routeForm.dropoff}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, dropoff: event.target.value }))}
            placeholder="目的地"
            style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
          />
          <input
            type="datetime-local"
            value={routeForm.date}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, date: event.target.value }))}
            style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
          />
          <select
            value={routeForm.status}
            onChange={(event) =>
              setRouteForm((prev) => ({ ...prev, status: event.target.value as OfficialRouteStatus }))
            }
            style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
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
            style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
          />
          <input
            value={routeForm.pickupLng}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, pickupLng: event.target.value }))}
            placeholder="上車經度"
            style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
          />
          <input
            value={routeForm.dropoffLat}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, dropoffLat: event.target.value }))}
            placeholder="下車緯度"
            style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
          />
          <input
            value={routeForm.dropoffLng}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, dropoffLng: event.target.value }))}
            placeholder="下車經度"
            style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
          />
          <input
            type="number"
            min={1}
            value={routeForm.totalSeats}
            onChange={(event) => setRouteForm((prev) => ({ ...prev, totalSeats: event.target.value }))}
            placeholder="總座位"
            style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
          />
          <input
            type="number"
            min={0}
            value={routeForm.pricePerSeat}
            onChange={(event) =>
              setRouteForm((prev) => ({ ...prev, pricePerSeat: event.target.value }))
            }
            placeholder="每位價格"
            style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
          />
          <input
            type="number"
            min={0}
            value={routeForm.charterPrice}
            onChange={(event) =>
              setRouteForm((prev) => ({ ...prev, charterPrice: event.target.value }))
            }
            placeholder="整車價格"
            style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => void handleSubmitRouteForm()}
            disabled={savingRoute}
            style={{
              border: 0,
              borderRadius: 10,
              padding: '9px 14px',
              fontWeight: 700,
              background: savingRoute ? '#e8e8e4' : '#1f4f43',
              color: savingRoute ? '#8d8a80' : '#effff7',
              cursor: savingRoute ? 'not-allowed' : 'pointer',
            }}
          >
            {savingRoute ? '保存中...' : routeForm.id ? '更新班次' : '建立班次'}
          </button>
          <button
            onClick={handleResetRouteForm}
            style={{
              border: '1px solid #dce6dd',
              borderRadius: 10,
              padding: '9px 14px',
              fontWeight: 700,
              background: '#fff',
              color: '#2d5449',
              cursor: 'pointer',
            }}
          >
            清空
          </button>
        </div>
      </section>

      {loadingRoutes ? (
        <div style={{ fontSize: 13, color: '#6e827c' }}>讀取官方班次中...</div>
      ) : routes.length === 0 ? (
        <div style={{ fontSize: 13, color: '#6e827c' }}>尚未建立官方班次</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {routes.map((route) => {
            const draftStatus = routeStatusDrafts[route.id] || route.status
            const availableSeats = Math.max(0, route.totalSeats - route.occupiedSeats)
            return (
              <article
                key={route.id}
                style={{
                  background: '#fff',
                  border: '1px solid #dce6dd',
                  borderRadius: 14,
                  padding: 12,
                  display: 'grid',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ color: '#27483f' }}>{route.id}</strong>
                  <span style={{ border: '1px solid #d9e5dc', borderRadius: 999, padding: '2px 8px', fontSize: 11, color: '#31564b', background: '#f8fbf9' }}>
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
                    style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '7px 10px', background: '#fff' }}
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
                    style={{
                      border: 0,
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontWeight: 700,
                      background: updatingRouteId === route.id ? '#e8e8e4' : '#1f4f43',
                      color: updatingRouteId === route.id ? '#8d8a80' : '#effff7',
                      cursor: updatingRouteId === route.id ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {updatingRouteId === route.id ? '更新中...' : '更新狀態'}
                  </button>
                  <button
                    onClick={() => handleEditRoute(route)}
                    style={{
                      border: '1px solid #dce6dd',
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontWeight: 700,
                      background: '#fff',
                      color: '#2d5449',
                      cursor: 'pointer',
                    }}
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
        <div style={{ fontSize: 13, color: '#6e827c' }}>讀取定價設定中...</div>
      ) : (
        <section
          style={{
            background: '#fff',
            border: '1px solid #dce6dd',
            borderRadius: 14,
            padding: 12,
            display: 'grid',
            gap: 10,
            maxWidth: 760,
          }}
        >
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
                style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', background: '#fff' }}
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
                style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
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
                style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
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
                style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
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
                style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
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
                style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
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
                style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
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
              style={{
                border: 0,
                borderRadius: 10,
                padding: '9px 14px',
                fontWeight: 700,
                background: savingPricing ? '#e8e8e4' : '#1f4f43',
                color: savingPricing ? '#8d8a80' : '#effff7',
                cursor: savingPricing ? 'not-allowed' : 'pointer',
              }}
            >
              {savingPricing ? '保存中...' : '保存設定'}
            </button>
          </div>
        </section>
      )}
    </div>
  )

  const renderPointsTab = () => {
    const requiresTargetUser = pointActionType === 'distribute' || pointActionType === 'reclaim'
    const totalUserPoints = users.reduce((sum, user) => sum + Number(user.points || 0), 0)

    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
          <article
            style={{
              background: '#fff',
              border: '1px solid #dce6dd',
              borderRadius: 14,
              padding: '12px 14px',
              display: 'grid',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 12, color: '#647a73', fontWeight: 700 }}>平台點數池</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#355f9e' }}>
              {loadingPlatformPoints ? '...' : platformPoints}
            </div>
          </article>
          <article
            style={{
              background: '#fff',
              border: '1px solid #dce6dd',
              borderRadius: 14,
              padding: '12px 14px',
              display: 'grid',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 12, color: '#647a73', fontWeight: 700 }}>用戶總點數</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1f7a68' }}>{totalUserPoints}</div>
          </article>
          <article
            style={{
              background: '#fff',
              border: '1px solid #dce6dd',
              borderRadius: 14,
              padding: '12px 14px',
              display: 'grid',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 12, color: '#647a73', fontWeight: 700 }}>台帳筆數</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#8942FE' }}>
              {loadingPointLogs ? '...' : pointLogs.length}
            </div>
          </article>
        </div>

        <section
          style={{
            background: '#fff',
            border: '1px solid #dce6dd',
            borderRadius: 14,
            padding: 12,
            display: 'grid',
            gap: 10,
          }}
        >
          <h3 style={{ margin: 0, color: '#27483f' }}>中央點數操作台</h3>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#556f67' }}>
              操作類型
              <select
                value={pointActionType}
                onChange={(event) => setPointActionType(event.target.value as PointOperationType)}
                style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', background: '#fff' }}
              >
                {POINT_OPERATION_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {POINT_OPERATION_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#556f67' }}>
              目標用戶（發放/回收必填）
              <select
                value={pointTargetUserId}
                onChange={(event) => setPointTargetUserId(event.target.value)}
                disabled={!requiresTargetUser}
                style={{
                  border: '1px solid #dce6dd',
                  borderRadius: 10,
                  padding: '9px 10px',
                  background: !requiresTargetUser ? '#f4f6f5' : '#fff',
                }}
              >
                <option value="">選擇用戶</option>
                {pointTargetUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.id} · {user.id.slice(0, 8)} · 目前 {user.points}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#556f67' }}>
              點數數量
              <input
                type="number"
                min={1}
                value={pointAmountDraft}
                onChange={(event) => setPointAmountDraft(event.target.value)}
                style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#556f67' }}>
              關聯訂單（可選）
              <input
                value={pointOrderIdDraft}
                onChange={(event) => setPointOrderIdDraft(event.target.value)}
                placeholder="例：order id"
                style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '9px 10px', outline: 'none' }}
              />
            </label>
          </div>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#556f67' }}>
            備註（可選）
            <textarea
              value={pointNoteDraft}
              onChange={(event) => setPointNoteDraft(event.target.value)}
              placeholder="輸入操作原因，方便日後追查"
              rows={2}
              style={{
                border: '1px solid #dce6dd',
                borderRadius: 10,
                padding: '9px 10px',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => void handleSubmitPointAction()}
              disabled={processingPointAction}
              style={{
                border: 0,
                borderRadius: 10,
                padding: '9px 14px',
                fontWeight: 700,
                background: processingPointAction ? '#e8e8e4' : '#1f4f43',
                color: processingPointAction ? '#8d8a80' : '#effff7',
                cursor: processingPointAction ? 'not-allowed' : 'pointer',
              }}
            >
              {processingPointAction ? '處理中...' : '提交點數操作'}
            </button>
          </div>
        </section>

        <section
          style={{
            background: '#fff',
            border: '1px solid #dce6dd',
            borderRadius: 14,
            padding: 12,
            display: 'grid',
            gap: 8,
          }}
        >
          <h3 style={{ margin: 0, color: '#27483f' }}>點數台帳</h3>
          {loadingPointLogs ? (
            <div style={{ fontSize: 13, color: '#6e827c' }}>讀取點數台帳中...</div>
          ) : pointLogs.length === 0 ? (
            <div style={{ fontSize: 13, color: '#6e827c' }}>尚未有任何點數操作記錄</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {pointLogs.slice(0, 120).map((log) => (
                <article
                  key={log.id}
                  style={{
                    border: '1px solid #e2ebe5',
                    borderRadius: 10,
                    padding: '9px 10px',
                    display: 'grid',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#27483f', fontSize: 13 }}>
                      {POINT_OPERATION_LABELS[log.type]} · {log.amount}
                    </strong>
                    <span style={{ fontSize: 11, color: '#6a8179' }}>{formatDateTime(log.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#4f675f' }}>
                    平台: {log.platformBefore} {'->'} {log.platformAfter}
                    {typeof log.userBefore === 'number' && typeof log.userAfter === 'number'
                      ? ` · 用戶: ${log.userBefore} -> ${log.userAfter}`
                      : ''}
                  </div>
                  <div style={{ fontSize: 12, color: '#60766f', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>操作人: {log.operatorName || log.operatorId}</span>
                    {log.targetUserId && (
                      <span>
                        目標: {log.targetUserName || userNameById.get(log.targetUserId) || log.targetUserId}
                      </span>
                    )}
                    {log.orderId && <span>訂單: {log.orderId}</span>}
                  </div>
                  {log.note && <div style={{ fontSize: 12, color: '#5d746d' }}>備註: {log.note}</div>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  const renderSupportTab = () => {
    const activeReplyTarget =
      (activeSupportThread ? supportReplyTargetDrafts[activeSupportThread.id] : '') ||
      supportReplyTargets[0] ||
      activeSupportThread?.supportPartnerId ||
      ''
    const orderRef = activeSupportThread?.orderId
      ? orders.find((order) => order.id === activeSupportThread.orderId)
      : undefined

    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
          <article
            style={{
              background: '#fff',
              border: '1px solid #dce6dd',
              borderRadius: 14,
              padding: '12px 14px',
              display: 'grid',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 12, color: '#647a73', fontWeight: 700 }}>客服未讀訊息</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#b34f44' }}>{supportUnreadCount}</div>
          </article>
          <article
            style={{
              background: '#fff',
              border: '1px solid #dce6dd',
              borderRadius: 14,
              padding: '12px 14px',
              display: 'grid',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 12, color: '#647a73', fontWeight: 700 }}>客服會話數</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#355f9e' }}>
              {supportThreads.filter((thread) => thread.category === 'support').length}
            </div>
          </article>
          <article
            style={{
              background: '#fff',
              border: '1px solid #dce6dd',
              borderRadius: 14,
              padding: '12px 14px',
              display: 'grid',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 12, color: '#647a73', fontWeight: 700 }}>訂單聊天室數</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1f7a68' }}>
              {supportThreads.filter((thread) => thread.category === 'order').length}
            </div>
          </article>
        </div>

        <section
          style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: 'minmax(280px,360px) minmax(0,1fr)',
            alignItems: 'start',
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #dce6dd',
              borderRadius: 14,
              padding: 10,
              display: 'grid',
              gap: 8,
              maxHeight: 680,
              overflow: 'auto',
            }}
          >
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                value={supportSearch}
                onChange={(event) => setSupportSearch(event.target.value)}
                placeholder="搜尋對話 / 用戶 / 訂單"
                style={{
                  border: '1px solid #dce6dd',
                  borderRadius: 10,
                  padding: '9px 10px',
                  outline: 'none',
                  background: '#fff',
                }}
              />
              <select
                value={supportFilter}
                onChange={(event) => setSupportFilter(event.target.value as 'all' | SupportThreadCategory)}
                style={{ border: '1px solid #dce6dd', borderRadius: 10, padding: '8px 10px', background: '#fff' }}
              >
                <option value="all">全部會話</option>
                <option value="support">客服會話</option>
                <option value="order">訂單聊天室</option>
              </select>
            </div>

            {loadingSupportMessages ? (
              <div style={{ fontSize: 13, color: '#6e827c' }}>讀取客服訊息中...</div>
            ) : filteredSupportThreads.length === 0 ? (
              <div style={{ fontSize: 13, color: '#6e827c' }}>目前沒有符合條件的對話</div>
            ) : (
              filteredSupportThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => handleOpenSupportThread(thread)}
                  style={{
                    border: activeSupportThreadId === thread.id ? '1px solid #8db8aa' : '1px solid #dce6dd',
                    background: activeSupportThreadId === thread.id ? '#edf7f2' : '#fff',
                    borderRadius: 10,
                    padding: '9px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <strong style={{ color: '#214239', fontSize: 13 }}>{thread.title}</strong>
                    {thread.unreadForSupport > 0 && (
                      <span
                        style={{
                          minWidth: 20,
                          height: 20,
                          borderRadius: 999,
                          background: '#1f4f43',
                          color: '#fff',
                          fontSize: 11,
                          display: 'grid',
                          placeItems: 'center',
                          padding: '0 5px',
                        }}
                      >
                        {thread.unreadForSupport}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#60766f' }}>
                    {thread.category === 'order' ? '訂單聊天室' : '客服會話'}
                    {thread.orderId ? ` · ${thread.orderId}` : ''}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#5f746d',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {thread.subtitle}
                  </div>
                  <div style={{ fontSize: 11, color: '#8a9a94' }}>{formatDateTime(thread.time)}</div>
                </button>
              ))
            )}
          </div>

          <div
            style={{
              background: '#fff',
              border: '1px solid #dce6dd',
              borderRadius: 14,
              padding: 12,
              minHeight: 560,
              display: 'grid',
              gridTemplateRows: 'auto auto 1fr auto',
              gap: 10,
            }}
          >
            {!activeSupportThread ? (
              <div style={{ fontSize: 13, color: '#6e827c' }}>請先從左側選擇一個會話</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#23493f' }}>
                      {activeSupportThread.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#627a73' }}>
                      類型: {activeSupportThread.category === 'order' ? '訂單聊天室' : '客服會話'}
                      {activeSupportThread.orderId ? ` · 訂單 ${activeSupportThread.orderId}` : ''}
                    </div>
                  </div>
                  {orderRef && (
                    <button
                      onClick={() => setActiveTab('orders')}
                      style={{
                        border: '1px solid #dce6dd',
                        borderRadius: 10,
                        padding: '8px 10px',
                        background: '#fff',
                        color: '#244a3f',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      前往訂單管理
                    </button>
                  )}
                </div>

                {orderRef && (
                  <div
                    style={{
                      border: '1px solid #e4ece6',
                      borderRadius: 10,
                      padding: '8px 10px',
                      background: '#f7faf8',
                      fontSize: 12,
                      color: '#4f675f',
                    }}
                  >
                    {orderRef.pickup} {'->'} {orderRef.dropoff} · {STATUS_LABELS[orderRef.status]} · HK$
                    {orderRef.price}
                  </div>
                )}

                <div style={{ overflow: 'auto', display: 'grid', gap: 8, alignContent: 'start' }}>
                  {activeSupportMessages.length === 0 ? (
                    <div style={{ color: '#6f847d', fontSize: 13 }}>這個會話尚未有訊息</div>
                  ) : (
                    activeSupportMessages.map((message) => {
                      const fromSupport = message.senderId === SUPPORT_SYSTEM_ID
                      const bubbleColor = fromSupport ? '#1f4f43' : '#f3f6f4'
                      const textColor = fromSupport ? '#effff7' : '#2f4e46'
                      const senderLabel = fromSupport
                        ? `客服${
                            message.realSenderId
                              ? ` · ${userNameById.get(message.realSenderId) || message.realSenderId.slice(0, 8)}`
                              : ''
                          }`
                        : userNameById.get(message.senderId) || message.senderName || message.senderId.slice(0, 8)

                      return (
                        <div
                          key={message.id}
                          style={{
                            justifySelf: fromSupport ? 'end' : 'start',
                            maxWidth: '86%',
                            background: bubbleColor,
                            color: textColor,
                            borderRadius: 12,
                            padding: '8px 10px',
                            fontSize: 13,
                            display: 'grid',
                            gap: 5,
                          }}
                        >
                          <div style={{ fontSize: 11, opacity: 0.75 }}>{senderLabel}</div>
                          {message.type === 'IMAGE' ? (
                            <a
                              href={message.content}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'inherit', textDecoration: 'underline' }}
                            >
                              圖片訊息
                            </a>
                          ) : (
                            <div>{message.content || '(空訊息)'}</div>
                          )}
                          <div style={{ fontSize: 11, opacity: 0.7 }}>{formatDateTime(message.timestamp)}</div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <label style={{ fontSize: 12, color: '#60766f' }}>回覆對象</label>
                    <select
                      value={activeReplyTarget}
                      onChange={(event) => {
                        if (!activeSupportThread) return
                        setSupportReplyTargetDrafts((prev) => ({
                          ...prev,
                          [activeSupportThread.id]: event.target.value,
                        }))
                      }}
                      disabled={supportReplyTargets.length <= 1}
                      style={{
                        border: '1px solid #dce6dd',
                        borderRadius: 10,
                        padding: '8px 10px',
                        background: supportReplyTargets.length <= 1 ? '#f4f6f5' : '#fff',
                      }}
                    >
                      {supportReplyTargets.map((targetId) => (
                        <option key={targetId} value={targetId}>
                          {userNameById.get(targetId) || targetId}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={supportReplyDraft}
                      onChange={(event) => setSupportReplyDraft(event.target.value)}
                      placeholder="輸入客服回覆..."
                      style={{
                        flex: 1,
                        border: '1px solid #d6dfd6',
                        borderRadius: 10,
                        padding: '10px 12px',
                        outline: 'none',
                        fontSize: 13,
                      }}
                    />
                    <button
                      onClick={() => void handleSendSupportReply()}
                      disabled={!supportReplyDraft.trim() || sendingSupportReply}
                      style={{
                        border: 0,
                        borderRadius: 10,
                        padding: '10px 14px',
                        background:
                          !supportReplyDraft.trim() || sendingSupportReply ? '#e8e8e4' : '#1f4f43',
                        color:
                          !supportReplyDraft.trim() || sendingSupportReply ? '#8d8a80' : '#effff7',
                        fontWeight: 700,
                        cursor:
                          !supportReplyDraft.trim() || sendingSupportReply ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {sendingSupportReply ? '發送中...' : '送出客服回覆'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7f5' }}>
      <header
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #dce6dd',
          background: 'linear-gradient(90deg, #273037 0%, #2e453e 48%, #36584e 100%)',
          color: '#f3fff8',
          display: 'grid',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', opacity: 0.78, fontWeight: 700 }}>CABS ADMIN CONSOLE</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>後台管理中心 · {currentUser?.name}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate('/home')}
              style={{
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.1)',
                color: '#f3fff8',
                fontWeight: 700,
                padding: '8px 12px',
                cursor: 'pointer',
              }}
            >
              乘客前台
            </button>
            <button
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              style={{
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 10,
                background: loggingOut ? 'rgba(255,255,255,0.12)' : '#ffffff',
                color: loggingOut ? '#f3fff8' : '#27483f',
                fontWeight: 700,
                padding: '8px 12px',
                cursor: loggingOut ? 'not-allowed' : 'pointer',
              }}
            >
              {loggingOut ? '登出中...' : '登出'}
            </button>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'dashboard', label: '儀表板' },
            { key: 'orders', label: '訂單管理' },
            { key: 'users', label: '用戶管理' },
            { key: 'routes', label: '官方班次' },
            { key: 'pricing', label: '價格設定' },
            { key: 'points', label: '點數中心' },
            { key: 'support', label: '客服中心' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key as AdminTab)}
              style={{
                border: '1px solid rgba(255,255,255,0.26)',
                borderRadius: 999,
                background: activeTab === item.key ? '#ffffff' : 'rgba(255,255,255,0.08)',
                color: activeTab === item.key ? '#27483f' : '#f0fff8',
                fontWeight: 800,
                fontSize: 12,
                padding: '7px 12px',
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: 16, display: 'grid', gap: 12 }}>
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

        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'orders' && renderOrdersTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'routes' && renderRoutesTab()}
        {activeTab === 'pricing' && renderPricingTab()}
        {activeTab === 'points' && renderPointsTab()}
        {activeTab === 'support' && renderSupportTab()}
      </main>
    </div>
  )
}
