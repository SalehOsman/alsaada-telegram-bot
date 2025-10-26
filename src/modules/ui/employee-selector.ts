/**
 * مكون اختيار العاملين
 */

import { InlineKeyboard } from 'grammy'
import { Database } from '#root/modules/database/index.js'

type Employee = Awaited<ReturnType<typeof Database.prisma.employee.findMany>>[0]
type Position = Awaited<ReturnType<typeof Database.prisma.position.findUnique>>
type Department = Awaited<ReturnType<typeof Database.prisma.department.findUnique>>

export interface EmployeeSelectorOptions {
  /** قائمة العاملين */
  employees: (Employee & {
    position?: Position | null
    department?: Department | null
  })[]
  /** الصفحة الحالية */
  page: number
  /** عدد العاملين في الصفحة */
  pageSize?: number
  /** callback data prefix */
  callbackPrefix: string
  /** callback للصفحة التالية/السابقة */
  pageCallback: string
}

export class EmployeeSelector {
  /**
   * إنشاء قائمة اختيار العاملين
   */
  static create(options: EmployeeSelectorOptions): {
    keyboard: InlineKeyboard
    message: string
    hasMore: boolean
  } {
    const pageSize = options.pageSize || 20
    const start = options.page * pageSize
    const end = start + pageSize
    const pageEmployees = options.employees.slice(start, end)
    const totalPages = Math.ceil(options.employees.length / pageSize)
    const hasMore = end < options.employees.length

    const keyboard = new InlineKeyboard()

    // عرض العاملين (عمود واحد - 20 صف)
    for (const emp of pageEmployees) {
      const label = `${emp.nickname || emp.fullName} (${emp.position?.name || 'غير محدد'})`
      keyboard.text(label, `${options.callbackPrefix}:${emp.id}`).row()
    }

    // أزرار التنقل
    if (totalPages > 1) {
      if (options.page > 0) {
        keyboard.text('◀️ السابق', `${options.pageCallback}:${options.page - 1}`)
      }

      keyboard.text(`${options.page + 1}/${totalPages}`, 'noop')

      if (hasMore) {
        keyboard.text('التالي ▶️', `${options.pageCallback}:${options.page + 1}`)
      }

      keyboard.row()
    }

    const message = this.buildMessage(options.employees.length, options.page + 1, totalPages)

    return { keyboard, message, hasMore }
  }

  /**
   * بناء رسالة القائمة
   */
  private static buildMessage(total: number, currentPage: number, totalPages: number): string {
    return `👥 **اختر العامل**\n\n`
      + `📊 إجمالي العاملين: ${total}\n`
      + `📄 الصفحة: ${currentPage} من ${totalPages}`
  }

  /**
   * إنشاء قائمة مع بحث
   */
  static createWithSearch(options: EmployeeSelectorOptions & { searchCallback: string }): {
    keyboard: InlineKeyboard
    message: string
    hasMore: boolean
  } {
    const result = this.create(options)
    
    // إضافة زر البحث
    result.keyboard.row()
    result.keyboard.text('🔍 بحث بالاسم', options.searchCallback)

    return result
  }

  /**
   * تصفية العاملين حسب الاسم
   */
  static filterByName(
    employees: (Employee & {
      position?: Position | null
      department?: Department | null
    })[],
    searchTerm: string
  ): typeof employees {
    const term = searchTerm.toLowerCase().trim()
    
    return employees.filter(emp => 
      emp.fullName.toLowerCase().includes(term) ||
      emp.nickname?.toLowerCase().includes(term) ||
      emp.employeeCode.toLowerCase().includes(term)
    )
  }
}
