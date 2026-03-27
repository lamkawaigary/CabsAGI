export const UI_TEXT = {
  loading: {
    orders: '資料載入中，請稍候...',
    users: '資料載入中，請稍候...',
    routes: '資料載入中，請稍候...',
    pricing: '資料載入中，請稍候...',
    messages: '資料載入中，請稍候...',
    driverPool: '資料載入中，請稍候...',
    driverMine: '資料載入中，請稍候...',
  },
  empty: {
    orders: '目前尚無資料。',
    users: '目前尚無符合條件的資料。',
    routes: '目前尚無資料。',
    messages: '目前尚無對話紀錄。',
    driverPool: '目前暫無可接訂單。',
    driverMine: '目前尚無已接訂單。',
  },
  error: {
    fallback: '系統忙碌中，請稍後再試。',
    readOrders: '讀取訂單資料失敗',
    readUsers: '讀取用戶資料失敗',
    readRoutes: '讀取班次資料失敗',
    readPricing: '讀取定價資料失敗',
    readMessages: '讀取訊息資料失敗',
    uploadImage: '圖片上傳失敗',
  },
  success: {
    saved: '已成功保存。',
    updated: '已成功更新。',
    created: '已成功建立。',
    sent: '已成功送出。',
  },
} as const
