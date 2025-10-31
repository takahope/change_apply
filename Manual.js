/**
 * 您的資料來源工作表名稱。
 * @type {string}
 */
const SHEET_NAME = '申請紀錄'; // 請確認您的工作表名稱是否為「申請紀錄」


/**
 * 當使用者打開 Google Sheet 時，自動執行的函式，用於建立自訂選單。
 * @param {object} e - 事件物件。
 */
function onOpen(e) {
    SpreadsheetApp.getUi()
      .createMenu('⚙️ 自動化工具')
      .addItem('🚀 生成系統變更申請單', 'createChangeRequestDoc')
      .addToUi();
  }


/**
 * ✨ 新增：生成並設定紀錄編號的函式
 * @param {Sheet} sheet - 當前的工作表物件。
 * @param {number} currentRow - 當前處理的列數。
 * @param {Array<string>} headers - 標頭陣列。
 * @return {string} 新生成的紀錄編號。
 */
function generateAndSetRecordNumberz(sheet, currentRow, headers) {
    // 找到 '申請日期' 和 '紀錄編號' 的欄位索引
    const dateColIndex = headers.indexOf('申請日期');
    const recordNumColIndex = headers.indexOf('紀錄編號');
  
    if (dateColIndex === -1 || recordNumColIndex === -1) {
      throw new Error("找不到 '申請日期' 或 '紀錄編號' 欄位，請檢查標頭。");
    }
  
    // 1. 讀取申請日期並轉換格式為 YYMMDD
    const applicationDate = new Date(sheet.getRange(currentRow, dateColIndex + 1).getValue());
    if (isNaN(applicationDate.getTime())) {
      throw new Error(`第 ${currentRow} 列的申請日期格式不正確。`);
    }
    const datePart = Utilities.formatDate(applicationDate, Session.getScriptTimeZone(), 'yyMMdd');
  
    // 2. 掃描紀錄編號欄位，計算當天已有幾筆紀錄
    const allRecordNumbers = sheet.getRange(2, recordNumColIndex + 1, sheet.getLastRow() - 1, 1).getValues();
    let todayCount = 0;
    for (let i = 0; i < allRecordNumbers.length; i++) {
      const recordNumber = allRecordNumbers[i][0];
      if (recordNumber && recordNumber.includes(`-${datePart}-`)) {
        todayCount++;
      }
    }
  
    // 3. 計算流水號 (已有筆數 + 1)
    const sequence = String(todayCount + 1).padStart(2, '0');
  
    // 4. 組成完整的紀錄編號
    const newRecordNumberz = `${RECORD_NUMBER_PREFIX}-${datePart}-${sequence}`;
  
    // 5. 將新編號回寫到 Google Sheet
    sheet.getRange(currentRow, recordNumColIndex + 1).setValue(newRecordNumberz);
    
    // 將新編號回傳，讓主函式也能使用
    return newRecordNumberz;
  }


  /**
 * 主函式：建立系統變更申請單。
 * 處理流程：讀取資料 -> 複製範本 -> 替換文字 -> 儲存文件 -> 回寫連結。
 */
function createChangeRequestDoc() {
    const ui = SpreadsheetApp.getUi();
  
    // 檢查設定是否已填寫
    if (TEMPLATE_ID === '請在此貼上您的Google Doc範本ID' || DESTINATION_FOLDER_ID === '請在此貼上您的Google Drive資料夾ID') {
      ui.alert('🛑 設定錯誤', '請先在 Apps Script 編輯器中填寫 TEMPLATE_ID 和 DESTINATION_FOLDER_ID。', ui.ButtonSet.OK);
      return;
    }
  
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      if (!sheet) {
        throw new Error(`找不到名稱為 "${SHEET_NAME}" 的工作表。`);
      }
  
      // 取得使用者當前選取的儲存格所在的列
      const currentRow = sheet.getActiveCell().getRow();
      if (currentRow === 1) {
        ui.alert('提示', '請不要選取第一列標題列。', ui.ButtonSet.OK);
        return;
      }
      
      // 讀取標頭和當前列的資料
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
      // ✨ 修改：在生成文件前，先呼叫函式生成紀錄編號
      const newRecordNumberz = generateAndSetRecordNumberz(sheet, currentRow, headers);
  
      const dataRow = sheet.getRange(currentRow, 1, 1, sheet.getLastColumn()).getValues()[0];
      
      // 將資料轉換為物件，方便取用
      const data = headers.reduce((obj, header, index) => {
        obj[header] = dataRow[index];
        return obj;
      }, {});
  
      // 確保 data 物件中有最新的紀錄編號
      data['紀錄編號'] = newRecordNumberz;
  
      // 格式化日期
      const requestDate = new Date(data['申請日期']);
      const formattedDate = Utilities.formatDate(requestDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      
      // 根據 PRD FR-07 建立檔案名稱
      const docName = `系統變更申請單 - ${data['資訊資產名稱']} - ${formattedDate}`;
  
      // 根據 PRD FR-08 找到目標資料夾與範本
      const destinationFolder = DriveApp.getFolderById(DESTINATION_FOLDER_ID);
      const templateFile = DriveApp.getFileById(TEMPLATE_ID);
  
      // 複製範本並在新資料夾中建立文件
      const newDocFile = templateFile.makeCopy(docName, destinationFolder);
      const newDoc = DocumentApp.openById(newDocFile.getId());
      const body = newDoc.getBody();
      const header = newDoc.getHeader(); // << ✨ 新增：取得頁首物件
  
       // 根據 PRD FR-06 執行文字替換
      // 注意：請確保您的 Google Doc 範本中有使用 {{ }} 包起來的對應文字
      for (const h of headers) {
        let value = data[h];
        // 如果值是日期物件，進行格式化
        if (value instanceof Date) {
          value = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy/MM/dd');
        }
        const placeholder = `{{${h}}}`;
        const replacement = value || ''; // 如果儲存格為空，則替換為空字串
  
        // 替換內文中的文字
        body.replaceText(placeholder, replacement);
        
        // ✨ 新增：如果文件有頁首，也替換頁首中的文字
        if (header) {
          header.replaceText(placeholder, replacement);
        }
      }
  
  
      newDoc.saveAndClose();
  
      // 根據 PRD FR-10 回寫文件連結
      const docUrl = newDocFile.getUrl();
      const linkColumnIndex = headers.indexOf('文件連結') + 1;
      if (linkColumnIndex > 0) {
        sheet.getRange(currentRow, linkColumnIndex).setValue(docUrl);
      }
  
      // 根據 PRD FR-09 提供成功回饋
      ui.alert('✅ 操作成功', `文件 "${docName}" 已成功生成並儲存，連結已回寫至工作表。`, ui.ButtonSet.OK);
  
    } catch (error) {
      // 根據 PRD FR-09 提供失敗回饋
      Logger.log(error.toString());
      ui.alert('❌ 操作失敗', `發生錯誤：${error.message}`, ui.ButtonSet.OK);
    }
  }