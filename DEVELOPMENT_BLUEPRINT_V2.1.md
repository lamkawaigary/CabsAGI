# Cabs 跨境商務出行 - 開發藍圖 2.1

版本: 2.1  
更新日期: 2026-02-24  
基線: Cabs 現況 + P7SAGI 對照遷移

---

## 1) 2.1 目標與修訂重點

本版本針對 2.0 的三個核心問題作修訂:

1. 文件與現況不一致  
   - 統一為 React 19 + React Router DOM v7。
2. P0 定義過舊  
   - 登入不再是「假登入」，改為「註冊/持久化/錯誤處理完整化」。
3. 缺少舊系統遷移章節  
   - 新增命名替換、資料映射、回滾策略、驗收標準。

---

## 2) 現況快照 (As-Is)

### Cabs 現況
- 技術棧: React 19, TypeScript, Firebase, Router v7。
- 代碼狀態: 主流程大量集中於 `src/App.tsx` (monolith)。
- 地圖: `TencentMap.tsx` 已有 MultiMarker/setGeometries，但缺少 SDK 載入重試機制。
- 登入: 已有 Email/Password + Phone OTP 基礎流程。

### 舊系統 P7SAGI 可借鏡能力
- Context 分層: Auth/Order/Database/User 等關注點分離。
- 路由與權限: Protected Route + 角色導向頁面。
- 訂單流轉: 以 transaction/onSnapshot 提升一致性。
- 地圖 SDK 載入: 封裝 loader，降低初始化 race condition。

---

## 3) 技術棧 (To-Be)

### 前端
- React 19 + TypeScript strict
- Vite
- React Router DOM v7
- Tailwind CSS (沿用既有)
- Context + Hooks (按模組拆分)

### 後端
- Firebase Auth
- Cloud Firestore (real-time + transaction)
- Firebase Storage (為司機端 KYC 保留)
- Hosting: Vercel

### 地圖與地址
- Tencent Map GL JS SDK
- Tencent Suggestion API (優先 REST，SDK 為備援)
- Tencent Driving API (路徑/時間/距離)

---

## 4) 舊 -> 新 遷移藍圖 (Migration Blueprint)

### 4.1 命名與品牌替換清單
- 文案品牌: P7S* -> Cabs
- Firebase collection 名稱不改動前，先做 mapping layer，避免一次性大爆改
- Route 命名從舊頁面語義映射到新頁面:
  - `PassengerDashboard` -> `PassengerHome`
  - `MessageCenter` -> `Messages`
  - `TripDetails` -> `TripHistory/TripDetails` (按功能拆)

### 4.2 Firestore 資料映射
- `users/{uid}`
  - 必要欄位: `name`, `phone`, `role`, `points`, `createdAt`, `updatedAt`
- `orders/{id}`
  - 必要欄位: pickup/dropoff 座標、價格、狀態、乘客/司機、時間戳
- 兼容策略:
  - 讀取時允許舊欄位存在 (`date`, `biddingStatus` 等)；
  - 寫入時統一新 schema。

### 4.3 回滾策略
- 每個階段保持「可運行主分支」。
- 資料層改動先 additive (新增欄位) 再 cleanup (刪舊欄位)。
- 狀態機改動使用 feature flag (例如 `ORDER_V2_FLOW=true`)。

---

## 5) Phase 重排 (2 週可落地)

## Week 1: 穩定核心鏈路 (P0/P1)

### Phase A: 架構拆分 (P0)
目標: 將 monolith App 拆成可維護模組。

工作項:
1. 建立 `context/AuthContext.tsx`，接管登入狀態與 listener。
2. 建立 `pages/Login.tsx`, `pages/PassengerHome.tsx`, `pages/Profile.tsx`, `pages/Orders.tsx`。
3. `App.tsx` 只保留路由與 provider 裝配。

DoD:
1. `App.tsx` 不再承載業務細節。
2. 登入後刷新頁面可保留狀態。
3. `npm run build` 與 `npm run lint` 通過。

