/**
 * @fileoverview
 * 系統變更申請 Web App 後端主程式
 * @version 3.5 - 根據審核時間生成紀錄編號
 * @author Google Apps Script 專家
 */

// ===============================================================
// === 全域設定 ================================================
// ===============================================================
const SS = SpreadsheetApp.getActiveSpreadsheet();
const SHEET_RECORDS_NAME = '申請紀錄';
const SHEET_PERMISSIONS_NAME = '權限';
const SHEET_OPTIONS_NAME = '下拉選單'; // ✨【新增】選項工作表的名稱
const SHEET_ASSETS_NAME = '資訊資產'; // ✨【新增】資訊資產工作表的名稱

// --- ✨【核心修改】定義所有需要的欄位索引 (A欄=1, B欄=2, etc.) ---
const RECORDS_APPLICANT_EMAIL_COL = 16; // P欄: 申請人員帳號
const RECORDS_APPLICANT_NAME_COL = 15;  // O欄: 申請人員
const RECORDS_DATE_COL = 14;            // N欄: 申請日期
const RECORDS_CATEGORY_COL = 2;         // B欄: 申請類別
const RECORDS_ASSET_NAME_COL = 4;       // D欄: 資訊資產名稱
const RECORDS_DESCRIPTION_COL = 6;      // F欄: 申請說明
const RECORDS_STATUS_COL = 19;          // S欄: 申請狀態
const RECORDS_DOC_LINK_COL = 25;        // Y欄: 文件連結
const RECORDS_RECORD_NUM_COL = 23;      // W欄: 紀錄編號

// Google Doc 範本與目標資料夾 ID
const TEMPLATE_ID = '1zAYkTAu6zIwB6d7LWMyQMIfVY6r0a-_u5PhXn8gPSrI';
const DESTINATION_FOLDER_ID = '1c5bXz6RESiFKpQV6rxU_FIBrM3Fs_pAX';
const RECORD_NUMBER_PREFIX = 'IS-R-032';


// ===============================================================
// === Web App 路由 ============================================
// ===============================================================
function doGet(e) {
  const page = e.parameter.page || 'index';
  const currentUser = Session.getActiveUser().getEmail();

  if (page === 'review' && !isCurrentUserApprover(currentUser)) {
    return HtmlService.createHtmlOutputFromFile('unauthorized').setTitle('權限不足');
  }

  const template = HtmlService.createTemplateFromFile(page);
  template.currentUser = currentUser;
  template.isApprover = isCurrentUserApprover(currentUser);
  return template.evaluate().setTitle('系統變更申請');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ===============================================================
// === ✨【核心修改】前端資料讀取函式 ===============================
// ===============================================================

/**
 * ✨【新增】讀取並回傳所有資訊資產資料
 * @returns {Array<Array<string>>} 包含所有資產資訊的二維陣列
 */
function getAssetData() {
  try {
    const sheet = SS.getSheetByName(SHEET_ASSETS_NAME);
    if (!sheet) {
      throw new Error(`找不到名為 "${SHEET_ASSETS_NAME}" 的工作表。`);
    }
    // 從第二行開始讀取，跳過標頭
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    return data;
  } catch (e) {
    Logger.log(e);
    // 回傳一個空陣列，讓前端可以處理錯誤
    return [];
  }
}

/**
 * 處理前端提交的申請表單
 * (此版本與您既有的所有輔助函式完全兼容)
 */
function submitApplication(formData) {
  try {
    const sheet = SS.getSheetByName(SHEET_RECORDS_NAME);
    if (!sheet) throw new Error(`找不到工作表: '${SHEET_RECORDS_NAME}'`);

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const submissionDate = new Date();
    const currentUserEmail = Session.getActiveUser().getEmail();
    const userInfo = getUserInfoFromPermissionsSheet(); // <-- 正確呼叫您既有的函式
    const applicantName = userInfo.users[currentUserEmail] || '未知使用者';

    const newRow = headers.map(header => {
      const trimmedHeader = header.trim();
      switch (trimmedHeader) {
        case '申請日期': return submissionDate;
        case '申請人員': return applicantName;
        case '申請人員帳號': return currentUserEmail;
        case '申請狀態': return '申請中';
        case '年': return submissionDate.getFullYear();
        case '月': return submissionDate.getMonth() + 1;
        case '日': return submissionDate.getDate();
        default: return formData[trimmedHeader] || '';
      }
    });
    
    const nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);
    
    const approvers = userInfo.approvers;
    if (approvers && approvers.length > 0) {
      const subject = `[系統變更申請] 新案件待審核 - ${formData['資訊資產名稱'] || 'N/A'}`;
      const body = `申請人：${applicantName} (${currentUserEmail})\n` +
                   `資訊資產名稱：${formData['資訊資產名稱'] || 'N/A'}\n` +
                   `申請說明：${formData['申請說明'] || ''}\n\n` +
                   `請至審核頁面進行審核：${ScriptApp.getService().getUrl()}?page=review`;
      
      // 正確呼叫您既有的 sendNotificationEmail 函式
      sendNotificationEmail(approvers.join(','), subject, body);
    }

    return '申請已成功提交！';
  } catch (e) {
    Logger.log(`submitApplication 錯誤: ${e.message} (stack: ${e.stack})`);
    return `提交失敗：${e.message}`;
  }
}

