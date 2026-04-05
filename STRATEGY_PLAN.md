# CabsAGI 轉型計劃：機場接送 + 跨境直通

**版本:** 2.0  
**更新日期:** 2026-03-11  
**狀態:** 規劃中

---

## 🎯 產品定位

### 核心服務：跨境商務出行平台

專注於高價值、可預測既跨境交通需求：

| 服務類型 | 場景 | 痛點 |
|----------|------|------|
| **機場接送** | 旅客往返機場 | 的士貴、預約難 |
| **跨境直通** | 粵港澳商務出行 | 排隊耐、搵車難 |
| **主題公園** | 家庭樂園一日遊 | 交通遠、停車貴 |
| **演唱會直通** | 演唱會/展覽後跨境 | 深夜無車、搵唔到司機 |

---

## 🚗 服務線規劃

### 1. 機場接送 (Airport Transfer)

**路線：**
- 香港機場 ↔ 市區 (銅鑼灣/中環/尖沙咀)
- 香港機場 ↔ 深圳灣口岸
- 香港機場 ↔ 葵青/荃灣

**特點：**
- 固定時間表班次
- 預留行李空間
- 航班追蹤（延誤自動調整）

**定價：**
- 單程：$150-300
- 套票（3程）：$380-750

---

### 2. 跨境直通 (Cross-Border Express)

**熱門路線：**
- 香港市區 ↔ 內地熱門城市 (深圳/廣州/珠海)
- 香港 ↔ 澳門 (金光飛航/噴射飛航替代)

**特點：**
- 點到點直達（免轉車）
- 預約制（唔使等）
- 跨境交通費一齊包

**定價：**
- 深圳：$200-350
- 廣州：$400-600
- 澳門：$500-800

---

### 3. 主題公園 (Theme Park Express)

**路線：**
- 市區 ↔ 迪士尼/海洋公園/昂坪360
- 深圳灣口岸 ↔ 迪士尼

**特點：**
- 朝去晚返既標準班次
- 適合家庭
- 預留較多行李位

**定價：**
- 單程：$80-150
- 套票（來回）：$150-280

---

### 4. 演唱會/展覽直通 (Event Express)

**場館：**
- 香港演唱會場館（亞博館、會展、红館）
- 深圳/廣州演唱會場館

**特點：**
- 活動前公佈班次時間
- 活動結束後立即發車
- 跨境快線（深夜）

**定價：**
- 境內：$100-200
- 跨境：$300-500

---

## 📱 功能規劃

### 第一階段：MVP（2週）

#### 用戶端
```
1. 首頁展示
   - 服務類型選擇（4個 icons）
   - 精選路線推薦

2. 路線瀏覽
   - 路線卡（出發地 → 目的地）
   - 價格顯示
   - 班次時間

3. 班次選擇
   - 日期選擇
   - 時間選擇
   - 座位數量

4. 預訂流程
   - 乘客資料
   - 聯絡電話
   - 特別要求（行李、BB車）

5. 支付
   - 信用卡
   - Apple Pay

6. 確認頁
   - QR Code 車票
   - 司機資料（臨近出發顯示）
```

#### 司機端
```
1. 登入
2. 今日班次列表
3. 開始班次
4. 乘客點名（scan QR）
5. 完成行程
```

#### 管理端
```
1. 路線 CRUD
2. 班次 CRUD  
3. 訂單管理
4. 司機管理
```

---

### 第二階段：進階（2週）

```
- 訂閱制（月費用戶）
- 企業帳戶
- 儲值戶口
- 積分系統
- 司機收入統計
- 用戶行為分析
```

---

## 🏗️ 數據模型

### Firestore Schema

```
/routes/{routeId}
  - name: string
  - type: "AIRPORT" | "CROSS_BORDER" | "THEME_PARK" | "EVENT"
  - origin: { name, lat, lng }
  - destination: { name, lat, lng }
  - stops[]: { name, lat, lng, sequence }
  - price: number
  - duration: number (分鐘)
  - distance: number (公里)
  - status: "ACTIVE" | "INACTIVE"
  - createdAt, updatedAt

/shifts/{shiftId}
  - routeId: string
  - departureTime: timestamp
  - vehicleId: string
  - driverId: string
  - status: "SCHEDULED" | "OPEN" | "FULL" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  - availableSeats: number
  - totalSeats: number
  - price: number
  - notes: string
  - createdAt, updatedAt

/bookings/{bookingId}
  - shiftId: string
  - userId: string
  - pickupStopIndex: number
  - dropoffStopIndex: number
  - seatCount: number
  - passengerName: string
  - passengerPhone: string
  - status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
  - qrCode: string
  - totalPrice: number
  - paymentStatus: "UNPAID" | "PAID" | "REFUNDED"
  - createdAt, updatedAt

/vehicles/{vehicleId}
  - plateNumber: string
  - model: string
  - capacity: number
  - status: "ACTIVE" | "MAINTENANCE"
  - driverId: string

/users/{userId}
  - (現有結構 +)
  - subscriptionStatus: "FREE" | "MONTHLY" | "YEARLY"
  - points: number
  - balance: number (儲值)
```

---

## 🎨 UI/UX 方向

### 首頁 Layout

```
┌─────────────────────────────┐
│  CabsAGI     [我的預訂]    │
├─────────────────────────────┤
│  🛫 機場接送              │
│  🚏 跨境直通              │
│  🎢 主題公園              │
│  🎫 演唱會直通            │
├─────────────────────────────┤
│  精選路線                  │
│  [路線卡] [路線卡]        │
│  [路線卡] [路線卡]        │
└─────────────────────────────┘
```

### 預訂流程

1. **選擇服務類型** → 2. **選擇路線** → 3. **選擇班次** → 4. **填寫資料** → 5. **支付** → 6. **確認**

---

## 📋 開發順序

| 週 | 任務 |
|----|------|
| **Week 1** | 數據模型 + 基礎 API + 管理端（路線/班次） |
| **Week 2** | 用戶端首頁 + 瀏覽 + 預訂流程 |
| **Week 3** | 司機端 + 支付整合 |
| **Week 4** | 優化 + 訂閱/積分系統 |

---

## ✅ 下一步

1. ✅ 確認服務類型（機場/跨境/主題公園/演唱會）
2. ⏳ 設計具體路線
3. ⏳ 開始開發數據模型

---

你想我開始邊部分？
- **設計具體路線** - 例如「機場 → 銅鑼灣」既價格、時間
- **開始寫 Code** - 由數據模型做起
