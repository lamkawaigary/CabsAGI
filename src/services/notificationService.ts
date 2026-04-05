// Notification Service for Driver App
// Note: Firebase Messaging needs to be configured separately

export const notificationService = {
  // 請求通知權限
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  },

  // 發送本地通知 (不透過 FCM)
  showLocalNotification(title: string, body: string, data?: Record<string, string>): void {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/icon.png',
        tag: data?.type || 'local'
      })
      
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    }
  },

  // 司機相關通知
  driver: {
    // 新訂單通知
    newBooking(shiftId: string, routeName: string, passengerCount: number): void {
      notificationService.showLocalNotification(
        '🚗 新訂單!',
        `${routeName} - ${passengerCount}位乘客`,
        { type: 'new_booking', shiftId }
      )
    },

    // 乘客已確認
    passengerConfirmed(shiftId: string, passengerName: string): void {
      notificationService.showLocalNotification(
        '✅ 乘客已確認',
        `${passengerName} 已確認乘車`,
        { type: 'passenger_confirmed', shiftId }
      )
    },

    // 行程開始提醒
    tripStarting(shiftId: string, routeName: string): void {
      notificationService.showLocalNotification(
        '⏰ 行程即將開始',
        `路線: ${routeName}`,
        { type: 'trip_starting', shiftId }
      )
    },

    // 佣金已扣減
    commissionDeducted(amount: number, newBalance: number): void {
      notificationService.showLocalNotification(
        '💰 佣金已扣減',
        `扣減 ${amount} points，餘額: ${newBalance}`,
        { type: 'commission_deducted' }
      )
    },

    // 餘額不足警告
    lowBalance(requiredAmount: number): void {
      notificationService.showLocalNotification(
        '⚠️ 餘額不足',
        `需要 ${requiredAmount} points 完成行程，請聯繫平台充值`,
        { type: 'low_balance' }
      )
    }
  }
}

export default notificationService
