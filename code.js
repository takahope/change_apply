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

  // ✨【動態郵件】審核確認頁：僅渲染、不做任何資料寫入（避免郵件預抓取誤觸）
  // 身分改由簽章參數驗證（不依賴 Session），相容「以擁有者執行」的部署。
  if (page === 'action') {
    const actionRow = Number(e.parameter.row);
    const actionApprover = e.parameter.approver || '';
    const actionToken = e.parameter.token || '';
    let validLink = false;
    try {
      if (getUserInfoFromPermissionsSheet().approvers.indexOf(actionApprover) !== -1) {
        verifyActionToken(actionRow, actionApprover, actionToken);
        validLink = true;
      }
    } catch (err) {
      validLink = false;
    }
    if (!validLink) {
      return HtmlService.createHtmlOutputFromFile('unauthorized').setTitle('權限不足');
    }
    const actionTemplate = HtmlService.createTemplateFromFile('action');
    actionTemplate.actionType = e.parameter.action || '';
    actionTemplate.actionRow = e.parameter.row || '';
    actionTemplate.actionApprover = actionApprover;
    actionTemplate.actionToken = actionToken;
    return actionTemplate.evaluate().setTitle('系統變更申請 - 審核');
  }

  const template = HtmlService.createTemplateFromFile(page);
  template.currentUser = currentUser;
  template.isApprover = isCurrentUserApprover(currentUser);
  template.editRow = e.parameter.edit || ''; // ✨ 編輯模式時帶入要修改的列號
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
      // ✨【動態郵件】每位審核人各寄一封含專屬簽章連結的可操作郵件
      approvers.forEach(approverEmail => {
        const mail = buildApprovalEmail(nextRow, false, approverEmail);
        sendNotificationEmail(approverEmail, mail.subject, mail.plainBody, mail.htmlBody);
      });
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
function processBatchApproval(rowNumbers, approverEmailOverride) {
  try {
    const sheet = SS.getSheetByName(SHEET_RECORDS_NAME);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    // 郵件流程會傳入經簽章驗證的審核人；站內審核則沿用 Session
    const approverEmail = approverEmailOverride || Session.getActiveUser().getEmail();
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
function processRejection(rowNumber, rejectReason, approverEmailOverride) {
  try {
    const sheet = SS.getSheetByName(SHEET_RECORDS_NAME);
    if (!sheet) throw new Error(`找不到工作表: '${SHEET_RECORDS_NAME}'`);

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    // 郵件流程會傳入經簽章驗證的審核人；站內審核則沿用 Session
    const approverEmail = approverEmailOverride || Session.getActiveUser().getEmail();
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

/**
 * ✨【新增 - 需求4】共用驗證：確認列號有效、為本人申請、且狀態為「申請中」。
 * 用於 cancelApplication / updateApplication / getApplicationForEdit。
 * @returns {{statusCol:number, applicantEmail:string, applicantName:string, assetName:string}}
 */
function getEditableRowContext(sheet, headers, rowNumber) {
  if (!rowNumber || rowNumber < 2) throw new Error('無效的申請列號。');
  const statusCol = headers.indexOf('申請狀態') + 1;
  const applicantEmailCol = headers.indexOf('申請人員帳號') + 1;
  const applicantNameCol = headers.indexOf('申請人員') + 1;
  const assetNameCol = headers.indexOf('資訊資產名稱') + 1;
  if (!statusCol) throw new Error("找不到 '申請狀態' 的欄位標頭。");
  if (!applicantEmailCol) throw new Error("找不到 '申請人員帳號' 的欄位標頭。");

  const currentUser = Session.getActiveUser().getEmail();
  const applicantEmail = sheet.getRange(rowNumber, applicantEmailCol).getValue();
  if (applicantEmail !== currentUser) throw new Error('權限不足，只能操作自己的申請。');

  const status = sheet.getRange(rowNumber, statusCol).getValue();
  if (status !== '申請中') throw new Error('僅「申請中」的申請可修改或取消。');

  return {
    statusCol,
    applicantEmail,
    applicantName: applicantNameCol ? sheet.getRange(rowNumber, applicantNameCol).getValue() : '',
    assetName: assetNameCol ? sheet.getRange(rowNumber, assetNameCol).getValue() : ''
  };
}

/**
 * ✨【新增 - 需求4】取消尚在「申請中」的申請，並通知審核人。
 * @param {number} rowNumber - 申請在 Sheet 中的列號。
 * @returns {string} 執行結果訊息。
 */
function cancelApplication(rowNumber) {
  try {
    const sheet = SS.getSheetByName(SHEET_RECORDS_NAME);
    if (!sheet) throw new Error(`找不到工作表: '${SHEET_RECORDS_NAME}'`);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const ctx = getEditableRowContext(sheet, headers, rowNumber);
    sheet.getRange(rowNumber, ctx.statusCol).setValue('已取消');

    const approvers = getUserInfoFromPermissionsSheet().approvers;
    if (approvers && approvers.length > 0) {
      const subject = `[系統變更申請] 案件已取消 - ${ctx.assetName || 'N/A'}`;
      const body = `申請人：${ctx.applicantName} (${ctx.applicantEmail})\n` +
                   `資訊資產名稱：${ctx.assetName || 'N/A'}\n\n` +
                   `此申請已由申請人取消，無需審核。\n\n` +
                   `審核頁面：${ScriptApp.getService().getUrl()}?page=review`;
      sendNotificationEmail(approvers.join(','), subject, body);
    }
    return '申請已成功取消，並已通知審核人。';
  } catch (e) {
    Logger.log(`cancelApplication 錯誤: ${e.message} (stack: ${e.stack})`);
    throw new Error(e.message);
  }
}

/**
 * ✨【新增 - 需求4】更新尚在「申請中」的申請（沿用標頭對應），並通知審核人。
 * @param {number} rowNumber - 申請在 Sheet 中的列號。
 * @param {object} formData - 與 submitApplication 相同結構的表單資料。
 * @returns {string} 執行結果訊息。
 */
function updateApplication(rowNumber, formData) {
  try {
    const sheet = SS.getSheetByName(SHEET_RECORDS_NAME);
    if (!sheet) throw new Error(`找不到工作表: '${SHEET_RECORDS_NAME}'`);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const ctx = getEditableRowContext(sheet, headers, rowNumber);

    // 受保護欄位不因修改而被覆寫（維持原申請人/日期，狀態續為申請中）
    const protectedHeaders = ['申請日期', '申請人員', '申請人員帳號', '申請狀態', '年', '月', '日'];
    headers.forEach((header, idx) => {
      const trimmedHeader = header.trim();
      if (protectedHeaders.indexOf(trimmedHeader) !== -1) return;
      if (!Object.prototype.hasOwnProperty.call(formData, trimmedHeader)) return;
      sheet.getRange(rowNumber, idx + 1).setValue(formData[trimmedHeader]);
    });

    const approvers = getUserInfoFromPermissionsSheet().approvers;
    if (approvers && approvers.length > 0) {
      // ✨【動態郵件】修改後每位審核人各重寄一封含專屬簽章連結的可操作郵件
      approvers.forEach(approverEmail => {
        const mail = buildApprovalEmail(rowNumber, true, approverEmail);
        sendNotificationEmail(approverEmail, mail.subject, mail.plainBody, mail.htmlBody);
      });
    }
    return '申請已成功修改！';
  } catch (e) {
    Logger.log(`updateApplication 錯誤: ${e.message} (stack: ${e.stack})`);
    throw new Error(e.message);
  }
}

/**
 * ✨【新增 - 需求4】取得「申請中」案件的可預填欄位（供 form.html 編輯模式）。
 * @param {number} rowNumber - 申請在 Sheet 中的列號。
 * @returns {object} 以標頭名稱為鍵的欄位值。
 */
function getApplicationForEdit(rowNumber) {
  const sheet = SS.getSheetByName(SHEET_RECORDS_NAME);
  if (!sheet) throw new Error(`找不到工作表: '${SHEET_RECORDS_NAME}'`);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  getEditableRowContext(sheet, headers, rowNumber); // 驗證本人 + 申請中

  const dataRow = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const wanted = [
    '資訊資產編號', '類別名稱',
    '變更前評估-事前測試', '變更前評估-備份狀態說明',
    '變更前評估-風險處置方式', '變更前評估-風險處置方式說明',
    '變更前評估-影響範圍', '變更前資訊', '變更後資訊', '申請說明'
  ];
  const result = {};
  wanted.forEach(name => {
    const idx = headers.indexOf(name);
    result[name] = idx !== -1 ? dataRow[idx] : '';
  });
  return result;
}

/**
 * ✨【新增 - 需求5】取得單筆申請的完整內容供唯讀檢視（任何狀態皆可）。
 * 存取權限：本人，或當前使用者為審核者。
 * @param {number} rowNumber - 申請在 Sheet 中的列號。
 * @returns {Array<{label:string, value:string}>} 依序排列的欄位標籤與值。
 */
function getApplicationDetail(rowNumber) {
  if (!rowNumber || rowNumber < 2) throw new Error('無效的申請列號。');
  const sheet = SS.getSheetByName(SHEET_RECORDS_NAME);
  if (!sheet) throw new Error(`找不到工作表: '${SHEET_RECORDS_NAME}'`);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const applicantEmailCol = headers.indexOf('申請人員帳號') + 1;
  if (!applicantEmailCol) throw new Error("找不到 '申請人員帳號' 的欄位標頭。");
  const currentUser = Session.getActiveUser().getEmail();
  const applicantEmail = sheet.getRange(rowNumber, applicantEmailCol).getValue();
  if (applicantEmail !== currentUser && !isCurrentUserApprover(currentUser)) {
    throw new Error('權限不足，無法檢視此申請。');
  }

  const dataRow = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  return buildDetailRows(headers, dataRow);
}

/**
 * ✨【共用】依固定欄位順序，把一列資料整理成 [{label, value}]（日期格式化）。
 * 供 getApplicationDetail（站內檢視 Modal）與可操作郵件明細共用，確保兩處內容一致。
 * @param {Array<string>} headers - 工作表標頭列。
 * @param {Array<any>} dataRow - 單列資料。
 * @returns {Array<{label:string, value:string}>}
 */
function buildDetailRows(headers, dataRow) {
  const wanted = [
    '申請日期', '申請人員', '申請類別', '資訊資產編號', '資訊資產名稱',
    '申請說明', '變更前評估-影響範圍', '變更前評估-事前測試',
    '變更前評估-備份狀態說明', '變更前評估-風險處置方式', '變更前評估-風險處置方式說明',
    '變更前資訊', '變更後資訊', '申請狀態', '權責單位主管', '審核時間',
    '紀錄編號', '拒絕原因'
  ];
  const tz = Session.getScriptTimeZone();
  const result = [];
  wanted.forEach(name => {
    const idx = headers.indexOf(name);
    if (idx === -1) return; // 該欄不存在（如拒絕原因）則略過
    let value = dataRow[idx];
    if (value instanceof Date && !isNaN(value)) {
      value = Utilities.formatDate(value, tz, 'yyyy/MM/dd');
    }
    result.push({ label: name, value: (value === null || value === undefined) ? '' : value });
  });
  return result;
}

// ===============================================================
// === 動態（可操作）審核郵件 — Token 工具 ========================
// ===============================================================

/**
 * 取得（或首次建立）動態郵件用的 HMAC 密鑰，存於 Script Properties。
 * @returns {string}
 */
function getActionSecret() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('ACTION_SECRET');
  if (!secret) {
    secret = Utilities.getUuid();
    props.setProperty('ACTION_SECRET', secret);
  }
  return secret;
}

/**
 * 產生綁定「列號 + 審核人信箱」的審核 token。
 * 身分由此簽章證明（而非 Session），故相容「以擁有者執行」的部署。
 * @param {number} rowNumber
 * @param {string} approverEmail - 此連結所屬的審核人
 * @returns {string} web-safe base64 的 HMAC-SHA256
 */
function generateActionToken(rowNumber, approverEmail) {
  const raw = `${rowNumber}|${approverEmail}`;
  const signature = Utilities.computeHmacSha256Signature(raw, getActionSecret());
  return Utilities.base64EncodeWebSafe(signature);
}

/**
 * 驗證審核 token；不符則丟錯。
 * @param {number} rowNumber
 * @param {string} approverEmail
 * @param {string} token
 */
function verifyActionToken(rowNumber, approverEmail, token) {
  if (!token || token !== generateActionToken(rowNumber, approverEmail)) {
    throw new Error('連結無效或已失效，請改用審核頁面操作。');
  }
}

/**
 * 共用驗證：approver 為合法審核人 + token 正確（不依賴 Session）。
 * @returns {{sheet:Sheet, headers:Array<string>, status:string}}
 */
function validateEmailAction(rowNumber, approverEmail, token) {
  if (!rowNumber || rowNumber < 2) throw new Error('無效的申請列號。');
  if (!approverEmail || getUserInfoFromPermissionsSheet().approvers.indexOf(approverEmail) === -1) {
    throw new Error('權限不足，只有審核人可以進行審核。');
  }
  verifyActionToken(rowNumber, approverEmail, token);

  const sheet = SS.getSheetByName(SHEET_RECORDS_NAME);
  if (!sheet) throw new Error(`找不到工作表: '${SHEET_RECORDS_NAME}'`);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf('申請狀態') + 1;
  if (!statusCol) throw new Error("找不到 '申請狀態' 的欄位標頭。");
  const status = sheet.getRange(rowNumber, statusCol).getValue();
  return { sheet, headers, status };
}

/**
 * ✨【動態郵件】供 action.html 載入：回傳申請明細與目前狀態（不寫入任何資料）。
 * @param {number} rowNumber
 * @param {string} token
 * @returns {{status:string, assetName:string, detail:Array, processed:boolean}}
 */
function getActionContext(rowNumber, approverEmail, token) {
  rowNumber = Number(rowNumber);
  const { sheet, headers, status } = validateEmailAction(rowNumber, approverEmail, token);
  const dataRow = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const assetNameIdx = headers.indexOf('資訊資產名稱');
  return {
    status: status,
    assetName: assetNameIdx !== -1 ? dataRow[assetNameIdx] : '',
    detail: buildDetailRows(headers, dataRow),
    processed: status !== '申請中'
  };
}

/**
 * ✨【動態郵件】由確認頁觸發的核准：驗證後重用既有 processBatchApproval。
 * @param {number} rowNumber
 * @param {string} token
 * @returns {string} 執行結果訊息。
 */
function processEmailApproval(rowNumber, approverEmail, token) {
  rowNumber = Number(rowNumber);
  const { status } = validateEmailAction(rowNumber, approverEmail, token);
  if (status !== '申請中') throw new Error(`此申請已處理（目前狀態：${status}），無法重複審核。`);
  const result = processBatchApproval([rowNumber], approverEmail);
  if (String(result).indexOf('成功') === -1) throw new Error(result);
  return result;
}

/**
 * ✨【動態郵件】由確認頁觸發的拒絕：驗證 + 必填原因後重用既有 processRejection。
 * @param {number} rowNumber
 * @param {string} token
 * @param {string} reason
 * @returns {string} 執行結果訊息。
 */
function processEmailRejection(rowNumber, approverEmail, token, reason) {
  rowNumber = Number(rowNumber);
  const { status } = validateEmailAction(rowNumber, approverEmail, token);
  if (status !== '申請中') throw new Error(`此申請已處理（目前狀態：${status}），無法重複審核。`);
  if (!reason || !String(reason).trim()) throw new Error('請填寫拒絕原因。');
  const result = processRejection(rowNumber, String(reason).trim(), approverEmail);
  if (String(result).indexOf('成功') === -1) throw new Error(result);
  return result;
}

/**
 * HTML 跳脫，避免明細內容破壞郵件版型或注入標籤。
 */
function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * ✨【動態郵件】建構寄給審核人的可操作郵件（明細表 + 核准/拒絕按鈕）。
 * @param {number} rowNumber - 申請所在列號。
 * @param {boolean} isModified - 是否為「修改後重寄」。
 * @returns {{subject:string, htmlBody:string, plainBody:string}}
 */
function buildApprovalEmail(rowNumber, isModified, approverEmail) {
  const sheet = SS.getSheetByName(SHEET_RECORDS_NAME);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const dataRow = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const detail = buildDetailRows(headers, dataRow);

  const idx = name => headers.indexOf(name);
  const assetName = idx('資訊資產名稱') !== -1 ? dataRow[idx('資訊資產名稱')] : 'N/A';
  const applicantName = idx('申請人員') !== -1 ? dataRow[idx('申請人員')] : '';
  const applicantEmail = idx('申請人員帳號') !== -1 ? dataRow[idx('申請人員帳號')] : '';

  const url = ScriptApp.getService().getUrl();
  // 每位審核人專屬簽章連結：身分由 token 證明，相容「以擁有者執行」
  const token = generateActionToken(rowNumber, approverEmail);
  const linkBase = `${url}?page=action&row=${rowNumber}&approver=${encodeURIComponent(approverEmail)}&token=${encodeURIComponent(token)}`;
  const approveUrl = `${linkBase}&action=approve`;
  const rejectUrl = `${linkBase}&action=reject`;
  const reviewUrl = `${url}?page=review`;

  const heading = isModified ? '案件已修改，待重新審核' : '新系統變更申請待審核';
  const subject = isModified
    ? `[系統變更申請] 案件已修改待審核 - ${assetName}`
    : `[系統變更申請] 新案件待審核 - ${assetName}`;

  const rowsHtml = detail.map(item => {
    const label = escapeHtml(item.label);
    const value = escapeHtml(item.value === '' ? '—' : item.value).replace(/\n/g, '<br>');
    return `<tr>` +
      `<td style="padding:8px 12px;border:1px solid #ebecf0;background:#f4f5f7;color:#5e6c84;font-weight:bold;white-space:nowrap;vertical-align:top;">${label}</td>` +
      `<td style="padding:8px 12px;border:1px solid #ebecf0;color:#172b4d;">${value}</td>` +
      `</tr>`;
  }).join('');

  const htmlBody =
    `<div style="background:#f4f5f7;padding:24px 0;font-family:Arial,'Microsoft JhengHei',sans-serif;">` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">` +
        `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #dfe1e6;">` +
          `<tr><td style="background:#0052cc;padding:20px 24px;color:#ffffff;font-size:18px;font-weight:bold;">${escapeHtml(heading)}</td></tr>` +
          `<tr><td style="padding:20px 24px;color:#172b4d;font-size:14px;">` +
            `<p style="margin:0 0 16px;">申請人：<strong>${escapeHtml(applicantName)}</strong>（${escapeHtml(applicantEmail)}）<br>資訊資產名稱：<strong>${escapeHtml(assetName)}</strong></p>` +
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">${rowsHtml}</table>` +
          `</td></tr>` +
          `<tr><td align="center" style="padding:8px 24px 24px;">` +
            `<table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
              `<td style="padding:6px;"><a href="${approveUrl}" style="display:inline-block;background:#36b37e;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:bold;">✓ 核准</a></td>` +
              `<td style="padding:6px;"><a href="${rejectUrl}" style="display:inline-block;background:#de350b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:bold;">✕ 拒絕</a></td>` +
            `</tr></table>` +
            `<p style="margin:16px 0 0;color:#5e6c84;font-size:12px;">點擊按鈕會開啟確認頁，再次確認後才會正式送出審核結果。</p>` +
            `<p style="margin:8px 0 0;font-size:12px;"><a href="${reviewUrl}" style="color:#0052cc;">或前往審核頁面查看所有待審案件 →</a></p>` +
          `</td></tr>` +
        `</table>` +
      `</td></tr></table>` +
    `</div>`;

  const plainBody =
    `${heading}\n\n` +
    `申請人：${applicantName} (${applicantEmail})\n` +
    `資訊資產名稱：${assetName}\n\n` +
    detail.map(it => `${it.label}：${it.value || '—'}`).join('\n') + '\n\n' +
    `核准：${approveUrl}\n拒絕：${rejectUrl}\n\n` +
    `（點擊後會開啟確認頁，再次確認才會送出）\n` +
    `前往審核頁面：${reviewUrl}`;

  return { subject, htmlBody, plainBody };
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
function sendNotificationEmail(recipient, subject, body, htmlBody) {
  if (!recipient) return;
  if (htmlBody) {
    GmailApp.sendEmail(recipient, subject, body, { htmlBody: htmlBody });
  } else {
    GmailApp.sendEmail(recipient, subject, body);
  }
}

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
