// Cabs Carpool - CounterOfferModal Component
// v1.0 - Modal for passenger to send counter-offer

import React, { useState } from 'react'

interface CounterOfferModalProps {
  isOpen: boolean
  originalQuote: {
    pricePerSeat: number
    tunnelFee?: number
    freeWaitingMinutes?: number
  }
  onSubmit: (data: {
    pricePerSeat: number
    tunnelFee: number
    freeWaitingMinutes: number
    message: string
  }) => void
  onClose: () => void
}

export default function CounterOfferModal({ isOpen, originalQuote, onSubmit, onClose }: CounterOfferModalProps) {
  const [price, setPrice] = useState('')
  const [tunnelFee, setTunnelFee] = useState('')
  const [freeWaiting, setFreeWaiting] = useState(originalQuote.freeWaitingMinutes || 10)
  const [message, setMessage] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    const priceVal = Number(price)
    if (isNaN(priceVal) || priceVal <= 0) {
      alert('請輸入有效的價格')
      return
    }
    
    onSubmit({
      pricePerSeat: priceVal,
      tunnelFee: Number(tunnelFee) || 0,
      freeWaitingMinutes: freeWaiting,
      message: message.trim() || `還價：HK$ ${priceVal}/位`,
    })
  }

  const totalEstimate = Number(price) + (Number(tunnelFee) || 0)

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          width: '90%',
          maxWidth: 340,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Title */}
        <div style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#4a3728',
          textAlign: 'center',
          marginBottom: 20,
        }}>
          💬 發送還價
        </div>

        {/* Original Quote Reference */}
        <div style={{
          background: '#fff9f5',
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
          border: '1px solid #f0e0d6',
        }}>
          <div style={{ fontSize: 12, color: '#8b7355', marginBottom: 4 }}>
            原始報價
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#e07b4c' }}>
            HK$ {originalQuote.pricePerSeat}/位
          </div>
          {originalQuote.tunnelFee > 0 && (
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              + 隧道費 HK$ {originalQuote.tunnelFee}
            </div>
          )}
        </div>

        {/* Counter Price */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 14, color: '#8b7355', marginBottom: 8, display: 'block' }}>
            你的還價 (每位 HK$)
          </label>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="輸入你的還價"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #f0e0d6',
              borderRadius: 12,
              fontSize: 18,
              fontWeight: 600,
              color: '#4a3728',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Tunnel Fee */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 14, color: '#8b7355', marginBottom: 8, display: 'block' }}>
            隧道費 (每位 HK$)
          </label>
          <input
            type="number"
            value={tunnelFee}
            onChange={e => setTunnelFee(e.target.value)}
            placeholder="0"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #f0e0d6',
              borderRadius: 12,
              fontSize: 16,
              color: '#4a3728',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Total Preview */}
        {price && (
          <div style={{
            background: '#fff9f5',
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4a3728', marginBottom: 4 }}>
              <span>每位價格</span>
              <span>HK$ {price}</span>
            </div>
            {tunnelFee && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4a3728', marginBottom: 4 }}>
                <span>+ 隧道費</span>
                <span>HK$ {tunnelFee}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid #f0e0d6', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: '#e07b4c' }}>
              <span>每位總計</span>
              <span>HK$ {totalEstimate}</span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              background: '#f5f5f5',
              color: '#666',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!price}
            style={{
              flex: 1,
              padding: '12px',
              background: price ? '#e07b4c' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: price ? 'pointer' : 'not-allowed',
            }}
          >
            發送還價
          </button>
        </div>
      </div>
    </div>
  )
}