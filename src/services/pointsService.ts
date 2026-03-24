import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore'
import { db } from '../firebaseConfig'

// ==================== Types ====================
export type PointsTransactionType = 
  | 'DRIVER_TOPUP'      // 司機充值
  | 'COMMISSION'       // 佣金扣費
  | 'PASSENGER_BONUS'  // 乘客獎勵
  | 'PASSENGER_COMPENSATION'  // 乘客賠償
  | 'DRIVER_REFUND'    // 司機退款

export interface PointsTransaction {
  id?: string
  userId: string
  userRole: 'driver' | 'passenger' | 'admin'
  type: PointsTransactionType
  amount: number // positive = credit, negative = debit
  balanceBefore: number
  balanceAfter: number
  orderId?: string        // related order (optional)
  shiftId?: string        // related shift (optional)
  description: string
  createdAt: string
  createdBy: string       // admin user who performed the action
}

export interface PointsConfig {
  id: string
  commissionRate: number // 0.08 = 8%
  minDriverBalance: number // minimum balance required to complete trips
  createdAt: string
  updatedAt: string
}

// ==================== Constants ====================
const DEFAULT_COMMISSION_RATE = 0.08 // 8%
const DEFAULT_MIN_BALANCE = 0

// ==================== Config Service ====================
const CONFIG_DOC = 'systemConfig/points'

export const pointsConfigService = {
  async get(): Promise<PointsConfig> {
    const docRef = doc(db, CONFIG_DOC)
    const snapshot = await getDoc(docRef)
    
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as PointsConfig
    }
    
    // Create default config if not exists
    const defaultConfig: Omit<PointsConfig, 'id'> = {
      commissionRate: DEFAULT_COMMISSION_RATE,
      minDriverBalance: DEFAULT_MIN_BALANCE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Use setDoc with merge to create the document if it doesn't exist
    await setDoc(docRef, defaultConfig, { merge: true })
    return { id: CONFIG_DOC, ...defaultConfig }
  },

  async update(config: Partial<PointsConfig>): Promise<void> {
    const docRef = doc(db, CONFIG_DOC)
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString()
    }, { merge: true })
  }
}

// ==================== Points Service ====================
export const pointsService = {

  /**
   * Get user's current points balance
   */
  async getBalance(userId: string): Promise<number> {
    const docRef = doc(db, 'users', userId)
    const snapshot = await getDoc(docRef)
    
    if (snapshot.exists()) {
      return snapshot.data().points || 0
    }
    return 0
  },

  /**
   * Add points to a user (for topups, bonuses, compensations)
   */
  async addPoints(params: {
    userId: string
    userRole: 'driver' | 'passenger'
    type: PointsTransactionType
    amount: number
    orderId?: string
    shiftId?: string
    description: string
    createdBy: string // admin user ID
  }): Promise<PointsTransaction> {
    const { userId, userRole, type, amount, orderId, shiftId, description, createdBy } = params
    
    // Get current balance
    const currentBalance = await this.getBalance(userId)
    const newBalance = currentBalance + amount
    
    // Update user's points
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      points: newBalance,
      updatedAt: new Date().toISOString()
    })
    
    // Create transaction record (filter out undefined values)
    const transaction: Omit<PointsTransaction, 'id'> = {
      userId,
      userRole,
      type,
      amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description,
      createdAt: new Date().toISOString(),
      createdBy
    }
    
    // Only add orderId/shiftId if they exist
    if (orderId) transaction.orderId = orderId
    if (shiftId) transaction.shiftId = shiftId
    
    const docRef = await addDoc(collection(db, 'pointsTransactions'), transaction)
    return { id: docRef.id, ...transaction }
  },

  /**
   * Deduct points from a user (for commissions)
   */
  async deductPoints(params: {
    userId: string
    type: PointsTransactionType
    amount: number
    orderId?: string
    shiftId?: string
    description: string
  }): Promise<PointsTransaction | null> {
    const { userId, type, amount, orderId, shiftId, description } = params
    
    // Get current balance
    const currentBalance = await this.getBalance(userId)
    
    // Check if enough balance
    if (currentBalance < amount) {
      console.error(`Insufficient balance: ${currentBalance} < ${amount}`)
      return null
    }
    
    const newBalance = currentBalance - amount
    
    // Update user's points
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, {
      points: newBalance,
      updatedAt: new Date().toISOString()
    })
    
    // Create transaction record
    const transaction: Omit<PointsTransaction, 'id'> = {
      userId,
      userRole: 'driver',
      type,
      amount: -amount, // negative for deduction
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      orderId,
      shiftId,
      description,
      createdAt: new Date().toISOString(),
      createdBy: 'system'
    }
    
    const docRef = await addDoc(collection(db, 'pointsTransactions'), transaction)
    return { id: docRef.id, ...transaction }
  },

  /**
   * Calculate commission for an order
   */
  async calculateCommission(orderPrice: number): Promise<number> {
    const config = await pointsConfigService.get()
    return Math.round(orderPrice * config.commissionRate)
  },

  /**
   * Deduct commission from driver when trip is completed
   */
  async deductCommission(params: {
    driverId: string
    orderId: string
    shiftId: string
    orderPrice: number
  }): Promise<{ success: boolean; commission: number; message: string }> {
    const { driverId, orderId, shiftId, orderPrice } = params
    
    const commission = await this.calculateCommission(orderPrice)
    const currentBalance = await this.getBalance(driverId)
    
    if (currentBalance < commission) {
      return {
        success: false,
        commission,
        message: `餘額不足。需要 ${commission} points，但只有 ${currentBalance} points`
      }
    }
    
    const result = await this.deductPoints({
      userId: driverId,
      type: 'COMMISSION',
      amount: commission,
      orderId,
      shiftId,
      description: `訂單 ${orderId} 佣金 (8%)`
    })
    
    if (result) {
      return {
        success: true,
        commission,
        message: `已扣除佣金 ${commission} points`
      }
    }
    
    return {
      success: false,
      commission,
      message: '扣費失敗'
    }
  },

  /**
   * Get transaction history for a user
   */
  async getTransactions(userId: string, limitCount: number = 20): Promise<PointsTransaction[]> {
    const q = query(
      collection(db, 'pointsTransactions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PointsTransaction[]
  },

  /**
   * Get all transactions (for admin)
   */
  async getAllTransactions(limitCount: number = 50): Promise<PointsTransaction[]> {
    const q = query(
      collection(db, 'pointsTransactions'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PointsTransaction[]
  },

  /**
   * Adjust user's points (admin action)
   */
  async adjustPoints(params: {
    userId: string
    userRole: 'driver' | 'passenger'
    amount: number // can be positive or negative
    description: string
    adminUserId: string
  }): Promise<PointsTransaction> {
    if (params.amount > 0) {
      return this.addPoints({
        userId: params.userId,
        userRole: params.userRole,
        type: params.amount > 0 ? 'DRIVER_TOPUP' : 'DRIVER_REFUND',
        amount: Math.abs(params.amount),
        description: params.description,
        createdBy: params.adminUserId
      })
    } else {
      // For negative amounts, we use deductPoints
      return this.deductPoints({
        userId: params.userId,
        type: 'DRIVER_REFUND',
        amount: Math.abs(params.amount),
        description: params.description
      }) as Promise<PointsTransaction>
    }
  }
}

// ==================== Helper Functions ====================
export const formatPoints = (points: number): string => {
  return points.toLocaleString()
}

export const formatPointsWithLabel = (points: number): string => {
  return `${formatPoints(points)} pts`
}