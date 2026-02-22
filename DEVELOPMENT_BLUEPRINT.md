# 🚕 Cabs 跨境商務出行 - 開發藍圖

**版本:** 1.0  
**建立日期:** 2026-02-22  
**參考:** P7S 系統架構  
**目標:** 建立類似 P7S 體驗既跨境 taxi app

---

## 📋 開發原則

1. **SaaS 架構** - 可擴展、模組化
2. **參考 P7S** - 沿用其核心設計模式
3. **MVP 優先** - 先完成核心功能，再優化體驗
4. **代碼質量** - TypeScript Strict Typing、組件化

---

## 🏗️ 技術堆疊 (Tech Stack)

### 前端
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS
- **State:** React Context + Firestore Real-time

### 後端 (Firebase)
- **Auth:** Firebase Auth (Email/Password + Phone)
- **Database:** Cloud Firestore
- **Storage:** Firebase Storage
- **Hosting:** Vercel / 本地開發

### 地圖服務
- **主要:** Tencent Map SDK (跨境)
- **參考:** P7S 使用 Google Maps (可擴展)

### AI 智能
- **地址解析:** Tencent Map Suggestion API
- **擴展:** Gemini API (參考 P7S)

---

## 📦 項目結構

```
cabs/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── map/
│   │   │   ├── TencentMap.tsx
│   │   │   ├── MapMarker.tsx
│   │   │   └── RouteDisplay.tsx
│   │   ├── search/
│   │   │   ├── LocationInput.tsx
│   │   │   └── LocationSearch.tsx
│   │   ├── booking/
│   │   │   ├── BookingCard.tsx
│   │   │   ├── PriceDisplay.tsx
│   │   │   └── OrderButton.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Input.tsx
│   │
│   ├── pages/              # 页面
│   │   ├── Login.tsx
│   │   ├── PassengerHome.tsx
│   │   ├── DriverDashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── TripHistory.tsx
│   │   ├── Profile.tsx
│   │   └── Messages.tsx
│   │
│   ├── context/            # 状态管理
│   │   ├── AuthContext.tsx
│   │   ├── OrderContext.tsx
│   │   └── LocationContext.tsx
│   │
│   ├── services/           # 业务逻辑
│   │   ├── mapService.ts       # 地圖 API
│   │   ├── pricingService.ts   # 定價引擎
│   │   ├── orderService.ts     # 訂單管理
│   │   └── userService.ts     # 用戶服務
│   │
│   ├── hooks/              # 自定义 Hooks
│   │   ├── useAuth.ts
│   │   ├── useOrder.ts
│   │   └── useLocation.ts
│   │
│   ├── types/              # TypeScript 類型
│   │   └── index.ts
│   │
│   ├── data/               # 静态数据
│   │   └── locations.ts    # 熱門地點
│   │
│   └── utils/              # 工具函數
│       ├── pricing.ts
│       └── validation.ts
│
├── public/
└── package.json
```

---

## 🎯 开发阶段

### Phase 1: 基礎架構 (Foundation)
**目標:** 建立項目結構、認證、數據庫連接

- [x] 1.1 項目初始化 (Vite + React + TS)
- [x] 1.2 Firebase 配置 (Auth + Firestore)
- [x] 1.3 基礎登入頁面
- [ ] 1.4 AuthContext 完善
- [ ] 1.5 用戶數據結構設計

### Phase 2: 地圖與搜索 (Map & Search)
**目標:** 實現地址搜索、地圖顯示、路徑規劃

- [x] 2.1 Tencent Map SDK 集成
- [ ] 2.2 地圖標記顯示 (Markers)
- [ ] 2.3 地圖與輸入框互動
- [ ] 2.4 路徑規劃 API (Driving)
- [ ] 2.5 AI 地址搜索 (Tencent Suggestion API)
- [ ] 2.6 跨境口岸識別

