# 🚕 CabsAGI 開發計劃書

**版本:** 3.0  
**更新日期:** 2026-03-02  
**基於:** CabsAGI 現況 + P7SAGI 參考

---

## 📊 現況評估

### CabsAGI 現有嘢
| 範疇 | 狀態 | 備註 |
|------|------|------|
| 架構 | ✅ | React Router v7, AuthContext 已拆分 |
| 認證 | ✅ | Firebase Auth (Email + Phone) |
| 地圖 | ⚠️ | Tencent Map SDK 有，但 marker/搜索有問題 |
| 乘客端 | ⚠️ | 有 pages，但功能未完善 |
| 司機端 | ⚠️ | 有 DriverDashboard，但接單未貫通 |
| 管理端 | ⚠️ | 有 AdminConsole，但好多嘢得 UI |
| 訂單 | ⚠️ | 有 orderService，但狀態流轉未完整 |

### P7SAGI 可以攞嘅嘢
- **地圖服務:** mapService.ts (完整 SDK loader + 座標轉換)
- **位置服務:** locationService.ts (地址搜索建議)
- **定價服務:** pricingService.ts (隧道費、跨境費計算)
- **訂單服務:** orderService.ts (完整狀態流轉)
- **組件:** MapViewer, LocationSearch, BookingDrawer, OrderCard

---

## 🎯 開發目標 (4週)

### Week 1: 穩定核心 (P0)
1. **修復地圖** - Marker顯示 + 地址搜索
2. **完善登入** - 真正Firebase登入流程
3. **訂單創建** - 可以落單並寫入Firestore

### Week 2: 乘客體驗 (P1)
1. **乘客首頁** - 地圖 + 落單流程完整
2. **行程歷史** - 睇到過去訂單
3. **用戶資料** - Profile + Points顯示

### Week 3: 司機端 (P1)
1. **司機登入** - 司機角色認證
2. **接單系統** - 司機可以接單
3. **狀態更新** - 司機可以更新訂單狀態

### Week 4: 管理端 + 優化 (P2)
1. **管理後台** - 訂單管理、用戶管理
2. **統計儀表板** - 基本營運數據
3. **優化體驗** - Error handling, loading states

---

## 📋 詳細工作清單

### Phase 1: 基礎修復 (Week 1)

#### 1.1 地圖修復 (P0)
- [ ] **從P7SAGI copy** `services/mapService.ts` SDK loader邏輯
- [ ] **修復** `TencentMap.tsx` marker顯示問題
- [ ] **實現** 地址搜索 (用P7SAGI locationService做參考)
- [ ] **添加** 地圖中心點自動移動

#### 1.2 登入完善 (P0)
- [ ] **修復** Landing.tsx 登入表單
- [ ] **實現** Email/Password 登入
- [ ] **實現** Phone OTP 登入
- [ ] **添加** 錯誤處理同loading states

#### 1.3 訂單創建 (P1)
- [ ] **完善** `services/orderService.ts` createOrder
- [ ] **連接** PassengerHome 落單按鈕到 Firestore
- [ ] **添加** 訂單成功/失敗 feedback

### Phase 2: 乘客端完善 (Week 2)

#### 2.1 乘客首頁
- [ ] **整合** 地圖 + 輸入框 + 價格顯示
- [ ] **添加** 實時訂單狀態顯示
- [ ] **實現** 確認叫車流程

#### 2.2 訂單歷史
- [ ] **實現** OrdersPage 讀取用戶訂單
- [ ] **顯示** 訂單狀態、價格、時間
- [ ] **添加** 空狀態 UI

#### 2.3 用戶資料
- [ ] **完善** ProfilePage 顯示用戶資料
- [ ] **添加** Points 餘額顯示
- [ ] **實現** 登出功能

### Phase 3: 司機端 (Week 3)

#### 3.1 司機認證
- [ ] **添加** 司機角色登入
- [ ] **實現** 司機專屬layout

#### 3.2 接單系統
- [ ] **實現** 司機睇pending訂單列表
- [ ] **實現** 一鍵接單功能
- [ ] **實現** 司機更新訂單狀態 (accepted → in_progress → completed)

#### 3.3 司機收入
- [ ] **添加** 司機收入統計
- [ ] **顯示** 今日訂單、總收入

### Phase 4: 管理端 (Week 4)

#### 4.1 訂單管理
- [ ] **實現** 管理員睇全部訂單
- [ ] **添加** 訂單篩選 (狀態、日期)
- [ ] **實現** 手動修改訂單狀態

#### 4.2 用戶管理
- [ ] **實現** 睇用戶列表
- [ ] **添加** 用戶角色管理

#### 4.3 儀表板
- [ ] **顯示** 今日訂單數
- [ ] **顯示** 活躍司機數
- [ ] **顯示** 營收統計

---

## 🔧 技術參考

### 從P7SAGI搬過來

```bash
# Services (直接copy + 改名)
P7SAGI/services/mapService.ts        → CabsAGI/src/services/mapService.ts
P7SAGI/services/locationService.ts  → CabsAGI/src/services/locationService.ts
P7SAGI/services/pricingService.ts   → CabsAGI/src/services/pricingService.ts

# Components (參考實現)
P7SAGI/components/MapViewer.tsx    → 參考改寫 TencentMap.tsx
P7SAGI/components/LocationSearch.tsx → 新建 CabsAGI/src/components/LocationSearch.tsx
P7SAGI/components/BookingDrawer.tsx → 參考改寫
```

### 數據庫 Schema (不變)

```typescript
// users/{uid}
{
  phone, name, role, points, email, createdAt, updatedAt
}

// orders/{id}
{
  pickup, pickupLat, pickupLng,
  dropoff, dropoffLat, dropoffLng,
  price, distance, duration, tollFee,
  status, passengerId, passengerName,
  driverId, driverName,
  createdAt, acceptedAt, completedAt
}
```

---

## ✅ 驗收標準

### Week 1 結束時
- [ ] 地圖可以正常顯示marker
- [ ] 地址搜索有建議彈出
- [ ] 用戶可以真正登入
- [ ] 可以創建訂單並寫入Firestore

### Week 2 結束時
- [ ] 乘客可以完成: 登入 → 選址 → 計價 → 落單
- [ ] 可以睇到訂單歷史
- [ ] Profile顯示用戶資料

### Week 3 結束時
- [ ] 司機可以登入
- [ ] 司機可以接單
- [ ] 司機可以更新訂單狀態

### Week 4 結束時
- [ ] 管理員可以睇全部訂單
- [ ] 基本統計數據顯示
- [ ] `npm run build` 通過

---

## 📝 優先序

**今日開始做:**

1. **第一步:** Copy P7SAGI mapService.ts 入 CabsAGI
2. **第二步:** 修復 TencentMap.tsx marker問題
3. **第三步:** 實現地址搜索

你想我從邊度開始？

---

*Plan created based on CabsAGI current state + P7SAGI reference architecture*
