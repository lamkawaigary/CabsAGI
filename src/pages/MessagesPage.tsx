import Messages from './Messages'
import { usePassengerOrders } from '../hooks/usePassengerOrders'

export default function MessagesPage() {
  const { orders } = usePassengerOrders()
  return <Messages orders={orders} />
}
