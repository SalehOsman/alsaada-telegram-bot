/**
 * Code Generator Utility
 * أداة توليد أكواد المنتجات - عامة لجميع المخازن
 * 
 * @description
 * تولد أكواد فريدة للمنتجات بناءً على prefix الفئة + رقم تسلسلي
 * يمكن استخدامها في أي مخزن (زيوت، قطع غيار، معدات، إلخ)
 * 
 * @example
 * - مخزن الزيوت: ENG-001, GRS-002, HYD-003
 * - قطع الغيار: SPR-001, SPR-002, SPR-003
 * - المعدات: EQP-001, EQP-002, EQP-003
 */

import { Database } from '#root/modules/database/index.js'

/**
 * معلومات الكود المُولّد
 */
export interface GeneratedCode {
  code: string // الكود الكامل (مثل: ENG-001)
  prefix: string // البادئة (مثل: ENG)
  sequence: number // الرقم التسلسلي (مثل: 1)
  formatted: string // الرقم المنسق (مثل: 001)
}

/**
 * خيارات توليد الكود
 */
export interface CodeGeneratorOptions {
  /**
   * طول الرقم التسلسلي (عدد الأصفار)
   * @default 3 (ينتج: 001, 002, 003)
   */
  sequenceLength?: number

  /**
   * بادئة مخصصة (اختياري)
   * إذا لم تُحدد، سيتم جلبها من الفئة
   */
  customPrefix?: string
}

/**
 * توليد كود منتج لمخزن الزيوت والشحوم
 * 
 * @param categoryId - معرّف الفئة (INV_OilsGreasesCategory)
 * @param options - خيارات توليد الكود
 * @returns الكود المُولّد
 * 
 * @example
 * ```typescript
 * const code = await generateOilsGreasesCode(1); // ENG-001
 * const code = await generateOilsGreasesCode(2, { sequenceLength: 4 }); // GRS-0001
 * ```
 */
