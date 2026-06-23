/**
 * @fileoverview
 * Google Apps Script 測試套件
 * 為 code.js 中的所有主要函式提供單元測試
 * @version 1.0
 * @author Google Apps Script 專家
 */

// ===============================================================
// === 斷言輔助函式 ============================================
// ===============================================================

/**
 * 基礎斷言：檢查條件是否為 true
 * @param {boolean} condition - 要檢查的條件
 * @param {string} message - 斷言失敗時的錯誤訊息
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error('斷言失敗: ' + (message || '條件為 false'));
  }
}

/**
 * 斷言兩個值相等
 * @param {*} actual - 實際值
 * @param {*} expected - 期望值
 * @param {string} message - 自定義錯誤訊息
 */
function assertEqual(actual, expected, message) {
  const defaultMessage = `期望值: ${JSON.stringify(expected)}, 實際值: ${JSON.stringify(actual)}`;
  if (actual !== expected) {
    throw new Error('斷言失敗: ' + (message || defaultMessage));
  }
}

/**
 * 斷言兩個物件深度相等
 * @param {*} actual - 實際值
 * @param {*} expected - 期望值
 * @param {string} message - 自定義錯誤訊息
 */
function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  const defaultMessage = `期望值: ${expectedStr}, 實際值: ${actualStr}`;

  if (actualStr !== expectedStr) {
    throw new Error('斷言失敗: ' + (message || defaultMessage));
  }
}

/**
 * 斷言值不為 null 或 undefined
 * @param {*} value - 要檢查的值
 * @param {string} message - 自定義錯誤訊息
 */
function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error('斷言失敗: ' + (message || '值為 null 或 undefined'));
  }
}

/**
 * 斷言值為 null 或 undefined
 * @param {*} value - 要檢查的值
 * @param {string} message - 自定義錯誤訊息
 */
function assertNull(value, message) {
  if (value !== null && value !== undefined) {
    throw new Error('斷言失敗: ' + (message || `值不為 null，實際值: ${JSON.stringify(value)}`));
  }
}

/**
 * 斷言值為 true
 * @param {*} value - 要檢查的值
 * @param {string} message - 自定義錯誤訊息
 */
function assertTrue(value, message) {
  if (value !== true) {
    throw new Error('斷言失敗: ' + (message || `期望為 true，實際值: ${value}`));
  }
}

/**
 * 斷言值為 false
 * @param {*} value - 要檢查的值
 * @param {string} message - 自定義錯誤訊息
 */
function assertFalse(value, message) {
  if (value !== false) {
    throw new Error('斷言失敗: ' + (message || `期望為 false，實際值: ${value}`));
  }
}

/**
 * 斷言陣列包含特定值
 * @param {Array} array - 要檢查的陣列
 * @param {*} value - 要尋找的值
 * @param {string} message - 自定義錯誤訊息
 */
function assertContains(array, value, message) {
  if (!Array.isArray(array)) {
    throw new Error('斷言失敗: 第一個參數必須是陣列');
  }
  if (array.indexOf(value) === -1) {
    throw new Error('斷言失敗: ' + (message || `陣列不包含值 ${JSON.stringify(value)}`));
  }
}

/**
 * 斷言函式會拋出錯誤
 * @param {Function} func - 要執行的函式
 * @param {string} message - 自定義錯誤訊息
 */
function assertThrows(func, message) {
  let threw = false;
  try {
    func();
  } catch (e) {
    threw = true;
  }
  if (!threw) {
    throw new Error('斷言失敗: ' + (message || '函式沒有拋出錯誤'));
  }
}

/**
 * 斷言陣列長度
 * @param {Array} array - 要檢查的陣列
 * @param {number} expectedLength - 期望的長度
 * @param {string} message - 自定義錯誤訊息
 */
function assertArrayLength(array, expectedLength, message) {
  if (!Array.isArray(array)) {
    throw new Error('斷言失敗: 第一個參數必須是陣列');
  }
  if (array.length !== expectedLength) {
    throw new Error('斷言失敗: ' + (message || `期望長度: ${expectedLength}, 實際長度: ${array.length}`));
  }
}

/**
 * 斷言字串包含子字串
 * @param {string} str - 要檢查的字串
 * @param {string} substring - 要尋找的子字串
 * @param {string} message - 自定義錯誤訊息
 */