/**
 * ✨【核心修改 4】
 * 取得當前使用者提交的申請紀錄，並只回傳指定的 10 個欄位。
 * @returns {Array<Array<any>>}
 */
function getUserApplications() {
  try {
    const currentUser = Session.getActiveUser().getEmail();
    const isApprover = isCurrentUserApprover(currentUser);
    const sheet = SS.getSheetByName(SHEET_RECORDS_NAME);
    if (!sheet) throw new Error(`工作表 '${SHEET_RECORDS_NAME}' 不存在。`);

    const allData = sheet.getDataRange().getValues();
    
    // 步驟 1: 定義要顯示的欄位標題與對應的原始欄位索引 (0-based)
    // First, get the headers to find the rejection reason column index dynamically
    const headers = allData[0];
    const rejectReasonIndex = headers.indexOf('拒絕原因');
    
    const desiredColumns = [
      { header: '申請日期', index: 13 },     // N
      { header: '申請人員', index: RECORDS_APPLICANT_NAME_COL - 1 }, // O
      { header: '申請類別', index: 1 },      // B
      { header: '資訊資產編號', index: 2 },  // C
      { header: '資訊資產名稱', index: 3 },   // D
      { header: '申請說明', index: 5 },      // F
      { header: '變更前資訊', index: 11 },    // L
      { header: '變更後資訊', index: 12 },    // M
      { header: '紀錄編號', index: 22 },     // W
      { header: '申請狀態', index: 18 },     // S
      { header: '審核通過時間', index: 23 },  // X
    ];
    
    // Add rejection reason column if it exists in the spreadsheet
    if (rejectReasonIndex !== -1) {
      desiredColumns.push({ header: '拒絕原因', index: rejectReasonIndex });
    }

    const desiredHeader = desiredColumns.map(col => col.header);
    desiredHeader.push('申請單');
    if (allData.length <= 1) return [desiredHeader];

    const dataRows = allData.slice(1);
    const userApps = [];
    dataRows.forEach((row, index) => {
      if (!row || row.length <= RECORDS_APPLICANT_EMAIL_COL - 1) return;
      const rowEmail = row[RECORDS_APPLICANT_EMAIL_COL - 1];
      if (isApprover ? rowEmail : rowEmail === currentUser) {
        userApps.push({ row, rowNumber: index + 2 });
      }
    });
    
    const mappedUserApps = userApps.map(({ row, rowNumber }) => {
      const mappedRow = desiredColumns.map(col => {
        const cellValue = row[col.index];
        if ((col.header === '申請日期' || col.header === '審核通過時間') && cellValue instanceof Date && !isNaN(cellValue)) {
          return Utilities.formatDate(cellValue, Session.getScriptTimeZone(), "yyyy/MM/dd");
        }
        return cellValue;
      });
      mappedRow.push(rowNumber);
      return mappedRow;
    });

    return [desiredHeader, ...mappedUserApps];
  } catch (e) {
    Logger.log(`getUserApplications 錯誤: ${e.message}`);
    return [['錯誤'], ['讀取紀錄時發生錯誤: ' + e.message]];
  }
}

