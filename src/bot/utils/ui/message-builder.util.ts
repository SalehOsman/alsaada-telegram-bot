/**
 * Message Builder Utility
 * أدوات بناء الرسائل العامة
 * 
 * ✅ GLOBAL UTILITY - Can be used across all bot features
 * 📝 Note: Inventory-specific message builders remain in inventory-management/utils/
 */

/**
 * بناء رسالة نجاح
 */
export function buildSuccessMessage(
  action: string,
  details?: string
): string {
  let message = `✅ **${action} بنجاح!**\n`
  
  if (details) {
    message += `\n${details}`
  }
  
  return message
}

/**
 * بناء رسالة خطأ
 */
export function buildErrorMessage(
  action: string,
  reason?: string
): string {
  let message = `❌ **فشل ${action}**\n`
  
  if (reason) {
    message += `\n**السبب:** ${reason}`
  } else {
    message += `\nالرجاء المحاولة مرة أخرى.`
  }
  
  return message
}

/**
 * بناء رسالة تأكيد
 */
export function buildConfirmationMessage(
  action: string,
  itemName: string,
  itemCode: string,
  warning?: string
): string {
  let message = `⚠️ **تأكيد ${action}**\n\n`
  message += `هل أنت متأكد من ${action}:\n\n`
  message += `**${itemName}**\n`
  message += `الكود: \`${itemCode}\`\n`
  
  if (warning) {
    message += `\n⚠️ **ملاحظة:** ${warning}`
  }
  
  return message
}

/**
 * بناء رسالة قائمة فارغة
 */
export function buildEmptyListMessage(
  title: string,
  suggestion?: string
): string {
  let message = `📊 **${title}**\n\n`
  message += `❌ **لا توجد عناصر**\n`
  
  if (suggestion) {
    message += `\n${suggestion}`
  }
  
  return message
}

/**
 * بناء رسالة تحذير
 */
export function buildWarningMessage(
  title: string,
  details: string
): string {
  return `⚠️ **${title}**\n\n${details}`
}

/**
 * بناء رسالة معلومات
 */
export function buildInfoMessage(
  title: string,
  details: string
): string {
  return `ℹ️ **${title}**\n\n${details}`
}

