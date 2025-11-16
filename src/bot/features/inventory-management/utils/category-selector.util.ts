/**
 * Category Selector Utility
 * أداة اختيار الفئات - عامة لجميع الأنظمة
 * 
 * @description
 * توفر واجهة موحدة لعرض واختيار الفئات باستخدام Inline Keyboards
 * يمكن استخدامها في أي نظام (مخازن، موظفين، مشاريع، إلخ)
 * 
 * @example
 * - مخزن الزيوت: اختيار نوع الزيت (محرك، هيدروليك، تروس)
 * - قطع الغيار: اختيار فئة القطعة (كهربائي، ميكانيكي، إلخ)
 * - المشاريع: اختيار نوع المشروع (داخلي، خارجي، إلخ)
 */

import { InlineKeyboard } from 'grammy'

/**
 * بيانات الفئة (Generic)
 */
export interface CategoryData {
  id: number // معرّف الفئة
  nameAr: string // الاسم بالعربية
  nameEn?: string // الاسم بالإنجليزية (اختياري)
  code?: string // الكود (اختياري)
  prefix?: string // البادئة (اختياري)
  icon?: string // أيقونة (اختياري)
  description?: string // وصف (اختياري)
  isActive?: boolean // نشطة أم لا
}

/**
 * خيارات عرض الفئات
 */
export interface CategorySelectorOptions {
  /**
   * عدد الأعمدة في لوحة الأزرار
   * @default 2
   */
  columns?: number

  /**
   * البادئة للـ callback_data
   * @example "og:category" → og:category:1, og:category:2
   */
  callbackPrefix: string

  /**
   * عرض الكود مع الاسم
   * @default false
   */
  showCode?: boolean

  /**
   * عرض البادئة مع الاسم
   * @default false
   */
  showPrefix?: boolean

  /**
   * عرض الأيقونة مع الاسم
   * @default true
   */
  showIcon?: boolean

  /**
   * إضافة زر "رجوع" في النهاية
   * @default undefined (لا يُضاف)
   */
  backButton?: {
    text: string // نص الزر
    callback: string // callback_data للزر
  }

  /**
   * إضافة زر "إلغاء" في النهاية
   * @default undefined (لا يُضاف)
   */
  cancelButton?: {
    text: string
    callback: string
  }

  /**
   * تصفية الفئات النشطة فقط
   * @default true
   */
  activeOnly?: boolean
}

/**
 * إنشاء لوحة مفاتيح للفئات (Inline Keyboard)
 * 
 * @param categories - قائمة الفئات
 * @param options - خيارات العرض
 * @returns InlineKeyboard جاهزة للاستخدام
 * 
 * @example
 * ```typescript
 * const categories = await prisma.iNV_OilsGreasesCategory.findMany();
 * const keyboard = buildCategoryKeyboard(categories, {
 *   callbackPrefix: 'og:category',
 *   columns: 2,
 *   showIcon: true,
 *   backButton: { text: '🔙 رجوع', callback: 'og:back' }
 * });
 * 
 * await ctx.reply('اختر نوع الزيت:', { reply_markup: keyboard });
 * ```
 */
export function buildCategoryKeyboard(
  categories: CategoryData[],
  options: CategorySelectorOptions,
): InlineKeyboard {
  const {
    columns = 2,
    callbackPrefix,
    showCode = false,
    showPrefix = false,
    showIcon = true,
    backButton,
    cancelButton,
    activeOnly = true,
  } = options

  const keyboard = new InlineKeyboard()

  // 1️⃣ تصفية الفئات النشطة فقط (إذا كان مطلوباً)
  let filteredCategories = categories
  if (activeOnly) {
    filteredCategories = categories.filter((cat) => cat.isActive !== false)
  }

  // 2️⃣ بناء نص الزر لكل فئة
  filteredCategories.forEach((category, index) => {
    let buttonText = ''

    // إضافة الأيقونة
    if (showIcon && category.icon) {
      buttonText += `${category.icon} `
    }

    // إضافة الاسم
    buttonText += category.nameAr

    // إضافة الكود
    if (showCode && category.code) {
      buttonText += ` (${category.code})`
    }

    // إضافة البادئة
    if (showPrefix && category.prefix) {
      buttonText += ` [${category.prefix}]`
    }

    // إضافة الزر إلى اللوحة
    const callbackData = `${callbackPrefix}:${category.id}`
    keyboard.text(buttonText, callbackData)

    // إنشاء سطر جديد بعد كل N أعمدة
    if ((index + 1) % columns === 0) {
      keyboard.row()
    }
  })

  // 3️⃣ إضافة أزرار إضافية في النهاية
  if (backButton || cancelButton) {
    keyboard.row() // سطر جديد للأزرار الإضافية

    if (backButton) {
      keyboard.text(backButton.text, backButton.callback)
    }

    if (cancelButton) {
      keyboard.text(cancelButton.text, cancelButton.callback)
    }
  }

  return keyboard
}

