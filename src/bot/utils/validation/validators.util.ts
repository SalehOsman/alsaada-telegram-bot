/**
 * Extended Validators Utility
 * أدوات التحقق من البيانات - موسعة لتشمل validations إضافية
 * قابلة لإعادة الاستخدام في جميع أقسام البوت
 */

/**
 * نتيجة التحقق
 */
export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * التحقق من الكمية
 */
export function validateQuantity(quantity: any): ValidationResult {
  // التحقق من وجود القيمة
  if (quantity === null || quantity === undefined || quantity === '') {
    return {
      isValid: false,
      error: '❌ الرجاء إدخال الكمية',
    }
  }

  // التحقق من أن القيمة رقم
  const num = Number(quantity)
  if (Number.isNaN(num)) {
    return {
      isValid: false,
      error: '❌ الكمية يجب أن تكون رقماً',
    }
  }

  // التحقق من أن الرقم موجب
  if (num <= 0) {
    return {
      isValid: false,
      error: '❌ الكمية يجب أن تكون أكبر من صفر',
    }
  }

  // التحقق من أن الرقم عدد صحيح
  if (!Number.isInteger(num)) {
    return {
      isValid: false,
      error: '❌ الكمية يجب أن تكون عدداً صحيحاً',
    }
  }

  return { isValid: true }
}

/**
 * التحقق من السعر
 */
export function validatePrice(price: any): ValidationResult {
  // التحقق من وجود القيمة
  if (price === null || price === undefined || price === '') {
    return {
      isValid: false,
      error: '❌ الرجاء إدخال السعر',
    }
  }

  // التحقق من أن القيمة رقم
  const num = Number(price)
  if (Number.isNaN(num)) {
    return {
      isValid: false,
      error: '❌ السعر يجب أن يكون رقماً',
    }
  }

  // التحقق من أن الرقم موجب
  if (num < 0) {
    return {
      isValid: false,
      error: '❌ السعر يجب أن يكون أكبر من أو يساوي صفر',
    }
  }

  return { isValid: true }
}

/**
 * التحقق من الكود/الباركود
 */
export function validateCode(code: any, fieldName = 'الكود'): ValidationResult {
  // التحقق من وجود القيمة
  if (!code || code.trim() === '') {
    return {
      isValid: false,
      error: `❌ الرجاء إدخال ${fieldName}`,
    }
  }

  // التحقق من الطول
  if (code.length < 2) {
    return {
      isValid: false,
      error: `❌ ${fieldName} يجب أن يكون أطول من حرفين`,
    }
  }

  if (code.length > 50) {
    return {
      isValid: false,
      error: `❌ ${fieldName} طويل جداً (الحد الأقصى 50 حرف)`,
    }
  }

  return { isValid: true }
}

/**
 * التحقق من الاسم
 */
export function validateName(name: any, fieldName = 'الاسم'): ValidationResult {
  // التحقق من وجود القيمة
  if (!name || name.trim() === '') {
    return {
      isValid: false,
      error: `❌ الرجاء إدخال ${fieldName}`,
    }
  }

  // التحقق من الطول
  if (name.length < 3) {
    return {
      isValid: false,
      error: `❌ ${fieldName} يجب أن يكون أطول من 3 أحرف`,
    }
  }

  if (name.length > 200) {
    return {
      isValid: false,
      error: `❌ ${fieldName} طويل جداً (الحد الأقصى 200 حرف)`,
    }
  }

  return { isValid: true }
}

/**
 * التحقق من التاريخ
 */
export function validateDate(date: any): ValidationResult {
  if (!date) {
    return {
      isValid: false,
      error: '❌ الرجاء إدخال التاريخ',
    }
  }

  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) {
    return {
      isValid: false,
      error: '❌ التاريخ غير صحيح',
    }
  }

  return { isValid: true }
}

/**
 * التحقق من توفر الكمية في المخزن
 */
export function validateStockAvailability(
  requestedQuantity: number,
  availableQuantity: number,
  itemName: string,
): ValidationResult {
  if (requestedQuantity > availableQuantity) {
    return {
      isValid: false,
      error: `❌ الكمية المطلوبة (${requestedQuantity}) أكبر من الكمية المتاحة (${availableQuantity}) للصنف: ${itemName}`,
    }
  }

  return { isValid: true }
}

/**
 * التحقق من الملاحظات (اختياري)
 */
