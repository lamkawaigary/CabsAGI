# Cabs Carpool - 發展藍圖 v1.0
## 跨境商務七人車預訂平台

---

## 📋 項目概覽

### 商業模式
- **平台角色**：被動式資訊與工具提供者
- **目標用戶**：跨境商務旅客（七人車需求）
- **收入模式**：司機月費訂閱（待定）

### 技術堆疊
| 層面 | 技術 |
|------|------|
| 前端 | React 18 + TypeScript + Vite |
| 後端 | Firebase Auth + Firestore |
| 地圖 | Tencent Map SDK |
| 樣式 | Tailwind CSS |
| 托管 | Vercel |
| 域名 | cabs-agi.vercel.app |

### Firebase 項目
- **Project ID**: cabs-agi-a779f
- **Region**: asia-east2 (Hong Kong)

---

## ✅ 已實現功能

### 1. 用戶系統
| 功能 | 狀態 | 說明 |
|------|------|------|
| Email 登入 | ✅ | 密碼登入 |
| Google 登入 | ✅ | OAuth |
| 電話驗證 | ⚠️ | 需要 SMS 整合 |
| 角色選擇 | ✅ | 司機/乘客 |
| 用戶資料 | ✅ | 名稱、電話 |

### 2. 司機功能
| 功能 | 狀態 | 說明 |
|------|------|------|
| 創建行程 | ✅ | 發布路線、時間、價格 |
| 管理行程 | ✅ | 編輯、取消 |
| 瀏覽乘客需求 | ✅ | 查看並聯絡 |
| 審批乘客 | ✅ | 批准/拒絕加入 |
| 開始/完成行程 | ✅ | 狀態升級 |
| 標記乘客未到 | ✅ | 行程中/後 |
| 發送報價 | ✅ | 含隧道費、等候費 |

### 3. 乘客功能
| 功能 | 狀態 | 說明 |
|------|------|------|
| 瀏覽行程 | ✅ | 查看司機行程 |
| 申請加入 | ✅ | 進入審批流程 |
| 主動離開 | ✅ | 行程開始前 |
| 確認乘車 | ✅ | 行程中 |
| 發布需求 | ✅ | 讓司機聯絡 |
| 查看聊天 | ✅ | 聯絡司機 |

### 4. 聊天系統
| 功能 | 狀態 | 說明 |
|------|------|------|
| 聊天室 | ✅ | 行程/需求聊天的中心 |
| 文字訊息 | ✅ | 即時聊天 |
| 圖片發送 | ✅ | 相片分享 |
| 報價功能 | ✅ | 💰 發送/接受報價 |
| 行程狀態卡 | ✅ | 聊天室頂部顯示 |
| 新消息通知 | ✅ | 登入後彈出提示 |

### 5. 行程管理
| 功能 | 狀態 | 說明 |
|------|------|------|
| 狀態流程 | ✅ | OPEN → IN_PROGRESS → COMPLETED |
| 座位追蹤 | ✅ | availableSeats 自動更新 |
| 乘客名單 | ✅ | pending/approved/rejected |
| 未到標記 | ✅ | 司機可以標記 |

### 6. 導航一致性
| 功能 | 狀態 | 說明 |
|------|------|------|
| 統一底部導航 | ✅ | 所有頁面一致 |
| 角色專屬導航 | ✅ | 司機/乘客不同 |
| 當前頁面高亮 | ✅ | 自動識別 |

---

## 🔧 核心服務架構

### Firestore Collections
```
trips              - 行程（司機發布）
tripPassengers     - 乘客記錄（已批准）
intelligence       - 路上情報
intelligenceVotes  - 情報投票
users              - 用戶（含 subscription）
chats              - 對話（已棄用）
chatRooms          - 聊天室
chatMessages       - 聊天訊息
priceQuotes        - 報價
passengerRequests  - 乘客需求
```

### 關鍵 Services
| 服務 | 檔案 | 功能 |
|------|------|------|
| tripService | `/src/services/tripService.ts` | 行程 CRUD、乘客審批 |
| chatService | `/src/services/chatService.ts` | 聊天室、訊息收發 |
| priceQuoteService | `/src/services/priceQuoteService.ts` | 報價管理 |
| requestService | `/src/services/tripService.ts` | 乘客需求 |

---

## 📊 數據模型

### Trip（行程）
```typescript
{
  id: string
  driverId: string
  driverName: string
  route: {
    pickup: { placeName, latitude, longitude }
    dropoff: { placeName, latitude, longitude }
  }
  departureTime: string
  totalSeats: number
  availableSeats: number
  pricePerSeat: number
  status: 'OPEN' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'
  passengers: [{ oderId, name, phone, confirmed }]
  pendingPassengers: [{ oderId, name, phone, joinedAt }]
  rejectedPassengers: [oderId]
  leftPassengers: [{ oderId, leftAt, reason }]
  noShowPassengers: [{ oderId, markedAt, markedBy }]
  notes?: string
  createdAt: string
  updatedAt: string
}
```

### ChatRoom（聊天室）
```typescript
{
  id: string
  roomType: 'trip' | 'request'
  roomTypeId: string
  participantIds: [string]
  participants: [{ oderId, name, role, phone }]
  topicPickup: string
  topicDropoff: string
  departureTime?: string
  status: 'active' | 'closed'
  lastMessage?: string
  lastMessageAt?: string
  driverId?: string
  driverName?: string
  driverPhone?: string
  createdAt: string
  updatedAt: string
}
```

