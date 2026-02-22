# 🚕 Cabs 跨境商務出行 - 詳細開發藍圖

**版本:** 2.0  
**更新日期:** 2026-02-22  
**參考:** P7S 完整架構 + Tencent Map

---

## 📋 開發原則

1. **SaaS 優先** - 模組化、可擴展
2. **P7S 標準** - 參照其 Context 架構、Component 設計
3. **MVP 迭代** - 先核心功能、後優化
4. **TypeScript Strict** - 確保類型安全

---

## 🏗️ 技術堆疊

### 前端
| 項目 | 技術 | 備註 |
|------|------|------|
| Framework | React 18 + TypeScript | |
| Build | Vite | 快速 HMR |
| Styling | Tailwind CSS | Utility-first |
| State | React Context | 參考 P7S |
| Routing | React Router DOM v7 | 角色權限 |

### 後端 (Firebase)
| 項目 | 用途 | 備註 |
|------|------|------|
| Firebase Auth | 登入/註冊 | Email/Password + Phone |
| Cloud Firestore | 訂單、用戶數據 | NoSQL, 即時監聽 |
| Firebase Storage | 頭像、證件 | 司機 KYC |
| Hosting | Vercel | CDN + HTTPS |

### 地圖服務
| 項目 | API | 狀態 |
|------|-----|------|
| 地圖顯示 | Tencent Map GL JS SDK | ✅ 已集成 |
| 地址搜索 | Tencent Suggestion API | ⚠️ 待優化 |
| 路徑規劃 | Tencent Driving API | ⚠️ 待集成 |
| 標記顯示 | TMap.MultiMarker | ⚠️ 待修復 |

### AI 智能
- **地址解析:** Tencent Map API (優先)
- **擴展:** Gemini API (參考 P7S geminiService.ts)

---

## 📁 項目結構 (對照 P7S)

```
cabs/src/
├── components/
│   ├── map/
│   │   ├── TencentMap.tsx      # 地圖主組件
│   │   ├── MapMarker.tsx       # 標記組件
│   │   └── RouteDisplay.tsx    # 路徑顯示
│   ├── search/
│   │   ├── LocationInput.tsx    # 地址輸入框
│   │   └── LocationSearch.tsx   # 搜索建議
│   ├── booking/
│   │   ├── BookingCard.tsx      # 預訂卡片
│   │   ├── PriceDisplay.tsx     # 價格顯示
│   │   └── ConfirmModal.tsx     # 確認彈窗
│   └── ui/                      # 基礎 UI 組件
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Input.tsx
│
├── pages/
│   ├── Login.tsx                # 登入/註冊
│   ├── PassengerHome.tsx        # 乘客首頁
│   ├── DriverDashboard.tsx      # 司機儀表板
│   ├── AdminDashboard.tsx       # 管理後台
│   ├── TripHistory.tsx          # 行程歷史
│   ├── Profile.tsx              # 用戶資料
│   └── Messages.tsx             # 訊息中心
│
├── context/                     # 狀態管理 (P7S 標準)
│   ├── AuthContext.tsx          # 認證狀態
│   ├── OrderContext.tsx         # 訂單狀態
│   ├── LocationContext.tsx       # 地址狀態
│   └── UserContext.tsx          # 用戶資料
│
├── services/                    # 業務邏輯
│   ├── mapService.ts            # 地圖 API (參考 P7S)
│   ├── locationService.ts       # 地址服務
│   ├── pricingService.ts        # 定價引擎
│   ├── orderService.ts          # 訂單管理
│   └── userService.ts           # 用戶服務
│
├── hooks/                       # 自定義 Hooks
│   ├── useAuth.ts
│   ├── useOrder.ts
│   └── useLocation.ts
│
├── types/                       # TypeScript 類型
│   └── index.ts                # 統一導出
│
├── data/                        # 靜態數據
│   └── locations.ts             # 熱門地點
│
└── utils/                      # 工具函數
    ├── pricing.ts               # 價格計算
    └── validation.ts            # 驗證
```

---

## 🎯 開發階段 (詳細)

### Phase 1: 基礎架構 ✅ 完成度 80%
| 任務 | 狀態 | 備註 |
|------|------|------|
| 項目初始化 (Vite + React + TS) | ✅ | |
| Firebase 配置 | ✅ | |
| 基礎登入頁面 | ⚠️ | 需修復為完整 Firebase Form |
| AuthContext | ⚠️ | 需從 App.tsx 分離 |
| 用戶數據結構 | ✅ | |

**Phase 1 詳細任務:**
1. ~~建立項目~~ → 完成
2. ~~配置 Firebase (firebaseConfig.ts)~~ → 完成
3. [TODO] 將 AuthContext 從 App.tsx 分離到 `context/AuthContext.tsx`
4. [TODO] 將 Login 頁面分離到 `pages/Login.tsx`
5. [TODO] 添加 AuthContext 到 App.tsx

