import { useNavigate } from 'react-router-dom'
import Messages from './Messages'
import { useAuth } from '../context/AuthContext'
import { useDriverOrders } from '../hooks/useDriverOrders'

export default function DriverMessagesPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { orders, loading, error } = useDriverOrders()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #edf4f2 0%, #f6f8f6 45%, #f3f6f4 100%)',
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          borderBottom: '1px solid #dce6dd',
          background: 'linear-gradient(95deg, rgba(47,61,79,0.95) 0%, rgba(53,95,106,0.95) 48%, rgba(45,122,102,0.95) 100%)',
          color: '#f3fff8',
          padding: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', opacity: 0.8, fontWeight: 700 }}>
            CABS DRIVER
          </div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>司機訊息中心 · {currentUser?.name}</div>
        </div>
        <button
          onClick={() => navigate('/driver')}
          style={{
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.12)',
            color: '#f3fff8',
            fontWeight: 800,
            padding: '8px 12px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          返回接單中心
        </button>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: 12, display: 'grid', gap: 10 }}>
        {(loading || error) && (
          <div
            style={{
              borderRadius: 10,
              padding: '10px 12px',
              border: error ? '1px solid #edc2bb' : '1px solid #d8e2da',
              background: error ? '#fff0ec' : '#f5f8f5',
              color: error ? '#9c3d31' : '#2c5a4f',
              fontSize: 13,
            }}
          >
            {error || '同步司機訂單中...'}
          </div>
        )}
        <Messages orders={orders} />
      </main>
    </div>
  )
}
