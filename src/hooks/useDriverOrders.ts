import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { subscribeDriverOrders, type OrderRecord } from '../services/orderService'

interface DriverOrdersState {
  orders: OrderRecord[]
  loading: boolean
  error: string | null
}

export function useDriverOrders(): DriverOrdersState {
  const { currentUser } = useAuth()
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    if (!currentUser?.id) {
      queueMicrotask(() => {
        if (!active) return
        setOrders([])
        setLoading(false)
        setError(null)
      })
      return () => {
        active = false
      }
    }

    queueMicrotask(() => {
      if (!active) return
      setLoading(true)
      setError(null)
    })

    const unsub = subscribeDriverOrders(
      currentUser.id,
      (nextOrders) => {
        if (!active) return
        setOrders(nextOrders)
        setLoading(false)
      },
      (nextError) => {
        if (!active) return
        setError(nextError.message || '讀取司機訂單失敗')
        setLoading(false)
      },
    )

    return () => {
      active = false
      unsub()
    }
  }, [currentUser?.id])

  return { orders, loading, error }
}
