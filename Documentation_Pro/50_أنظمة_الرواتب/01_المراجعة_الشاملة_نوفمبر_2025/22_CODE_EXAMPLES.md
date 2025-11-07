# 💻 أمثلة الكود الكاملة
## Before/After Code Examples

> **الغرض:** مقارنة الكود قبل وبعد الإصلاحات  
> **الجمهور:** المطورون والمبرمجون

---

## 📋 الفهرس

1. [الكود الحالي (Before)](#الكود-الحالي-before)
2. [الحل السريع (Quick Fix)](#الحل-السريع-quick-fix)
3. [الحل المتوسط (Proper Fix)](#الحل-المتوسط-proper-fix)
4. [الحل الشامل (Complete Refactor)](#الحل-الشامل-complete-refactor)
5. [مقارنة النتائج](#مقارنة-النتائج)

---

## الكود الحالي (Before)

### المشكلة: لا يوجد خصم للمسحوبات الزائدة

```typescript
// ملف: src/bot/features/hr-management/handlers/payroll-calculate.handler.ts
// السطور: 684-745

// ✨ حساب بدل المسحوبات العينية (بناءً على المسحوبات الفعلية)

// 1. جلب المسحوبات العينية الفعلية من HR_Transaction للفترة المحددة
const materialWithdrawals = await Database.prisma.hR_Transaction.findMany({
  where: {
    employeeId: employee.id,
    transactionType: 'ITEM_WITHDRAWAL',
    status: 'APPROVED',
    createdAt: {
      gte: startOfMonth,
      lte: endOfPeriod,
    },
  },
  include: {
    item: true,
  },
})

// 2. جلب الاستحقاقات لمعرفة الحد الأقصى
const materialEntitlements = await Database.prisma.hR_MaterialEntitlement.findMany({
  where: {
    targetType: 'EMPLOYEE',
    targetId: employee.id,
    isActive: true,
  },
  include: {
    item: true,
  },
})

// 3. حساب المسحوبات لكل صنف
const withdrawalsByItem = new Map<number, number>()
for (const withdrawal of materialWithdrawals) {
  if (withdrawal.itemId) {
    const currentQty = withdrawalsByItem.get(withdrawal.itemId) || 0
    withdrawalsByItem.set(withdrawal.itemId, currentQty + (withdrawal.quantity || 0))
  }
}

// 4. حساب البدل مع الحد الأقصى (الاستحقاق × أيام العمل)
let totalMaterialAllowance = 0

if (materialEntitlements.length > 0 && withdrawalsByItem.size > 0) {
  allowancesDetails += '📦 **بدل المسحوبات العينية:**\n'

  for (const ent of materialEntitlements) {
    const itemId = ent.itemId
    const maxAllowed = ent.dailyQuantity * actualWorkDays // الحد الأقصى المسموح
    const actualWithdrawn = withdrawalsByItem.get(itemId) || 0 // المسحوب فعلياً

    if (actualWithdrawn > 0) {
      // الكمية المعتمدة للبدل = الأقل من (المسحوب فعلياً، الحد الأقصى)
      const allowedQty = Math.min(actualWithdrawn, maxAllowed)
      const allowanceAmount = allowedQty * (ent.item?.price || 0)

      totalMaterialAllowance += allowanceAmount  // ✅ يُضاف للبدلات

      allowancesDetails += `├ ${ent.item?.nameAr || 'صنف'}: ${formatCurrency(allowanceAmount)}\n`
      allowancesDetails += `  (${formatArabicNumber(allowedQty)} علبة × ${formatCurrency(ent.item?.price || 0)})\n`

      // عرض تحذير إذا سحب أكثر من المسموح
      if (actualWithdrawn > maxAllowed) {
        allowancesDetails += `  ⚠️ تم السحب: ${formatArabicNumber(actualWithdrawn)} علبة (الحد الأقصى: ${formatArabicNumber(maxAllowed)})\n`
        
        // ❌❌❌ المشكلة: لا يوجد خصم! ❌❌❌
      }
    }
  }
  allowancesDetails += '\n'
}

totalAllowances += totalMaterialAllowance  // ✅ البدل يُضاف
// ❌ الخصم لا يُضاف!

// ... باقي الكود
```

### المشاكل في الكود الحالي:

```typescript
❌ المشكلة #1: لا يوجد حساب للخصم
   const excessQty = actualWithdrawn - maxAllowed  // مفقود!
   const deductionAmount = excessQty * price        // مفقود!

❌ المشكلة #2: التحذير بلا فعل
   if (actualWithdrawn > maxAllowed) {
     // يعرض تحذير فقط
     // لا يخصم!
   }

❌ المشكلة #3: منطق خاطئ
   const maxAllowed = ent.dailyQuantity * actualWorkDays
   // يُستخدم للمقارنة بدلاً من الاستحقاق الفعلي

❌ المشكلة #4: خلط المفاهيم
   totalAllowances += allowanceAmount  // البدل
   // أين الخصم؟
```

---

## الحل السريع (Quick Fix)

### ⚡ الحل الأسرع (2-4 ساعات)

```typescript
// ملف: src/bot/features/hr-management/handlers/payroll-calculate.handler.ts
// بعد السطر ~745

// ... الكود السابق كما هو ...

totalAllowances += totalMaterialAllowance  // ✅ البدل

// ✅✅✅ إضافة: حساب خصم الزيادة ✅✅✅
let totalMaterialDeductions = 0
let materialDeductionDetails = ''

if (materialEntitlements.length > 0 && withdrawalsByItem.size > 0) {
  for (const ent of materialEntitlements) {
    const itemId = ent.itemId
    const actualWithdrawn = withdrawalsByItem.get(itemId) || 0

    if (actualWithdrawn > 0) {
      // حساب الاستحقاق الفعلي للشهر
      const monthlyEntitlement = ent.quantity || (ent.dailyQuantity * actualWorkDays)
      
      // إذا سحب أكثر من الاستحقاق
      if (actualWithdrawn > monthlyEntitlement) {
        const excessQty = actualWithdrawn - monthlyEntitlement
        const price = ent.item?.price || 0
        const deductionAmount = excessQty * price
        
        totalMaterialDeductions += deductionAmount
        
        // بناء رسالة الخصم
        if (!materialDeductionDetails) {
          materialDeductionDetails = '💸 **خصم المسحوبات الزائدة:**\n'
        }
        
        materialDeductionDetails += `├ ${ent.item?.nameAr || 'صنف'}: ${formatCurrency(deductionAmount)}\n`
        materialDeductionDetails += `  (${formatArabicNumber(excessQty)} علبة زيادة × ${formatCurrency(price)})\n`
      }
    }
  }
}

// إضافة الخصم للإجمالي
totalDeductions += totalMaterialDeductions  // ✅ الخصم يُضاف

// عرض تفاصيل الخصم في التقرير
if (materialDeductionDetails) {
  reportText += materialDeductionDetails + '\n'
}
// ✅✅✅ نهاية الإضافة ✅✅✅

// ... باقي الكود
```

### مزايا الحل السريع:

```
✅ سريع التنفيذ (2-4 ساعات)
✅ لا يغير البنية الأساسية
✅ يحل المشكلة الرئيسية
✅ سهل الاختبار

⚠️ لكن:
- لا يزال الكود معقد
- منطق متشابك
- صعب الصيانة
```

---

## الحل المتوسط (Proper Fix)

### 🔧 حل أفضل مع إعادة تنظيم (1-2 أيام)

```typescript
// ملف: src/bot/features/hr-management/handlers/payroll-calculate.handler.ts

// ═══════════════════════════════════════════════════════════════
// الخطوة 1: إنشاء Interface واضح
// ═══════════════════════════════════════════════════════════════

interface MaterialCalculationResult {
  // المبالغ
  allowance: number          // البدل (يُضاف للراتب)
  deduction: number          // الخصم (يُخصم من الراتب)
  
  // التفاصيل للعرض
  details: {
    allowance: string        // نص البدل
    deduction: string        // نص الخصم
    warnings: string[]       // التحذيرات
  }
  
  // التفصيل لكل صنف
  breakdown: MaterialItemBreakdown[]
}

interface MaterialItemBreakdown {
  itemId: number
  itemName: string
  price: number
  
  entitled: number           // الاستحقاق
  withdrawn: number          // المسحوب فعلياً
  
  allowanceQty: number       // الكمية المعتمدة للبدل
  excessQty: number          // الكمية الزائدة
  
  allowanceAmount: number    // مبلغ البدل
  deductionAmount: number    // مبلغ الخصم
}

// ═══════════════════════════════════════════════════════════════
// الخطوة 2: دالة منظمة لحساب المسحوبات
// ═══════════════════════════════════════════════════════════════

async function calculateMaterialEntitlements(
  employeeId: number,
  workDays: number,
  startDate: Date,
  endDate: Date
): Promise<MaterialCalculationResult> {
  
  // 1. جلب البيانات
  const [withdrawals, entitlements] = await Promise.all([
    // المسحوبات الفعلية
    Database.prisma.hR_Transaction.findMany({
      where: {
        employeeId,
        transactionType: 'ITEM_WITHDRAWAL',
        status: 'APPROVED',
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { item: true },
    }),
    
    // الاستحقاقات
    Database.prisma.hR_MaterialEntitlement.findMany({
      where: {
        targetType: 'EMPLOYEE',
        targetId: employeeId,
        isActive: true,
      },
      include: { item: true },
    }),
  ])
  
  // 2. تجميع المسحوبات حسب الصنف
  const withdrawalsByItem = new Map<number, number>()
  for (const w of withdrawals) {
    if (w.itemId) {
      const qty = withdrawalsByItem.get(w.itemId) || 0
      withdrawalsByItem.set(w.itemId, qty + (w.quantity || 0))
    }
  }
  
  // 3. تحضير النتيجة
  const result: MaterialCalculationResult = {
    allowance: 0,
    deduction: 0,
    details: {
      allowance: '',
      deduction: '',
      warnings: [],
    },
    breakdown: [],
  }
  
  // 4. حساب لكل صنف
  for (const ent of entitlements) {
    const itemId = ent.itemId
    const withdrawn = withdrawalsByItem.get(itemId) || 0
    
    if (withdrawn === 0) continue  // لم يسحب شيء
    
    // حساب الاستحقاق
    const entitled = ent.quantity || (ent.dailyQuantity * workDays)
    const price = ent.item?.price || 0
    
    // حساب البدل والخصم
    const allowanceQty = Math.min(withdrawn, entitled)
    const excessQty = Math.max(0, withdrawn - entitled)
    
    const allowanceAmount = allowanceQty * price
    const deductionAmount = excessQty * price
    
    // إضافة للنتيجة
    result.allowance += allowanceAmount
    result.deduction += deductionAmount
    
    // حفظ التفاصيل
    result.breakdown.push({
      itemId,
      itemName: ent.item?.nameAr || 'صنف',
      price,
      entitled,
      withdrawn,
      allowanceQty,
      excessQty,
      allowanceAmount,
      deductionAmount,
    })
    
    // إضافة تحذير إذا لزم
    if (excessQty > 0) {
      result.details.warnings.push(
        `${ent.item?.nameAr}: تجاوز الحد (${withdrawn}/${entitled})`
      )
    }
  }
  
  // 5. بناء نصوص العرض
  result.details.allowance = buildAllowanceText(result.breakdown)
  result.details.deduction = buildDeductionText(result.breakdown)
  
  return result
}

// ═══════════════════════════════════════════════════════════════
// الخطوة 3: دوال مساعدة لبناء النصوص
// ═══════════════════════════════════════════════════════════════

function buildAllowanceText(breakdown: MaterialItemBreakdown[]): string {
  const items = breakdown.filter(b => b.allowanceAmount > 0)
  if (items.length === 0) return ''
  
  let text = '📦 **بدل المسحوبات العينية:**\n'
  
  for (const item of items) {
    text += `├ ${item.itemName}: ${formatCurrency(item.allowanceAmount)}\n`
    text += `  (${formatArabicNumber(item.allowanceQty)} × ${formatCurrency(item.price)})\n`
  }
  
  return text + '\n'
}

function buildDeductionText(breakdown: MaterialItemBreakdown[]): string {
  const items = breakdown.filter(b => b.deductionAmount > 0)
  if (items.length === 0) return ''
  
  let text = '💸 **خصم المسحوبات الزائدة:**\n'
  
  for (const item of items) {
    text += `├ ${item.itemName}: ${formatCurrency(item.deductionAmount)}\n`
    text += `  (${formatArabicNumber(item.excessQty)} زيادة × ${formatCurrency(item.price)})\n`
  }
  
  return text + '\n'
}

// ═══════════════════════════════════════════════════════════════
// الخطوة 4: الاستخدام في calculateAndShowPayroll
// ═══════════════════════════════════════════════════════════════

// في دالة calculateAndShowPayroll، استبدل الكود القديم بـ:

const materialCalc = await calculateMaterialEntitlements(
  employee.id,
  actualWorkDays,
  startOfMonth,
  endOfPeriod
)

// استخدام بسيط وواضح
totalAllowances += materialCalc.allowance
totalDeductions += materialCalc.deduction

// إضافة للتقرير
reportText += materialCalc.details.allowance
reportText += materialCalc.details.deduction

// عرض التحذيرات في logs
for (const warning of materialCalc.details.warnings) {
  console.warn(`⚠️ [Material] ${warning}`)
}

// الوصول للتفاصيل إذا لزم
if (DEBUG_MODE) {
  console.log('Material Breakdown:', materialCalc.breakdown)
}
```

### مزايا الحل المتوسط:

```
✅ منظم وواضح
✅ سهل الفهم والصيانة
✅ فصل المنطق عن العرض
✅ سهل الاختبار
✅ قابل للتوسع
✅ توثيق ذاتي (self-documenting)

مقارنة بالحل السريع:
+ أفضل تنظيماً
+ أسهل في الصيانة
+ أكثر قابلية للاختبار
- يحتاج وقت أطول (1-2 أيام)
```

---

## الحل الشامل (Complete Refactor)

### 🏗️ إعادة هيكلة كاملة مع خدمات منفصلة (1-2 أسابيع)

```typescript
// ═══════════════════════════════════════════════════════════════
// الملف: src/services/payroll/MaterialEntitlementService.ts
// ═══════════════════════════════════════════════════════════════

import { Database } from '@/db'
import { formatCurrency, formatArabicNumber } from '@/utils/formatters'
import { MaterialCalculationResult, MaterialItemBreakdown } from './types'

/**
 * خدمة حساب المسحوبات العينية
 * 
 * مسؤوليات:
 * - جلب بيانات المسحوبات والاستحقاقات
 * - حساب البدل والخصم
 * - بناء التقارير
 * - التحقق من الصحة
 */
export class MaterialEntitlementService {
  
  /**
   * حساب المسحوبات العينية لموظف
   */
  async calculate(params: {
    employeeId: number
    workDays: number
    startDate: Date
    endDate: Date
  }): Promise<MaterialCalculationResult> {
    
    // 1. Validation
    this.validateParams(params)
    
    // 2. جلب البيانات
    const data = await this.fetchData(params.employeeId, params.startDate, params.endDate)
    
    // 3. المعالجة
    const withdrawalsByItem = this.groupWithdrawals(data.withdrawals)
    
    // 4. الحساب
    const result = this.calculateAmounts(
      data.entitlements,
      withdrawalsByItem,
      params.workDays
    )
    
    // 5. بناء النصوص
    this.buildTexts(result)
    
    // 6. Logging
    this.logCalculation(params.employeeId, result)
    
    return result
  }
  
  /**
   * التحقق من صحة المعطيات
   */
  private validateParams(params: {
    employeeId: number
    workDays: number
    startDate: Date
    endDate: Date
  }): void {
    if (params.employeeId <= 0) {
      throw new Error('Invalid employeeId')
    }
    
    if (params.workDays <= 0 || params.workDays > 31) {
      throw new Error('Invalid workDays')
    }
    
    if (params.startDate >= params.endDate) {
      throw new Error('Invalid date range')
    }
  }
  
  /**
   * جلب البيانات من قاعدة البيانات
   */
  private async fetchData(
    employeeId: number,
    startDate: Date,
    endDate: Date
  ) {
    const [withdrawals, entitlements] = await Promise.all([
      Database.prisma.hR_Transaction.findMany({
        where: {
          employeeId,
          transactionType: 'ITEM_WITHDRAWAL',
          status: 'APPROVED',
          createdAt: { gte: startDate, lte: endDate },
        },
        include: { item: true },
      }),
      
      Database.prisma.hR_MaterialEntitlement.findMany({
        where: {
          targetType: 'EMPLOYEE',
          targetId: employeeId,
          isActive: true,
        },
        include: { item: true },
      }),
    ])
    
    return { withdrawals, entitlements }
  }
  
  /**
   * تجميع المسحوبات حسب الصنف
   */
  private groupWithdrawals(
    withdrawals: any[]
  ): Map<number, number> {
    const grouped = new Map<number, number>()
    
    for (const w of withdrawals) {
      if (!w.itemId) continue
      
      const currentQty = grouped.get(w.itemId) || 0
      const newQty = currentQty + (w.quantity || 0)
      
      grouped.set(w.itemId, newQty)
    }
    
    return grouped
  }
  
  /**
   * حساب المبالغ
   */
  private calculateAmounts(
    entitlements: any[],
    withdrawalsByItem: Map<number, number>,
    workDays: number
  ): MaterialCalculationResult {
    
    const result: MaterialCalculationResult = {
      allowance: 0,
      deduction: 0,
      details: {
        allowance: '',
        deduction: '',
        warnings: [],
      },
      breakdown: [],
    }
    
    for (const ent of entitlements) {
      const breakdown = this.calculateItem(
        ent,
        withdrawalsByItem.get(ent.itemId) || 0,
        workDays
      )
      
      if (breakdown) {
        result.allowance += breakdown.allowanceAmount
        result.deduction += breakdown.deductionAmount
        result.breakdown.push(breakdown)
        
        if (breakdown.excessQty > 0) {
          result.details.warnings.push(
            `${breakdown.itemName}: تجاوز (${breakdown.withdrawn}/${breakdown.entitled})`
          )
        }
      }
    }
    
    return result
  }
  
  /**
   * حساب صنف واحد
   */
  private calculateItem(
    entitlement: any,
    withdrawn: number,
    workDays: number
  ): MaterialItemBreakdown | null {
    
    if (withdrawn === 0) return null
    
    const entitled = entitlement.quantity || (entitlement.dailyQuantity * workDays)
    const price = entitlement.item?.price || 0
    
    // التحقق من الصحة
    if (price <= 0) {
      console.warn(`Invalid price for item ${entitlement.itemId}`)
      return null
    }
    
    const allowanceQty = Math.min(withdrawn, entitled)
    const excessQty = Math.max(0, withdrawn - entitled)
    
    return {
      itemId: entitlement.itemId,
      itemName: entitlement.item?.nameAr || 'صنف',
      price,
      entitled,
      withdrawn,
      allowanceQty,
      excessQty,
      allowanceAmount: allowanceQty * price,
      deductionAmount: excessQty * price,
    }
  }
  
  /**
   * بناء النصوص للعرض
   */
  private buildTexts(result: MaterialCalculationResult): void {
    result.details.allowance = this.buildAllowanceText(result.breakdown)
    result.details.deduction = this.buildDeductionText(result.breakdown)
  }
  
  private buildAllowanceText(breakdown: MaterialItemBreakdown[]): string {
    const items = breakdown.filter(b => b.allowanceAmount > 0)
    if (items.length === 0) return ''
    
    let text = '📦 **بدل المسحوبات العينية:**\n'
    
    for (const item of items) {
      text += `├ ${item.itemName}: ${formatCurrency(item.allowanceAmount)}\n`
      text += `  (${formatArabicNumber(item.allowanceQty)} × ${formatCurrency(item.price)})\n`
    }
    
    return text + '\n'
  }
  
  private buildDeductionText(breakdown: MaterialItemBreakdown[]): string {
    const items = breakdown.filter(b => b.deductionAmount > 0)
    if (items.length === 0) return ''
    
    let text = '💸 **خصم المسحوبات الزائدة:**\n'
    
    for (const item of items) {
      text += `├ ${item.itemName}: ${formatCurrency(item.deductionAmount)}\n`
      text += `  (${formatArabicNumber(item.excessQty)} زيادة × ${formatCurrency(item.price)})\n`
    }
    
    return text + '\n'
  }
  
  /**
   * Logging للعملية
   */
  private logCalculation(
    employeeId: number,
    result: MaterialCalculationResult
  ): void {
    console.log(`[MaterialEntitlement] Employee ${employeeId}:`, {
      allowance: result.allowance,
      deduction: result.deduction,
      itemsCount: result.breakdown.length,
      warningsCount: result.details.warnings.length,
    })
    
    for (const warning of result.details.warnings) {
      console.warn(`⚠️ [MaterialEntitlement] ${warning}`)
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// الملف: src/services/payroll/types.ts
// ═══════════════════════════════════════════════════════════════

export interface MaterialCalculationResult {
  allowance: number
  deduction: number
  details: {
    allowance: string
    deduction: string
    warnings: string[]
  }
  breakdown: MaterialItemBreakdown[]
}

export interface MaterialItemBreakdown {
  itemId: number
  itemName: string
  price: number
  entitled: number
  withdrawn: number
  allowanceQty: number
  excessQty: number
  allowanceAmount: number
  deductionAmount: number
}

// ═══════════════════════════════════════════════════════════════
// الملف: src/bot/features/hr-management/handlers/payroll-calculate.handler.ts
// ═══════════════════════════════════════════════════════════════

import { MaterialEntitlementService } from '@/services/payroll/MaterialEntitlementService'

// إنشاء instance من الخدمة
const materialService = new MaterialEntitlementService()

// في دالة calculateAndShowPayroll:
const materialCalc = await materialService.calculate({
  employeeId: employee.id,
  workDays: actualWorkDays,
  startDate: startOfMonth,
  endDate: endOfPeriod,
})

totalAllowances += materialCalc.allowance
totalDeductions += materialCalc.deduction
reportText += materialCalc.details.allowance
reportText += materialCalc.details.deduction

// ═══════════════════════════════════════════════════════════════
// الملف: src/services/payroll/__tests__/MaterialEntitlementService.test.ts
// ═══════════════════════════════════════════════════════════════

import { MaterialEntitlementService } from '../MaterialEntitlementService'
import { Database } from '@/db'

// Mock Prisma
jest.mock('@/db')

describe('MaterialEntitlementService', () => {
  let service: MaterialEntitlementService
  
  beforeEach(() => {
    service = new MaterialEntitlementService()
    jest.clearAllMocks()
  })
  
  describe('calculate', () => {
    test('should calculate allowance for normal withdrawal', async () => {
      // Setup
      const mockWithdrawals = [
        { itemId: 1, quantity: 2, item: { price: 55, nameAr: 'سجائر' } },
      ]
      const mockEntitlements = [
        { itemId: 1, quantity: 2, item: { price: 55, nameAr: 'سجائر' } },
      ]
      
      Database.prisma.hR_Transaction.findMany = jest.fn().mockResolvedValue(mockWithdrawals)
      Database.prisma.hR_MaterialEntitlement.findMany = jest.fn().mockResolvedValue(mockEntitlements)
      
      // Execute
      const result = await service.calculate({
        employeeId: 1,
        workDays: 30,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      })
      
      // Assert
      expect(result.allowance).toBe(110) // 2 × 55
      expect(result.deduction).toBe(0)
      expect(result.details.warnings).toHaveLength(0)
    })
    
    test('should calculate deduction for excess withdrawal', async () => {
      // Setup
      const mockWithdrawals = [
        { itemId: 1, quantity: 5, item: { price: 55, nameAr: 'سجائر' } },
      ]
      const mockEntitlements = [
        { itemId: 1, quantity: 1, item: { price: 55, nameAr: 'سجائر' } },
      ]
      
      Database.prisma.hR_Transaction.findMany = jest.fn().mockResolvedValue(mockWithdrawals)
      Database.prisma.hR_MaterialEntitlement.findMany = jest.fn().mockResolvedValue(mockEntitlements)
      
      // Execute
      const result = await service.calculate({
        employeeId: 1,
        workDays: 30,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      })
      
      // Assert
      expect(result.allowance).toBe(55)   // 1 × 55
      expect(result.deduction).toBe(220)  // 4 × 55
      expect(result.details.warnings).toHaveLength(1)
      expect(result.details.warnings[0]).toContain('تجاوز')
    })
    
    test('should handle multiple items', async () => {
      // Setup
      const mockWithdrawals = [
        { itemId: 1, quantity: 3, item: { price: 55, nameAr: 'سجائر' } },
        { itemId: 2, quantity: 7, item: { price: 10, nameAr: 'ولاعات' } },
      ]
      const mockEntitlements = [
        { itemId: 1, quantity: 1, item: { price: 55, nameAr: 'سجائر' } },
        { itemId: 2, quantity: 5, item: { price: 10, nameAr: 'ولاعات' } },
      ]
      
      Database.prisma.hR_Transaction.findMany = jest.fn().mockResolvedValue(mockWithdrawals)
      Database.prisma.hR_MaterialEntitlement.findMany = jest.fn().mockResolvedValue(mockEntitlements)
      
      // Execute
      const result = await service.calculate({
        employeeId: 1,
        workDays: 30,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      })
      
      // Assert
      expect(result.allowance).toBe(105)   // (1×55) + (5×10)
      expect(result.deduction).toBe(130)   // (2×55) + (2×10)
      expect(result.breakdown).toHaveLength(2)
    })
    
    test('should throw error for invalid params', async () => {
      await expect(
        service.calculate({
          employeeId: -1,
          workDays: 30,
          startDate: new Date(),
          endDate: new Date(),
        })
      ).rejects.toThrow('Invalid employeeId')
    })
  })
})
```

### مزايا الحل الشامل:

```
✅ فصل كامل للمسؤوليات (Separation of Concerns)
✅ سهل الاختبار (Testable)
✅ سهل الصيانة (Maintainable)
✅ قابل لإعادة الاستخدام (Reusable)
✅ موثّق بشكل كامل (Well-documented)
✅ آمن من الأخطاء (Error-safe)
✅ قابل للتوسع (Scalable)
✅ يتبع أفضل الممارسات (Best Practices)

مقارنة بالحلول الأخرى:
++ أفضل تنظيماً بكثير
++ أسهل في الصيانة
++ أكثر قابلية للاختبار
++ أكثر احترافية
-- يحتاج وقت أطول (1-2 أسابيع)
-- تغيير أكبر في البنية
```

---

## مقارنة النتائج

### جدول المقارنة:

```
┌───────────────────┬───────────┬───────────┬──────────────┐
│      المعيار      │ الحالي    │   سريع    │    شامل      │
├───────────────────┼───────────┼───────────┼──────────────┤
│ الوقت المطلوب    │    -      │  2-4 ساعات │  1-2 أسابيع  │
│ دقة الحسابات     │   75%     │   100%    │    100%      │
│ سهولة الفهم      │   منخفضة  │  متوسطة   │   عالية      │
│ سهولة الصيانة    │   صعبة    │  متوسطة   │   سهلة جداً  │
│ قابلية الاختبار  │   صعبة    │  متوسطة   │   سهلة جداً  │
│ جودة الكود       │   منخفضة  │  متوسطة   │   عالية جداً │
│ التوثيق          │   قليل    │  قليل     │   شامل       │
│ Scalability       │   محدودة  │  محدودة   │   عالية      │
└───────────────────┴───────────┴───────────┴──────────────┘
```

### مثال على النتائج:

```typescript
// الحالة: موظف سحب 5 علبات، استحقاقه 1 علبة

// ❌ الكود الحالي:
{
  allowance: 275,      // خطأ! يجب أن يكون 55
  deduction: 0,        // خطأ! يجب أن يكون 220
  netSalary: base + 275
}

// ✅ الحل السريع:
{
  allowance: 55,       // ✅ صحيح
  deduction: 220,      // ✅ صحيح
  netSalary: base + 55 - 220 = base - 165
}

// ✅ الحل المتوسط:
{
  allowance: 55,
  deduction: 220,
  netSalary: base - 165,
  breakdown: [
    {
      itemName: 'سجائر',
      entitled: 1,
      withdrawn: 5,
      allowanceQty: 1,
      excessQty: 4,
      ...
    }
  ],
  warnings: ['سجائر: تجاوز الحد (5/1)']
}

// ✅ الحل الشامل:
// نفس النتيجة + validation + logging + testing + documentation
```

---

## التوصية النهائية

### المسار المقترح:

```
المرحلة 1 (فورية):
  ✅ تطبيق الحل السريع
  ✅ إيقاف الخسائر المالية
  ✅ استعادة الثقة في النظام
  
المرحلة 2 (قصيرة):
  ⏳ تطبيق الحل المتوسط
  ⏳ تحسين جودة الكود
  ⏳ إضافة اختبارات أساسية
  
المرحلة 3 (طويلة):
  ⏳ تطبيق الحل الشامل
  ⏳ إعادة هيكلة كاملة
  ⏳ توثيق شامل
  ⏳ اختبارات كاملة
```

---

**روابط ذات صلة:**
- [15_IMMEDIATE_FIXES.md](./15_IMMEDIATE_FIXES.md) - خطة التنفيذ التفصيلية
- [07_CRITICAL_ISSUES.md](./07_CRITICAL_ISSUES.md) - جميع المشاكل
- [10_MISSING_DEDUCTIONS.md](./10_MISSING_DEDUCTIONS.md) - تحليل المشكلة