/**
 * بناء رسالة تأكيد اختيار الفئة
 * 
 * @param category - الفئة المختارة
 * @param options - خيارات العرض
 * @returns نص رسالة التأكيد
 * 
 * @example
 * ```typescript
 * const category = await prisma.iNV_OilsGreasesCategory.findUnique({ where: { id: 1 } });
 * const message = buildCategoryConfirmation(category, { showCode: true });
 * // "✅ تم اختيار: زيت محرك (ENGINE-OIL)"
 * ```
 */
export function buildCategoryConfirmation(
  category: CategoryData,
  options: {
    showCode?: boolean
    showPrefix?: boolean
    showDescription?: boolean
  } = {},
): string {
  const { showCode = false, showPrefix = false, showDescription = false } =
    options

  let message = `✅ تم اختيار: ${category.nameAr}`

  if (showCode && category.code) {
    message += ` (${category.code})`
  }

  if (showPrefix && category.prefix) {
    message += ` [${category.prefix}]`
  }

  if (showDescription && category.description) {
    message += `\n📝 ${category.description}`
  }

  return message
}

/**
 * البحث عن فئة بواسطة ID من callback_data
 * 
 * @param callbackData - البيانات من الزر (مثل: "og:category:1")
 * @param callbackPrefix - البادئة المستخدمة
 * @returns معرّف الفئة أو null
 * 
 * @example
 * ```typescript
 * const categoryId = extractCategoryId('og:category:5', 'og:category');
 * // 5
 * 
 * const category = await prisma.iNV_OilsGreasesCategory.findUnique({
 *   where: { id: categoryId }
 * });
 * ```
 */
export function extractCategoryId(
  callbackData: string,
  callbackPrefix: string,
): number | null {
  // التحقق من أن callback_data يبدأ بالبادئة الصحيحة
  if (!callbackData.startsWith(`${callbackPrefix}:`)) {
    return null
  }

  // استخراج الـ ID من نهاية callback_data
  const parts = callbackData.split(':')
  const idString = parts[parts.length - 1]
  const id = parseInt(idString, 10)

  return Number.isNaN(id) ? null : id
}

/**
 * بناء قائمة نصية للفئات (للعرض فقط، بدون أزرار)
 * 
 * @param categories - قائمة الفئات
 * @param options - خيارات العرض
 * @returns نص منسق للفئات
 * 
 * @example
 * ```typescript
 * const categories = await prisma.iNV_OilsGreasesCategory.findMany();
 * const list = buildCategoryList(categories, { numbered: true });
 * console.log(list);
 * // 1. 🛢️ زيت محرك (ENG)
 * // 2. 🧴 شحم (GRS)
 * // 3. 💧 زيت هيدروليك (HYD)
 * ```
 */
export function buildCategoryList(
  categories: CategoryData[],
  options: {
    numbered?: boolean
    showCode?: boolean
    showPrefix?: boolean
    showIcon?: boolean
    activeOnly?: boolean
  } = {},
): string {
  const {
    numbered = false,
    showCode = false,
    showPrefix = true,
    showIcon = true,
    activeOnly = true,
  } = options

  // تصفية الفئات النشطة فقط
  let filteredCategories = categories
  if (activeOnly) {
    filteredCategories = categories.filter((cat) => cat.isActive !== false)
  }

  // بناء القائمة
  const lines = filteredCategories.map((category, index) => {
    let line = ''

    // إضافة رقم تسلسلي
    if (numbered) {
      line += `${index + 1}. `
    } else {
      line += '• '
    }

    // إضافة الأيقونة
    if (showIcon && category.icon) {
      line += `${category.icon} `
    }

    // إضافة الاسم
    line += category.nameAr

    // إضافة الكود
    if (showCode && category.code) {
      line += ` (${category.code})`
    }

    // إضافة البادئة
    if (showPrefix && category.prefix) {
      line += ` [${category.prefix}]`
    }

    return line
  })

  return lines.join('\n')
}

/**
 * التحقق من صحة الفئة (موجودة ونشطة)
 * 
 * @param categoryId - معرّف الفئة
 * @param categories - قائمة الفئات المتاحة
 * @returns true إذا كانت الفئة صالحة
 * 
 * @example
 * ```typescript
 * const categories = await prisma.iNV_OilsGreasesCategory.findMany();
 * const isValid = isCategoryValid(5, categories);
 * if (!isValid) {
 *   await ctx.reply('❌ الفئة غير صالحة');
 * }
 * ```
 */
export function isCategoryValid(
  categoryId: number,
  categories: CategoryData[],
): boolean {
  const category = categories.find((cat) => cat.id === categoryId)
  return category !== undefined && category.isActive !== false
}

/**
 * الحصول على معلومات الفئة من القائمة
 * 
 * @param categoryId - معرّف الفئة
 * @param categories - قائمة الفئات
 * @returns بيانات الفئة أو undefined
 */
export function getCategoryById(
  categoryId: number,
  categories: CategoryData[],
): CategoryData | undefined {
  return categories.find((cat) => cat.id === categoryId)
}