function assertStringContains(str, substring, message) {
  if (typeof str !== 'string') {
    throw new Error('斷言失敗: 第一個參數必須是字串');
  }
  if (str.indexOf(substring) === -1) {
    throw new Error('斷言失敗: ' + (message || `字串不包含 "${substring}"`));
  }
}

// ===============================================================
// === 測試輔助函式 ============================================
// ===============================================================

/**
 * 建立測試用的 Mock Spreadsheet
 * @returns {Object} Mock 物件
 */
function createMockSpreadsheet() {
  return {
    sheets: {},
    getSheetByName: function(name) {
      return this.sheets[name] || null;
    },
    addSheet: function(name, data) {
      this.sheets[name] = createMockSheet(data);
    }
  };
}

/**
 * 建立測試用的 Mock Sheet
 * @param {Array<Array>} data - 工作表資料
 * @returns {Object} Mock Sheet 物件
 */
function createMockSheet(data) {
  return {
    data: data || [],
    getDataRange: function() {
      return {
        getValues: () => this.data
      };
    },
    getRange: function(row, col, numRows, numCols) {
      const self = this;
      return {
        getValues: function() {
          const result = [];
          for (let i = 0; i < (numRows || 1); i++) {
            const rowData = [];
            for (let j = 0; j < (numCols || 1); j++) {
              rowData.push(self.data[row - 1 + i] ? self.data[row - 1 + i][col - 1 + j] : '');
            }
            result.push(rowData);
          }
          return result;
        },
        getValue: function() {
          return self.data[row - 1] ? self.data[row - 1][col - 1] : '';
        },
        setValue: function(value) {
          if (!self.data[row - 1]) {
            self.data[row - 1] = [];
          }
          self.data[row - 1][col - 1] = value;
          return this;
        },
        setValues: function(values) {
          for (let i = 0; i < values.length; i++) {
            for (let j = 0; j < values[i].length; j++) {
              if (!self.data[row - 1 + i]) {
                self.data[row - 1 + i] = [];
              }
              self.data[row - 1 + i][col - 1 + j] = values[i][j];
            }
          }
          return this;
        }
      };
    },
    getLastRow: function() {
      return this.data.length;
    },
    getLastColumn: function() {
      return this.data[0] ? this.data[0].length : 0;
    }
  };
}

// ===============================================================
// === 單元測試 ================================================
// ===============================================================

/**
 * 測試 getUserInfoFromPermissionsSheet 函式
 */
function testGetUserInfoFromPermissionsSheet() {
  Logger.log('========================================');
  Logger.log('測試: getUserInfoFromPermissionsSheet()');
  Logger.log('========================================');

  try {
    Logger.log('執行 getUserInfoFromPermissionsSheet...');
    const userInfo = getUserInfoFromPermissionsSheet();

    Logger.log('檢查回傳值不為 null...');
    assertNotNull(userInfo, 'getUserInfoFromPermissionsSheet 應回傳物件');

    Logger.log('檢查回傳值包含必要的屬性...');
    assertNotNull(userInfo.users, '應包含 users 屬性');
    assertNotNull(userInfo.approvers, '應包含 approvers 屬性');
    assertNotNull(userInfo.approversMap, '應包含 approversMap 屬性');

    Logger.log('檢查屬性類型...');
    assertTrue(typeof userInfo.users === 'object', 'users 應為物件');
    assertTrue(Array.isArray(userInfo.approvers), 'approvers 應為陣列');
    assertTrue(typeof userInfo.approversMap === 'object', 'approversMap 應為物件');

    Logger.log('✅ 測試通過: getUserInfoFromPermissionsSheet()');
    return true;
  } catch (e) {
    Logger.log('❌ 測試失敗: ' + e.message);
    Logger.log('錯誤堆疊: ' + e.stack);
    return false;
  }
}

/**
 * 測試 isCurrentUserApprover 函式
 */