function createApplicationDocument(rowNumber) {
  try {
    if (!rowNumber || rowNumber < 2) throw new Error('無效的申請列號。');
    const sheet = SS.getSheetByName(SHEET_RECORDS_NAME);
    if (!sheet) throw new Error(`找不到工作表: '${SHEET_RECORDS_NAME}'`);

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusCol = headers.indexOf('申請狀態') + 1;
    const applicantEmailCol = headers.indexOf('申請人員帳號') + 1;
    const docLinkCol = headers.indexOf('文件連結') + 1;
    const recordNumCol = headers.indexOf('紀錄編號') + 1;

    if (!statusCol) throw new Error("找不到 '申請狀態' 的欄位標頭。");
    if (!applicantEmailCol) throw new Error("找不到 '申請人員帳號' 的欄位標頭。");
    if (!docLinkCol) throw new Error("找不到 '文件連結' 的欄位標頭。");
    if (!recordNumCol) throw new Error("找不到 '紀錄編號' 的欄位標頭。");

    const currentUser = Session.getActiveUser().getEmail();
    const applicantEmail = sheet.getRange(rowNumber, applicantEmailCol).getValue();
    if (!isCurrentUserApprover(currentUser) && applicantEmail !== currentUser) {
      throw new Error('權限不足，無法產生申請單。');
    }

    const status = sheet.getRange(rowNumber, statusCol).getValue();
    if (status !== '已核准') throw new Error('僅已核准的申請可產生申請單。');

    const existingLink = sheet.getRange(rowNumber, docLinkCol).getValue();
    if (existingLink) return existingLink;

    const recordNumber = sheet.getRange(rowNumber, recordNumCol).getValue();
    if (!recordNumber) throw new Error('尚未產生紀錄編號，請確認審核流程完成。');

    generateDocumentForRow(sheet, rowNumber, headers, recordNumber);

    const newLink = sheet.getRange(rowNumber, docLinkCol).getValue();
    if (!newLink) throw new Error('文件產生失敗，請稍後再試。');
    return newLink;
  } catch (e) {
    Logger.log(`createApplicationDocument 錯誤: ${e.message} (stack: ${e.stack})`);
    throw new Error(e.message);
  }
}

/**
 * ✨【核心修改】完全採用範例程式碼的架構重構
 * 取得所有待審核的申請案件，並只回傳指定的欄位。
 * @returns {Array<Array<any>>}
 */
function getPendingApprovals() {
  try {
    const sheet = SS.getSheetByName(SHEET_RECORDS_NAME);
    if (!sheet) throw new Error(`工作表 '${SHEET_RECORDS_NAME}' 不存在。`);

    const allData = sheet.getDataRange().getValues();

    // 步驟 1: 定義審核頁面需要顯示的欄位標題與對應的原始欄位索引 (0-based)
    // 這裡我們選擇了審核者最需要看到的幾個關鍵欄位
    const desiredColumns = [
        { header: "申請日期", index: 13 },     // N
        { header: "申請人員", index: 14 },     // O
        { header: "申請類別", index: 1 },      // B
        { header: "資訊資產名稱", index: 3 },   // D
        { header: "申請說明", index: 5 },      // F
        { header: "變更前資訊", index: 11 },    // L
        { header: "變更後資訊", index: 12 },    // M
    ];

    const desiredHeader = desiredColumns.map(col => col.header);
    desiredHeader.push('查看變更前評估');
    desiredHeader.push('原始列號');
    if (allData.length <= 1) return [desiredHeader];
    const dataRows = allData.slice(1);
    const pendingRows = dataRows.filter(row => row && row.length > RECORDS_STATUS_COL - 1 && row[RECORDS_STATUS_COL - 1] === '申請中');
    const mappedPendingApps = pendingRows.map(row => {
      const originalRowNumber = dataRows.indexOf(row) + 2;
      const selectedColumns = desiredColumns.map(col => {
        const cellValue = row[col.index];
        if (col.index === 13 && cellValue instanceof Date && !isNaN(cellValue)) {
          return Utilities.formatDate(cellValue, Session.getScriptTimeZone(), "yyyy/MM/dd");
        }
        return cellValue;
      });
      const assessmentDetails = `影響範圍: ${row[6] || 'N/A'}\n事前測試: ${row[7] || 'N/A'}\n備份狀態說明: ${row[8] || 'N/A'}\n風險處置方式: ${row[9] || 'N/A'}\n風險處置方式說明: ${row[10] || 'N/A'}`;
      selectedColumns.push(assessmentDetails);
      selectedColumns.push(originalRowNumber);
      return selectedColumns;
    });
    return [desiredHeader, ...mappedPendingApps];
  } catch (e) {
    Logger.log(`getPendingApprovals 錯誤: ${e.message}`);
    return [['錯誤'], ['讀取待審核清單時發生錯誤: ' + e.message]];
  }
}

