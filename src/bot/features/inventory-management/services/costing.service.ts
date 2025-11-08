/**
 * Costing Service
 * خدمة حساب متوسط التكلفة المرجح (WAC)
 */

/**
 * حساب متوسط التكلفة المرجح (Weighted Average Cost - WAC)
 * 
 * @param currentQuantity - الكمية الحالية في المخزن
 * @param currentCost - متوسط التكلفة الحالي
 * @param newQuantity - الكمية الجديدة المشتراة
 * @param newPrice - سعر الشراء الجديد
 * @returns متوسط التكلفة الجديد
 * 
 * @example
 * // مخزون: 20 قطعة × 450 جنيه = 9000
 * // شراء: 10 قطع × 500 جنيه = 5000
 * // النتيجة: (9000 + 5000) / (20 + 10) = 466.67
 */
export function calculateWAC(
  currentQuantity: number,
  currentCost: number,
  newQuantity: number,
  newPrice: number,
): number {
  const currentValue = currentQuantity * currentCost
  const newValue = newQuantity * newPrice
  const totalQuantity = currentQuantity + newQuantity

  if (totalQuantity === 0) return 0

  return (currentValue + newValue) / totalQuantity
}

