/**
 * Barcode Handler Utility
 * أداة إدارة الباركود - عامة لجميع المخازن
 * 
 * @description
 * توفر واجهة موحدة لإدارة عمليات الباركود (مسح، إدخال يدوي، توليد QR)
 * يمكن استخدامها في أي مخزن أو نظام يحتاج باركود
 * 
 * @example
 * - مخزن الزيوت: مسح باركود المنتج أو توليد QR Code
 * - قطع الغيار: إدخال باركود يدوياً أو مسح من الصورة
 * - المعدات: توليد QR Code للمعدة
 */

import type { Context } from 'grammy'
import { InlineKeyboard } from 'grammy'
import { BarcodeScannerService } from '#root/modules/services/barcode-scanner/index.js'

/**
 * نتيجة عملية الباركود
 */
export interface BarcodeHandlerResult {
  success: boolean // نجحت العملية أم لا
  barcode?: string // الباركود (إذا نجحت)
  qrCode?: string // QR Code (إذا تم التوليد)
  method: 'scan' | 'manual' | 'generate' | 'skip' // الطريقة المستخدمة
  error?: string // رسالة الخطأ (إذا فشلت)
}

/**
 * خيارات معالج الباركود
 */
export interface BarcodeHandlerOptions {
  /**
   * السماح بالمسح الضوئي
   * @default true
   */
  allowScan?: boolean

  /**
   * السماح بالإدخال اليدوي
   * @default true
   */
  allowManual?: boolean

  /**
   * السماح بتوليد QR Code تلقائياً
   * @default true
   */
  allowGenerate?: boolean

  /**
   * السماح بالتخطي (اختياري)
   * @default true
   */
  allowSkip?: boolean

  /**
   * البادئة للـ callback_data
   * @example "og:barcode" → og:barcode:scan, og:barcode:manual
   */
  callbackPrefix: string

  /**
   * البيانات المستخدمة لتوليد QR Code (إذا كان مطلوباً)
   * يمكن أن تكون كود المنتج، معرّف المعدة، إلخ
   */
  dataForQR?: string
}

/**
 * بناء لوحة مفاتيح خيارات الباركود
 * 
 * @param options - خيارات المعالج
 * @returns InlineKeyboard جاهزة للاستخدام
 * 
 * @example
 * ```typescript
 * const keyboard = buildBarcodeKeyboard({
 *   callbackPrefix: 'og:barcode',
 *   allowScan: true,
 *   allowManual: true,
 *   allowGenerate: true,
 *   allowSkip: true
 * });
 * 
 * await ctx.reply('اختر طريقة إدخال الباركود:', { reply_markup: keyboard });
 * ```
 */
export function buildBarcodeKeyboard(
  options: BarcodeHandlerOptions,
): InlineKeyboard {
  const {
    allowScan = true,
    allowManual = true,
    allowGenerate = true,
    allowSkip = true,
    callbackPrefix,
  } = options

  const keyboard = new InlineKeyboard()

  // زر المسح الضوئي
  if (allowScan) {
    keyboard.text('📸 مسح الباركود', `${callbackPrefix}:scan`)
  }

  // زر الإدخال اليدوي
  if (allowManual) {
    keyboard.text('⌨️ إدخال يدوي', `${callbackPrefix}:manual`)
  }

  keyboard.row() // سطر جديد

  // زر توليد QR Code
  if (allowGenerate) {
    keyboard.text('🔄 توليد QR Code تلقائياً', `${callbackPrefix}:generate`)
  }

  // زر التخطي
  if (allowSkip) {
    keyboard.text('⏭️ تخطي', `${callbackPrefix}:skip`)
  }

  return keyboard
}

/**
 * مسح باركود من صورة
 * 
 * @param ctx - السياق (Context)
 * @returns نتيجة المسح
 * 
 * @example
 * ```typescript
 * const result = await scanBarcodeFromImage(ctx);
 * if (result.success) {
 *   console.log('✅ تم مسح الباركود:', result.barcode);
 * } else {
 *   console.log('❌ فشل المسح:', result.error);
 * }
 * ```
 */