/**
 * ✨【全新升級】一次性獲取表單所需的所有下拉選單選項
 * @returns {object} 一個包含各欄位選項陣列的物件
 */
function getFormDropdownOptions() {
  try {
    const sheet = SS.getSheetByName(SHEET_OPTIONS_NAME);
    if (!sheet) {
      throw new Error(`找不到名為 '${SHEET_OPTIONS_NAME}' 的工作表。`);
    }

    // 1. 定義我們要抓取的欄位名稱 (必須與工作表標頭完全一致)
    const requiredHeaders = [
      '類別名稱',                      // E欄
      '申請說明',                      // F欄
      '申請原因',                      // G欄
      '變更前評估-事前測試',           // H欄
      '變更前評估-備份狀態說明',       // I欄
      '變更前評估-風險處置方式',       // J欄
      '變更前評估-風險處置方式說明'    // K欄
    ];

    const allData = sheet.getDataRange().getValues();
    const headers = allData.shift(); // 取出標頭列

    const options = {};

    // 2. 遍歷我們需要的每個標頭
    requiredHeaders.forEach(headerName => {
      const colIndex = headers.indexOf(headerName);
      if (colIndex !== -1) {
        // 3. 提取該欄的所有值，過濾掉空格，並移除重複項
        const columnValues = allData
          .map(row => row[colIndex])
          .filter(value => typeof value === 'string' && value.trim() !== '');
        
        options[headerName] = [...new Set(columnValues)]; // 使用 Set 移除重複值
      } else {
        // 如果找不到標頭，也回傳一個空陣列，避免前端出錯
        options[headerName] = [];
      }
    });

    return options;
  } catch (e) {
    Logger.log(`getFormDropdownOptions 發生錯誤: ${e.message}`);
    // 即使發生錯誤，也回傳一個帶有空陣列的物件結構，讓前端可以正常處理
    return {
      '類別名稱': [], '申請說明': [], '申請原因': [], '變更前評估-事前測試': [],
      '變更前評估-備份狀態說明': [], '變更前評估-風險處置方式': [], '變更前評估-風險處置方式說明': []
    };
  }
}

/**
 * ✨【核心修改 1】
 * 批次處理審核，增加寫入審核者帳號的邏輯。
 * @param {Array<number>} rowNumbers - 要核准的申請在 Sheet 中的列號陣列。
 * @returns {string} 執行結果。
 */