### PriceQuote（報價）
```typescript
{
  id: string
  roomId: string
  oderId: string
  oderName: string
  pricePerSeat: number
  tunnelFee?: number
  waitingTime?: number
  status: 'pending' | 'accepted' | 'rejected'
  acceptedBy?: string
  acceptedByName?: string
  acceptedAt?: string
  createdAt: string
}
```

---

## 🚨 待改善項目

### 🔴 高優先級

#### 1. 電話驗證流程
**問題**：用戶反映電話驗證按鈕被禁用
**原因**：Firebase Phone Auth 需要 SMS 費用
**建議**：
- 考慮使用第三方 SMS 服務（如 Twilio）
- 或改用 Email 驗證代替

#### 2. 即時通知（Push Notification）
**問題**：目前只是輪詢模式（每10秒）
**建議**：
- 整合 Firebase Cloud Messaging (FCM)
- 支持離線推送通知
- 實現真正的即時性

#### 3. 旅程自動過期
**問題**：行程時間到了不會自動關閉
**建議**：
- 使用 Cloud Functions 定時任務
- 或在用戶訪問時檢查並更新過期行程

### 🟡 中優先級

#### 4. 管理員後台
**問題**：Admin Console 需要更新
**建議**：
- 用戶管理（查看/編輯/刪除）
- 行程監控
- 投訴處理

#### 5. 評價系統
**問題**：沒有司機/乘客互評
**建議**：
- 行程完成後雙方可以評價
- 影響信譽度顯示

#### 6. 地點自動完成
**問題**：輸入地點沒有自動填充
**建議**：
- 整合 Tencent Map POI 搜索
- 常用地點收藏

### 🟢 低優先級（可選）

#### 7. 積分系統
**狀態**：保留但暫停收費
**建議**：
- 完成後啟用積分獎勵
- 兌換優惠

#### 8. 行程分享
**建議**：
- 生成行程海報分享到社交媒體
- WhatsApp 分享連結

#### 9. 離線支援
**建議**：
- Service Worker 快取
- 離線時顯示緩存數據

---

## 🎯 短期發展計劃（1-2個月）

### Phase 1: 穩定基礎
1. ✅ 修復電話驗證問題
2. ✅ 實現真正的即時通知
3. ✅ 完成旅程自動過期邏輯

### Phase 2: 用戶體驗
4. 添加地點自動完成
5. 實現評價系統
6. 優化聊天室的 UX

### Phase 3: 商業化
7. 實現司機月費訂閱
8. 設置付款系統
9. 建立優惠券/獎勵機制

---

## 📁 項目結構

```
~/Desktop/CabsAGI/
├── src/
│   ├── components/
│   │   ├── BottomNav.tsx          # 統一底部導航
│   │   ├── NotificationBanner.tsx  # 新消息/報價提示
│   │   └── ...
│   ├── context/
│   │   └── AuthContext.tsx         # 認證上下文
│   ├── pages/
│   │   ├── driver/                 # 司機頁面
│   │   │   ├── DriverHomePage.tsx
│   │   │   ├── DriverTripsPage.tsx
│   │   │   ├── DriverBrowsePage.tsx
│   │   │   └── DriverSettingsPage.tsx
│   │   ├── passenger/              # 乘客頁面
│   │   │   ├── PassengerHomePage.tsx
│   │   │   ├── MyTripsPage.tsx    # 🆕 乘客行程列表
│   │   │   ├── PassengerBrowsePage.tsx
│   │   │   └── PassengerRequestsPage.tsx
│   │   ├── ChatPage.tsx           # 聊天室
│   │   └── ...
│   ├── services/
│   │   ├── tripService.ts         # 行程服務
│   │   ├── chatService.ts         # 聊天服務
│   │   └── priceQuoteService.ts    # 報價服務
│   ├── types/
│   │   └── trip.ts                # 類型定義
│   ├── firebaseConfig.ts          # Firebase 配置
│   └── App.tsx                    # 路由配置
├── firestore.rules                # Firestore 安全規則
├── firebase.json                  # Firebase 配置
└── package.json
```

---

## 🔐 安全規則摘要

```javascript
// chatRooms - 已登入用戶可讀寫
match /chatRooms/{roomId} {
  allow read, write: if request.auth != null;
}

// chatMessages - 已登入用戶可讀寫
match /chatMessages/{messageId} {
  allow read, write: if request.auth != null;
}

// trips - 已登入用戶可讀，司機可寫自己的
match /trips/{tripId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == resource.data.driverId;
}

// priceQuotes - 已登入用戶可讀寫
match /priceQuotes/{quoteId} {
  allow read, write: if request.auth != null;
}
```

---

## 📞 測試帳戶

| 角色 | 郵箱 | 密碼 |
|------|------|------|
| 司機 | Garylkw1842@gmail.com | 28Dec2016 |
| 乘客 | lamkawaigary@gmail.com | lamka123 |

---

## 📝 更新日誌

### 2026-04-26
- ✅ 完成行程狀態管理（OPEN → IN_PROGRESS → COMPLETED）
- ✅ 添加乘客審批流程（requestJoin → approve/reject）
- ✅ 添加司機標記乘客未到功能
- ✅ 添加乘客主動離開功能
- ✅ 創建乘客行程列表頁（/my-trips）
- ✅ 聊天室頂部顯示行程狀態
- ✅ 新消息/報價通知橫幅
- ✅ 統一底部導航組件
- ✅ 修復聊天輸入框被遮擋問題

### 2026-04-25
- ✅ 修復 Firestore Rules 部署問題
- ✅ 聊天室功能恢復正常
- ✅ 實現報價功能

---

*最後更新：2026-04-26*
*版本：v1.0*