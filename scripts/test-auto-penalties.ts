/**
 * سكريبت اختبار المجدول التلقائي للعقوبات
 * يتحقق من الإجازات المتأخرة وينشئ عقوبات تلقائية
 */

import { Database } from '../src/modules/database/index.js'
import { AutoPenaltiesScheduler } from '../src/modules/schedulers/auto-penalties-scheduler.js'

async function testAutoPenalties() {
  try {
    console.log('🔍 بدء اختبار المجدول التلقائي للعقوبات...\n')

    // الاتصال بقاعدة البيانات
    await Database.connect()

    // تشغيل التحقق بدون bot instance (لن ترسل إشعارات)
    await AutoPenaltiesScheduler.runNow()

    console.log('\n✅ انتهى الاختبار')
  } catch (error) {
    console.error('❌ خطأ:', error)
  } finally {
    await Database.disconnect()
  }
}

testAutoPenalties()
