/**
 * Cache Helper Utility
 * أدوات التخزين المؤقت
 */

interface CacheEntry<T> {
  value: T
  expiry: number
}

/**
 * تخزين مؤقت بسيط
 */
export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  
  /**
   * حفظ قيمة
   */
  set(key: string, value: T, ttl: number = 300000): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    })
  }
  
  /**
   * الحصول على قيمة
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return entry.value
  }
  
  /**
   * التحقق من وجود قيمة
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }
  
  /**
   * مسح قيمة أو جميع القيم
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }
  
  /**
   * الحصول على قيمة أو تنفيذ دالة
   */
  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    ttl: number = 300000
  ): Promise<T> {
    const cached = this.get(key)
    
    if (cached !== null) {
      return cached
    }
    
    const value = await factory()
    this.set(key, value, ttl)
    
    return value
  }
  
  /**
   * مسح القيم المنتهية
   */
  cleanup(): void {
    const now = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
      }
    }
  }
}

/**
 * Cache instances للاستخدام المشترك
 */
export const categoriesCache = new SimpleCache<any[]>()
export const locationsCache = new SimpleCache<any[]>()
export const itemsCache = new SimpleCache<any>()
export const employeesCache = new SimpleCache<any[]>()
export const equipmentCache = new SimpleCache<any[]>()

/**
 * تنظيف دوري للـ cache
 */
setInterval(() => {
  categoriesCache.cleanup()
  locationsCache.cleanup()
  itemsCache.cleanup()
  employeesCache.cleanup()
  equipmentCache.cleanup()
}, 60000) // كل دقيقة
