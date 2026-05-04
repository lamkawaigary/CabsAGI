# OpenCabs UI 更新實施計劃

## 📋 概述
將 Mockup 中的乘客首頁設計整合到 CabsAGI 專案

---

## ✅ 已完成

### 1. PassengerHomePage (乘客首頁)
- ✅ 頂部 App Bar 設計
- ✅ 搜索區塊 + 日期/乘客篩選
- ✅ 横向類別標籤
- ✅ 熱門路線卡片
- ✅ FAB 按鈕
- ⚠️ 需要整合 Tailwind 樣式系統

### 2. Design System
- ✅ ~/Desktop/CabsAGI/src/styles/designSystem.ts

---

## 📝 待辦事項

### Phase 1: 核心組件統一
1. **整合 Tailwind / 統一样式系統**
   - 目前使用 inline styles，需要確認是否要用 Tailwind
   - 或繼續用 designSystem.ts

2. **更新 BottomNav**
   - 配合新設計的底部導航樣式

3. **更新 Button / Card / Badge 組件**
   - 配合新設計的圓角、顏色、陰影

### Phase 2: 頁面更新

| 頁面 | 優先級 | 狀態 |
|------|--------|------|
| PassengerHomePage | P0 | ⚠️ 部分完成 |
| PassengerBrowsePage | P1 | 📋 待更新 |
| DriverHomePage | P1 | 📋 待更新 |
| PassengerRequestsMarket | P2 | 📋 Mockup 完成 |
| TripDetailPage | P2 | 📋 待更新 |

### Phase 3: 新頁面
| 頁面 | 優先級 |
|------|--------|
| 乘客需求公海 (Passenger Requests) | P1 |
| 司機行程請求頁面 | P1 |

---

## 🎨 設計系統採用

### 顏色
```
Primary (Orange):    #f59e0b (amber-400)
Primary Dark:       #855300 (amber-700)
Background:          #f9f9ff
Surface:             #ffffff
Text Primary:        #111c2d
Text Secondary:      #534434
Secondary Blue:      #1d4ed8 (blue-600)
Success:             #4caf50
```

### 圓角
```
Small:    8px  (rounded-lg)
Medium:  12px (rounded-xl)
Large:   16px (rounded-2xl)
Full:    9999px (rounded-full)
```

### 間距
```
Container Margin:  20px
Card Gap:         16px
Section Space:    24px
```

### 陰影
```
Card:   0 4px 20px rgba(29,78,216,0.05)
Hover:  0 8px 30px rgba(29,78,216,0.08)
FAB:    0 8px 30px rgba(245,158,11,0.3)
```

---

## 🔧 技術債務

### 需要更新的服務
1. **listingService** - 確保 `getOpenListings` 返回正確數據
2. **tripService** - 確保與 Listing 同步
3. **chatService** - 確保聊天功能正常

### 需要更新的類型
1. **Listing** - 確認 `price`, `departureTime` 等欄位
2. **Trip** - 確認狀態機制

---

## 📂 檔案結構
```
src/
├── styles/
│   └── designSystem.ts     ✅ 現有
├── components/
│   └── ui/
│       ├── Button.tsx      ✅ 現有
│       ├── Card.tsx        ✅ 現有
│       ├── Badge.tsx       ✅ 現有
│       └── TripCard.tsx    ✅ 現有
├── pages/
│   ├── passenger/
│   │   ├── PassengerHomePage.tsx    ⚠️ 需要優化
│   │   ├── PassengerBrowsePage.tsx  📋 待更新
│   │   └── PassengerRequestsPage.tsx 📋 待更新
│   └── driver/
│       ├── DriverHomePage.tsx       📋 待更新
│       └── DriverTripsManager.tsx   📋 待更新
```

---

## 🚀 建議實施順序

1. **確認設計系統** - 繼續用 inline styles 或引入 Tailwind
2. **更新 BottomNav** - 配合新設計
3. **更新 PassengerHomePage** - 完成並測試
4. **更新 PassengerBrowsePage** - 統一瀏覽頁面
5. **更新 DriverHomePage** - 司機視角同步更新
6. **新增 PassengerRequestsPage** - 乘客需求公海

---

## 📞 備註
- Mockup 位置: ~/Desktop/OpenCabs-Mockup/
- 設計稿顏色代碼已保存在 designSystem.ts
