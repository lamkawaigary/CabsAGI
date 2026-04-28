# Trip Flow 行程流程全面審視計劃書

## 🎯 目標

從零開始審視整個行程生命週期，確保：
1. 行程狀態跳轉清晰明確
2. 數據在各模組間正確傳遞
3. 沒有數據遺漏或狀態不一致

---

## 📋 現有流程分析

### 現有兩套系統

| 系統 | 觸發點 | 當前問題 |
|------|--------|----------|
| **Trip 系統** | 司機創建行程 | 乘客需要「申請加入」|
| **Request 系統** | 乘客發需求 | 司機「報價」，乘客「接受」後**沒有創建 Trip** |

### 核心問題

**Request 接受報價後應該創建 Trip，但數據流斷了！**

```
PassengerRequest ──→ Driver Quote ──→ Passenger Accepts ──→ ❌ 沒有後續！
                                                    ↓
                                              應該創建 Trip
```

---

## 🔄 行程生命週期

### 完整流程圖

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PASSENGER FLOW (乘客流程)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. 發佈需求                                                       │
│     PassengerHome → CreateRequestPage                              │
│     → 創建 PassengerRequest 文檔                                    │
│     → 自動創建聊天室 (roomType='request')                            │
│                                                                     │
│  2. 等待司機報價                                                    │
│     ChatPage                                                        │
│     → 查看 Quotes                                                   │
│     → 接受 / 拒絕 司機報價                                          │
│                                                                     │
│  3. 接受報價後 🔥                                                    │
│     → priceQuoteService.accept()                                    │
│     → ⚠️ 應該創建 Trip                                             │
│     → 更新聊天室 roomType='trip', roomTypeId=tripId                  │
│     → 雙方可在「我的行程」看到                                        │
│                                                                     │
│  4. 行程管理                                                        │
│     MyTripsPage                                                    │
│     → 查看行程狀態                                                   │
│     → QR Code 上車令牌                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      DRIVER FLOW (司機流程)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. 創建行程 OR 回應需求                                             │
│     a) 主動發佈行程：CreateTripPage                                  │
│        → 創建 Trip 文檔                                              │
│        → 自動創建聊天室 (roomType='trip')                            │
│                                                                     │
│     b) 回應乘客需求：BrowseRequests → 發送報價                       │
│        → priceQuoteService.createOrUpdate()                         │
│        → 報價寫入 priceQuotes                                       │
│                                                                     │
│  2. 報價後等待乘客接受                                               │
│     ChatPage                                                        │
│     → 等待乘客確認                                                   │
│                                                                     │
│  3. 乘客接受後 🔥                                                    │
│     → Trip 已由乘客端的 accept() 創建                                │
│     → 司機可在「我的行程」看到                                        │
│                                                                     │
│  4. 行程管理                                                        │
│     DriverTripsPage                                                │
│     → 查看待批准乘客                                                │
│     → 批准/拒絕乘客                                                 │
│     → 開始/完成行程                                                  │
│     → QR 掃描上車                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 需要審視的代碼模組

### 1. Request 相關

| 檔案 | 功能 | 審視重點 |
|------|------|----------|
| `PassengerHome.tsx` | 發佈需求 | 確保 Request 正確創建 |
| `CreateRequestPage.tsx` | 創建需求頁面 | 確保數據完整 |
| `tripService.ts` | getByPassenger (Request版) | 確保可以查詢 |

### 2. Quote 相關

| 檔案 | 功能 | 審視重點 |
|------|------|----------|
| `priceQuoteService.ts` | 報價服務 | accept() 是否正確創建 Trip |
| `ChatPage.tsx` | 聊天頁面 | handleAcceptQuote 是否正確調用 |

### 3. Trip 相關