---

### Phase 2: 地圖與搜索 ⚠️ 完成度 40%
| 任務 | 狀態 | 備註 |
|------|------|------|
| Tencent Map SDK 集成 | ✅ | |
| 地圖標記顯示 (Markers) | ❌ | 需修復 |
| 地圖與輸入框互動 | ❌ | 需修復 |
| 路徑規劃 API | ⚠️ | 已有函數，待測試 |
| AI 地址搜索 | ⚠️ | SDK 加載問題 |
| 跨境口岸識別 | ✅ | |

**Phase 2 詳細任務:**

#### 2.1 修復地圖 Marker 顯示
```typescript
// 目標: 選擇地址後，地圖即時顯示藍色標記
// 問題: 當前 marker唔顯示
// 解決: 
// 1. 確保 TMap.MultiMarker 正確初始化
// 2. 使用 setGeometries() 更新標記
// 3. 添加錯誤處理
```

#### 2.2 實現地圖-輸入框互動
```typescript
// 目標: 選擇地址後地圖自動 pan/zoom 到該位置
// 實現:
// 1. 當 pickup/dropoff 改變時觸發 useEffect
// 2. 使用 map.setCenter() 和 map.setZoom()
// 3. 添加 fitBounds() 顯示所有標記
```

#### 2.3 修復 AI 地址搜索
```typescript
// 目標: 輸入文字彈出建議列表
// 當前問題: Tencent Suggestion API service module 加載失敗
// 解決方案:
// 1. 使用 HTTP REST API 替代 SDK
// 2. 或確保 SDK 正確加載後再調用
// 3. 添加 loading 狀態和錯誤處理
```

#### 2.4 路徑規劃顯示
```typescript
// 目標: 選擇起點和終點後顯示駕駛路線
// 實現:
// 1. 調用 Tencent Driving API
// 2. 使用 polyline 繪製路徑
// 3. 顯示預計時間和距離
```

---

### Phase 3: 預訂流程 ⚠️ 完成度 60%
| 任務 | 狀態 | 備註 |
|------|------|------|
| 上下車地點選擇 UI | ✅ | |
| 價格計算引擎 | ✅ | |
| 隧道費/跨境費計算 | ✅ | |
| 訂單創建 (Firestore) | ⚠️ | 基本實現 |
| 訂單狀態流轉 | ❌ | |

**Phase 3 詳細任務:**

#### 3.1 訂單狀態管理
```typescript
// 訂單狀態流轉:
// pending → accepted → in_progress → completed
// 或: pending → cancelled
// 實現: 使用 OrderContext + Firestore onSnapshot
```

#### 3.2 創建訂單函數
```typescript
// 位置: services/orderService.ts
// 函數: createOrder(orderData)
// 實現:
// 1. 驗證用戶登入
// 2. 創建 Firestore 文檔
// 3. 返回訂單 ID
// 4. 觸發通知 (可選)
```

---

### Phase 4: 乘客端 ⚠️ 完成度 50%
| 任務 | 狀態 | 備註 |
|------|------|------|
| 乘客首頁 (地圖 + 預訂) | ⚠️ | 需要修復 |
| 行程歷史 | ⚠️ | 需完善 |
| 訊息中心 | ❌ | 空殼 |
| 用戶資料頁面 | ⚠️ | 需添加積分顯示 |
| 支付方式 | ❌ | 預設現金 |

**Phase 4 詳細任務:**

#### 4.1 乘客首頁優化
```typescript
// 當前問題:
// 1. 地圖 marker 不顯示
// 2. 登入表單不完整
// 3. 沒有實時訂單狀態

// 解決:
// 1. 修復 TencentMap 組件
// 2. 添加完整的登入/註冊表單
// 3. 添加訂單監聽 (onSnapshot)
```

#### 4.2 用戶資料頁面
```typescript
// 實現:
// - 顯示用戶頭像、名稱、手機
// - 顯示積分餘額
// - 顯示訂單統計 (已完成/進行中)
// - 菜單: 聯絡客服、付款方式、設定、幫助
// - 登出按鈕
```

---

### Phase 5: 司機端 ❌ 未開始
| 任務 | 狀務 |
|------|------|
| 司機登錄與認證 | TODO |
| 司機接單列表 | TODO |
| 訂單詳情與狀態更新 | TODO |
| 收入統計 | TODO |
| 司機資料編輯 | TODO |

**實現方式:** 參考 `P7SAGI/pages/DriverDashboard.tsx`

---

