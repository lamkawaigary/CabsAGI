import { useState, useEffect } from 'react'
import { pointsService, formatPoints, type PointsTransaction } from '../services/pointsService'

interface PointsWalletProps {
  userId: string
  userRole: 'driver' | 'passenger'
  compact?: boolean
}

export default function PointsWallet({ userId, userRole, compact = false }: PointsWalletProps) {
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [balanceData, txns] = await Promise.all([
        pointsService.getBalance(userId),
        pointsService.getTransactions(userId, 5)
      ])
      setBalance(balanceData)
      setTransactions(txns)
    } catch (error) {
      console.error('Failed to load points:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'driver': return '司機'
      case 'passenger': return '乘客'
      default: return role
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'DRIVER_TOPUP': return '💰 充值'
      case 'COMMISSION': return '💸 佣金'
      case 'PASSENGER_BONUS': return '🎁 獎勵'
      case 'PASSENGER_COMPENSATION': return '🎯 賠償'
      case 'DRIVER_REFUND': return '↩️ 退款'
      default: return type
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
        載入中...
      </div>
    )
  }

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: userRole === 'driver' ? '#fff3e0' : '#e3f2fd',
        borderRadius: 10,
        border: `1px solid ${userRole === 'driver' ? '#ffb74d' : '#90caf9'}`
      }}>
        <span style={{ fontSize: 18 }}>💎</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: userRole === 'driver' ? '#e65100' : '#1565c0' }}>
          {formatPoints(balance)}
        </span>
        <span style={{ fontSize: 12, color: '#666' }}>pts</span>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Wallet Header */}
      <div style={styles.walletCard}>
        <div style={styles.walletHeader}>
          <div>
            <div style={styles.walletLabel}>
              {userRole === 'driver' ? '🚗 司機錢包' : '👤 乘客錢包'}
            </div>
            <div style={styles.walletRole}>{getRoleLabel(userRole)}帳戶</div>
          </div>
          <div style={styles.walletIcon}>💎</div>
        </div>
        <div style={styles.balanceSection}>
          <div style={styles.balanceLabel}>可用點數</div>
          <div style={styles.balanceValue}>{formatPoints(balance)}</div>
          <div style={styles.balanceUnit}>points</div>
        </div>
        <button onClick={() => setShowHistory(!showHistory)} style={styles.historyToggle}>
          {showHistory ? '▲ 隱藏記錄' : '▼ 查看記錄'}
        </button>
      </div>

      {/* Transaction History */}
      {showHistory && (
        <div style={styles.transactionList}>
          <div style={styles.transactionHeader}>最近交易記錄</div>
          {transactions.length === 0 ? (
            <div style={styles.empty}>暫無交易記錄</div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} style={styles.transactionItem}>
                <div style={styles.txLeft}>
                  <div style={styles.txType}>{getTypeLabel(tx.type)}</div>
                  <div style={styles.txDesc}>{tx.description}</div>
                  <div style={styles.txDate}>
                    {new Date(tx.createdAt).toLocaleString('zh-HK')}
                  </div>
                </div>
                <div style={{
                  ...styles.txRight,
                  color: tx.amount >= 0 ? '#2e7d32' : '#c62828'
                }}>
                  {tx.amount >= 0 ? '+' : ''}{formatPoints(tx.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'grid',
    gap: 12
  },
  walletCard: {
    background: 'linear-gradient(135deg, #1f4f43 0%, #2e7d5a 100%)',
    borderRadius: 16,
    padding: 20,
    color: '#fff'
  },
  walletHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  walletLabel: {
    fontSize: 14,
    fontWeight: 600,
    opacity: 0.9
  },
  walletRole: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2
  },
  walletIcon: {
    fontSize: 32
  },
  balanceSection: {
    textAlign: 'center',
    padding: '16px 0'
  },
  balanceLabel: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 4
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: 700
  },
  balanceUnit: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 2
  },
  historyToggle: {
    width: '100%',
    padding: '10px',
    border: 'none',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer'
  },
  transactionList: {
    background: '#fff',
    borderRadius: 12,
    padding: 12,
    border: '1px solid #eee'
  },
  transactionHeader: {
    fontSize: 13,
    fontWeight: 600,
    color: '#666',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1px solid #eee'
  },
  empty: {
    padding: 20,
    textAlign: 'center',
    color: '#999',
    fontSize: 13
  },
  transactionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #f5f5f5'
  },
  txLeft: {
    flex: 1
  },
  txType: {
    fontSize: 13,
    fontWeight: 600,
    color: '#333'
  },
  txDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  txDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2
  },
  txRight: {
    fontSize: 15,
    fontWeight: 700
  }
}