/**
 * Feature Flags - نظام التحكم في تشغيل/إيقاف الميزات
 * 
 * يسمح بالتبديل بين النظام القديم والجديد بأمان
 * 
 * @example
 * // لتشغيل نظام الجرد الجديد:
 * INVENTORY_FEATURE_FLAGS.USE_NEW_AUDIT_SYSTEM = true
 * 
 * // للرجوع للنظام القديم فوراً:
 * INVENTORY_FEATURE_FLAGS.USE_NEW_AUDIT_SYSTEM = false
 */

export const INVENTORY_FEATURE_FLAGS = {
  /**
   * النظام القديم - يجب أن يبقى true دائماً حتى نتأكد من النظام الجديد
   */
  USE_OLD_SPARE_PARTS_SYSTEM: true,

  /**
   * نظام الجرد الجديد (Audit System)
   * - جرد شامل
   * - جرد الفئة
   * - جرد الموقع
   * - جرد الصنف الواحد
   * - تصدير Excel
   */
  USE_NEW_AUDIT_SYSTEM: false,

  /**
   * نظام الحركات السريعة الجديد (Quick Transactions)
   * - الإدخال السريع
   * - الإخراج السريع
   */
  USE_NEW_QUICK_TRANSACTIONS: false,

  /**
   * نظام الشراء الجديد (Purchase System)
   * - طلب شراء
   * - استلام
   */
  USE_NEW_PURCHASE_SYSTEM: false,

  /**
   * نظام الإخراج الجديد (Issue System)
   * - إخراج للموظف
   * - إخراج للمعدة
   * - إخراج للمشروع
   */
  USE_NEW_ISSUE_SYSTEM: false,

  /**
   * نظام النقل الجديد (Transfer System)
   * - نقل بين المواقع
   */
  USE_NEW_TRANSFER_SYSTEM: false,

  /**
   * نظام الإرجاع الجديد (Return System)
   * - إرجاع قطع غيار
   */
  USE_NEW_RETURN_SYSTEM: false,

  /**
   * استخدام Services الجديدة المشتركة
   */
  USE_NEW_SERVICES: true, // آمن - لا يؤثر على النظام القديم

  /**
   * استخدام Utils الجديدة المشتركة
   */
  USE_NEW_UTILS: true, // آمن - لا يؤثر على النظام القديم

  /**
   * تفعيل نظام القوالب (Templates)
   * يسمح بإنشاء مخازن جديدة بسرعة
   */
  ENABLE_TEMPLATE_SYSTEM: true, // آمن - للمخازن الجديدة فقط
} as const

/**
 * التحقق من إمكانية استخدام نظام معين
 */
export function canUseNewSystem(systemName: keyof typeof INVENTORY_FEATURE_FLAGS): boolean {
  return INVENTORY_FEATURE_FLAGS[systemName] === true
}

/**
 * تفعيل نظام جديد
 */
export function enableNewSystem(systemName: keyof typeof INVENTORY_FEATURE_FLAGS): void {
  console.log(`🔵 [Feature Flag] Enabling ${systemName}`)
  // @ts-ignore - تحديث القيمة
  INVENTORY_FEATURE_FLAGS[systemName] = true
}

/**
 * إيقاف نظام جديد والرجوع للقديم
 */
export function disableNewSystem(systemName: keyof typeof INVENTORY_FEATURE_FLAGS): void {
  console.log(`🔴 [Feature Flag] Disabling ${systemName} - Rollback to old system`)
  // @ts-ignore - تحديث القيمة
  INVENTORY_FEATURE_FLAGS[systemName] = false
}

/**
 * الحصول على ملخص حالة جميع الأنظمة
 */
export function getSystemsStatus() {
  return Object.entries(INVENTORY_FEATURE_FLAGS).map(([key, value]) => ({
    system: key,
    enabled: value,
    status: value ? '✅ مفعّل' : '❌ معطّل',
  }))
}
