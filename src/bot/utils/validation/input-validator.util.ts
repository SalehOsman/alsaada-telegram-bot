/**
 * Input Validator Utility
 * أدوات التحقق من المدخلات
 * 
 * ✅ GLOBAL UTILITY - Can be used across all bot features
 */

export interface ValidationResult {
  valid: boolean
  value?: any
  error?: string
}

/**
 * التحقق من رقم
 */
export function validateNumber(
  text: string,
  options: {
    min?: number
    max?: number
    allowDecimals?: boolean
  } = {}
): ValidationResult {
  const { min, max, allowDecimals = true } = options
  
  const num = allowDecimals ? Number.parseFloat(text) : Number.parseInt(text, 10)
  
  if (Number.isNaN(num)) {
    return { valid: false, error: '❌ يجب إدخال رقم صحيح' }
  }
  
  if (min !== undefined && num < min) {
    return { valid: false, error: `❌ الرقم يجب أن يكون أكبر من أو يساوي ${min}` }
  }
  
  if (max !== undefined && num > max) {
    return { valid: false, error: `❌ الرقم يجب أن يكون أقل من أو يساوي ${max}` }
  }
  
  return { valid: true, value: num }
}

/**
 * التحقق من رقم موجب
 */
export function validatePositiveNumber(text: string): ValidationResult {
  return validateNumber(text, { min: 0.01 })
}

/**
 * التحقق من عدد صحيح موجب
 */
export function validatePositiveInteger(text: string): ValidationResult {
  return validateNumber(text, { min: 1, allowDecimals: false })
}

/**
 * التحقق من نص
 */
export function validateText(
  text: string,
  options: {
    minLength?: number
    maxLength?: number
    required?: boolean
  } = {}
): ValidationResult {
  const { minLength, maxLength, required = true } = options
  
  const trimmed = text.trim()
  
  if (required && !trimmed) {
    return { valid: false, error: '❌ هذا الحقل مطلوب' }
  }
  
  if (minLength && trimmed.length < minLength) {
    return { valid: false, error: `❌ يجب أن يكون النص ${minLength} أحرف على الأقل` }
  }
  
  if (maxLength && trimmed.length > maxLength) {
    return { valid: false, error: `❌ يجب أن يكون النص ${maxLength} حرف كحد أقصى` }
  }
  
  return { valid: true, value: trimmed }
}

/**
 * التحقق من كمية
 */
export function validateQuantity(text: string): ValidationResult {
  const result = validateNumber(text, { min: 0.01 })
  
  if (!result.valid) {
    return { valid: false, error: '❌ يجب إدخال كمية صحيحة أكبر من صفر' }
  }
  
  return result
}

/**
 * التحقق من سعر
 */
export function validatePrice(text: string): ValidationResult {
  const result = validateNumber(text, { min: 0 })
  
  if (!result.valid) {
    return { valid: false, error: '❌ يجب إدخال سعر صحيح' }
  }
  
  return result
}

/**
 * التحقق من باركود
 */
export function validateBarcode(text: string): ValidationResult {
  const trimmed = text.trim()
  
  if (!trimmed) {
    return { valid: false, error: '❌ الباركود مطلوب' }
  }
  
  if (trimmed.length < 3) {
    return { valid: false, error: '❌ الباركود قصير جداً' }
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: '❌ الباركود طويل جداً' }
  }
  
  return { valid: true, value: trimmed }
}

/**
 * التحقق من كود
 */
export function validateCode(text: string): ValidationResult {
  const trimmed = text.trim().toUpperCase()
  
  if (!trimmed) {
    return { valid: false, error: '❌ الكود مطلوب' }
  }
  
  if (!/^[A-Z0-9-_]+$/.test(trimmed)) {
    return { valid: false, error: '❌ الكود يجب أن يحتوي على أحرف إنجليزية وأرقام فقط' }
  }
  
  return { valid: true, value: trimmed }
}

/**
 * التحقق من رقم هاتف
 */
export function validatePhone(text: string): ValidationResult {
  const trimmed = text.trim()
  
  if (!trimmed) {
    return { valid: false, error: '❌ رقم الهاتف مطلوب' }
  }
  
  const cleaned = trimmed.replace(/[\s-()]/g, '')
  
  if (!/^\+?[0-9]{10,15}$/.test(cleaned)) {
    return { valid: false, error: '❌ رقم الهاتف غير صحيح' }
  }
  
  return { valid: true, value: cleaned }
}

/**
 * التحقق من بريد إلكتروني
 */
export function validateEmail(text: string): ValidationResult {
  const trimmed = text.trim().toLowerCase()
  
  if (!trimmed) {
    return { valid: false, error: '❌ البريد الإلكتروني مطلوب' }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: '❌ البريد الإلكتروني غير صحيح' }
  }
  
  return { valid: true, value: trimmed }
}