export function validateNotes(notes: any, maxLength = 500): ValidationResult {
  if (!notes) {
    return { isValid: true } // الملاحظات اختيارية
  }

  if (notes.length > maxLength) {
    return {
      isValid: false,
      error: `❌ الملاحظات طويلة جداً (الحد الأقصى ${maxLength} حرف)`,
    }
  }

  return { isValid: true }
}

/**
 * التحقق من رقم الهاتف المصري
 */
export function validateEgyptianPhone(phone: any): ValidationResult {
  if (!phone || phone.trim() === '') {
    return {
      isValid: false,
      error: '❌ الرجاء إدخال رقم الهاتف',
    }
  }

  // إزالة المسافات والشرطات
  const cleanPhone = phone.replace(/[\s-]/g, '')

  // التحقق من أن الرقم يبدأ بـ 01 ومكون من 11 رقم
  const egyptianPhoneRegex = /^01[0-2,5]\d{8}$/

  if (!egyptianPhoneRegex.test(cleanPhone)) {
    return {
      isValid: false,
      error: '❌ رقم الهاتف غير صحيح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)',
    }
  }

  return { isValid: true }
}

/**
 * التحقق من البريد الإلكتروني
 */
export function validateEmail(email: any): ValidationResult {
  if (!email || email.trim() === '') {
    return {
      isValid: false,
      error: '❌ الرجاء إدخال البريد الإلكتروني',
    }
  }

  // Simplified email regex to avoid catastrophic backtracking
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: '❌ البريد الإلكتروني غير صحيح',
    }
  }

  return { isValid: true }
}

/**
 * التحقق من النطاق الرقمي
 */
export function validateRange(value: number, min: number, max: number, fieldName = 'القيمة'): ValidationResult {
  if (value < min || value > max) {
    return {
      isValid: false,
      error: `❌ ${fieldName} يجب أن تكون بين ${min} و ${max}`,
    }
  }

  return { isValid: true }
}

/**
 * التحقق من التحديد (dropdown)
 */
export function validateSelection(value: any, fieldName = 'الحقل'): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return {
      isValid: false,
      error: `❌ الرجاء اختيار ${fieldName}`,
    }
  }

  return { isValid: true }
}

/**
 * التحقق من نوع الملف
 */
export function validateFileType(filename: string, allowedExtensions: string[]): ValidationResult {
  const ext = filename.split('.').pop()?.toLowerCase()

  if (!ext || !allowedExtensions.includes(ext)) {
    return {
      isValid: false,
      error: `❌ نوع الملف غير مدعوم. الأنواع المسموحة: ${allowedExtensions.join(', ')}`,
    }
  }

  return { isValid: true }
}

/**
 * التحقق من حجم الملف
 */
export function validateFileSize(sizeInBytes: number, maxSizeInMB: number): ValidationResult {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024

  if (sizeInBytes > maxSizeInBytes) {
    return {
      isValid: false,
      error: `❌ حجم الملف كبير جداً. الحد الأقصى: ${maxSizeInMB} ميجا بايت`,
    }
  }

  return { isValid: true }
}

/**
 * التحقق من نمط معين (Regex)
 */
export function validatePattern(value: string, pattern: RegExp, errorMessage: string): ValidationResult {
  if (!pattern.test(value)) {
    return {
      isValid: false,
      error: errorMessage,
    }
  }

  return { isValid: true }
}

/**
 * التحقق من القيمة الفريدة (Unique)
 */
export async function validateUnique<T>(
  value: any,
  checkFunction: (value: any) => Promise<T | null>,
  fieldName = 'القيمة',
): Promise<ValidationResult> {
  const exists = await checkFunction(value)

  if (exists) {
    return {
      isValid: false,
      error: `❌ ${fieldName} "${value}" موجود مسبقاً`,
    }
  }

  return { isValid: true }
}

/**
 * التحقق من حقول متعددة
 */
export function validateMultiple(validations: ValidationResult[]): ValidationResult {
  for (const validation of validations) {
    if (!validation.isValid) {
      return validation
    }
  }

  return { isValid: true }
}

/**
 * تنظيف المدخلات (Sanitize)
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/\s+/g, ' ')
}

/**
 * تنظيف الأرقام (إزالة الأحرف غير الرقمية)
 */
export function sanitizeNumber(input: string): string {
  return input.replace(/[^0-9.-]/g, '')
}

