# 系統變更申請管理系統

一個基於 Google Apps Script 開發的系統變更申請與審核管理平台，提供完整的申請流程、審核機制及自動化文件產生功能。

## 📋 目錄

- [專案簡介](#專案簡介)
- [功能特點](#功能特點)
- [技術架構](#技術架構)
- [專案結構](#專案結構)
- [安裝部署](#安裝部署)
- [使用說明](#使用說明)
- [配置說明](#配置說明)
- [開發資訊](#開發資訊)
- [授權資訊](#授權資訊)

## 專案簡介

本系統是一個完整的 IT 資產變更申請管理解決方案，整合 Google Workspace 生態系統（Sheets、Drive、Docs、Gmail），提供：

- ✅ 線上申請提交
- ✅ 主管審核工作流
- ✅ 自動單號生成
- ✅ 文件自動產生
- ✅ 郵件通知機制
- ✅ 申請狀態追蹤

**適用場景：** IT 部門系統變更管理、設備維護申請、變更控制流程

**語言：** 繁體中文介面

**版本：** v3.5

## 功能特點

### 🎯 核心功能

1. **申請提交系統**
   - 階層式資產選擇（群組 → 類別 → 資產）
   - 變更前評估表單
   - 影響範圍評估
   - 前測與備份檢核
   - 風險減緩方案記錄

2. **審核管理系統**
   - 權限控管（僅審核者可存取）
   - 批次審核功能
   - 詳細資訊檢視
   - 一鍵核准與郵件通知

3. **自動化作業**
   - 單號自動生成（格式：`IS-R-032-YYMMDD-##`）
   - 從範本自動產生變更申請文件
   - 審核完成自動發送通知郵件
   - 申請人與審核者雙向通知

4. **查詢追蹤**
   - 個人申請歷史記錄
   - 即時狀態更新
   - 核准日期與單號追蹤

### 🔐 權限管理

- 基於 Google 帳號的身份驗證
- 審核者權限控管
- 使用者資訊快取機制（300 秒）
- 組織內部專用（Domain-based access）

## 技術架構

### 技術棧

| 層級 | 技術 |
|------|------|
| **前端** | HTML5, CSS3, JavaScript |
| **後端** | Google Apps Script (V8 Runtime) |
| **資料庫** | Google Sheets |
| **文件系統** | Google Drive |
| **文件範本** | Google Docs |
| **通知系統** | Gmail API |
| **版本控制** | Git |

### 系統架構

```
┌─────────────────┐
│   使用者介面    │ (HTML/CSS/JavaScript)
│  index.html     │
│  form.html      │
│  myapply.html   │
│  review.html    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   應用邏輯層    │ (Google Apps Script)
│  code.js        │ ← 主要業務邏輯
│  Manual.js      │ ← 工具函數
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│         Google Workspace            │
│  ┌─────────┐  ┌──────┐  ┌────────┐ │
│  │ Sheets  │  │ Docs │  │ Gmail  │ │
│  │ (資料)  │  │(範本)│  │(通知)  │ │
│  └─────────┘  └──────┘  └────────┘ │
│  ┌─────────┐                        │
│  │  Drive  │  (文件存放)            │
│  └─────────┘                        │
└─────────────────────────────────────┘
```

### 資料結構

**主要工作表：**
- `申請紀錄` - 申請單主表
- `權限` - 使用者權限設定
- `資產清單` - IT 資產資料
- `影響範圍` - 影響範圍選項

**核心欄位：**
- 申請人資訊、時間戳記
- 資產詳細資料
- 變更前評估資料
- 審核狀態、審核者、審核時間
- 單號、文件連結

## 專案結構

```
change_apply/
├── appsscript.json        # Google Apps Script 配置檔
├── code.js                # 主要應用程式邏輯 (398 行)
├── Manual.js              # 手動操作工具函數 (165 行)
├── index.html             # 首頁/儀表板
├── form.html              # 申請表單頁面
├── myapply.html           # 我的申請查詢頁面
├── review.html            # 主管審核頁面
├── stylesheet.html        # 全域 CSS 樣式
├── loader.html            # 載入動畫元件
├── unauthorized.html      # 權限錯誤頁面
├── .gitignore             # Git 忽略清單
└── README.md              # 本文件
```

### 檔案說明

#### 後端檔案

- **code.js**
  - 全域配置與常數定義
  - 路由控制 (`doGet()`)
  - 資料存取函數
  - 審核流程處理
  - 單號生成邏輯
  - 文件產生功能
  - 郵件通知機制
  - 權限驗證

- **Manual.js**
  - Google Sheets 選單整合
  - 手動文件產生工具
  - 輔助單號生成函數

#### 前端檔案

- **index.html** - 首頁三卡片導航介面
- **form.html** - 完整的申請表單，包含動態下拉選單與驗證
- **myapply.html** - 個人申請記錄表格檢視
- **review.html** - 審核者專用批次審核介面

#### 共用元件

- **stylesheet.html** - 響應式 CSS 樣式
- **loader.html** - 載入進度條元件

## 安裝部署

### 前置需求

1. Google Workspace 帳號（組織帳號）
2. Google Sheets 權限
3. Google Drive 權限
4. clasp CLI（可選，用於本地開發）

### 部署步驟

#### 方法 1：直接從 Google Sheets 部署

1. **建立 Google 試算表**
   - 建立新的 Google Sheets 檔案
   - 建立以下工作表：`申請紀錄`、`權限`、`資產清單`、`影響範圍`

2. **設定工作表結構**
   - 參照 `code.js` 中的欄位索引設定欄位
   - 在 `權限` 工作表中設定審核者清單

3. **複製程式碼**
   - 開啟 Apps Script 編輯器（擴充功能 → Apps Script）
   - 複製所有 `.js` 和 `.html` 檔案內容
   - 貼上至對應的新建檔案

4. **配置設定**
   - 修改 `code.js` 中的試算表 ID
   - 設定文件範本 ID
   - 設定 Drive 資料夾路徑

5. **部署為網頁應用程式**
   - 點選「部署」→「新增部署作業」
   - 選擇類型：網頁應用程式
   - 執行身分：我
   - 存取權：組織內部
   - 複製網頁應用程式網址

#### 方法 2：使用 clasp 本地開發

```bash
# 1. 安裝 clasp
npm install -g @google/clasp

# 2. 登入 Google 帳號
clasp login

# 3. Clone 專案
git clone <repository-url>
cd change_apply

# 4. 建立 .clasp.json
clasp create --type standalone --title "系統變更申請系統"

# 5. 推送程式碼
clasp push

# 6. 部署
clasp deploy --description "Production v1.0"
```

### 配置文件範本

1. 在 Google Docs 中建立變更申請文件範本
2. 使用 `{{變數名稱}}` 作為佔位符（如：`{{申請人}}`、`{{資產名稱}}`）
3. 複製範本檔案 ID
4. 更新 `code.js` 中的 `TEMPLATE_DOC_ID`

## 使用說明

### 使用者操作流程

#### 1️⃣ 提交申請

1. 登入系統，點選「提出變更申請」
2. 依序選擇：
   - 資產群組
   - 資產類別
   - 具體資產
3. 填寫變更評估表單：
   - 勾選影響範圍
   - 描述變更內容
   - 記錄前測結果
   - 確認備份狀態
   - 說明風險減緩措施
4. 送出申請
5. 等待審核（系統會發信通知審核者）

#### 2️⃣ 查詢申請

1. 點選「查詢我的申請」
2. 檢視所有歷史申請
3. 確認申請狀態：
   - `申請中` - 等待審核
   - `已核准` - 審核通過（顯示單號與審核日期）

#### 3️⃣ 主管審核（限有權限者）

1. 點選「主管審核」
2. 檢視待審核清單
3. 點選「檢視詳細資訊」查看完整評估內容
4. 勾選要核准的申請項目
5. 點選「核准選取的申請」
6. 系統自動：
   - 產生單號
   - 建立變更申請文件
   - 發送核准通知郵件給申請人

### API 使用（供開發者）

主要可用的 Apps Script 函數：

```javascript
// 取得使用者的申請記錄
getUserApplications()

// 取得待審核清單
getPendingApprovals()

// 批次核准
processBatchApproval(rowIndices)

// 取得資產資料
getAssetData()

// 產生單號
generateAndSetRecordNumber(row)

// 發送通知郵件
sendNotificationEmail(recipientEmail, subject, body)
```

## 配置說明

### appsscript.json 設定

```json
{
  "timeZone": "Asia/Taipei",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "access": "DOMAIN",
    "executeAs": "USER_DEPLOYING"
  }
}
```

### code.js 關鍵配置

```javascript
// 試算表設定
const SHEET_NAME_RECORDS = '申請紀錄';
const SHEET_NAME_PERMISSIONS = '權限';
const SHEET_NAME_ASSETS = '資產清單';
const SHEET_NAME_IMPACT = '影響範圍';

// 文件範本 ID（需自行設定）
const TEMPLATE_DOC_ID = 'YOUR_TEMPLATE_DOC_ID';

// 文件存放路徑（需自行設定）
const DESTINATION_FOLDER_PATH = 'YOUR_FOLDER_PATH';

// 單號格式
const RECORD_NUMBER_PREFIX = 'IS-R-032';

// 快取時效（秒）
const CACHE_DURATION = 300;
```

### 工作表欄位對應

詳見 `code.js` 中的 `COLUMNS` 物件，例如：

```javascript
const COLUMNS = {
  timestamp: 1,
  applicant: 2,
  assetNumber: 6,
  assetName: 7,
  // ... 更多欄位
  status: 16,
  approver: 17,
  approvalDate: 18,
  recordNumber: 19
};
```

## 開發資訊

### 開發環境設定

```bash
# Clone 專案
git clone <repository-url>
cd change_apply

# 安裝 clasp（如尚未安裝）
npm install -g @google/clasp

# 登入 Google 帳號
clasp login

# 拉取最新程式碼
clasp pull
```

### 分支策略

- `main` - 主分支（穩定版本）
- `claude/*` - 功能開發分支

### Git 工作流程

```bash
# 建立功能分支
git checkout -b feature/your-feature-name

# 提交變更
git add .
git commit -m "描述你的變更"

# 推送到遠端
git push -u origin feature/your-feature-name
```

### 程式碼規範

- 使用 JSDoc 註解記錄函數
- 遵循 Google Apps Script 最佳實踐
- 中文註解說明業務邏輯
- 使用 V8 runtime 語法（ES6+）

### 測試

建議測試項目：

1. ✅ 表單提交與資料寫入
2. ✅ 階層式下拉選單運作
3. ✅ 權限驗證機制
4. ✅ 單號生成唯一性
5. ✅ 文件產生正確性
6. ✅ 郵件發送功能
7. ✅ 批次審核流程

## 常見問題

### Q: 如何新增審核者？

A: 在 `權限` 工作表中新增使用者的 Email 帳號。

### Q: 單號格式可以自訂嗎？

A: 可以，修改 `code.js` 中的 `generateAndSetRecordNumber()` 函數。

### Q: 如何修改文件範本？

A: 編輯 Google Docs 範本檔案，使用 `{{變數}}` 格式的佔位符。

### Q: 申請表單可以新增欄位嗎？

A: 可以，需同步修改：
1. `form.html` - 新增表單欄位
2. `code.js` - 更新 `COLUMNS` 定義
3. Google Sheets - 新增對應欄位

### Q: 如何啟用日誌記錄？

A: 開啟 Apps Script 專案的 Stackdriver Logging，使用 `console.log()` 記錄。

## 版本歷史

- **v3.5** (Current)
  - ✨ 批次審核功能
  - ✨ 郵件通知機制
  - ✨ 權限快取優化
  - ✨ 載入動畫改善

- **v3.0**
  - 初始版本
  - 基礎申請與審核功能

## 貢獻指南

歡迎提交 Issue 和 Pull Request！

1. Fork 本專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 授權資訊

本專案為內部使用系統，請遵守組織相關資訊安全政策。

---

## 聯絡資訊

如有任何問題或建議，請聯絡系統管理員或透過 Issue 系統回報。

---

**最後更新日期：** 2025-11-05

**維護者：** IT 部門

**狀態：** ✅ 穩定運行中
