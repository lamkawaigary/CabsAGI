// Cabs Carpool - Trips Page v2.0
// Redesigned to match PassengerHome style + Fixed to show all trips

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tripService, requestService } from '../services/tripService'
import { useAuth } from '../context/AuthContext'
import { chatService } from '../services/chatService'
import { colors, radius } from '../styles/designSystem'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import BottomNav from '../components/BottomNav'

// ============ TAGS ============
const getTagIcon = (tag: string) => {
  switch (tag) {
    case '演唱會': return '🎵'
    case '迪士尼': return '🏰'
    case '機場': return '✈️'
    case '口岸': return '🚪'
    case '商務': return '💼'
    case '婚禮': return '💒'
    case '體育賽事': return '⚽'
    default: return '🏷️'
  }
}

export default function TripsPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [trips, setTrips] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'all' | 'my'>('all')

  useEffect(() => {
    if (currentUser) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [currentUser])

  const loadData = async () => {
    try {
      setLoading(true)
      
      if (currentUser?.role === 'driver') {
        // 司機：載入自己的行程
        const myTrips = await tripService.getByDriver(currentUser.id)
        setTrips(myTrips || [])
        setRequests([])
      } else {
        // 乘客：載入已加入的行程和需求
        const [myTrips, myRequests] = await Promise.all([
          tripService.getByPassenger(currentUser?.id || ''),
          requestService.getByPassenger(currentUser?.id || '')
        ])
        setTrips(myTrips || [])
        setRequests(myRequests || [])
      }
    } catch (error) {
      console.error('Error loading trips:', error)
    } finally {
      setLoading(false)
    }
  }

  const isDriver = currentUser?.role === 'driver'

  const getPickup = (item: any) => {
    if (item.route?.pickup?.placeName) return item.route.pickup.placeName
    if (item.pickup?.placeName) return item.pickup.placeName
    if (item.pickup) return item.pickup
    return '未知'
  }

  const getDropoff = (item: any) => {
    if (item.route?.dropoff?.placeName) return item.route.dropoff.placeName
    if (item.dropoff?.placeName) return item.dropoff.placeName
    if (item.dropoff) return item.dropoff
    return '未知'
  }

  const formatDate = (iso: string) => {
    if (!iso) return '時間待定'
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'error' }> = {
      'OPEN': { label: '🟢 招募中', variant: 'success' },
      'CONFIRMED': { label: '✅ 已確認', variant: 'info' },
      'IN_PROGRESS': { label: '🔵 進行中', variant: 'info' },
      'COMPLETED': { label: '✅ 已完成', variant: 'success' },
      'CANCELLED': { label: '❌ 已取消', variant: 'error' },
      'EXPIRED': { label: '⏰ 已過期', variant: 'warning' },
    }
    return map[status] || { label: status, variant: 'default' as const }
  }

  const handleEnterChat = async (trip: any) => {
    try {
      // Get or create chat room for this trip
      let roomId = await chatService.getTripRoom(trip.id)
      if (!roomId) {
        roomId = await chatService.createTripChatRoom({
          tripId: trip.id,
          driverId: trip.driverId,
          driverName: trip.driverName,
          driverPhone: trip.driverPhone,
          pickup: getPickup(trip),
          dropoff: getDropoff(trip),
          departureTime: trip.departureTime,
        })
      }
      navigate(`/chat/${roomId}`)
    } catch (error) {
      console.error('Error entering chat:', error)
      navigate(`/chat/${trip.id}`)
    }
  }

  const handleEnterRequestChat = async (req: any) => {
    try {
      const roomId = await chatService.createRequestChatRoom({
        requestId: req.id,
        passengerId: req.passengerId,
        passengerName: req.passengerName,
        passengerPhone: req.passengerPhone,
        pickup: getPickup(req),
        dropoff: getDropoff(req),
        departureDate: req.departureDate,
      })
      navigate(`/chat/${roomId}`)
    } catch (error) {
      console.error('Error entering chat:', error)
      navigate(`/chat/${req.id}`)
    }
  }

  const getPendingCount = (trip: any) => trip.pendingPassengers?.length || 0
  const getPassengerCount = (trip: any) => trip.passengers?.length || 0

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.headerTitle}>
              {isDriver ? '🚗 我的行程' : '📋 我的記錄'}
            </h1>
            <p style={styles.headerSubtitle}>
              {isDriver ? '管理你的行程' : '查看已加入的行程'}
            </p>
          </div>
          <button onClick={() => navigate('/profile')} style={styles.profileBtn}>
            👤
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      {!isDriver && (
        <div style={styles.quickActions}>
          <Button fullWidth onClick={() => navigate('/passenger-home')}>
            🔍 瀏覽新行程
          </Button>
        </div>
      )}

      {isDriver && (
        <div style={styles.quickActions}>
          <Button fullWidth onClick={() => navigate('/create-trip')}>
            🚗 發布新行程
          </Button>
        </div>
      )}

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <Card><p style={styles.center}>載入中...</p></Card>
        ) : isDriver ? (
          // === 司機視圖 ===
          trips.length === 0 ? (
            <Card>
              <p style={styles.center}>
                暫時沒有行程<br />
                <small style={{ color: colors.textSecondary }}>
                  去發布你的第一個行程吧！
                </small>
              </p>
            </Card>
          ) : (
            trips.map(trip => {
              const statusInfo = getStatusBadge(trip.status)
              return (
                <Card key={trip.id} style={{ marginBottom: 12 }}>
                  <div style={styles.cardHeader}>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    <span style={styles.time}>{formatDate(trip.departureTime)}</span>
                  </div>

                  <div style={styles.route}>
                    <div style={styles.routePoint}>
                      <span style={{ ...styles.routeDot, color: colors.success }}>●</span>
                      <span style={styles.placeName}>{getPickup(trip)}</span>
                    </div>
                    <div style={styles.routeLine}>↓</div>
                    <div style={styles.routePoint}>
                      <span style={{ ...styles.routeDot, color: colors.primary }}>●</span>
                      <span style={styles.placeName}>{getDropoff(trip)}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {trip.tags && trip.tags.length > 0 && (
                    <div style={styles.tagRow}>
                      {trip.tags.map((tag: string) => (
                        <span key={tag} style={styles.tag}>
                          {getTagIcon(tag)} {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={styles.tripInfo}>
                    <span>💺 {getPassengerCount(trip)}/{trip.totalSeats} 乘客</span>
                    {getPendingCount(trip) > 0 && (
                      <span style={{ color: colors.warning }}>
                        ⏳ {getPendingCount(trip)} 位待批准
                      </span>
                    )}
                  </div>

                  {trip.notes && <p style={styles.notes}>📝 {trip.notes}</p>}

                  <div style={styles.actionRow}>
                    <Button
                      variant="secondary"
                      onClick={() => handleEnterChat(trip)}
                      style={{ flex: 1 }}
                    >
                      💬 進入聊天
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/edit-trip/${trip.id}`)}
                      style={{ flex: 1 }}
                    >
                      ✏️ 編輯
                    </Button>
                  </div>
                </Card>
              )
            })
          )
        ) : (
          // === 乘客視圖 ===
          <>
            {/* Trips Section */}
            {trips.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={styles.sectionTitle}>🚗 已加入的行程</h3>
                {trips.map(trip => {
                  const statusInfo = getStatusBadge(trip.status)
                  return (
                    <Card key={trip.id} style={{ marginBottom: 12 }}>
                      <div style={styles.cardHeader}>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        <span style={styles.time}>{formatDate(trip.departureTime)}</span>
                      </div>

                      <div style={styles.route}>
                        <div style={styles.routePoint}>
                          <span style={{ ...styles.routeDot, color: colors.success }}>●</span>
                          <span style={styles.placeName}>{getPickup(trip)}</span>
                        </div>
                        <div style={styles.routeLine}>↓</div>
                        <div style={styles.routePoint}>
                          <span style={{ ...styles.routeDot, color: colors.primary }}>●</span>
                          <span style={styles.placeName}>{getDropoff(trip)}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      {trip.tags && trip.tags.length > 0 && (
                        <div style={styles.tagRow}>
                          {trip.tags.map((tag: string) => (
                            <span key={tag} style={styles.tag}>
                              {getTagIcon(tag)} {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div style={styles.tripInfo}>
                        <span>👤 司機：{trip.driverName}</span>
                        <span>💺 {getPassengerCount(trip)}/{trip.totalSeats}</span>
                      </div>

                      <Button
                        fullWidth
                        variant="secondary"
                        onClick={() => handleEnterChat(trip)}
                        style={{ marginTop: 12 }}
                      >
                        💬 進入聊天
                      </Button>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Requests Section */}
            {requests.length > 0 && (
              <div>
                <h3 style={styles.sectionTitle}>📋 我發布的需求</h3>
                {requests.map(req => (
                  <Card key={req.id} style={{ marginBottom: 12 }}>
                    <div style={styles.cardHeader}>
                      <Badge variant={req.status === 'OPEN' ? 'success' : req.status === 'CONFIRMED' ? 'info' : 'error'}>
                        {req.status === 'OPEN' ? '🟢 開放中' : req.status === 'CONFIRMED' ? '✅ 已確認' : '❌ 已取消'}
                      </Badge>
                      <span style={styles.time}>{formatDate(req.departureDate)}</span>
                    </div>

                    <div style={styles.route}>
                      <div style={styles.routePoint}>
                        <span style={{ ...styles.routeDot, color: colors.success }}>●</span>
                        <span style={styles.placeName}>{getPickup(req)}</span>
                      </div>
                      <div style={styles.routeLine}>↓</div>
                      <div style={styles.routePoint}>
                        <span style={{ ...styles.routeDot, color: colors.primary }}>●</span>
                        <span style={styles.placeName}>{getDropoff(req)}</span>
                      </div>
                    </div>

                    {/* Tags */}
                    {req.tags && req.tags.length > 0 && (
                      <div style={styles.tagRow}>
                        {req.tags.map((tag: string) => (
                          <span key={tag} style={styles.tag}>
                            {getTagIcon(tag)} {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={styles.tripInfo}>
                      <span>👤 {req.passengerCount}位乘客</span>
                      {req.interestedDrivers?.length > 0 && (
                        <span>有 {req.interestedDrivers.length} 位司機感興趣</span>
                      )}
                    </div>

                    <Button
                      fullWidth
                      variant="secondary"
                      onClick={() => handleEnterRequestChat(req)}
                      style={{ marginTop: 12 }}
                    >
                      💬 進入聊天
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {trips.length === 0 && requests.length === 0 && (
              <Card>
                <p style={styles.center}>
                  暫時沒有記錄<br />
                  <small style={{ color: colors.textSecondary }}>
                    {isDriver ? '去發布你的第一個行程吧！' : '去瀏覽並加入行程吧！'}
                  </small>
                </p>
              </Card>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: colors.background,
    paddingBottom: 100,
  },
  header: {
    background: colors.white,
    padding: '16px',
    borderBottom: `1px solid ${colors.border}`,
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    margin: '4px 0 0',
    fontSize: 13,
    color: colors.textSecondary,
  },
  profileBtn: {
    padding: '8px 12px',
    background: colors.primaryLight,
    border: 'none',
    borderRadius: radius.sm,
    fontSize: 16,
    cursor: 'pointer',
  },
  quickActions: {
    padding: 16,
    background: colors.white,
  },
  content: {
    padding: 16,
  },
  center: {
    textAlign: 'center' as const,
    padding: 40,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: colors.textPrimary,
    margin: '0 0 12px 0',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  time: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  route: {
    marginBottom: 12,
  },
  routePoint: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  routeDot: {
    fontSize: 10,
  },
  placeName: {
    fontSize: 15,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  routeLine: {
    paddingLeft: 4,
    color: colors.textLight,
    fontSize: 14,
  },
  tripInfo: {
    display: 'flex',
    gap: 12,
    fontSize: 13,
    color: colors.textSecondary,
  },
  notes: {
    fontSize: 13,
    color: colors.textSecondary,
    background: colors.background,
    padding: '8px 12px',
    borderRadius: radius.sm,
    marginTop: 8,
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    fontSize: 12,
    background: colors.primaryLight,
    color: colors.primary,
    padding: '4px 10px',
    borderRadius: radius.full,
    fontWeight: 500,
  },
  actionRow: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
  },
}
