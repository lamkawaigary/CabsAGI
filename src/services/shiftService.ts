import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore'
import { db } from '../firebaseConfig'
import type { Route, Shift, Booking } from '../types/shift'

// ==================== Routes ====================

export const routeService = {
  async getAll(): Promise<Route[]> {
    const snapshot = await getDocs(collection(db, 'routes'))
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Route[]
  },

  async getById(id: string): Promise<Route | null> {
    const docRef = doc(db, 'routes', id)
    const snapshot = await getDoc(docRef)
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Route : null
  },

  async create(route: Partial<Route>): Promise<string> {
    const docRef = await addDoc(collection(db, 'routes'), {
      ...route,
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  async update(id: string, data: Partial<Route>): Promise<void> {
    await updateDoc(doc(db, 'routes', id), {
      ...data,
      updatedAt: serverTimestamp()
    })
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'routes', id))
  }
}

// ==================== Shifts ====================

export const shiftService = {
  async getAll(): Promise<Shift[]> {
    const snapshot = await getDocs(collection(db, 'shifts'))
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Shift[]
  },

  async getByRoute(routeId: string, date?: string): Promise<Shift[]> {
    let q = query(collection(db, 'shifts'), where('routeId', '==', routeId))
    if (date) {
      q = query(q, where('date', '==', date))
    }
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Shift[]
  },

  async getById(id: string): Promise<Shift | null> {
    const docRef = doc(db, 'shifts', id)
    const snapshot = await getDoc(docRef)
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Shift : null
  },

  async create(shift: Partial<Shift>): Promise<string> {
    const docRef = await addDoc(collection(db, 'shifts'), {
      ...shift,
      status: 'SCHEDULED',
      visibility: 'public',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  async createDriverShift(params: {
    shift: (Partial<Shift> & Pick<Shift, 'routeId'>)
    driverId: string
    createdBy?: string
  }): Promise<string> {
    if (!params.shift.routeId) {
      throw new Error('routeId is required when creating driver shift')
    }

    const docRef = await addDoc(collection(db, 'shifts'), {
      ...params.shift,
      status: params.shift.status || 'SCHEDULED',
      visibility: params.shift.visibility || 'public',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  async update(id: string, data: Partial<Shift>): Promise<void> {
    await updateDoc(doc(db, 'shifts', id), {
      ...data,
      updatedAt: serverTimestamp()
    })
  },

  async updateStatus(id: string, status: string): Promise<void> {
    await updateDoc(doc(db, 'shifts', id), {
      status,
      updatedAt: serverTimestamp()
    })
  },

  async updateSeats(id: string, seats: number): Promise<void> {
    await updateDoc(doc(db, 'shifts', id), {
      availableSeats: seats,
      updatedAt: serverTimestamp()
    })
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'shifts', id))
  }
}

// ==================== Bookings ====================

export const bookingService = {
  async getAll(): Promise<Booking[]> {
    const snapshot = await getDocs(collection(db, 'bookings'))
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Booking[]
  },

  async getByUser(userId: string): Promise<Booking[]> {
    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', userId)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Booking[]
  },

  async getByShift(shiftId: string): Promise<Booking[]> {
    const q = query(
      collection(db, 'bookings'),
      where('shiftId', '==', shiftId)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Booking[]
  },

  async create(booking: Partial<Booking>): Promise<string> {
    const docRef = await addDoc(collection(db, 'bookings'), {
      ...booking,
      status: 'PENDING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  async update(id: string, data: Partial<Booking>): Promise<void> {
    await updateDoc(doc(db, 'bookings', id), {
      ...data,
      updatedAt: serverTimestamp()
    })
  },

  async confirm(id: string): Promise<void> {
    await updateDoc(doc(db, 'bookings', id), {
      status: 'CONFIRMED',
      updatedAt: serverTimestamp()
    })
  },

  async confirmPayment(id: string, paymentId: string): Promise<void> {
    await updateDoc(doc(db, 'bookings', id), {
      status: 'CONFIRMED',
      paymentId,
      updatedAt: serverTimestamp()
    })
  },

  async cancel(id: string): Promise<void> {
    await updateDoc(doc(db, 'bookings', id), {
      status: 'CANCELLED',
      updatedAt: serverTimestamp()
    })
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'bookings', id))
  }
}
