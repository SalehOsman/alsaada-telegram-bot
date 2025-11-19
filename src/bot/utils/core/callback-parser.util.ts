/**
 * Callback Parser Utility
 * أدوات تحليل callback data
 * 
 * ✅ GLOBAL UTILITY - Can be used across all bot features
 */

/**
 * تحليل callback الصنف
 */
export function parseItemCallback(match: RegExpMatchArray): {
  itemId: number
  page?: number
  categoryId?: number
  locationId?: number
} {
  return {
    itemId: Number.parseInt(match[1], 10),
    page: match[2] ? Number.parseInt(match[2], 10) : undefined,
    categoryId: match[3] ? Number.parseInt(match[3], 10) : undefined,
    locationId: match[4] ? Number.parseInt(match[4], 10) : undefined,
  }
}

/**
 * بناء callback data
 */
export function buildCallbackData(
  prefix: string,
  params: Record<string, any>
): string {
  let callback = prefix
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      callback += `:${key}:${value}`
    }
  }
  
  return callback
}

/**
 * تحليل ID من callback
 */
export function parseId(match: RegExpMatchArray, index: number = 1): number {
  return Number.parseInt(match[index], 10)
}

/**
 * تحليل IDs متعددة من callback
 */
export function parseIds(match: RegExpMatchArray, startIndex: number = 1): number[] {
  const ids: number[] = []
  
  for (let i = startIndex; i < match.length; i++) {
    if (match[i]) {
      ids.push(Number.parseInt(match[i], 10))
    }
  }
  
  return ids
}

