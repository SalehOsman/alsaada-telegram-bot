import { Database } from '../src/modules/database/index.js'

async function fixSuspensionStatus() {
  try {
    console.log('🔧 جاري إصلاح حالات الموظفين الموقوفين...\n')
    
    // Connect to database
    await Database.connect()
    
    const prisma = Database.prisma

    // Get all approved suspension penalties that are not cancelled
    const suspensionPenalties = await prisma.hR_AppliedPenalty.findMany({
      where: {
        penaltyType: 'SUSPENSION',
        status: 'APPROVED',
        isCancelled: false
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            employmentStatus: true,
            isActive: true
          }
        },
        leave: {
          select: {
            leaveNumber: true
          }
        }
      }
    })

    console.log(`📊 عدد عقوبات الإيقاف المعتمدة: ${suspensionPenalties.length}\n`)

    if (suspensionPenalties.length === 0) {
      console.log('✅ لا يوجد عقوبات إيقاف تحتاج إلى إصلاح')
      return
    }

    let fixedCount = 0

    for (const penalty of suspensionPenalties) {
      if (penalty.employee.employmentStatus !== 'SUSPENDED') {
        console.log(`🔧 إصلاح حالة الموظف:`)
        console.log(`   - الاسم: ${penalty.employee.fullName}`)
        console.log(`   - الكود: ${penalty.employee.employeeCode}`)
        console.log(`   - الحالة الحالية: ${penalty.employee.employmentStatus}`)
        console.log(`   - رقم العقوبة: #${penalty.id}`)
        console.log(`   - رقم الإجازة: ${penalty.leave.leaveNumber}`)

        // Update employee status to SUSPENDED
        await prisma.employee.update({
          where: { id: penalty.employee.id },
          data: {
            employmentStatus: 'SUSPENDED'
          }
        })

        console.log(`   ✅ تم تحديث الحالة إلى: SUSPENDED\n`)
        fixedCount++
      } else {
        console.log(`✓ الموظف ${penalty.employee.fullName} (${penalty.employee.employeeCode}) بالفعل موقوف\n`)
      }
    }

    if (fixedCount > 0) {
      console.log(`\n✅ تم إصلاح ${fixedCount} من الموظفين`)
    } else {
      console.log(`\n✅ جميع الموظفين بالفعل في الحالة الصحيحة`)
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

fixSuspensionStatus()