### Phase 3: 預訂流程 (Booking)
**目標:** 選擇地點、計算價格、創建訂單

- [x] 3.1 上下車地點選擇 UI
- [x] 3.2 價格計算引擎
- [ ] 3.3 隧道費/跨境費計算
- [ ] 3.4 訂單創建 (Firestore)
- [ ] 3.5 訂單狀態流轉

### Phase 4: 乘客端 (Passenger)
**目標:** 乘客完整體驗

- [ ] 4.1 乘客首頁 (地圖 + 預訂)
- [ ] 4.2 行程歷史
- [ ] 4.3 訊息中心
- [ ] 4.4 用戶資料頁面 (積分餘額)
- [ ] 4.5 支付方式 (預設現金)

### Phase 5: 司機端 (Driver)
**目標:** 司機接單與配送

- [ ] 5.1 司機登錄與認證
- [ ] 5.2 司機接單列表
- [ ] 5.3 訂單詳情與狀態更新
- [ ] 5.4 收入統計
- [ ] 5.5 司機資料編輯

### Phase 6: 管理端 (Admin)
**目標:** 後台管理系統

- [ ] 6.1 管理員登錄
- [ ] 6.2 訂單管理
- [ ] 6.3 用戶管理
- [ ] 6.4 統計儀表板
- [ ] 6.5 價格配置

### Phase 7: 高級功能 (Advanced)
**目標:** 增強體驗

- [ ] 7.1 即時司機位置追蹤
- [ ] 7.2 聊天功能
- [ ] 7.3 推送通知
- [ ] 7.4 AI 地址解析 (Gemini)
- [ ] 7.5 評分系統
- [ ] 7.6 優惠券/積分系統

---

## 🔧 當前任務 (Immediate Tasks)

### 優先度 P0 - 阻塞問題
1. **修復地圖標記顯示** - 選擇地點後 marker唔顯示
2. **完善 Firebase 登入表單** - 當前係測試版

### 優先度 P1 - 核心功能
3. **AI 地址搜索** - Tencent Suggestion API 整合
4. **路徑規劃顯示** - 選擇目的地後顯示路線

### 優先度 P2 - 優化體驗
5. **訂單狀態管理**
6. **司機 Dashboard**

---

## 📊 數據庫結構 (Firestore)

### Collections

```
users/
  {uid}
    - phone: string
    - name: string
    - role: "passenger" | "driver" | "admin"
    - points: number
    - createdAt: timestamp

orders/
  {autoId}
    - pickup: string (地點名稱)
    - pickupLat: number
    - pickupLng: number
    - dropoff: string
    - dropoffLat: number
    - dropoffLng: number
    - price: number
    - distance: number (km)
    - duration: number (分鐘)
    - status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled"
    - passengerId: string
    - passengerName: string
    - driverId: string?
    - driverName: string?
    - createdAt: timestamp
    - completedAt: timestamp?

locations/ (可選 - 熱門地點緩存)
  {id}
    - name: string
    - address: string
    - lat: number
    - lng: number
    - regionId: "hk" | "cn" | "mo"
```

---

## 🎨 UI 設計參考

### 配色方案
- **Primary:** #667EEA (紫藍)
- **Secondary:** #764BA2 (深紫)
- **Accent:** #F59E0B (金/積分)
- **Success:** #22C55E (綠)
- **Danger:** #EF4444 (紅)
- **Background:** #F8F9FC (淺灰)

### 組件風格 (參考 P7S)
- 卡片: white + rounded-2xl + shadow-sm
- 按鈕: gradient + rounded-xl
- 輸入框: rounded-xl + gray background
- 地圖: border-radius-xl + shadow-lg

---

## 📝 待辦清單 (Next Steps)

- [ ] 建立完整項目結構
- [ ] 修復地圖標記問題
- [ ] 實現 AI 地址搜索
- [ ] 添加司機端
- [ ] 添加管理端

---

*Developed with reference to P7S architecture blueprint*
