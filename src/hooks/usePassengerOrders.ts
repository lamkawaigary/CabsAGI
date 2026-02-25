import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { subscribePassengerOrders, type OrderRecord } from '../services/orderService'

interface PassengerOrdersState {
  orders: OrderRecord[]
  loading: boolean
  error: string | null
}

export function usePassengerOrders(): PassengerOrdersState {
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

    const unsub = subscribePassengerOrders(
      currentUser.id,
      (nextOrders) => {
        if (!active) return
        setOrders(nextOrders)
        setLoading(false)
      },
      (nextError) => {
        if (!active) return
        setError(nextError.message || '讀取訂單失敗')
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