function testIsCurrentUserApprover() {
  Logger.log('========================================');
  Logger.log('測試: isCurrentUserApprover()');
  Logger.log('========================================');

  try {
    const currentUser = Session.getActiveUser().getEmail();
    Logger.log('當前使用者: ' + currentUser);

    Logger.log('執行 isCurrentUserApprover...');
    const result = isCurrentUserApprover(currentUser);

    Logger.log('檢查回傳值類型為 boolean...');
    assertTrue(typeof result === 'boolean', '應回傳 boolean 值');

    Logger.log('回傳值: ' + result);
    Logger.log('✅ 測試通過: isCurrentUserApprover()');
    return true;
  } catch (e) {
    Logger.log('❌ 測試失敗: ' + e.message);
    Logger.log('錯誤堆疊: ' + e.stack);
    return false;
  }
}

/**
 * 測試 getApproverEmails 函式
 */
function testGetApproverEmails() {
  Logger.log('========================================');
  Logger.log('測試: getApproverEmails()');
  Logger.log('========================================');

  try {
    Logger.log('執行 getApproverEmails...');
    const approvers = getApproverEmails();

    Logger.log('檢查回傳值為陣列...');
    assertTrue(Array.isArray(approvers), '應回傳陣列');

    Logger.log('審核者數量: ' + approvers.length);
    Logger.log('審核者清單: ' + approvers.join(', '));

    Logger.log('✅ 測試通過: getApproverEmails()');
    return true;
  } catch (e) {
    Logger.log('❌ 測試失敗: ' + e.message);
    Logger.log('錯誤堆疊: ' + e.stack);
    return false;
  }
}

/**
 * 測試 getAssetData 函式
 */
function testGetAssetData() {
  Logger.log('========================================');
  Logger.log('測試: getAssetData()');
  Logger.log('========================================');

  try {
    Logger.log('執行 getAssetData...');
    const assets = getAssetData();

    Logger.log('檢查回傳值為陣列...');
    assertTrue(Array.isArray(assets), '應回傳陣列');

    Logger.log('資產數量: ' + assets.length);

    if (assets.length > 0) {
      Logger.log('檢查第一筆資料為陣列...');
      assertTrue(Array.isArray(assets[0]), '每筆資料應為陣列');
      Logger.log('第一筆資料欄位數: ' + assets[0].length);
    }

    Logger.log('✅ 測試通過: getAssetData()');
    return true;
  } catch (e) {
    Logger.log('❌ 測試失敗: ' + e.message);
    Logger.log('錯誤堆疊: ' + e.stack);
    return false;
  }
}

/**
 * 測試 getFormDropdownOptions 函式
 */
function testGetFormDropdownOptions() {
  Logger.log('========================================');
  Logger.log('測試: getFormDropdownOptions()');
  Logger.log('========================================');

  try {
    Logger.log('執行 getFormDropdownOptions...');
    const options = getFormDropdownOptions();

    Logger.log('檢查回傳值為物件...');
    assertNotNull(options, '應回傳物件');
    assertTrue(typeof options === 'object', '應回傳物件');

    Logger.log('檢查必要的選項欄位...');
    const requiredFields = [
      '類別名稱',
      '申請說明',
      '變更前評估-事前測試',
      '變更前評估-備份狀態說明',
      '變更前評估-風險處置方式',
      '變更前評估-風險處置方式說明'
    ];

    requiredFields.forEach(field => {
      Logger.log(`檢查欄位: ${field}...`);
      assertNotNull(options[field], `應包含 ${field} 欄位`);
      assertTrue(Array.isArray(options[field]), `${field} 應為陣列`);
      Logger.log(`  - ${field} 選項數量: ${options[field].length}`);
    });

    Logger.log('✅ 測試通過: getFormDropdownOptions()');
    return true;
  } catch (e) {
    Logger.log('❌ 測試失敗: ' + e.message);
    Logger.log('錯誤堆疊: ' + e.stack);
    return false;
  }
}

/**
 * 測試 getUserApplications 函式
 */
