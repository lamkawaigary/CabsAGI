// Cabs Carpool - Card Component
// 統一路程卡片樣式

import { colors, shadows, radius } from '../../styles/designSystem'

interface CardProps {
  children: React.ReactNode
  padding?: string
  onClick?: () => void
  style?: React.CSSProperties
}

export default function Card({ children, padding = '16px', onClick, style }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: colors.cardBg,
        borderRadius: radius.md,
        padding,
        boxShadow: shadows.sm,
        ...(onClick ? { cursor: 'pointer' } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  )
}