### Phase 6: 管理端 ❌ 未開始
| 任務 | 狀態 |
|------|------|
| 管理員登錄 | TODO |
| 訂單管理 | TODO |
| 用戶管理 | TODO |
| 統計儀表板 | TODO |
| 價格配置 | TODO |

**實現方式:** 參考 `P7SAGI/pages/AdminDashboard.tsx`

---

### Phase 7: 高級功能 ❌ 未開始
| 任務 |
|------|
| 即時司機位置追蹤 |
| 聊天功能 |
| 推送通知 |
| AI 地址解析 (Gemini) |
| 評分系統 |
| 優惠券/積分系統 |

---

## 📊 數據庫結構 (Firestore)

### users/{uid}
```typescript
{
  phone: string,        // +85212345678
  name: string,        // 用戶名稱
  role: "passenger" | "driver" | "admin",
  points: number,      // 積分餘額
  email?: string,      // 電郵 (可選)
  photoURL?: string,  // 頭像 URL
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### orders/{autoId}
```typescript
{
  // 地點信息
  pickup: string,           // "香港國際機場"
  pickupLat: number,
  pickupLng: number,
  dropoff: string,          // "深圳灣口岸"
  dropoffLat: number,
  dropoffLng: number,
  
  // 價格信息
  price: number,            // HK$441
  distance: number,          // km
  duration: number,         // 分鐘
  tollFee: number,          // 隧道費
  
  // 狀態
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled",
  
  // 用戶
  passengerId: string,
  passengerName: string,
  
  // 司機 (訂單被接後填充)
  driverId?: string,
  driverName?: string,
  driverPhone?: string,
  
  // 時間
  createdAt: timestamp,
  acceptedAt?: timestamp,
  completedAt?: timestamp
}
```

### locations/{id} (可選)
```typescript
{
  name: string,
  address: string,
  lat: number,
  lng: number,
  regionId: "hk" | "cn" | "mo",
  isPopular: boolean
}
```

---

## 🔧 當前優先任務 (P0)

### 1. 修復地圖 Marker 顯示 ⚠️
```bash
# 問題: 選擇地址後 marker 不顯示
# 位置: src/components/map/TencentMap.tsx

# 解決步驟:
# 1. 確保 TMap SDK 完全加載
# 2. 確保 MultiMarker 正確初始化
# 3. 使用正確的 geometry 格式
# 4. 添加錯誤處理和調試日誌
```

### 2. 完善 Firebase 登入表單 ⚠️
```bash
# 問題: 當前係測試版，click login 就直接進入
# 位置: src/pages/Login.tsx

# 解決:
# 1. 添加手機號碼輸入框
# 2. 添加密碼輸入框  
# 3. 實現 signInWithEmailAndPassword
# 4. 實現 createUserWithEmailAndPassword
# 5. 添加錯誤處理
```

### 3. 實現 AI 地址搜索 ⚠️
```bash
# 問題: Tencent Suggestion API service module 加載失敗
# 位置: src/services/locationService.ts

# 解決方案:
# 方案A: 使用 HTTP REST API
# 方案B: 修復 SDK 加載邏輯
# 方案C: 使用本地數據 + 網格搜索
```

---

## 📝 代碼質量標準

### TypeScript
```typescript
// ✅ 好的寫法
interface User {
  id: string;
  name: string;
  role: 'passenger' | 'driver' | 'admin';
}

// ❌ 避免
const user: any = ...
```

### Component 結構 (參考 P7S)
```typescript
// ✅ P7S 標準
interface Props {
  onSelect: (location: Location) => void;
  placeholder?: string;
}

function LocationInput({ onSelect, placeholder }: Props) {
  // implementation
}
```

### Context 使用
```typescript
// ✅ 推薦: 分離關注點
// AuthContext.tsx - 只處理認證
// OrderContext.tsx - 只處理訂單
// LocationContext.tsx - 只處理地址

// ❌ 避免: 單一巨大 Context
```

---

## 📋 下一步行動

### 立即執行 (Immediate)
- [ ] **修復地圖 Marker** - 最高優先
- [ ] **完善登入表單** - 用戶體驗

### 短期目標 (This Week)
- [ ] 完成 Phase 2 (地圖與搜索)
- [ ] 完成 Phase 3 (預訂流程)
- [ ] 完成 Phase 4 (乘客端)

### 中期目標 (This Month)
- [ ] Phase 5 (司機端)
- [ ] Phase 6 (管理端)
- [ ] Phase 7 (高級功能)

---

## 🔗 參考資源

- **P7S 原始碼:** `/Users/garyl./projects/P7SAGI/`
- **P7S Blueprint:** `P7SAGI/PROJECT_BLUEPRINT.md`
- **Cabs 當前:** `/Users/garyl./projects/cabs/`

---

*Developed based on P7S architecture research*