export async function scanBarcodeFromImage(
  ctx: Context,
): Promise<BarcodeHandlerResult> {
  try {
    // التحقق من وجود صورة
    if (!ctx.message?.photo) {
      return {
        success: false,
        method: 'scan',
        error: '❌ لم يتم إرسال صورة',
      }
    }

    // جلب الصورة
    const photo = ctx.message.photo[ctx.message.photo.length - 1] // أكبر حجم
    const file = await ctx.api.getFile(photo.file_id)

    if (!file.file_path) {
      return {
        success: false,
        method: 'scan',
        error: '❌ فشل في جلب الصورة',
      }
    }

    // تحميل الصورة
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
    const response = await fetch(fileUrl)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // مسح الباركود من الصورة
    const scanResult = await BarcodeScannerService.scanBarcode(buffer)

    if (!scanResult || !scanResult.data) {
      return {
        success: false,
        method: 'scan',
        error: '❌ لم يتم العثور على باركود في الصورة',
      }
    }

    return {
      success: true,
      method: 'scan',
      barcode: scanResult.data,
    }
  }
  catch (error) {
    return {
      success: false,
      method: 'scan',
      error: `❌ حدث خطأ أثناء مسح الباركود: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
    }
  }
}

/**
 * مسح QR Code من صورة
 * 
 * @param ctx - السياق (Context)
 * @returns نتيجة المسح
 */
export async function scanQRCodeFromImage(
  ctx: Context,
): Promise<BarcodeHandlerResult> {
  try {
    if (!ctx.message?.photo) {
      return {
        success: false,
        method: 'scan',
        error: '❌ لم يتم إرسال صورة',
      }
    }

    const photo = ctx.message.photo[ctx.message.photo.length - 1]
    const file = await ctx.api.getFile(photo.file_id)

    if (!file.file_path) {
      return {
        success: false,
        method: 'scan',
        error: '❌ فشل في جلب الصورة',
      }
    }

    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
    const response = await fetch(fileUrl)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // مسح QR Code من الصورة
    const scanResult = await BarcodeScannerService.scanQRCode(buffer)

    if (!scanResult || !scanResult.data) {
      return {
        success: false,
        method: 'scan',
        error: '❌ لم يتم العثور على QR Code في الصورة',
      }
    }

    return {
      success: true,
      method: 'scan',
      barcode: scanResult.data,
      qrCode: scanResult.data,
    }
  }
  catch (error) {
    return {
      success: false,
      method: 'scan',
      error: `❌ حدث خطأ أثناء مسح QR Code: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
    }
  }
}

/**
 * التحقق من صحة الباركود المدخل يدوياً
 * 
 * @param barcode - الباركود المدخل
 * @returns نتيجة التحقق
 * 
 * @example
 * ```typescript
 * const result = validateManualBarcode('1234567890123');
 * if (result.success) {
 *   console.log('✅ الباركود صحيح');
 * }
 * ```
 */
export function validateManualBarcode(barcode: string): BarcodeHandlerResult {
  // إزالة المسافات
  const cleaned = barcode.trim()

  // التحقق من الطول (على الأقل 4 أحرف)
  if (cleaned.length < 4) {
    return {
      success: false,
      method: 'manual',
      error: '❌ الباركود قصير جداً (على الأقل 4 أحرف)',
    }
  }

  // التحقق من الطول الأقصى (50 حرف)
  if (cleaned.length > 50) {
    return {
      success: false,
      method: 'manual',
      error: '❌ الباركود طويل جداً (50 حرف كحد أقصى)',
    }
  }

  // التحقق من أن الباركود يحتوي على أحرف وأرقام فقط
  const isValid = /^[A-Za-z0-9-_]+$/.test(cleaned)
  if (!isValid) {
    return {
      success: false,
      method: 'manual',
      error: '❌ الباركود يجب أن يحتوي على أحرف وأرقام فقط (A-Z, 0-9, -, _)',
    }
  }

  return {
    success: true,
    method: 'manual',
    barcode: cleaned,
  }
}

