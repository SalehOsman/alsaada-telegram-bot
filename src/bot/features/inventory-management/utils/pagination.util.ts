/**
 * Pagination Utility
 * أدوات التصفح والترقيم
 */

import { InlineKeyboard } from 'grammy'

/**
 * بناء أزرار التصفح (السابق/التالي)
 */
export function buildPaginationButtons(
  page: number,
  totalPages: number,
  callbackPrefix: string,
  extraParams: string = ''
): InlineKeyboard {
  const keyboard = new InlineKeyboard()
  
  const hasPrev = page > 1
  const hasNext = page < totalPages
  
  if (hasPrev || hasNext) {
    if (hasPrev) {
      keyboard.text('⬅️ السابق', `${callbackPrefix}:page:${page - 1}${extraParams}`)
    }
    if (hasNext) {
      keyboard.text('التالي ➡️', `${callbackPrefix}:page:${page + 1}${extraParams}`)
    }
    keyboard.row()
  }
  
  return keyboard
}

/**
 * تحليل معاملات التصفح من callback
 */
export function parsePaginationParams(match: RegExpMatchArray): {
  page: number
  categoryId?: number
  locationId?: number
} {
  return {
    page: match[1] ? Number.parseInt(match[1], 10) : 1,
    categoryId: match[2] ? Number.parseInt(match[2], 10) : undefined,
    locationId: match[3] ? Number.parseInt(match[3], 10) : undefined,
  }
}

/**
 * بناء معاملات إضافية للـ callback
 */
export function buildExtraParams(params: {
  categoryId?: number
  locationId?: number
  [key: string]: any
}): string {
  let extra = ''
  
  if (params.categoryId) {
    extra += `:cat:${params.categoryId}`
  }
  
  if (params.locationId) {
    extra += `:loc:${params.locationId}`
  }
  
  return extra
}

/**
 * حساب معلومات التصفح
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number
): {
  skip: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
} {
  const totalPages = Math.ceil(total / limit)
  const skip = (page - 1) * limit
  
  return {
    skip,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  }
}
