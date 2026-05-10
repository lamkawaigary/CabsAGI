// Cabs Carpool - QuoteCard Component
// v1.0 - Quote display for NEGOTIATED and FIXED modes

import React from 'react'

interface QuoteCardProps {
  quote: {
    id: string
    oderId: string
    oderName: string
    oderRole: 'driver' | 'passenger'
    type: 'offer' | 'counter'
    pricePerSeat: number
    tunnelFee?: number
    freeWaitingMinutes?: number
    extraChargePer10Min?: number
    status: 'pending' | 'accepted' | 'rejected' | 'expired'
    createdAt: string
  }
  isMyQuote: boolean
  onAccept?: (quote: any) => void
  onReject?: (quote: any) => void
  onCounter?: (quote: any) => void
  mode: 'NEGOTIATED' | 'FIXED'
}

export default function QuoteCard({ quote, isMyQuote, onAccept, onReject, onCounter, mode }: QuoteCardProps) {
  const { pricePerSeat, tunnelFee = 0, freeWaitingMinutes = 0, extraChargePer10Min = 0, status, oderName, oderRole, type } = quote

  const handleAccept = () => onAccept?.(quote)
  const handleReject = () => onReject?.(quote)
  const handleCounter = () => onCounter?.(quote)

  const getStatusStyle = () => {
    switch (status) {
      case 'accepted':
        return { background: '#e8f5e8', color: '#5a9a5a', borderColor: '#81c784' }
      case 'rejected':
        return { background: '#ffebee', color: '#c62828', borderColor: '#ef9a9a' }
      case 'expired':
        return { background: '#f5f5f5', color: '#999', borderColor: '#e0e0e0' }
      default:
        return { background: '#fff3e0', color: '#e07b4c', borderColor: '#ffcc80' }
    }
  }

  const statusStyle = getStatusStyle()

  return (
    <div style={{
      background: '#fff',
      border: `2px solid ${status === 'pending' ? '#e07b4c' : '#e0e0e0'}`,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      opacity: status === 'expired' ? 0.7 : 1,
    }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{oderRole === 'driver' ? '🚗' : '👤'}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#4a3728' }}>
            {isMyQuote ? '📤 你的' : oderName}
          </span>
          {type === 'counter' && (
            <span style={{
              background: '#fff3e0',
              color: '#e07b4c',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
            }}>
              還價
            </span>
          )}
        </div>
        <span style={{
          ...statusStyle,
          padding: '3px 8px',
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 600,
        }}>
          {status === 'pending' ? '⏳ 待回應' :
           status === 'accepted' ? '✅ 已接受' :
           status === 'rejected' ? '❌ 已拒絕' : '⏰ 已過期'}
        </span>
      </div>

      {/* Price Display */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: '#8b7355' }}>每位</span>
        <span style={{ fontSize: 28, fontWeight: 700, color: '#e07b4c' }}>
          HK$ {pricePerSeat}
        </span>
      </div>

      {/* Extra Fees */}
      {(tunnelFee > 0 || freeWaitingMinutes > 0 || extraChargePer10Min > 0) && (
        <div style={{
          background: '#f9f9f9',
          borderRadius: 8,
          padding: '8px 12px',
          marginBottom: 10,
        }}>
          {tunnelFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666', marginBottom: 2 }}>
              <span>🚇 隧道費</span>
              <span>HK$ {tunnelFee}</span>
            </div>
          )}
          {freeWaitingMinutes > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666', marginBottom: 2 }}>
              <span>⏱️ 免費等候</span>
              <span>{freeWaitingMinutes} 分鐘</span>
            </div>
          )}
          {extraChargePer10Min > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666' }}>
              <span>⏱️ 超時費</span>
              <span>HK$ {extraChargePer10Min}/10分</span>
            </div>
          )}
        </div>
      )}

      {/* Time */}
      <div style={{ fontSize: 11, color: '#8b7355', marginBottom: 10 }}>
        📅 {new Date(quote.createdAt).toLocaleString('zh-HK')}
      </div>

      {/* Action Buttons - only for pending, non-own quotes */}
      {status === 'pending' && !isMyQuote && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handleAccept}
            style={{
              flex: 1,
              minWidth: '80px',
              padding: '10px 14px',
              background: '#e8f5e8',
              color: '#5a9a5a',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✅ 接受
          </button>
          <button
            onClick={handleCounter}
            style={{
              flex: 1,
              minWidth: '80px',
              padding: '10px 14px',
              background: '#fff3e0',
              color: '#e07b4c',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            💬 還價
          </button>
          <button
            onClick={handleReject}
            style={{
              flex: 1,
              minWidth: '80px',
              padding: '10px 14px',
              background: '#ffebee',
              color: '#c62828',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ❌ 拒絕
          </button>
        </div>
      )}

      {/* Accepted Info */}
      {status === 'accepted' && (
        <div style={{ fontSize: 12, color: '#5a9a5a', marginTop: 8 }}>
          ✅ 報價已確認
        </div>
      )}
    </div>
  )
}