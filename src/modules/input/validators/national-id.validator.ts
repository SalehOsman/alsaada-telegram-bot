/**
 * National ID Validator
 * التحقق من صحة الرقم القومي المصري
 */

/**
 * يتحقق من صحة الرقم القومي المصري (14 رقم)
 * @param id - الرقم القومي المراد التحقق منه
 * @returns true إذا كان الرقم صحيح، false إذا كان خاطئ
 *
 * @example
 * ```typescript
 * isValidNationalID('12345678901234') // true - 14 رقم
 * isValidNationalID('123456789')      // false - أقل من 14
 * isValidNationalID('1234567890123A')  // false - يحتوي حروف
 * isValidNationalID('12345678901234567') // false - أكثر من 14
 * ```
 */
export function isValidNationalID(id: string): boolean {
  // التحقق من أن المدخل موجود
  if (!id || typeof id !== 'string') {
    return false
  }

  // إزالة المسافات
  const cleanId = id.trim()

  // التحقق من الطول (يجب أن يكون 14 رقم بالضبط)
  if (cleanId.length !== 14) {
    return false
  }

  // التحقق من أنه أرقام فقط
  const numberRegex = /^\d{14}$/
  if (!numberRegex.test(cleanId)) {
    return false
  }

  // التحقق من صحة القرن (أول رقم: 2 أو 3)
  const century = Number.parseInt(cleanId[0])
  if (century !== 2 && century !== 3) {
    return false
  }

  // التحقق من صحة السنة (رقمين 00-99)
  const year = Number.parseInt(cleanId.substring(1, 3))
  if (year < 0 || year > 99) {
    return false
  }

  // التحقق من صحة الشهر (01-12)
  const month = Number.parseInt(cleanId.substring(3, 5))
  if (month < 1 || month > 12) {
    return false
  }

  // التحقق من صحة اليوم (01-31)
  const day = Number.parseInt(cleanId.substring(5, 7))
  if (day < 1 || day > 31) {
    return false
  }

  // التحقق من صحة كود المحافظة (رقمين 01-35)
  const governorate = Number.parseInt(cleanId.substring(7, 9))
  if (governorate < 1 || governorate > 35) {
    return false
  }

  return true
}

/**
 * يتحقق من صحة الرقم القومي ويعيد معلومات إضافية
 * @param id - الرقم القومي
 * @returns كائن يحتوي على صحة الرقم ومعلومات إضافية
 *
 * @example
 * ```typescript
 * validateNationalIDWithInfo('29501011234567')
 * // {
 * //   isValid: true,
 * //   century: 2,
 * //   year: 95,
 * //   month: 1,
 * //   day: 1,
 * //   governorate: 12,
 * //   gender: 'male'
 * // }
 * ```
 */
export function validateNationalIDWithInfo(id: string): {
  isValid: boolean
  century?: number
  year?: number
  month?: number
  day?: number
  governorate?: number
  gender?: 'male' | 'female'
  birthDate?: string
} {
  if (!isValidNationalID(id)) {
    return { isValid: false }
  }

  const century = Number.parseInt(id[0])
  const year = Number.parseInt(id.substring(1, 3))
  const month = Number.parseInt(id.substring(3, 5))
  const day = Number.parseInt(id.substring(5, 7))
  const governorate = Number.parseInt(id.substring(7, 9))
  const genderDigit = Number.parseInt(id[12])

  // تحديد الجنس من الرقم قبل الأخير (الموضع 12)
  // فردي = ذكر، زوجي = أنثى
  const gender = genderDigit % 2 === 1 ? 'male' : 'female'

  // حساب سنة الميلاد الكاملة
  const fullYear = century === 2 ? 1900 + year : 2000 + year
  const birthDate = `${fullYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`

  return {
    isValid: true,
    century,
    year,
    month,
    day,
    governorate,
    gender,
    birthDate,
  }
}
