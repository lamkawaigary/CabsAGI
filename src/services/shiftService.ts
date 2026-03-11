import { db } from '../firebaseConfig'
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import type { Route, RouteType, Shift, ShiftStatus, Booking, Vehicle } from '../types/shift'

const routesCollection = collection(db, 'routes')
const shiftsCollection = collection(db, 'shifts')
const bookingsCollection = collection(db, 'bookings')
const vehiclesCollection = collection(db, 'vehicles')

// ==================== Routes ====================

export const routeService = {
  async getAll(type?: RouteType): Promise<Route[]> {
    let q = query(routesCollection, where('status', '==', 'ACTIVE'))
    if (type) {
      q = query(q, where('type', '==', type))
    }
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Route))
  },

  async getById(id: string): Promise<Route | null> {
    const docRef = doc(routesCollection, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as Route
  },

  async create(route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Timestamp.now().toMillis().toString()
    const docRef = await addDoc(routesCollection, {
      ...route,
      createdAt: now,
      updatedAt: now
    })
    return docRef.id
  },

  async update(id: string, data: Partial<Route>): Promise<void> {
    const docRef = doc(routesCollection, id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now().toMillis().toString()
    })
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(routesCollection, id))
  }
}

// ==================== Shifts ====================

export const shiftService = {
  async getByRoute(routeId: string, date?: string): Promise<Shift[]> {
    let q = query(
      shiftsCollection, 
      where('routeId', '==', routeId),
      where('status', 'in', ['SCHEDULED', 'OPEN']),
      orderBy('departureTime', 'asc')
    )
    
    const snapshot = await getDocs(q)
    let shifts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Shift))
    
    // Filter by date if provided
    if (date) {
      const targetDate = new Date(date)
      shifts = shifts.filter(s => {
        const shiftDate = new Date(parseInt(s.departureTime))
        return shiftDate.toDateString() === targetDate.toDateString()
      })
    }
    
    return shifts
  },

  async getById(id: string): Promise<Shift | null> {
    const snapshot = await getDoc(doc(shiftsCollection, id))
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as Shift
  },

  async create(shift: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Timestamp.now().toMillis().toString()
    const docRef = await addDoc(shiftsCollection, {
      ...shift,
      createdAt: now,
      updatedAt: now
    })
    return docRef.id
  },

  async update(id: string, data: Partial<Shift>): Promise<void> {
    await updateDoc(doc(shiftsCollection, id), {
      ...data,
      updatedAt: Timestamp.now().toMillis().toString()
    })
  },

  async updateStatus(id: string, status: ShiftStatus): Promise<void> {
    await this.update(id, { status })
  },

  async updateSeats(id: string, availableSeats: number): Promise<void> {
    await this.update(id, { availableSeats })
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(shiftsCollection, id))
  }
}

// ==================== Bookings ====================

export const bookingService = {
  async getByUser(userId: string): Promise<Booking[]> {
    const q = query(
      bookingsCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booking))
  },

  async getByShift(shiftId: string): Promise<Booking[]> {
    const q = query(
      bookingsCollection,
      where('shiftId', '==', shiftId),
      where('status', 'in', ['PENDING', 'CONFIRMED'])
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booking))
  },

  async getById(id: string): Promise<Booking | null> {
    const snapshot = await getDoc(doc(bookingsCollection, id))
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as Booking
  },

  async create(booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'qrCode' | 'status' | 'paymentStatus'>): Promise<string> {
    const now = Timestamp.now().toMillis().toString()
    const qrCode = `CABS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    
    const docRef = await addDoc(bookingsCollection, {
      ...booking,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      qrCode,
      createdAt: now,
      updatedAt: now
    })
    return docRef.id
  },

  async update(id: string, data: Partial<Booking>): Promise<void> {
    await updateDoc(doc(bookingsCollection, id), {
      ...data,
      updatedAt: Timestamp.now().toMillis().toString()
    })
  },

  async confirmPayment(id: string, paymentId: string): Promise<void> {
    await this.update(id, {
      paymentStatus: 'PAID',
      paymentId,
      status: 'CONFIRMED'
    })
  },

  async cancel(id: string): Promise<void> {
    await this.update(id, { status: 'CANCELLED' })
  },

  async checkIn(id: string): Promise<void> {
    await this.update(id, { status: 'COMPLETED' })
  }
}

// ==================== Vehicles ====================

export const vehicleService = {
  async getAll(): Promise<Vehicle[]> {
    const q = query(vehiclesCollection, where('status', '==', 'ACTIVE'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle))
  },

  async getById(id: string): Promise<Vehicle | null> {
    const snapshot = await getDoc(doc(vehiclesCollection, id))
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() } as Vehicle
  },

  async create(vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Timestamp.now().toMillis().toString()
    const docRef = await addDoc(vehiclesCollection, {
      ...vehicle,
      createdAt: now,
      updatedAt: now
    })
    return docRef.id
  },

  async update(id: string, data: Partial<Vehicle>): Promise<void> {
    await updateDoc(doc(vehiclesCollection, id), {
      ...data,
      updatedAt: Timestamp.now().toMillis().toString()
    })
  }
}