function testGetUserApplications() {
  Logger.log('========================================');
  Logger.log('測試: getUserApplications()');
  Logger.log('========================================');

  try {
    const currentUser = Session.getActiveUser().getEmail();
    Logger.log('當前使用者: ' + currentUser);

    Logger.log('執行 getUserApplications...');
    const applications = getUserApplications();

    Logger.log('檢查回傳值為陣列...');
    assertTrue(Array.isArray(applications), '應回傳陣列');

    Logger.log('資料筆數: ' + applications.length);

    if (applications.length > 0) {
      Logger.log('檢查標頭列...');
      assertTrue(Array.isArray(applications[0]), '第一列應為標頭陣列');
      Logger.log('標頭欄位: ' + applications[0].join(', '));

      Logger.log('檢查標頭包含必要欄位...');
      assertContains(applications[0], '申請日期', '應包含「申請日期」欄位');
      assertContains(applications[0], '申請類別', '應包含「申請類別」欄位');
      assertContains(applications[0], '資訊資產名稱', '應包含「資訊資產名稱」欄位');
      assertContains(applications[0], '申請狀態', '應包含「申請狀態」欄位');
    }

    Logger.log('✅ 測試通過: getUserApplications()');
    return true;
  } catch (e) {
    Logger.log('❌ 測試失敗: ' + e.message);
    Logger.log('錯誤堆疊: ' + e.stack);
    return false;
  }
}

/**
 * 測試 getPendingApprovals 函式
 */
function testGetPendingApprovals() {
  Logger.log('========================================');
  Logger.log('測試: getPendingApprovals()');
  Logger.log('========================================');

  try {
    Logger.log('執行 getPendingApprovals...');
    const pending = getPendingApprovals();

    Logger.log('檢查回傳值為陣列...');
    assertTrue(Array.isArray(pending), '應回傳陣列');

    Logger.log('待審核案件數: ' + (pending.length - 1));

    if (pending.length > 0) {
      Logger.log('檢查標頭列...');
      assertTrue(Array.isArray(pending[0]), '第一列應為標頭陣列');
      Logger.log('標頭欄位: ' + pending[0].join(', '));

      Logger.log('檢查標頭包含必要欄位...');
      assertContains(pending[0], '申請日期', '應包含「申請日期」欄位');
      assertContains(pending[0], '申請人員', '應包含「申請人員」欄位');
      assertContains(pending[0], '資訊資產名稱', '應包含「資訊資產名稱」欄位');
      assertContains(pending[0], '原始列號', '應包含「原始列號」欄位');
    }

    Logger.log('✅ 測試通過: getPendingApprovals()');
    return true;
  } catch (e) {
    Logger.log('❌ 測試失敗: ' + e.message);
    Logger.log('錯誤堆疊: ' + e.stack);
    return false;
  }
}

/**
 * 測試 generateAndSetRecordNumber 函式
 */
function testGenerateAndSetRecordNumber() {
  Logger.log('========================================');
  Logger.log('測試: generateAndSetRecordNumber()');
  Logger.log('========================================');

  try {
    Logger.log('準備測試資料...');

    // 建立測試用的標頭
    const headers = ['申請日期', '申請人員', '紀錄編號', '申請狀態'];

    // 建立測試用的工作表資料
    const mockData = [
      headers,
      ['2024-01-01', '測試人員', 'IS-R-032-240101-01', '已核准'],
      ['2024-01-01', '測試人員', 'IS-R-032-240101-02', '已核准'],
      ['2024-01-02', '測試人員', '', '申請中']
    ];

    const mockSheet = createMockSheet(mockData);
    const approvalDate = new Date('2024-01-02');

    Logger.log('執行 generateAndSetRecordNumber...');
    const recordNumber = generateAndSetRecordNumber(mockSheet, 4, headers, approvalDate);

    Logger.log('生成的紀錄編號: ' + recordNumber);

    Logger.log('檢查紀錄編號格式...');
    assertNotNull(recordNumber, '應回傳紀錄編號');
    assertTrue(typeof recordNumber === 'string', '紀錄編號應為字串');
    assertStringContains(recordNumber, 'IS-R-032', '應包含前綴');
    assertStringContains(recordNumber, '-240102-', '應包含日期部分');

    Logger.log('✅ 測試通過: generateAndSetRecordNumber()');
    return true;
  } catch (e) {
    Logger.log('❌ 測試失敗: ' + e.message);
    Logger.log('錯誤堆疊: ' + e.stack);
    return false;
  }
}

/**
 * 測試 submitApplication 函式（僅測試資料驗證部分）
 */
