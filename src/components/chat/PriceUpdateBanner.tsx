// Cabs Carpool - PriceUpdateBanner Component
// v1.0 - Displayed when driver updates price for FIXED mode trips

import React from 'react'

interface PriceUpdateBannerProps {
  oldPrice?: number
  newPrice: number
  updatedBy: string
  updatedAt: string
  onDismiss?: () => void
}

export default function PriceUpdateBanner({ oldPrice, newPrice, updatedBy, updatedAt, onDismiss }: PriceUpdateBannerProps) {
  const priceChanged = oldPrice && oldPrice !== newPrice
  const priceDiff = oldPrice ? newPrice - oldPrice : 0
  const priceUp = priceDiff > 0

  return (
    <div style={{
      background: priceUp ? '#fff3e0' : '#e8f5e8',
      border: `2px solid ${priceUp ? '#e07b4c' : '#4caf50'}`,
      borderRadius: 12,
      padding: '12px 16px',
      margin: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      {/* Icon */}
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: priceUp ? '#e07b4c' : '#4caf50',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        flexShrink: 0,
      }}>
        {priceUp ? '📈' : '📉'}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#4a3728',
          marginBottom: 4,
        }}>
          💰 司機更新了價格
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 16,
        }}>
          {priceChanged && (
            <>
              <span style={{ textDecoration: 'line-through', color: '#999' }}>
                HK$ {oldPrice}
              </span>
              <span style={{ color: '#4a3728' }}>→</span>
            </>
          )}
          <span style={{
            fontWeight: 700,
            color: priceUp ? '#e07b4c' : '#4caf50',
            fontSize: 18,
          }}>
            HK$ {newPrice}/位
          </span>
        </div>
        {priceChanged && (
          <div style={{
            fontSize: 12,
            color: priceUp ? '#e07b4c' : '#4caf50',
            marginTop: 2,
          }}>
            {priceUp ? '↑' : '↓'} HK$ {Math.abs(priceDiff)} 
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.1)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: '#666',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}