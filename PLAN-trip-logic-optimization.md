# CabsAGI 行程 & 報價邏輯優化計劃書

**版本：** 1.0  
**日期：** 2026-05-09  
**狀態：** 待Gary確認

---

## 🎯 目標

簡化「行程」和「需求」的複雜邏輯，建立清晰的 Trip 定價模型。

---

## 🔄 現有問題分析

### 現況
| 发起人 | 流程 | 問題 |
|--------|------|------|
| 司機發起 Trip | 司機填寫每位價格 → 創建行程 → 乘客加入 | ✅ 定價已確定 |
| 乘客發起 Request | 乘客創建需求 → 等司機加入 → 司機報價 → 乘客接受 | ⚠️ 報價流程分散 |

### 核心問題
1. **命名混淆**：Trip / Request / Listing 多個概念
2. **資料庫結構複雜**：trips / requests / listings / priceQuotes 多個 collection
3. **報價時機不清**：乘客不知道什麼時候該報價
4. **房間類型切換混亂**：request_room → trip_room 的轉換邏輯

---

## 📐 新的邏輯模型

### 統一 Trip 概念

所有出行都叫 **Trip**，但有不同的**定價模式**：

```
Trip
├── pricingMode: "FIXED" | "NEGOTIATED"
├── initiatorRole: "driver" | "passenger"
└── status: "OPEN" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED"
```

### 兩種場景

#### 場景 A：司機主動發車（司機 = 發起人）
```
司機創建 Trip
├── 填寫：路線、時間、座位、每位價格（已確定）
└── → 聊天室已存在，司機為主

乘客瀏覽 → 加入 Trip → 直接顯示價格
乘客可以加入（需司機批准）
```

#### 場景 B：乘客主動搵車（乘客 = 發起人）
```
乘客創建 Trip（等待司機報價）
├── 填寫：路線、時間、乘客人數
├── pricingMode: NEGOTIATED
└── → 聊天室已存在，乘客為主

司機加入聊天室 → 向乘客報價
乘客接受報價 → Trip 確認（價格锁定）
```

---

## 🗄️ 新的 Firestore 結構

### Collection: `trips`

```typescript
interface Trip {
  id: string
  
  // 基本資訊
  pricingMode: 'FIXED' | 'NEGOTIATED'  // 固定報價 or 協商報價
  initiatorRole: 'driver' | 'passenger'  // 誰發起的
  initiatorId: string
  initiatorName: string
  initiatorPhone: string
  
  // 路線
  route: {
    pickup: Location
    dropoff: Location
  }
  
  // 時間
  departureTime: string  // ISO timestamp
  
  // 車輛
  vehicleType: 'sedan' | '7seater'
  totalSeats: number
  
  // 定價
  pricePerSeat?: number        // FIXED 模式時必填
  confirmedPrice?: number      // 協商後確定的價格
  tunnelFee?: number           // 隧道費（可選）
  
  // 參與者
  driver: {
    id: string
    name: string
    phone: string
    confirmed: boolean
  }
  
  passengers: {
    id: string
    name: string
    phone: string
    confirmed: boolean
    onboarded: boolean
    joinedAt: string
  }[]
  
  // 報價記錄（協商模式）
  quotes: {
    quoteId: string
    driverId: string
    driverName: string
    pricePerSeat: number
    tunnelFee: number
    status: 'pending' | 'accepted' | 'rejected' | 'expired'
    createdAt: string
    respondedAt?: string
    respondedBy?: string
  }[]
  
  // 狀態
  status: 'OPEN' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  
  // 標籤
  tags?: string[]
  
  // 時間戳
  createdAt: string
  updatedAt: string
}
```

### Collection: `chatRooms`（簡化）

```typescript
interface ChatRoom {
  id: string
  tripId: string           // 唯一關聯到 Trip
  roomType: 'trip'        // 統一為 trip
  participants: {
    id: string
    name: string
    role: 'driver' | 'passenger'
    phone: string
  }[]
  status: 'active' | 'closed'
  createdAt: string
  updatedAt: string
  lastMessage?: string
  lastMessageAt?: string
  lastMessageBy?: string
}
```

### Collection: `chatMessages`（保持不變）

```typescript
interface ChatMessage {
  id: string
  conversationId: string   // chatRoom.id
  senderId: string
  senderName: string
  senderRole: 'driver' | 'passenger'
  content: string
  messageType: 'text' | 'image' | 'location' | 'system' | 'price_offer' | 'price_confirmed'
  quoteData?: {
    pricePerSeat: number
    tunnelFee: number
    status: 'pending' | 'accepted' | 'rejected'
  }
  readBy: string[]
  createdAt: string
}
```

---

## 📱 UI 修改計劃

### 優先級 1：核心流程修改

| 頁面 | 修改內容 | 優先級 |
|------|---------|--------|
| `CreateTripPage.tsx` | 重新命名為「發車」頁，分離 FIXED/NEGOTIATED 模式 | 🔴 高 |
| `CreateRequestPage.tsx` | 整合到 Trip 流程，不再獨立 | 🔴 高 |
| `ChatPage.tsx` | 簡化報價 UI，新增報價卡片顯示 | 🔴 高 |
| `PassengerHomePage.tsx` | 統一瀏覽司機發佈的行程 | 🟡 中 |
| `DriverHomePage.tsx` | 顯示自己發佈的行程 + 收到的需求 | 🟡 中 |

### 優先級 2：服務層修改

| 服務 | 修改內容 | 優先級 |
|------|---------|--------|
| `tripService.ts` | 統一 create/update/join 邏輯 | 🔴 高 |
| `chatService.ts` | 簡化為單一 roomType | 🔴 高 |
| `priceQuoteService.ts` | 整合到 Trip 內的 quotes 陣列 | 🟡 中 |

### 優先級 3：類型定義

| 檔案 | 修改內容 | 優先級 |
|------|---------|--------|
| `types/trip.ts` | 重新定義 Trip 結構 | 🔴 高 |
| `types/chat.ts` | 簡化 ChatRoom | 🟡 中 |

---

## 🔧 修改順序（建議）

```
Step 1: 定義類型
├── types/trip.ts - 新的 Trip 介面
└── types/chat.ts - 簡化的 ChatRoom

Step 2: 修改服務層
├── tripService.ts - 統一 CRUD
├── chatService.ts - 簡化 room 邏輯
└── 移除獨立的 priceQuoteService（整合進 Trip）

Step 3: 修改 UI 頁面
├── CreateTripPage.tsx - 新邏輯
├── ChatPage.tsx - 報價流程
├── DriverHomePage.tsx
└── PassengerHomePage.tsx

Step 4: 測試驗證
└── Firebase 測試
```

---

## 🗑️ 待清除的 Collection

```
Firebase Firestore 需清除：
- trips (舊結構)
- requests  
- listings
- chatRooms
- chatMessages
- priceQuotes

建議：先 export 備份再清除
```

---

## 📝 備註

- 新的 Mockup 將單獨展示在 `design-trip-logic-mockup.html`
- 所有歷史數據需清除後重新開始
- 考慮是否需要 Migration Script

---

**下一步：** 確認後開始製作 Mockup UI