export async function generateOilsGreasesCode(
  categoryId: number,
  options: CodeGeneratorOptions = {},
): Promise<GeneratedCode> {
  const { sequenceLength = 3, customPrefix } = options

  // 1️⃣ جلب البادئة من الفئة (إذا لم تُحدد)
  let prefix = customPrefix
  if (!prefix) {
    const category = await Database.prisma.iNV_OilsGreasesCategory.findUnique({
      where: { id: categoryId },
      select: { prefix: true },
    })

    if (!category) {
      throw new Error(`❌ الفئة غير موجودة: ${categoryId}`)
    }

    prefix = category.prefix
  }

  // 2️⃣ جلب آخر كود تم توليده لهذه البادئة
  const lastItem = await Database.prisma.iNV_OilsGreasesItem.findFirst({
    where: {
      code: {
        startsWith: `${prefix}-`,
      },
    },
    orderBy: {
      code: 'desc',
    },
    select: { code: true },
  })

  // 3️⃣ حساب الرقم التسلسلي الجديد
  let sequence = 1
  if (lastItem) {
    // استخراج الرقم من الكود (مثل: ENG-001 → 1)
    const lastSequence = Number.parseInt(lastItem.code.split('-')[1], 10)
    if (!Number.isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  // 4️⃣ تنسيق الرقم التسلسلي (001, 002, 003)
  const formatted = sequence.toString().padStart(sequenceLength, '0')

  // 5️⃣ بناء الكود الكامل
  const code = `${prefix}-${formatted}`

  return {
    code,
    prefix,
    sequence,
    formatted,
  }
}

/**
 * توليد كود منتج لمخزن قطع الغيار
 *
 * @param categoryId - معرّف الفئة (INV_EquipmentCategory)
 * @param options - خيارات توليد الكود
 * @returns الكود المُولّد
 *
 * @example
 * ```typescript
 * const code = await generateSparePartCode(1); // SPR-001
 * ```
 */
export async function generateSparePartCode(
  categoryId: number,
  options: CodeGeneratorOptions = {},
): Promise<GeneratedCode> {
  const { sequenceLength = 3, customPrefix } = options

  // 1️⃣ جلب البادئة من الفئة (إذا لم تُحدد)
  let prefix = customPrefix
  if (!prefix) {
    const category = await Database.prisma.iNV_EquipmentCategory.findUnique({
      where: { id: categoryId },
      select: { code: true },
    })

    if (!category) {
      throw new Error(`❌ الفئة غير موجودة: ${categoryId}`)
    }

    // استخدام أول 3 أحرف من الكود كبادئة
    prefix = category.code.substring(0, 3).toUpperCase()
  }

  // 2️⃣ جلب آخر كود تم توليده لهذه البادئة
  const lastItem = await Database.prisma.iNV_SparePart.findFirst({
    where: {
      code: {
        startsWith: `${prefix}-`,
      },
    },
    orderBy: {
      code: 'desc',
    },
    select: { code: true },
  })

  // 3️⃣ حساب الرقم التسلسلي الجديد
  let sequence = 1
  if (lastItem) {
    const lastSequence = Number.parseInt(lastItem.code.split('-')[1], 10)
    if (!Number.isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  // 4️⃣ تنسيق الرقم التسلسلي
  const formatted = sequence.toString().padStart(sequenceLength, '0')

  // 5️⃣ بناء الكود الكامل
  const code = `${prefix}-${formatted}`

  return {
    code,
    prefix,
    sequence,
    formatted,
  }
}

/**
 * توليد كود عام (Generic) - للاستخدام مع أي جدول
 *
 * @param tableName - اسم الجدول في قاعدة البيانات
 * @param prefix - البادئة المخصصة
 * @param options - خيارات توليد الكود
 * @returns الكود المُولّد
 *
 * @example
 * ```typescript
 * // لأي مخزن جديد مستقبلاً
 * const code = await generateGenericCode('INV_Tools', 'TOL'); // TOL-001
 * const code = await generateGenericCode('INV_Chemicals', 'CHM', { sequenceLength: 4 }); // CHM-0001
 * ```
 */
export async function generateGenericCode(
  tableName: string,
  prefix: string,
  options: CodeGeneratorOptions = {},
): Promise<GeneratedCode> {
  const { sequenceLength = 3 } = options

  // 1️⃣ جلب آخر كود من الجدول المحدد
  // استخدام $queryRawUnsafe لأن اسم الجدول ديناميكي
  const lastItem: any = await Database.prisma.$queryRawUnsafe(
    `SELECT code FROM ${tableName} WHERE code LIKE '${prefix}-%' ORDER BY code DESC LIMIT 1`,
  )

  // 2️⃣ حساب الرقم التسلسلي الجديد
  let sequence = 1
  if (lastItem && lastItem.length > 0 && lastItem[0].code) {
    const lastSequence = Number.parseInt(lastItem[0].code.split('-')[1], 10)
    if (!Number.isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  // 3️⃣ تنسيق الرقم التسلسلي
  const formatted = sequence.toString().padStart(sequenceLength, '0')

  // 4️⃣ بناء الكود الكامل
  const code = `${prefix}-${formatted}`

  return {
    code,
    prefix,
    sequence,
    formatted,
  }
}

/**
 * التحقق من توفر كود معين
 *
 * @param tableName - اسم الجدول
 * @param code - الكود المراد التحقق منه
 * @returns true إذا كان الكود متاحاً، false إذا كان مستخدماً
 *
 * @example
 * ```typescript
 * const isAvailable = await isCodeAvailable('INV_OilsGreasesItem', 'ENG-001');
 * if (!isAvailable) {
 *   console.log('❌ الكود مستخدم بالفعل');
 * }
 * ```
 */
export async function isCodeAvailable(
  tableName: string,
  code: string,
): Promise<boolean> {
  const result: any = await Database.prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as count FROM ${tableName} WHERE code = '${code}'`,
  )

  return result[0].count === 0
}

/**
 * معاينة الكود التالي بدون حفظه
 * مفيدة لعرض الكود للمستخدم قبل الحفظ
 *
 * @param prefix - البادئة
 * @param lastCode - آخر كود مُستخدم (اختياري)
 * @param options - خيارات التنسيق
 * @returns الكود التالي المتوقع
 *
 * @example
 * ```typescript
 * const preview = previewNextCode('ENG', 'ENG-005'); // ENG-006
 * console.log(`الكود التالي سيكون: ${preview.code}`);
 * ```
 */
export function previewNextCode(
  prefix: string,
  lastCode?: string,
  options: CodeGeneratorOptions = {},
): GeneratedCode {
  const { sequenceLength = 3 } = options

  let sequence = 1
  if (lastCode) {
    const parts = lastCode.split('-')
    if (parts.length === 2) {
      const lastSequence = Number.parseInt(parts[1], 10)
      if (!Number.isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }
  }

  const formatted = sequence.toString().padStart(sequenceLength, '0')
  const code = `${prefix}-${formatted}`

  return {
    code,
    prefix,
    sequence,
    formatted,
  }
}
