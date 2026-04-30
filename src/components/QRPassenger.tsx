// Cabs Carpool - Passenger QR Code Display
// 乘客上車令牌 QR Code 顯示

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { tripService } from '../services/tripService'

interface QRPassengerProps {
  tripId: string
  passengerId: string
  passengerName: string
}

export default function QRPassenger({ tripId, passengerId, passengerName }: QRPassengerProps) {
  const [qrCode, setQrCode] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [trip, setTrip] = useState<any>(null)

  useEffect(() => {
    loadTripAndQR()
  }, [tripId, passengerId])

  const loadTripAndQR = async () => {
    try {
      setLoading(true)
      // Get trip details
      const tripData = await tripService.getById(tripId)
      setTrip(tripData)
      
      // Find passenger in the trip
      const passenger = tripData?.passengers?.find((p: any) => p.passengerId === passengerId)
      
      if (passenger?.qrCode) {
        setQrCode(passenger.qrCode)
      } else {
        // Generate new QR code
        const newQR = await tripService.generateQRCode(tripId, passengerId, passengerName)
        setQrCode(newQR)
      }
    } catch (error) {
      console.error('Error loading QR:', error)
    } finally {
      setLoading(false)
    }
  }

  // Format QR code for display (add dashes)
  const formatQRCode = (code: string) => {
    if (!code) return '------'
    return code.slice(0, 4) + '-' + code.slice(4)
  }

  // QR Code data payload
  const qrPayload = qrCode ? JSON.stringify({
    t: tripId,      // trip ID
    p: passengerId, // passenger ID
    c: qrCode,      // verification code
    v: 1            // version
  }) : ''

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>載入中...</div>
      </div>
    )
  }

  if (!qrCode) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>無法生成 QR Code</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.icon}>🎫</div>
        <div style={styles.title}>你的上車令牌</div>
      </div>
      
      <div style={styles.qrBox}>
        <div style={styles.qrWrapper}>
          <QRCodeSVG 
            value={qrPayload}
            size={180}
            level="M"
            bgColor="#ffffff"
            fgColor="#4a3728"
          />
        </div>
        
        <div style={styles.codeDisplay}>
          {formatQRCode(qrCode)}
        </div>
        
        <div style={styles.codeHint}>
          向司機展示此 QR Code 或讀出驗證碼
        </div>
      </div>
      
      {trip && (
        <div style={styles.tripInfo}>
          <div style={styles.tripRoute}>
            📍 {trip.route?.pickup?.placeName || '未知'} → {trip.route?.dropoff?.placeName || '未知'}
          </div>
          <div style={styles.tripTime}>
            🕐 {trip.departureTime || '時間待定'}
          </div>
          <div style={styles.status}>
            {trip.status === 'OPEN' && <span style={styles.statusRecruiting}>🟢 招募中</span>}
            {trip.status === 'CONFIRMED' && <span style={styles.statusConfirmed}>🟡 已確認</span>}
            {trip.status === 'IN_PROGRESS' && <span style={styles.statusProgress}>🔵 行程中</span>}
          </div>
        </div>
      )}
      
      <div style={styles.footer}>
        狀態：
        {trip?.passengers?.find((p: any) => p.passengerId === passengerId)?.onboarded 
          ? <span style={styles.onboarded}> 🚗 已上車</span>
          : <span style={styles.pending}> ⏳ 等待上車</span>
        }
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    textAlign: 'center' as const,
  },
  header: {
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#4a3728',
  },
  qrBox: {
    background: '#f8f8f8',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  qrWrapper: {
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    display: 'inline-block',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  codeDisplay: {
    fontSize: 28,
    fontWeight: 700,
    fontFamily: 'monospace',
    color: '#4a3728',
    letterSpacing: 4,
    marginTop: 16,
    padding: '12px 20px',
    background: '#fff',
    borderRadius: 8,
    border: '2px solid #e07b4c',
  },
  codeHint: {
    fontSize: 12,
    color: '#8b7355',
    marginTop: 12,
  },
  tripInfo: {
    background: '#fff9f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tripRoute: {
    fontSize: 14,
    color: '#4a3728',
    fontWeight: 500,
    marginBottom: 8,
  },
  tripTime: {
    fontSize: 13,
    color: '#8b7355',
    marginBottom: 8,
  },
  status: {
    fontSize: 14,
    fontWeight: 600,
  },
  statusRecruiting: {
    color: '#4caf50',
  },
  statusConfirmed: {
    color: '#ff9800',
  },
  statusProgress: {
    color: '#2196f3',
  },
  footer: {
    fontSize: 13,
    color: '#8b7355',
  },
  onboarded: {
    color: '#4caf50',
    fontWeight: 600,
  },
  pending: {
    color: '#ff9800',
    fontWeight: 600,
  },
  loading: {
    padding: 40,
    color: '#8b7355',
  },
  error: {
    padding: 40,
    color: '#f44336',
  },
}