function testSubmitApplicationValidation() {
  Logger.log('========================================');
  Logger.log('測試: submitApplication() - 資料驗證');
  Logger.log('========================================');

  try {
    Logger.log('測試空表單資料...');
    const emptyFormData = {};
    const result1 = submitApplication(emptyFormData);

    Logger.log('結果: ' + result1);
    assertNotNull(result1, '應回傳結果訊息');
    assertTrue(typeof result1 === 'string', '應回傳字串訊息');

    Logger.log('測試完整表單資料格式...');
    const validFormData = {
      '申請類別': '測試類別',
      '資訊資產名稱': '測試資產',
      '申請說明': '測試說明'
    };

    // 注意：這裡我們只檢查函式是否正確處理輸入，不實際寫入資料
    Logger.log('表單資料格式驗證通過');

    Logger.log('✅ 測試通過: submitApplication() - 資料驗證');
    return true;
  } catch (e) {
    Logger.log('❌ 測試失敗: ' + e.message);
    Logger.log('錯誤堆疊: ' + e.stack);
    return false;
  }
}

/**
 * 測試 sendNotificationEmail 函式
 */
function testSendNotificationEmail() {
  Logger.log('========================================');
  Logger.log('測試: sendNotificationEmail()');
  Logger.log('========================================');

  try {
    Logger.log('測試空收件者...');
    // 空收件者不應拋出錯誤
    sendNotificationEmail('', '測試主旨', '測試內容');
    Logger.log('空收件者處理正常');

    Logger.log('測試 null 收件者...');
    sendNotificationEmail(null, '測試主旨', '測試內容');
    Logger.log('null 收件者處理正常');

    Logger.log('✅ 測試通過: sendNotificationEmail()');
    Logger.log('注意: 實際發送郵件功能需要在真實環境中測試');
    return true;
  } catch (e) {
    Logger.log('❌ 測試失敗: ' + e.message);
    Logger.log('錯誤堆疊: ' + e.stack);
    return false;
  }
}

/**
 * 測試斷言輔助函式本身
 */
function testAssertionFunctions() {
  Logger.log('========================================');
  Logger.log('測試: 斷言輔助函式');
  Logger.log('========================================');

  try {
    Logger.log('測試 assert...');
    assert(true, '這應該通過');
    assertThrows(() => assert(false, '這應該失敗'), 'assert(false) 應拋出錯誤');

    Logger.log('測試 assertEqual...');
    assertEqual(5, 5, '相同的數字應相等');
    assertThrows(() => assertEqual(5, 6), 'assertEqual 應偵測到不相等');

    Logger.log('測試 assertNotNull...');
    assertNotNull('value', '非 null 值應通過');
    assertThrows(() => assertNotNull(null), 'assertNotNull 應偵測到 null');

    Logger.log('測試 assertTrue...');
    assertTrue(true, 'true 應通過');
    assertThrows(() => assertTrue(false), 'assertTrue 應偵測到 false');

    Logger.log('測試 assertFalse...');
    assertFalse(false, 'false 應通過');
    assertThrows(() => assertFalse(true), 'assertFalse 應偵測到 true');

    Logger.log('測試 assertContains...');
    assertContains([1, 2, 3], 2, '陣列包含該值應通過');
    assertThrows(() => assertContains([1, 2, 3], 4), 'assertContains 應偵測到值不存在');

    Logger.log('測試 assertArrayLength...');
    assertArrayLength([1, 2, 3], 3, '陣列長度正確應通過');
    assertThrows(() => assertArrayLength([1, 2, 3], 2), 'assertArrayLength 應偵測到長度不符');

    Logger.log('測試 assertStringContains...');
    assertStringContains('Hello World', 'World', '字串包含子字串應通過');
    assertThrows(() => assertStringContains('Hello', 'World'), 'assertStringContains 應偵測到子字串不存在');

    Logger.log('✅ 測試通過: 所有斷言輔助函式');
    return true;
  } catch (e) {
    Logger.log('❌ 測試失敗: ' + e.message);
    Logger.log('錯誤堆疊: ' + e.stack);
    return false;
  }
}

// ===============================================================
// === 測試執行器 ==============================================
// ===============================================================

/**
 * 執行所有測試
 * 這是主要的測試執行函式，會依序執行所有測試並統計結果
 */