function processBatchApproval(rowNumbers) {
  try {
    const sheet = SS.getSheetByName(SHEET_RECORDS_NAME);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const approverEmail = Session.getActiveUser().getEmail();
    const userInfo = getUserInfoFromPermissionsSheet();
    const approverName = userInfo.approversMap[approverEmail] || '未知審核者';
    const statusCol = headers.indexOf('申請狀態') + 1;
    const supervisorCol = headers.indexOf('權責單位主管') + 1;
    const approverEmailCol = headers.indexOf('審核人帳號') + 1;
    const applicantEmailCol = headers.indexOf('申請人員帳號') + 1;
    const assetNameCol = headers.indexOf('資訊資產名稱') + 1;
    const approvalTimeCol = headers.indexOf('審核時間') + 1;
    const yearCol = headers.indexOf('年') + 1;
    const monthCol = headers.indexOf('月') + 1;
    const dayCol = headers.indexOf('日') + 1;
    if (!approverEmailCol) throw new Error("找不到 '審核人帳號' 的欄位標頭。");
    rowNumbers.forEach(rowNum => {
      const approvalTime = new Date();
      sheet.getRange(rowNum, statusCol).setValue('已核准');
      sheet.getRange(rowNum, supervisorCol).setValue(approverName);
      sheet.getRange(rowNum, approverEmailCol).setValue(approverEmail);
      sheet.getRange(rowNum, approvalTimeCol).setValue(approvalTime);
      sheet.getRange(rowNum, yearCol).setValue(approvalTime.getFullYear());
      sheet.getRange(rowNum, monthCol).setValue(approvalTime.getMonth() + 1);
      sheet.getRange(rowNum, dayCol).setValue(approvalTime.getDate());
      const newRecordNumber = generateAndSetRecordNumber(sheet, rowNum, headers, approvalTime);
      generateDocumentForRow(sheet, rowNum, headers, newRecordNumber);
      const applicantEmail = sheet.getRange(rowNum, applicantEmailCol).getValue();
      const assetName = sheet.getRange(rowNum, assetNameCol).getValue();
      const subject = `[系統變更申請] 您的申請已核准 - ${assetName}`;
      const body = `您好，\n您申請的系統變更「${assetName}」已審核通過。\n紀錄編號為：${newRecordNumber}。`;
      sendNotificationEmail(applicantEmail, subject, body);
    });
    return `${rowNumbers.length} 項申請已成功核准！`;
  } catch (e) {
    Logger.log(e);
    return `審核失敗： ${e.message}`;
  }
}

/**
 * ✨【新增】處理申請拒絕
 * @param {number} rowNumber - 要拒絕的申請在 Sheet 中的列號。
 * @param {string} rejectReason - 拒絕原因。
 * @returns {string} 執行結果。
 */
function processRejection(rowNumber, rejectReason) {
  try {
    const sheet = SS.getSheetByName(SHEET_RECORDS_NAME);
    if (!sheet) throw new Error(`找不到工作表: '${SHEET_RECORDS_NAME}'`);
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const approverEmail = Session.getActiveUser().getEmail();
    const userInfo = getUserInfoFromPermissionsSheet();
    const approverName = userInfo.approversMap[approverEmail] || '未知審核者';
    
    // Find column indices
    const statusCol = headers.indexOf('申請狀態') + 1;
    const supervisorCol = headers.indexOf('權責單位主管') + 1;
    const approverEmailCol = headers.indexOf('審核人帳號') + 1;
    const applicantEmailCol = headers.indexOf('申請人員帳號') + 1;
    const assetNameCol = headers.indexOf('資訊資產名稱') + 1;
    const approvalTimeCol = headers.indexOf('審核時間') + 1;
    const rejectReasonCol = headers.indexOf('拒絕原因') + 1;
    
    if (!statusCol) throw new Error("找不到 '申請狀態' 的欄位標頭。");
    if (!rejectReasonCol) throw new Error("找不到 '拒絕原因' 的欄位標頭。");
    
    const rejectionTime = new Date();
    
    // Update the status and rejection information
    sheet.getRange(rowNumber, statusCol).setValue('已拒絕');
    if (supervisorCol) sheet.getRange(rowNumber, supervisorCol).setValue(approverName);
    if (approverEmailCol) sheet.getRange(rowNumber, approverEmailCol).setValue(approverEmail);
    if (approvalTimeCol) sheet.getRange(rowNumber, approvalTimeCol).setValue(rejectionTime);
    sheet.getRange(rowNumber, rejectReasonCol).setValue(rejectReason);
    
    // Send notification email to applicant
    const applicantEmail = sheet.getRange(rowNumber, applicantEmailCol).getValue();
    const assetName = sheet.getRange(rowNumber, assetNameCol).getValue();
    const subject = `[系統變更申請] 您的申請已被拒絕 - ${assetName}`;
    const body = `您好，\n\n您申請的系統變更「${assetName}」已被拒絕。\n\n拒絕原因：\n${rejectReason}\n\n如有疑問，請聯繫審核人員。`;
    
    sendNotificationEmail(applicantEmail, subject, body);
    
    return '申請已成功拒絕，並已通知申請人。';
  } catch (e) {
    Logger.log(`processRejection 錯誤: ${e.message} (stack: ${e.stack})`);
    return `拒絕失敗：${e.message}`;
  }
}

