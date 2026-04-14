# UI 收斂完成清單（驗收版）

最後更新：2026-03-03  
適用版本：`cursor/cabs-saas-ui-ux-987b`

---

## 1) 已完成範圍（按頁面）

### A. Passenger 流程
- [x] `PassengerHome`
  - [x] Hero 視覺語言統一（主標 / 副標 / 品牌色）
  - [x] 模式切換（包車 / 官方班次）卡片化與間距收斂
  - [x] 主要操作區塊（流程、選項、CTA）層次一致
  - [x] 手機窄寬（375/390）避免固定三欄擠壓
- [x] `RouteDetail`
  - [x] Hero + 關鍵資訊 chips（時長 / 距離 / 價格）
  - [x] 班次卡片重排（時間、座位、狀態、加入按鈕）
  - [x] 主 CTA（加入最近班次）語意清晰
- [x] `BookingPage`
  - [x] Hero + 表單卡 + 價格卡語言一致
  - [x] 成功頁改為同系統視覺（完成 Hero + 摘要卡）
  - [x] 底部固定 CTA 與全站按鈕密度一致
- [x] `Orders`
  - [x] Hero 統計（全部 / 進行中 / 已完成）
  - [x] 訂單卡片標籤與資訊層級統一
- [x] `Messages` / `MessagesPage`
  - [x] Hero + 對話列表卡片化
  - [x] 對話視窗（泡泡、輸入列、按鈕）語言一致
- [x] `Profile`
  - [x] Hero + 資訊卡化（身份、聯絡、KYC）
  - [x] 電話驗證流程控件視覺一致

### B. Admin / Driver
- [x] `AdminConsole`
  - [x] 頂部升級為 Hero 風格
  - [x] 加入營運關鍵 chips（待處理訂單 / 今日訂單 / 今日營收）
  - [x] 主內容卡片背景、留白與整體層次收斂
- [x] `DriverDashboard`
  - [x] Hero、卡片、按鈕、折疊區域一致化（前批次完成）

### C. 入口頁
- [x] `Landing`
  - [x] Hero 文案與高亮資訊塊統一
  - [x] 登入 / 註冊 / OTP / Reset 區塊節奏收斂
  - [x] 手機密度微調（避免過於鬆散）

---

## 2) 全域設計系統與互動狀態

- [x] `src/index.css` 已建立統一 tokens（spacing / radius / border / color）
- [x] 統一 UI 基礎類：`ui-page` / `ui-card` / `ui-btn` / `ui-input` / `ui-notice` / `ui-pill`
- [x] 互動狀態完善：hover / active / focus-visible
- [x] 手機規則：
  - [x] `@media (max-width: 768px)` 基礎收斂
  - [x] `@media (max-width: 420px)` 最終 QA 微修（375/390 針對性）

---

## 3) 驗收重點（建議 QA 走查）

### 視覺一致性
- [ ] Hero 區塊是否在主要頁面都有一致的層次與字級感
- [ ] 卡片圓角、陰影、邊框是否整站一致
- [ ] 主次按鈕（primary / outline / tab）是否有清楚優先級

### 流程可用性
- [ ] Passenger 主流程「首頁 -> 路線 -> 加入 -> 訂單」是否連貫
- [ ] Messages 對話切換與回退是否直覺
- [ ] Admin 常見操作（篩選、更新狀態、派單）是否可快速完成

### 手機體驗（重點）
- [ ] iPhone 12/13 mini 寬度（約 375）無明顯擠壓或按鈕過密
- [ ] iPhone 14/15 寬度（約 390）卡片資訊不換行爆版
- [ ] 固定底部 CTA（如 Booking）不遮擋關鍵內容

---

## 4) 明確不在本次範圍

- [ ] 不改動核心業務邏輯（訂單狀態機、扣點規則、佣金計算）
- [ ] 不調整資料模型 schema
- [ ] 不引入新的第三方 UI 套件

---

## 5) 可選下一步（若要再做）

1. **最終文案一致化**  
   將「包車點對點」與「路線型共乘」相關文案做單一詞彙表，避免同義詞混用。

2. **A11y 快速補強**  
   為主要 CTA、切換按鈕、訊息輸入區補齊 aria-label 與焦點流程檢查。

3. **可視化回歸基準**  
   對 Landing / PassengerHome / Booking / Orders 做 screenshot baseline，之後改版更好防止視覺回退。

