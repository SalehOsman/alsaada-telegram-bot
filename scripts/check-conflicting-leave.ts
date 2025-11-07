import { Database } from '../src/modules/database/index.js'

async function checkConflictingLeave() {
  try {
    console.log('🔍 جاري البحث عن الإجازة المتعارضة...\n')
    
    // Connect to database
    await Database.connect()
    
    const prisma = Database.prisma

    // Get the conflicting leave LV-2025-051
    const conflictingLeave = await prisma.hR_EmployeeLeave.findFirst({
      where: {
        leaveNumber: 'LV-2025-051'
      },
      include: {
        employee: {
          select: {
            employeeCode: true,
            fullName: true,
            nickname: true,
            employmentStatus: true,
            isActive: true
          }
        }
      }
    })

    if (!conflictingLeave) {
      console.log('❌ لم يتم العثور على الإجازة LV-2025-051')
      return
    }

    console.log('📋 معلومات الإجازة المتعارضة:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`رقم الإجازة: ${conflictingLeave.leaveNumber}`)
    console.log(`الموظف: ${conflictingLeave.employee.fullName} (${conflictingLeave.employee.employeeCode})`)
    console.log(`من: ${conflictingLeave.startDate.toLocaleDateString('ar-EG')}`)
    console.log(`إلى: ${conflictingLeave.endDate.toLocaleDateString('ar-EG')}`)
    console.log(`تاريخ العودة الفعلي: ${conflictingLeave.actualReturnDate ? conflictingLeave.actualReturnDate.toLocaleDateString('ar-EG') : 'لم يسجل بعد'}`)
    console.log(`حالة الموظف: ${conflictingLeave.employee.employmentStatus}`)
    console.log(`نشط: ${conflictingLeave.employee.isActive ? 'نعم' : 'لا'}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Check all open leaves for this employee
    const openLeaves = await prisma.hR_EmployeeLeave.findMany({
      where: {
        employeeId: conflictingLeave.employeeId,
        actualReturnDate: null
      },
      orderBy: {
        startDate: 'desc'
      }
    })

    console.log(`📊 عدد الإجازات المفتوحة لهذا الموظف: ${openLeaves.length}\n`)

    if (openLeaves.length > 0) {
      console.log('📋 قائمة الإجازات المفتوحة:')
      for (const leave of openLeaves) {
        console.log(`\n  - ${leave.leaveNumber}`)
        console.log(`    من: ${leave.startDate.toLocaleDateString('ar-EG')}`)
        console.log(`    إلى: ${leave.endDate.toLocaleDateString('ar-EG')}`)
        console.log(`    تاريخ العودة الفعلي: ${leave.actualReturnDate ? leave.actualReturnDate.toLocaleDateString('ar-EG') : 'لم يسجل بعد'}`)
      }
    }

    // Check if this leave should be considered "open"
    console.log('\n🔍 تحليل الحالة:')
    if (conflictingLeave.actualReturnDate === null) {
      console.log('⚠️ الإجازة ليس لها تاريخ عودة فعلي (actualReturnDate = null)')
      console.log('💡 هذه إجازة مفتوحة ويجب أن تظهر في قائمة "تسجيل العودة"')
    } else {
      console.log(`✅ الإجازة لها تاريخ عودة فعلي: ${conflictingLeave.actualReturnDate.toLocaleDateString('ar-EG')}`)
      console.log('💡 هذه إجازة مغلقة ولا يجب أن تسبب تعارض في التواريخ')
    }

    // Check for date overlap logic issue
    const today = new Date()
    console.log(`\n📅 اليوم: ${today.toLocaleDateString('ar-EG')}`)
    console.log(`📅 نهاية الإجازة: ${conflictingLeave.endDate.toLocaleDateString('ar-EG')}`)
    
    if (conflictingLeave.endDate < today && conflictingLeave.actualReturnDate === null) {
      console.log('\n🚨 مشكلة: الإجازة منتهية لكن لم يتم تسجيل العودة!')
      console.log('💡 الحل: يجب تسجيل تاريخ العودة لهذه الإجازة أو حذفها')
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

checkConflictingLeave()