function getUserInfoFromPermissionsSheet() {
  const cache = CacheService.getScriptCache();
  const cachedData = cache.get('permissionsData');
  if (cachedData) return JSON.parse(cachedData);
  const sheet = SS.getSheetByName(SHEET_PERMISSIONS_NAME);
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  const userInfo = { users: {}, approvers: [], approversMap: {} };
  data.forEach(row => {
    const [userName, userEmail, approverName, approverEmail] = row;
    if (userEmail) userInfo.users[userEmail] = userName;
    if (approverEmail) {
      if (!userInfo.approvers.includes(approverEmail)) userInfo.approvers.push(approverEmail);
      userInfo.approversMap[approverEmail] = approverName;
    }
  });
  cache.put('permissionsData', JSON.stringify(userInfo), 300);
  return userInfo;
}

function isCurrentUserApprover(email) { return getUserInfoFromPermissionsSheet().approvers.includes(email); }
function getApproverEmails() { return getUserInfoFromPermissionsSheet().approvers; }
function sendNotificationEmail(recipient, subject, body) { if (recipient) GmailApp.sendEmail(recipient, subject, body); }

function generateAndSetRecordNumber(sheet, currentRow, headers, approvalDate) {
  const recordNumColIndex = headers.indexOf('紀錄編號') + 1;
  if (!recordNumColIndex) throw new Error("找不到 '紀錄編號' 欄位。");
  
  if (!(approvalDate instanceof Date)) throw new Error(`傳入的審核時間格式不正確。`);
  
  const datePart = Utilities.formatDate(approvalDate, Session.getScriptTimeZone(), 'yyMMdd');
  const allRecordNumbers = sheet.getRange(2, recordNumColIndex, sheet.getLastRow(), 1).getValues();
  let todayCount = 0;
  allRecordNumbers.forEach(record => { 
    if (record[0] && record[0].includes(`-${datePart}-`)) todayCount++; 
  });
  
  const sequence = String(todayCount + 1).padStart(2, '0');
  const newRecordNumber = `${RECORD_NUMBER_PREFIX}-${datePart}-${sequence}`;
  
  sheet.getRange(currentRow, recordNumColIndex).setValue(newRecordNumber);
  return newRecordNumber;
}

function generateDocumentForRow(sheet, rowNum, headers, newRecordNumber) {
  const dataRow = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
  const data = headers.reduce((obj, header, index) => ({...obj, [header]: dataRow[index]}), {});
  data['紀錄編號'] = newRecordNumber;
  const requestDate = new Date(data['申請日期']);
  const formattedDate = Utilities.formatDate(requestDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const docName = `系統變更申請單 - ${data['資訊資產名稱']} - ${formattedDate}`;
  const destinationFolder = DriveApp.getFolderById(DESTINATION_FOLDER_ID);
  const templateFile = DriveApp.getFileById(TEMPLATE_ID);
  const newDocFile = templateFile.makeCopy(docName, destinationFolder);
  const newDoc = DocumentApp.openById(newDocFile.getId());
  const body = newDoc.getBody();
  const header = newDoc.getHeader();
  headers.forEach(h => {
    let value = data[h] instanceof Date ? Utilities.formatDate(data[h], Session.getScriptTimeZone(), 'yyyy/MM/dd') : data[h];
    const placeholder = `{{${h}}}`;
    const replacement = value || '';
    body.replaceText(placeholder, replacement);
    if (header) header.replaceText(placeholder, replacement);
  });
  newDoc.saveAndClose();
  const docUrl = newDocFile.getUrl();
  const linkColumnIndex = headers.indexOf('文件連結') + 1; 
  if (linkColumnIndex > 0) sheet.getRange(rowNum, linkColumnIndex).setValue(docUrl);
}