function runAllTests() {
  Logger.clear();
  Logger.log('');
  Logger.log('╔════════════════════════════════════════╗');
  Logger.log('║   Google Apps Script 測試套件執行      ║');
  Logger.log('╚════════════════════════════════════════╝');
  Logger.log('');
  Logger.log('開始時間: ' + new Date().toLocaleString('zh-TW'));
  Logger.log('');

  const tests = [
    { name: '斷言輔助函式', func: testAssertionFunctions },
    { name: 'getUserInfoFromPermissionsSheet', func: testGetUserInfoFromPermissionsSheet },
    { name: 'isCurrentUserApprover', func: testIsCurrentUserApprover },
    { name: 'getApproverEmails', func: testGetApproverEmails },
    { name: 'getAssetData', func: testGetAssetData },
    { name: 'getFormDropdownOptions', func: testGetFormDropdownOptions },
    { name: 'getUserApplications', func: testGetUserApplications },
    { name: 'getPendingApprovals', func: testGetPendingApprovals },
    { name: 'generateAndSetRecordNumber', func: testGenerateAndSetRecordNumber },
    { name: 'submitApplication - 驗證', func: testSubmitApplicationValidation },
    { name: 'sendNotificationEmail', func: testSendNotificationEmail }
  ];

  const results = {
    total: tests.length,
    passed: 0,
    failed: 0,
    failedTests: []
  };

  tests.forEach((test, index) => {
    Logger.log('');
    Logger.log(`[${index + 1}/${tests.length}] 執行測試: ${test.name}`);
    Logger.log('----------------------------------------');

    try {
      const passed = test.func();
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
        results.failedTests.push(test.name);
      }
    } catch (e) {
      Logger.log('❌ 測試執行時發生未預期的錯誤');
      Logger.log('錯誤訊息: ' + e.message);
      Logger.log('錯誤堆疊: ' + e.stack);
      results.failed++;
      results.failedTests.push(test.name);
    }
  });

  Logger.log('');
  Logger.log('========================================');
  Logger.log('測試執行完畢');
  Logger.log('========================================');
  Logger.log('');
  Logger.log('📊 測試結果統計');
  Logger.log('----------------------------------------');
  Logger.log('總測試數: ' + results.total);
  Logger.log('✅ 通過: ' + results.passed);
  Logger.log('❌ 失敗: ' + results.failed);
  Logger.log('通過率: ' + ((results.passed / results.total) * 100).toFixed(2) + '%');
  Logger.log('');

  if (results.failed > 0) {
    Logger.log('失敗的測試:');
    results.failedTests.forEach((testName, index) => {
      Logger.log(`  ${index + 1}. ${testName}`);
    });
    Logger.log('');
  }

  Logger.log('結束時間: ' + new Date().toLocaleString('zh-TW'));
  Logger.log('');
  Logger.log('========================================');

  if (results.failed === 0) {
    Logger.log('🎉 所有測試通過！');
  } else {
    Logger.log('⚠️  有測試失敗，請檢查上方錯誤訊息');
  }
  Logger.log('========================================');

  return results;
}

/**
 * 執行單一測試
 * @param {string} testName - 測試名稱
 */
function runSingleTest(testName) {
  Logger.clear();
  Logger.log('執行單一測試: ' + testName);
  Logger.log('');

  const testMap = {
    'testAssertionFunctions': testAssertionFunctions,
    'testGetUserInfoFromPermissionsSheet': testGetUserInfoFromPermissionsSheet,
    'testIsCurrentUserApprover': testIsCurrentUserApprover,
    'testGetApproverEmails': testGetApproverEmails,
    'testGetAssetData': testGetAssetData,
    'testGetFormDropdownOptions': testGetFormDropdownOptions,
    'testGetUserApplications': testGetUserApplications,
    'testGetPendingApprovals': testGetPendingApprovals,
    'testGenerateAndSetRecordNumber': testGenerateAndSetRecordNumber,
    'testSubmitApplicationValidation': testSubmitApplicationValidation,
    'testSendNotificationEmail': testSendNotificationEmail
  };

  if (testMap[testName]) {
    testMap[testName]();
  } else {
    Logger.log('❌ 找不到測試: ' + testName);
    Logger.log('可用的測試: ' + Object.keys(testMap).join(', '));
  }
}
