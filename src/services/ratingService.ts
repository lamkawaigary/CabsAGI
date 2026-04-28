// Cabs Carpool - Rating Service
// 評價服務

import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy
} from 'firebase/firestore'
import { db } from '../firebaseConfig'

const RATINGS_COLLECTION = 'ratings'

export interface Rating {
  id: string
  tripId: string
  roomId: string
  fromUserId: string
  fromUserName: string
  toUserId: string
  toUserName: string
  rating: number  // 1-5
  comment?: string
  role: 'driver' | 'passenger'
  createdAt: string
}

export const ratingService = {
  /**
   * 發送評價
   */
  async submitRating(data: {
    tripId: string
    roomId: string
    fromUserId: string
    fromUserName: string
    toUserId: string
    toUserName: string
    rating: number
    comment?: string
    role: 'driver' | 'passenger'
  }): Promise<string> {
    const docRef = await addDoc(collection(db, RATINGS_COLLECTION), {
      ...data,
      createdAt: new Date().toISOString(),
    })
    return docRef.id
  },

  /**
   * 獲取用戶收到的評價
   */
  async getUserRatings(userId: string): Promise<Rating[]> {
    try {
      const q = query(
        collection(db, RATINGS_COLLECTION),
        where('toUserId', '==', userId),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rating))
    } catch (e) {
      console.error('Error getting user ratings:', e)
      return []
    }
  },

  /**
   * 獲取行程的評價
   */
  async getTripRatings(tripId: string): Promise<Rating[]> {
    try {
      const q = query(
        collection(db, RATINGS_COLLECTION),
        where('tripId', '==', tripId)
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rating))
    } catch (e) {
      console.error('Error getting trip ratings:', e)
      return []
    }
  },

  /**
   * 檢查用戶是否已評價過某行程
   */
  async hasRated(tripId: string, userId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, RATINGS_COLLECTION),
        where('tripId', '==', tripId),
        where('fromUserId', '==', userId)
      )
      const snapshot = await getDocs(q)
      return !snapshot.empty
    } catch (e) {
      console.error('Error checking rating:', e)
      return false
    }
  },

  /**
   * 獲取用戶的平均評分
   */
  async getUserAverageRating(userId: string): Promise<number> {
    const ratings = await this.getUserRatings(userId)
    if (ratings.length === 0) return 0
    
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
    return Math.round((sum / ratings.length) * 10) / 10  // 保留1位小數
  },

  /**
   * 獲取用戶評價數量
   */
  async getUserRatingCount(userId: string): Promise<number> {
    const ratings = await this.getUserRatings(userId)
    return ratings.length
  }
}

export default ratingService