/**
 * توليد QR Code من بيانات
 * 
 * @param data - البيانات المراد تحويلها إلى QR
 * @returns نتيجة التوليد
 * 
 * @example
 * ```typescript
 * const result = await generateQRCode('ENG-001-PRODUCT-INFO');
 * if (result.success) {
 *   console.log('✅ تم توليد QR Code:', result.qrCode);
 * }
 * ```
 */
export async function generateQRCode(data: string): Promise<BarcodeHandlerResult> {
  try {
    if (!data || data.trim().length === 0) {
      return {
        success: false,
        method: 'generate',
        error: '❌ لا توجد بيانات لتوليد QR Code',
      }
    }

    // توليد QR Code باستخدام BarcodeScannerService
    const qrBuffer = await BarcodeScannerService.generateQRCode({
      text: data,
      size: 512,
      margin: 4,
    })

    // تحويل Buffer إلى Base64 (للحفظ في قاعدة البيانات إذا لزم الأمر)
    const qrBase64 = qrBuffer.toString('base64')

    return {
      success: true,
      method: 'generate',
      qrCode: qrBase64,
      barcode: data, // البيانات الأصلية
    }
  }
  catch (error) {
    return {
      success: false,
      method: 'generate',
      error: `❌ فشل في توليد QR Code: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
    }
  }
}

/**
 * استخراج طريقة الباركود من callback_data
 * 
 * @param callbackData - البيانات من الزر
 * @param callbackPrefix - البادئة المستخدمة
 * @returns الطريقة ('scan' | 'manual' | 'generate' | 'skip') أو null
 * 
 * @example
 * ```typescript
 * const method = extractBarcodeMethod('og:barcode:scan', 'og:barcode');
 * // 'scan'
 * ```
 */
export function extractBarcodeMethod(
  callbackData: string,
  callbackPrefix: string,
): 'scan' | 'manual' | 'generate' | 'skip' | null {
  if (!callbackData.startsWith(`${callbackPrefix}:`)) {
    return null
  }

  const parts = callbackData.split(':')
  const method = parts[parts.length - 1]

  if (
    method === 'scan'
    || method === 'manual'
    || method === 'generate'
    || method === 'skip'
  ) {
    return method
  }

  return null
}

/**
 * بناء رسالة تأكيد الباركود
 * 
 * @param result - نتيجة عملية الباركود
 * @returns نص رسالة التأكيد
 * 
 * @example
 * ```typescript
 * const message = buildBarcodeConfirmation({
 *   success: true,
 *   method: 'scan',
 *   barcode: '1234567890123'
 * });
 * // "✅ تم مسح الباركود بنجاح\n📦 الباركود: 1234567890123"
 * ```
 */
export function buildBarcodeConfirmation(result: BarcodeHandlerResult): string {
  if (!result.success) {
    return result.error || '❌ فشلت العملية'
  }

  const methodName = {
    scan: 'مسح الباركود',
    manual: 'إدخال الباركود يدوياً',
    generate: 'توليد QR Code',
    skip: 'تخطي',
  }[result.method]

  let message = `✅ تم ${methodName} بنجاح`

  if (result.barcode && result.method !== 'skip') {
    message += `\n📦 الباركود: \`${result.barcode}\``
  }

  if (result.qrCode && result.method === 'generate') {
    message += '\n🔄 تم توليد QR Code تلقائياً'
  }

  return message
}

/**
 * بناء رسالة تعليمات حسب الطريقة المختارة
 * 
 * @param method - الطريقة المختارة
 * @returns نص التعليمات
 */
export function buildBarcodeInstructions(
  method: 'scan' | 'manual' | 'generate' | 'skip',
): string {
  const instructions = {
    scan: '📸 *مسح الباركود*\n\nالرجاء إرسال صورة تحتوي على الباركود أو QR Code',
    manual: '⌨️ *إدخال يدوي*\n\nالرجاء إرسال رقم الباركود (أحرف وأرقام فقط)',
    generate: '🔄 *توليد QR Code*\n\nسيتم توليد QR Code تلقائياً عند حفظ المنتج',
    skip: '⏭️ *تخطي*\n\nلن يتم إضافة باركود لهذا المنتج',
  }

  return instructions[method]
}