### Phase B: 地圖穩定化 (P0)
目標: 修復 marker/中心點更新不穩定。

工作項:
1. 新增 Tencent SDK loader (`services/tencentLoader.ts`)。
2. `TencentMap` 改為等待 loader resolve 後初始化 map/marker。
3. 加入初始化失敗與重試日誌。

DoD:
1. 選擇 pickup 後 2 秒內看到藍色 marker。
2. 選擇 dropoff 後 fitBounds 正常。
3. 連續切換地址 20 次不崩潰。

### Phase C: 地址搜索可用化 (P1)
目標: 搜尋可穩定返回建議，不依賴脆弱 SDK service module。

工作項:
1. `locationService.ts` 優先走 REST Suggestion API。
2. REST 失敗時 fallback 至本地熱門位置。
3. 加入 debounce/loading/error UI。

DoD:
1. 常見關鍵字可返回前 5 條建議。
2. API 失敗時 UI 不阻塞，仍可用本地候選。

## Week 2: 下單與狀態流轉 (P1/P2)

### Phase D: 訂單服務化 (P1)
目標: 從 UI 臨時計價進入 Firestore 訂單閉環。

工作項:
1. 建立 `services/orderService.ts`（create/subscribe/updateStatus）。
2. 建立 `context/OrderContext.tsx` 統一管理 onSnapshot。
3. Passenger 頁加入「確認叫車 -> 寫入訂單」。

DoD:
1. 可建立 pending 訂單並在 Orders 頁可見。
2. 訂單狀態更新可即時反映。

### Phase E: 狀態機與交易一致性 (P1)
目標: 避免競態和非法狀態跳轉。

工作項:
1. 狀態限制: `pending -> accepted -> in_progress -> completed`，或 `pending -> cancelled`。
2. driver 接單使用 transaction 保證單一接單成功。
3. 記錄 `acceptedAt`, `completedAt`, `updatedAt`。

DoD:
1. 兩個司機同時接單，只能一個成功。
2. 非法跳轉被拒絕並返回錯誤碼。

### Phase F: Profile/History 補齊 (P2)
目標: 交付最少可用乘客端體驗。

工作項:
1. Profile 顯示 points、基本資料與登出。
2. History 顯示過去訂單、狀態、價格。

DoD:
1. 乘客可在 Profile 與 Orders 完成基本自助查詢。

---

## 6) Firestore Schema 2.1 (最小可行)

### users/{uid}
```ts
{
  name: string;
  phone: string;
  role: "passenger" | "driver" | "admin";
  points: number;
  email?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}
```

### orders/{id}
```ts
{
  pickup: string;
  pickupLat: number;
  pickupLng: number;
  dropoff: string;
  dropoffLat: number;
  dropoffLng: number;
  price: number;
  distance: number;
  duration: number;
  tollFee: number;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  passengerId: string;
  passengerName: string;
  driverId?: string;
  driverName?: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  updatedAt?: string;
}
```

---

## 7) 風險與控制

1. 地圖 SDK race condition  
   - 控制: loader + timeout + fallback UI。

2. monolith 拆分期間回歸風險  
   - 控制: 每階段 build/lint + 手動 smoke test。

3. Firestore 欄位混用  
   - 控制: read 兼容、write 統一、分階段清理。

4. 外部網絡/金鑰限制  
   - 控制: 將關鍵功能設計為可降級（本地候選地址、預估距離）。

---

## 8) 驗收清單 (Release Gate)

1. 乘客可完成: 登入 -> 選址 -> 計價 -> 建單 -> 查看狀態。  
2. 地圖 marker/中心點/fitBounds 穩定可重現。  
3. 訂單狀態機遵循合法轉移，競態下保持一致。  
4. `npm run build` / `npm run lint` 通過。  
5. 關鍵錯誤有可追蹤日誌。

---

## 9) 2.1 後續 (非本階段)

- Phase 5 Driver Dashboard (接單/更新狀態/收入)
- Phase 6 Admin Dashboard (訂單/用戶/價格配置)
- Phase 7 進階功能 (聊天/推送/評分/優惠)

