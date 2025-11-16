/**
 * Warehouse Types - أنواع البيانات المشتركة لنظام المخازن
 *
 * قابلة لإعادة الاستخدام في جميع المخازن:
 * - قطع الغيار (Spare Parts)
 * - الوقود (Fuel)
 * - الزيوت (Oils)
 * - المواد (Materials)
 * - العدد والأدوات (Tools & Equipment)
 */

/**
 * أنواع المخازن المدعومة
 */
export type WarehouseType =
  | 'SPARE_PARTS'
  | 'FUEL'
  | 'OILS'
  | 'MATERIALS'
  | 'TOOLS_EQUIPMENT'
  | 'GENERAL'

/**
 * أنواع الحركات
 */
export type TransactionType =
  | 'IN' // إدخال
  | 'OUT' // إخراج
  | 'TRANSFER' // نقل
  | 'RETURN' // إرجاع
  | 'ADJUSTMENT' // تسوية
  | 'PURCHASE' // شراء
  | 'ISSUE_TO_EMPLOYEE' // صرف لموظف
  | 'ISSUE_TO_EQUIPMENT' // صرف لمعدة
  | 'ISSUE_TO_PROJECT' // صرف لمشروع

/**
 * حالة الحركة
 */
export type TransactionStatus =
  | 'PENDING' // معلقة
  | 'APPROVED' // مُعتمدة
  | 'REJECTED' // مرفوضة
  | 'COMPLETED' // مكتملة
  | 'CANCELLED' // ملغاة

/**
 * أنواع الجرد
 */
export type AuditType =
  | 'FULL' // جرد شامل
  | 'CATEGORY' // جرد فئة
  | 'LOCATION' // جرد موقع
  | 'SINGLE_ITEM' // جرد صنف واحد

/**
 * حالة الجرد
 */
export type AuditStatus =
  | 'PENDING' // قيد التنفيذ
  | 'IN_PROGRESS' // جاري
  | 'COMPLETED' // مكتمل
  | 'CANCELLED' // ملغي

/**
 * معلومات الصنف الأساسية
 */
export interface BaseItem {
  id: number
  code: string
  barcode?: string
  name: string
  nameEn?: string
  description?: string
  unit: string
  categoryId?: number
  locationId?: number
  imagePath?: string
  isActive: boolean
}

/**
 * معلومات الحركة الأساسية
 */
export interface BaseTransaction {
  id: number
  warehouseType: WarehouseType
  itemId: number
  type: TransactionType
  quantity: number
  unitPrice?: number
  totalPrice?: number
  employeeId?: number
  equipmentId?: number
  projectId?: number
  fromLocationId?: number
  toLocationId?: number
  notes?: string
  status: TransactionStatus
  createdBy: number
  createdAt: Date
}

/**
 * معلومات الجرد الأساسية
 */
export interface BaseAudit {
  id: number
  auditNumber: string
  warehouseType: WarehouseType
  auditType: AuditType
  categoryId?: number
  locationId?: number
  status: AuditStatus
  itemsCount: number
  matchedCount: number
  discrepancyCount: number
  createdBy: number
  createdAt: Date
  completedAt?: Date
}

/**
 * عنصر الجرد
 */
export interface AuditItem {
  id: number
  auditId: number
  itemId: number
  systemQuantity: number
  actualQuantity: number
  difference: number
  hasDiscrepancy: boolean
  notes?: string
}

/**
 * إحصائيات الجرد
 */
export interface AuditStatistics {
  totalItems: number
  checkedItems: number
  matchedItems: number
  shortageItems: number
  surplusItems: number
  totalShortageQty: number // إجمالي كمية العجز
  totalSurplusQty: number // إجمالي كمية الزيادة
  completionPercentage: number
}

/**
 * معلومات المخزن
 */
export interface WarehouseInfo {
  id: number
  name: string
  type: WarehouseType
  code?: string
  description?: string
  isActive: boolean
}

/**
 * تكوين المخزن (للقالب)
 */
export interface WarehouseConfig {
  type: WarehouseType
  name: string
  nameEn: string
  icon: string
  itemTableName: string // 'INV_SparePart', 'INV_FuelItem', etc.
  transactionTableName: string // 'INV_SparePartTransaction', etc.
  features: {
    enableQuickTransactions: boolean
    enablePurchase: boolean
    enableIssue: boolean
    enableTransfer: boolean
    enableReturn: boolean
    enableAudit: boolean
    enableBarcode: boolean
  }
  customFields?: Record<string, any>
}

/**
 * خيارات القائمة المرقمة
 */
export interface PaginationOptions {
  page: number
  itemsPerPage: number
  totalItems: number
  totalPages: number
}

/**
 * نتيجة القائمة المرقمة
 */
export interface PaginatedResult<T> {
  items: T[]
  pagination: PaginationOptions
}

/**
 * خيارات الفلترة
 */
export interface FilterOptions {
  categoryId?: number
  locationId?: number
  isActive?: boolean
  searchTerm?: string
  dateFrom?: Date
  dateTo?: Date
}
