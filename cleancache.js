/**
 * 清除權限資料的暫存 (permissionsData)。
 * 當您在「權限」工作表修改了人員名單後，若想立即生效而不等待 5 分鐘，可執行此函式。
 * 
 * @returns {string} 執行結果訊息
 */
function clearPermissionsCache() {
  const cache = CacheService.getScriptCache();
  cache.remove('permissionsData');
  
  const msg = '權限暫存已成功清除，下次讀取將從試算表重新抓取。';
  console.log(msg);
  return msg;
}
