# Google Apps Script 測試套件使用說明

## 概述

這個測試套件為 `code.js` 中的所有主要函式提供完整的單元測試。測試套件使用 Google Apps Script 內建的 Logger 進行測試輸出，並包含完整的斷言輔助函式。

## 檔案結構

```
├── code.js           # 主要應用程式碼
├── Tests.js          # 測試套件
└── TEST_README.md    # 本說明文件
```

## 如何使用

### 1. 安裝測試套件

1. 開啟您的 Google Apps Script 專案
2. 建立新的指令碼檔案，命名為 `Tests.js`
3. 將測試套件程式碼複製到該檔案中

### 2. 執行所有測試

在 Google Apps Script 編輯器中：

1. 選擇函式 `runAllTests`
2. 點擊執行按鈕（▶️）
3. 查看執行記錄（檢視 > 執行記錄）

或者在程式碼中呼叫：

```javascript
runAllTests();
```

### 3. 執行單一測試

如果您只想測試特定函式，可以使用：

```javascript
runSingleTest('testGetUserApplications');
```

可用的測試名稱：
- `testAssertionFunctions` - 測試斷言輔助函式
- `testGetUserInfoFromPermissionsSheet` - 測試權限資料讀取
- `testIsCurrentUserApprover` - 測試審核者權限檢查
- `testGetApproverEmails` - 測試審核者 Email 列表
- `testGetAssetData` - 測試資訊資產資料讀取
- `testGetFormDropdownOptions` - 測試表單下拉選單選項
- `testGetUserApplications` - 測試使用者申請紀錄
- `testGetPendingApprovals` - 測試待審核清單
- `testGenerateAndSetRecordNumber` - 測試紀錄編號生成
- `testSubmitApplicationValidation` - 測試申請表單驗證
- `testSendNotificationEmail` - 測試通知郵件發送

## 測試結果解讀

### 成功的測試輸出範例

```
✅ 測試通過: getUserApplications()
```

### 失敗的測試輸出範例

```
❌ 測試失敗: 期望值: 5, 實際值: 3
錯誤堆疊: Error: 斷言失敗...
```

### 測試統計報告

執行 `runAllTests()` 後，您會看到類似以下的統計報告：

```
========================================
測試執行完畢
========================================

📊 測試結果統計
----------------------------------------
總測試數: 11
✅ 通過: 11
❌ 失敗: 0
通過率: 100.00%

🎉 所有測試通過！
========================================
```

## 斷言輔助函式

測試套件包含以下斷言函式：

### 基礎斷言

- **`assert(condition, message)`**
  - 檢查條件是否為 true
  - 範例：`assert(x > 0, 'x 應該大於 0')`

### 相等性檢查

- **`assertEqual(actual, expected, message)`**
  - 檢查兩個值是否相等（使用 ===）
  - 範例：`assertEqual(result, 'success', '應回傳 success')`

- **`assertDeepEqual(actual, expected, message)`**
  - 檢查兩個物件是否深度相等（使用 JSON.stringify）
  - 範例：`assertDeepEqual(obj1, obj2, '物件應該相同')`

### Null/Undefined 檢查

- **`assertNotNull(value, message)`**
  - 檢查值不為 null 或 undefined
  - 範例：`assertNotNull(user, '使用者不應為 null')`

- **`assertNull(value, message)`**
  - 檢查值為 null 或 undefined
  - 範例：`assertNull(deletedItem, '已刪除的項目應為 null')`

### Boolean 檢查

- **`assertTrue(value, message)`**
  - 檢查值為 true
  - 範例：`assertTrue(isValid, '應該是有效的')`

- **`assertFalse(value, message)`**
  - 檢查值為 false
  - 範例：`assertFalse(hasError, '不應該有錯誤')`

### 陣列檢查

- **`assertContains(array, value, message)`**
  - 檢查陣列是否包含特定值
  - 範例：`assertContains(list, 'item', '清單應包含該項目')`

- **`assertArrayLength(array, expectedLength, message)`**
  - 檢查陣列長度
  - 範例：`assertArrayLength(results, 5, '應有 5 個結果')`

### 字串檢查

- **`assertStringContains(str, substring, message)`**
  - 檢查字串是否包含子字串
  - 範例：`assertStringContains(message, 'success', '訊息應包含 success')`

### 錯誤檢查

- **`assertThrows(func, message)`**
  - 檢查函式是否拋出錯誤
  - 範例：`assertThrows(() => divide(1, 0), '除以零應拋出錯誤')`

