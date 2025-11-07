/**
 * سكريبت للتحقق من الموظفين الموقوفين
 */

import { Database } from '../src/modules/database/index.js'

async function checkSuspendedEmployees() {
  try {
    console.log('🔍 جاري التحقق من الموظفين الموقوفين...\n')
    
    // Connect to database
    await Database.connect()
    
    const prisma = Database.prisma    // جلب جميع الموظفين الموقوفين
    const suspendedEmployees = await prisma.employee.findMany({
      where: {
        employmentStatus: 'SUSPENDED',
      },
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        nickname: true,
        employmentStatus: true,
        isActive: true,
        position: {
          select: {
            titleAr: true,
          },
        },
      },
    })

    console.log(`📊 عدد الموظفين الموقوفين: ${suspendedEmployees.length}\n`)

    if (suspendedEmployees.length === 0) {
      console.log('✅ لا يوجد موظفين موقوفين')
    }
    else {
      console.log('📋 قائمة الموظفين الموقوفين:\n')
      for (const emp of suspendedEmployees) {
        console.log(`👤 ${emp.fullName} (${emp.nickname || emp.employeeCode})`)
        console.log(`   - الكود: ${emp.employeeCode}`)
        console.log(`   - الوظيفة: ${emp.position?.titleAr || 'غير محدد'}`)
        console.log(`   - الحالة: ${emp.employmentStatus}`)
        console.log(`   - نشط: ${emp.isActive ? 'نعم' : 'لا'}`)
        console.log('')
      }
    }

    // جلب عقوبات الإيقاف المعتمدة وغير الملغاة
    const suspensionPenalties = await prisma.hR_AppliedPenalty.findMany({
      where: {
        penaltyType: 'SUSPENSION',
        status: 'APPROVED',
        isCancelled: false,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            employmentStatus: true,
          },
        },
        leave: {
          select: {
            leaveNumber: true,
          },
        },
      },
    })

    console.log(`\n🚨 عقوبات الإيقاف المعتمدة: ${suspensionPenalties.length}\n`)

    if (suspensionPenalties.length > 0) {
      console.log('📋 قائمة عقوبات الإيقاف:\n')
      for (const penalty of suspensionPenalties) {
        console.log(`⚠️ عقوبة #${penalty.id}`)
        console.log(`   - الموظف: ${penalty.employee.fullName}`)
        console.log(`   - حالة الموظف: ${penalty.employee.employmentStatus}`)
        console.log(`   - رقم الإجازة: ${penalty.leave.leaveNumber}`)
        console.log(`   - الحالة: ${penalty.status}`)
        console.log(`   - ملغاة: ${penalty.isCancelled ? 'نعم' : 'لا'}`)
        console.log('')
      }
    }
  }
  catch (error) {
    console.error('❌ خطأ:', error)
    await Database.disconnect()
  }
  finally {
    await Database.disconnect()
  }
}

checkSuspendedEmployees()