| 檔案 | 功能 | 審視重點 |
|------|------|----------|
| `tripService.ts` | 行程服務 | getByPassenger (Trip版) |
| `MyTripsPage.tsx` | 乘客行程頁 | 顯示邏輯是否正確 |
| `DriverTripsPage.tsx` | 司機行程頁 | 顯示邏輯是否正確 |

### 4. Chat 相關

| 檔案 | 功能 | 審視重點 |
|------|------|----------|
| `chatService.ts` | 聊天室服務 | 確保房間正確創建 |
| `ChatPage.tsx` | 聊天頁面 | 確保 Quote 流程正確 |

---

## 📊 數據結構審視清單

### PassengerRequest
```typescript
{
  id: string
  passengerId: string
  pickup: Location
  dropoff: Location
  departureDate: string
  status: RequestStatus  // OPEN | CONFIRMED | CANCELLED
  // ...
}
```

### PriceQuote
```typescript
{
  id: string
  roomId: string
  oderId: string
  oderName: string
  type: 'offer' | 'counter'
  pricePerSeat: number
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  tripId?: string  // ✅ 接受後應該有這個
  // ...
}
```

### Trip
```typescript
{
  id: string
  driverId: string
  driverName: string
  route: { pickup, dropoff }
  departureTime: string
  status: TripStatus  // OPEN | CONFIRMED | IN_PROGRESS | COMPLETED
  passengers: [{ oderId, name, phone, confirmed, onboarded }]
  pendingPassengers: [{ oderId, name, phone }]
  // ...
}
```

### ChatRoom
```typescript
{
  id: string
  roomType: 'trip' | 'request'  // ✅ 接受後應改為 'trip'
  roomTypeId: string  // ✅ 接受後應改為 tripId
  participants: [{ oderId, name, role, phone }]
  // ...
}
```

---

## 🔧 修復清單

### P0 - 緊急修復

- [ ] `priceQuoteService.accept()` 確保完全創建 Trip
- [ ] 確認 Quote 有 `tripId` 欄位
- [ ] 確認 ChatRoom 有正確的 `roomType` 和 `roomTypeId`

### P1 - 重要修復

- [ ] `MyTripsPage` 確保正確顯示乘客的所有 Trip
- [ ] `DriverTripsPage` 確保正確顯示司機的所有 Trip
- [ ] 刪除 `/my-trips` 路由或修復其邏輯

### P2 - 測試驗證

- [ ] 測試完整 Request → Quote → Accept → Trip 流程
- [ ] 測試 Trip 狀態跳轉
- [ ] 測試 QR Code 功能

---

## 📁 預計修改的檔案

1. `src/services/priceQuoteService.ts` - 核心修復
2. `src/services/tripService.ts` - 確保數據正確
3. `src/pages/ChatPage.tsx` - 確保正確調用
4. `src/pages/passenger/MyTripsPage.tsx` - 刪除或修復
5. `src/pages/driver/DriverTripsPage.tsx` - 確保數據正確
6. `src/App.tsx` - 路由調整

---

## ⏱️ 預計時間

| 任務 | 時間 |
|------|------|
| 審視現有代碼邏輯 | 30 分鐘 |
| 修復 Quote → Trip 流程 | 1 小時 |
| 修復行程顯示邏輯 | 1 小時 |
| 測試驗證 | 30 分鐘 |
| **總計** | **約 3 小時** |

---

## 🎯 成功標準

1. ✅ 乘客發需求 → 司機報價 → 乘客接受 → **雙方都能在「我的行程」看到**
2. ✅ 行程狀態標籤正確顯示
3. ✅ 每個狀態對應正確的動作按鈕
4. ✅ QR Code 功能正常運作
5. ✅ 沒有 Console Error

---

## 下一步

1. 刪除 `/my-trips` 路由
2. 從頭審視 `priceQuoteService.accept()` 邏輯
3. 確保 Trip 創建時所有必要欄位都正確填寫
4. 確保 `getByPassenger()` 和 `getByDriver()` 可以正確查詢

**請確認是否繼續！** 🇭🇰
