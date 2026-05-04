// Cabs Carpool - Listing Detail Page
// Placeholder - needs implementation

import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { listingService, type Listing } from '../services/listingService'
import { colors, radius } from '../styles/designSystem'

export default function ListingDetailPage() {
  const { listingId } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (listingId) {
      listingService.getById(listingId).then(l => {
        setListing(l)
        setLoading(false)
      }).catch(() => {
        setLoading(false)
      })
    }
  }, [listingId])

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>載入中...</div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>找不到這個行程</div>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          返回
        </button>
      </div>
    )
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>←</button>
        <h1 style={styles.title}>行程詳情</h1>
        <div style={{ width: 40 }} />
      </header>

      {/* Content */}
      <div style={styles.content}>
        {/* Status */}
        <div style={styles.statusBadge}>
          {listing.status === 'OPEN' && '🟢 開放中'}
          {listing.status === 'SOLD' && '🟠 已成交'}
          {listing.status === 'CANCELLED' && '🔴 已取消'}
        </div>

        {/* Route */}
        <div style={styles.routeCard}>
          <div style={styles.routePoint}>
            <span style={styles.routeDot}>●</span>
            <div>
              <p style={styles.routeLabel}>上車</p>
              <p style={styles.routePlace}>{listing.route.pickup?.placeName}</p>
            </div>
          </div>
          <div style={styles.routeLine} />
          <div style={styles.routePoint}>
            <span style={{...styles.routeDot, color: colors.primary}}>●</span>
            <div>
              <p style={styles.routeLabel}>目的地</p>
              <p style={styles.routePlace}>{listing.route.dropoff?.placeName}</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div style={styles.infoCard}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>🕐 時間</span>
            <span style={styles.infoValue}>{formatTime(listing.departureTime)}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>👥 乘客</span>
            <span style={styles.infoValue}>{listing.passengerCount}位</span>
          </div>
          {listing.price && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>💰 價格</span>
              <span style={styles.infoValue}>HK${listing.price}/位</span>
            </div>
          )}
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>🚗 類型</span>
            <span style={styles.infoValue}>
              {listing.type === 'driver_offer' ? '司機行程' : '乘客需求'}
            </span>
          </div>
        </div>

        {/* Notes */}
        {listing.notes && (
          <div style={styles.notesCard}>
            <p style={styles.notesLabel}>📝 備註</p>
            <p style={styles.notesText}>{listing.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          {listing.status === 'OPEN' && (
            <button style={styles.primaryBtn}>
              加入聊天
            </button>
          )}
          <button style={styles.secondaryBtn} onClick={() => navigate(-1)}>
            返回
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: colors.background,
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    color: colors.textSecondary,
  },
  error: {
    textAlign: 'center',
    padding: 60,
    color: colors.error,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: 24,
    color: colors.primary,
    cursor: 'pointer',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    background: colors.white,
    borderBottom: `1px solid ${colors.border}`,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  content: {
    padding: 18,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '6px 14px',
    background: colors.successBg,
    color: colors.success,
    borderRadius: radius.full,
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 16,
  },
  routeCard: {
    background: colors.white,
    borderRadius: radius.md,
    padding: 18,
    marginBottom: 16,
  },
  routePoint: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeDot: {
    fontSize: 12,
    color: colors.success,
    marginTop: 4,
  },
  routeLabel: {
    margin: 0,
    fontSize: 12,
    color: colors.textSecondary,
  },
  routePlace: {
    margin: '2px 0 0',
    fontSize: 16,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  routeLine: {
    width: 2,
    height: 24,
    background: colors.border,
    marginLeft: 5,
    marginTop: 8,
    marginBottom: 8,
  },
  infoCard: {
    background: colors.white,
    borderRadius: radius.md,
    padding: 18,
    marginBottom: 16,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: `1px solid ${colors.border}`,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  notesCard: {
    background: colors.white,
    borderRadius: radius.md,
    padding: 18,
    marginBottom: 16,
  },
  notesLabel: {
    margin: '0 0 8px',
    fontSize: 13,
    fontWeight: 600,
    color: colors.textSecondary,
  },
  notesText: {
    margin: 0,
    fontSize: 14,
    color: colors.textPrimary,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  primaryBtn: {
    width: '100%',
    padding: 14,
    background: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: radius.sm,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryBtn: {
    width: '100%',
    padding: 14,
    background: colors.white,
    color: colors.textSecondary,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    fontSize: 16,
    cursor: 'pointer',
  },
}