## 測試涵蓋的功能

### 1. 權限管理
- ✅ `getUserInfoFromPermissionsSheet()` - 讀取權限工作表
- ✅ `isCurrentUserApprover()` - 檢查審核者權限
- ✅ `getApproverEmails()` - 取得審核者清單

### 2. 資料讀取
- ✅ `getAssetData()` - 讀取資訊資產
- ✅ `getFormDropdownOptions()` - 讀取表單選項
- ✅ `getUserApplications()` - 讀取使用者申請
- ✅ `getPendingApprovals()` - 讀取待審核清單

### 3. 申請處理
- ✅ `submitApplication()` - 提交申請（驗證部分）
- ✅ `generateAndSetRecordNumber()` - 生成紀錄編號

### 4. 通知系統
- ✅ `sendNotificationEmail()` - 發送通知郵件

## 最佳實踐

### 1. 定期執行測試

建議在以下情況執行測試：
- 修改任何核心函式後
- 部署到生產環境前
- 發現 bug 並修復後

### 2. 閱讀測試日誌

Logger 輸出包含詳細的測試步驟和結果，仔細閱讀可以幫助您：
- 了解測試執行流程
- 快速定位問題
- 驗證修復是否成功

### 3. 擴展測試套件

當您新增功能時，記得：
- 為新函式撰寫對應的測試
- 將測試加入 `runAllTests()` 的測試清單
- 更新本說明文件

### 4. 處理失敗的測試

如果測試失敗：
1. 查看錯誤訊息和堆疊追蹤
2. 檢查相關的程式碼變更
3. 使用 `runSingleTest()` 專注於失敗的測試
4. 修復問題後重新執行測試

## 注意事項

### 權限要求

某些測試需要以下權限：
- 讀取 Google Sheets
- 取得使用者 Email
- 存取 Google Drive（文件生成功能）

### 環境限制

- 測試在真實的 Google Apps Script 環境中執行
- 某些測試會讀取實際的工作表資料
- 郵件發送測試不會實際發送郵件（使用空收件者測試）

### Mock 資料

對於可能修改資料的測試，套件提供了 Mock 物件：
- `createMockSpreadsheet()` - 建立測試用試算表
- `createMockSheet()` - 建立測試用工作表

## 疑難排解

### 問題：找不到工作表

**錯誤訊息：** `找不到名為 'xxx' 的工作表`

**解決方法：**
1. 確認工作表名稱正確
2. 檢查 `code.js` 中的工作表名稱常數
3. 確認您有存取該工作表的權限

### 問題：權限不足

**錯誤訊息：** `授權不足`

**解決方法：**
1. 執行任一函式以觸發授權流程
2. 在彈出視窗中授予必要權限
3. 重新執行測試

### 問題：測試逾時

**錯誤訊息：** `執行時間超過上限`

**解決方法：**
1. 使用 `runSingleTest()` 分別執行測試
2. 檢查是否有無限迴圈
3. 優化需要大量計算的測試

## 範例：撰寫新測試

如果您要為新函式撰寫測試：

```javascript
/**
 * 測試 newFunction 函式
 */
function testNewFunction() {
  Logger.log('========================================');
  Logger.log('測試: newFunction()');
  Logger.log('========================================');

  try {
    // 1. 準備測試資料
    Logger.log('準備測試資料...');
    const testData = { key: 'value' };

    // 2. 執行函式
    Logger.log('執行 newFunction...');
    const result = newFunction(testData);

    // 3. 驗證結果
    Logger.log('驗證結果...');
    assertNotNull(result, '結果不應為 null');
    assertEqual(result.status, 'success', '狀態應為 success');

    // 4. 記錄成功
    Logger.log('✅ 測試通過: newFunction()');
    return true;
  } catch (e) {
    // 5. 記錄失敗
    Logger.log('❌ 測試失敗: ' + e.message);
    Logger.log('錯誤堆疊: ' + e.stack);
    return false;
  }
}
```

然後將測試加入 `runAllTests()` 的測試陣列中。

## 貢獻

如果您改進了測試套件，請：
1. 確保所有現有測試仍然通過
2. 為新功能添加測試
3. 更新本說明文件

## 授權

本測試套件與主專案使用相同的授權條款。

---

**最後更新：** 2024

**版本：** 1.0

如有問題或建議，請聯繫專案維護者。
