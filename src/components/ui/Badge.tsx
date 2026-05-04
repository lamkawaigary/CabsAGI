// Cabs Carpool - Badge Component
// 狀態標籤樣式

import { colors, radius } from '../../styles/designSystem'
import type { TripStatus } from '../../types/trip'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  style?: React.CSSProperties
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string }> = {
  success: { bg: colors.successBg, color: colors.success },
  warning: { bg: colors.warningBg, color: colors.warning },
  error: { bg: colors.errorBg, color: colors.error },
  info: { bg: colors.infoBg, color: colors.info },
  default: { bg: colors.primaryLight, color: colors.primary },
}

// 取得Trip狀態對應的Badge
export function getStatusBadge(status: TripStatus): { label: string; variant: BadgeVariant } {
  const configs: Record<TripStatus, { label: string; variant: BadgeVariant }> = {
    'OPEN': { label: '🟢 招募中', variant: 'success' },
    'CONFIRMED': { label: '✅ 已確認', variant: 'info' },
    'IN_PROGRESS': { label: '🔵 行程中', variant: 'info' },
    'COMPLETED': { label: '✅ 已完成', variant: 'default' },
    'CANCELLED': { label: '❌ 已取消', variant: 'error' },
    'EXPIRED': { label: '⏰ 已過期', variant: 'warning' },
  }
  return configs[status] || { label: status, variant: 'default' }
}

export default function Badge({ children, variant = 'default', style }: BadgeProps) {
  const { bg, color } = variantStyles[variant]
  return (
    <span
      style={{
        background: bg,
        color,
        padding: '4px 10px',
        borderRadius: radius.full,
        fontSize: 12,
        fontWeight: 600,
        display: 'inline-block',
        ...style,
      }}
    >
      {children}
    </span>
  )
}