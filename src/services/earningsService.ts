import { pointsService } from './pointsService'

export interface EarningsRecord {
  id: string
  driverId: string
  shiftId: string
  routeName: string
  date: string
  passengerCount: number
  tripPrice: number
  commission: number
  netEarnings: number
  status: 'completed' | 'pending'
}

export interface EarningsSummary {
  todayEarnings: number
  todayTrips: number
  todayCommission: number
  weekEarnings: number
  weekTrips: number
  weekCommission: number
  totalEarnings: number
  totalTrips: number
  totalCommission: number
}

export const earningsService = {
  // 獲取司機收入記錄
  async getDriverEarnings(driverId: string): Promise<EarningsRecord[]> {
    try {
      const transactions = await pointsService.getAllTransactions(500)
      
      // 過濾出司機相關的交易 (佣金扣減)
      const commissionRecords = transactions.filter(
        t => t.userId === driverId && 
             (t.type === 'COMMISSION' || t.type === 'DRIVER_TOPUP')
      )

      // 轉換為收入記錄
      const records: EarningsRecord[] = []
      
      for (const tx of commissionRecords) {
        if (tx.shiftId) {
          records.push({
            id: tx.id,
            driverId: tx.userId,
            shiftId: tx.shiftId,
            routeName: tx.description || '行程',
            date: tx.createdAt,
            passengerCount: 0,
            tripPrice: Math.abs(tx.amount) || 0,
            commission: Math.abs(tx.amount),
            netEarnings: 0,
            status: 'completed'
          })
        }
      }

      return records.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    } catch (error) {
      console.error('Error getting driver earnings:', error)
      return []
    }
  },

  // 計算收入摘要
  async getEarningsSummary(driverId: string): Promise<EarningsSummary> {
    try {
      const transactions = await pointsService.getAllTransactions(500)
      
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // 過濾司機佣金記錄
      const driverTx = transactions.filter(
        t => t.userId === driverId && t.type === 'COMMISSION'
      )

      // 計算各時期
      const todayTx = driverTx.filter(t => t.createdAt >= todayStart)
      const weekTx = driverTx.filter(t => t.createdAt >= weekStart)

      return {
        todayEarnings: todayTx.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        todayTrips: todayTx.length,
        todayCommission: todayTx.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        weekEarnings: weekTx.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        weekTrips: weekTx.length,
        weekCommission: weekTx.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        totalEarnings: driverTx.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        totalTrips: driverTx.length,
        totalCommission: driverTx.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      }
    } catch (error) {
      console.error('Error calculating earnings summary:', error)
      return {
        todayEarnings: 0,
        todayTrips: 0,
        todayCommission: 0,
        weekEarnings: 0,
        weekTrips: 0,
        weekCommission: 0,
        totalEarnings: 0,
        totalTrips: 0,
        totalCommission: 0
      }
    }
  },

  // 獲取收入走勢 (過去 N 天)
  async getEarningsTrend(driverId: string, days: number = 7): Promise<{date: string, earnings: number, trips: number}[]> {
    try {
      const transactions = await pointsService.getAllTransactions(500)
      
      const driverTx = transactions.filter(
        t => t.userId === driverId && t.type === 'COMMISSION'
      )

      // 按日期分組
      const dateMap = new Map<string, {earnings: number, trips: number}>()
      
      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0]
        dateMap.set(date, { earnings: 0, trips: 0 })
      }

      driverTx.forEach(tx => {
        const date = tx.createdAt.split('T')[0]
        if (dateMap.has(date)) {
          const entry = dateMap.get(date)!
          entry.earnings += Math.abs(tx.amount)
          entry.trips += 1
        }
      })

      return Array.from(dateMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))
    } catch (error) {
      console.error('Error getting earnings trend:', error)
      return []
    }
  }
}

export default earningsService
