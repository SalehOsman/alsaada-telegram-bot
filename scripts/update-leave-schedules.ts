/**
 * Script لتحديث جميع مواعيد الإجازات للموظفين
 * يُستخدم بعد الإصلاحات لتحديث البيانات القديمة
 *
 * الاستخدام:
 * npm run tsx scripts/update-leave-schedules.ts
 */

import { Database } from '../src/modules/database/index.js'
import { LeaveScheduleService } from '../src/modules/services/leave-schedule.service.js'

async function main() {
  console.log('🔄 بدء تحديث مواعيد الإجازات لجميع الموظفين...\n')

  try {
    // قاعدة البيانات تهيأ تلقائياً عند أول استخدام
    const result = await LeaveScheduleService.updateAllEmployees()

    console.log('\n✅ انتهى التحديث بنجاح!')
    console.log(`📊 النتائج:`)
    console.log(`   • تم التحديث: ${result.updated} موظف`)
    console.log(`   • تم التخطي: ${result.skipped} موظف (بدون دورة محددة)`)
    console.log(`   • أخطاء: ${result.errors} موظف`)

    process.exit(0)
  }
  catch (error) {
    console.error('❌ خطأ في تحديث البيانات:', error)
    process.exit(1)
  }
}

main()
