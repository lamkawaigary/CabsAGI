import { useEffect, useState } from 'react'
import Messages from './Messages'
import { useAuth } from '../context/AuthContext'
import { subscribeDriverOrders, type OrderRecord } from '../services/orderService'

export default function MessagesPage() {
  const { currentUser } = useAuth()
  const [driverOrders, setDriverOrders] = useState<OrderRecord[]>([])
  
  // Also fetch driver orders if user is a driver
  useEffect(() => {
    if (!currentUser?.id || currentUser.role !== 'driver') return
    
    const unsub = subscribeDriverOrders(currentUser.id, (orders) => {
      setDriverOrders(orders)
    })
    
    return () => unsub()
  }, [currentUser?.id, currentUser?.role])

  // Combine passenger orders and driver orders
  const allOrders = [...(currentUser?.role === 'driver' ? driverOrders : [])]
  
  return <Messages orders={allOrders} />
}
