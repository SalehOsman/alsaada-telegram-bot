import { PrismaClient, LeaveType } from '../../generated/prisma/index.js'

const prisma = new PrismaClient()

export async function seedEmployeesWithLeaves() {
  console.log('\n👥 بدء إضافة العاملين والإجازات التجريبية...\n')

  // 30 عامل بحالات واقعية متنوعة من الأقسام الموجودة فعلياً
  const employees = [
    // 1. الإدارة العليا (TMG) - 3 عمال
    { fullName: 'أحمد محمد السيد', nickname: 'أحمد', nationalId: '28501011234567', phone: '01001234501', deptId: 1, posId: 21, govId: 1, work: 60, leave: 15, salary: 25000 },
    { fullName: 'محمد علي حسن', nickname: 'محمد', nationalId: '28702021234568', phone: '01001234502', deptId: 1, posId: 22, govId: 2, work: 50, leave: 12, salary: 18000 },
    { fullName: 'خالد حسن محمود', nickname: 'خالد', nationalId: '28903031234569', phone: '01001234503', deptId: 1, posId: 23, govId: 1, work: 45, leave: 10, salary: 15000 },
    
    // 2. الإدارة العامة (ADM) - 4 عمال
    { fullName: 'عمر سعيد أحمد', nickname: 'عمر', nationalId: '29004041234570', phone: '01001234504', deptId: 2, posId: 19, govId: 5, work: 30, leave: 10, salary: 9000 },
    { fullName: 'ياسر محمود علي', nickname: 'ياسر', nationalId: '29105051234571', phone: '01001234505', deptId: 2, posId: 20, govId: 4, work: 30, leave: 10, salary: 8500 },
    { fullName: 'طارق فتحي سالم', nickname: 'طارق', nationalId: '29206061234572', phone: '01001234506', deptId: 2, posId: 18, govId: 3, work: 25, leave: 8, salary: 7500 },
    { fullName: 'حسام الدين عبدالله', nickname: 'حسام', nationalId: '29307071234573', phone: '01001234507', deptId: 2, posId: 17, govId: 1, work: 25, leave: 8, salary: 7000 },
    
    // 3. الإدارة الهندسية (ENG) - 3 عمال
    { fullName: 'وليد صلاح الدين', nickname: 'وليد', nationalId: '28808081234574', phone: '01001234508', deptId: 3, posId: 16, govId: 2, work: 30, leave: 10, salary: 12000 },
    { fullName: 'سامح رمضان محمد', nickname: 'سامح', nationalId: '29009091234575', phone: '01001234509', deptId: 3, posId: 15, govId: 1, work: 30, leave: 10, salary: 10000 },
    { fullName: 'إبراهيم حسين علي', nickname: 'إبراهيم', nationalId: '29110101234576', phone: '01001234510', deptId: 3, posId: 14, govId: 5, work: 25, leave: 8, salary: 8500 },
    
    // 4. إدارة المشاريع والإشراف (PRJ) - 3 عمال
    { fullName: 'مصطفى جمال عبدالناصر', nickname: 'مصطفى', nationalId: '28911111234577', phone: '01001234511', deptId: 4, posId: 13, govId: 1, work: 30, leave: 10, salary: 9500 },
    { fullName: 'عادل فاروق حسن', nickname: 'عادل', nationalId: '29012121234578', phone: '01001234512', deptId: 4, posId: 12, govId: 2, work: 25, leave: 8, salary: 8000 },
    { fullName: 'هشام عبدالرحمن', nickname: 'هشام', nationalId: '29113131234579', phone: '01001234513', deptId: 4, posId: 12, govId: 3, work: 25, leave: 8, salary: 7500 },
    
    // 5. إدارة المركبات (VEH) - 3 عمال
    { fullName: 'كريم أحمد فتحي', nickname: 'كريم', nationalId: '29214141234580', phone: '01001234514', deptId: 5, posId: 11, govId: 1, work: 20, leave: 7, salary: 6500 },
    { fullName: 'رامي محمود سعيد', nickname: 'رامي', nationalId: '29315151234581', phone: '01001234515', deptId: 5, posId: 10, govId: 4, work: 20, leave: 7, salary: 6000 },
    { fullName: 'شريف عصام الدين', nickname: 'شريف', nationalId: '29416161234582', phone: '01001234516', deptId: 5, posId: 11, govId: 5, work: 20, leave: 7, salary: 6200 },
    
    // 6. إدارة المعدات (EQP) - 3 عمال
    { fullName: 'تامر وليد محمد', nickname: 'تامر', nationalId: '29517171234583', phone: '01001234517', deptId: 6, posId: 9, govId: 2, work: 20, leave: 7, salary: 6800 },
    { fullName: 'أيمن صلاح عبدالله', nickname: 'أيمن', nationalId: '29618181234584', phone: '01001234518', deptId: 6, posId: 8, govId: 1, work: 20, leave: 7, salary: 6500 },
    { fullName: 'باسم حسام الدين', nickname: 'باسم', nationalId: '29719191234585', phone: '01001234519', deptId: 6, posId: 7, govId: 1, work: 20, leave: 7, salary: 6300 },
    
    // 7. إدارة الصيانة (MNT) - 4 عمال
    { fullName: 'معتز طارق فتحي', nickname: 'معتز', nationalId: '29820201234586', phone: '01001234520', deptId: 7, posId: 6, govId: 2, work: 20, leave: 7, salary: 6200 },
    { fullName: 'عمرو سامح رمضان', nickname: 'عمرو', nationalId: '29921211234587', phone: '01001234521', deptId: 7, posId: 5, govId: 3, work: 15, leave: 5, salary: 5800 },
    { fullName: 'محمود إبراهيم حسين', nickname: 'محمود', nationalId: '30022221234588', phone: '01001234522', deptId: 7, posId: 4, govId: 1, work: 15, leave: 5, salary: 5500 },
    { fullName: 'سيد مصطفى جمال', nickname: 'سيد', nationalId: '30123231234589', phone: '01001234523', deptId: 7, posId: 3, govId: 4, work: 15, leave: 5, salary: 5300 },
    
    // 8. إدارة الخدمات العامة (SER) - 2 عمال
    { fullName: 'جمال عادل فاروق', nickname: 'جمال', nationalId: '30224241234590', phone: '01001234524', deptId: 8, posId: 2, govId: 5, work: 15, leave: 5, salary: 5200 },
    { fullName: 'فتحي هشام عبدالرحمن', nickname: 'فتحي', nationalId: '30325251234591', phone: '01001234525', deptId: 8, posId: 2, govId: 1, work: 15, leave: 5, salary: 5000 },
    
    // 9. إدارة الأمن والسلامة (SEC) - 2 عمال
    { fullName: 'سعيد كريم أحمد', nickname: 'سعيد', nationalId: '30426261234592', phone: '01001234526', deptId: 9, posId: 2, govId: 2, work: 20, leave: 7, salary: 5500 },
    { fullName: 'علي رامي محمود', nickname: 'علي', nationalId: '30527271234593', phone: '01001234527', deptId: 9, posId: 2, govId: 3, work: 20, leave: 7, salary: 5400 },
    
    // 10. إدارة التغذية (CAT) - 2 عمال
    { fullName: 'حسن شريف عصام', nickname: 'حسن', nationalId: '30628281234594', phone: '01001234528', deptId: 10, posId: 2, govId: 1, work: 15, leave: 5, salary: 5300 },
    { fullName: 'صلاح تامر وليد', nickname: 'صلاح', nationalId: '30729291234595', phone: '01001234529', deptId: 10, posId: 1, govId: 4, work: 15, leave: 5, salary: 5000 },
    
    // 11. إدارة المالية والمحاسبة (FIN) - 1 عامل
    { fullName: 'عبدالله أيمن صلاح', nickname: 'عبدالله', nationalId: '30830301234596', phone: '01001234530', deptId: 11, posId: 23, govId: 5, work: 30, leave: 10, salary: 11000 },
  ]

  // حذف العاملين القدامى أولاً
  console.log('🗑️  حذف العاملين القدامى...\n')
  await prisma.hR_EmployeeLeave.deleteMany({})
  await prisma.hR_LeaveAllowance.deleteMany({})
  await prisma.employee.deleteMany({})
  console.log('✅ تم حذف البيانات القديمة\n')

  let empCount = 0
  const createdEmployees: any[] = []

  // إنشاء العاملين
  for (const emp of employees) {
    try {
      const employee = await prisma.employee.create({
        data: {
          employeeCode: `EMP-${String(empCount + 1).padStart(3, '0')}`,
          fullName: emp.fullName,
          nickname: emp.nickname,
          nationalId: emp.nationalId,
          gender: 'MALE',
          dateOfBirth: new Date(1985 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)),
          nationality: 'Egyptian',
          maritalStatus: Math.random() > 0.5 ? 'MARRIED' : 'SINGLE',
          personalPhone: emp.phone,
          emergencyContactName: 'جهة اتصال طوارئ',
          emergencyContactPhone: '01000000000',
          currentAddress: `عنوان ${emp.fullName}`,
          city: 'القاهرة',
          country: 'Egypt',
          companyId: 1,
          departmentId: emp.deptId,
          positionId: emp.posId,
          governorateId: emp.govId,
          employmentType: 'FULL_TIME',
          contractType: 'PERMANENT',
          employmentStatus: 'ACTIVE',
          hireDate: new Date(2022, Math.floor(Math.random() * 12), 1),
          basicSalary: emp.salary,
          totalSalary: emp.salary,
          workDaysPerCycle: emp.work,
          leaveDaysPerCycle: emp.leave,
          currentWorkDays: Math.floor(Math.random() * emp.work),
          currentLeaveDays: 0,
        },
      })
      createdEmployees.push({ ...employee, work: emp.work, leave: emp.leave })
      empCount++
      console.log(`✅ ${emp.fullName}`)
    } catch (error) {
      console.error(`❌ ${emp.fullName}:`, error)
    }
  }

  console.log(`\n✨ تم إضافة ${empCount} عامل بنجاح!\n`)

  // إنشاء الإجازات لمدة 12 شهر
  console.log('\n📅 بدء إضافة الإجازات التجريبية...\n')

  const leaveTypes: LeaveType[] = ['REGULAR', 'SICK', 'EMERGENCY']
  const startDate = new Date(2024, 0, 1) // 1 يناير 2024
  let leaveCount = 0

  for (const emp of createdEmployees) {
    const cycleDays = emp.work + emp.leave
    const totalCycles = Math.floor(365 / cycleDays)
    
    // البدء من يناير 2024 مباشرة
    let currentDate = new Date(2024, 0, 1 + Math.floor(Math.random() * 15)) // تاريخ عشوائي في يناير
    
    for (let cycle = 0; cycle < totalCycles && cycle < 12; cycle++) {
      // حساب تاريخ بداية الإجازة
      const leaveStart = new Date(currentDate)
      leaveStart.setDate(leaveStart.getDate() + emp.work)
      
      // تخطي إذا كان التاريخ بعد 2024
      if (leaveStart.getFullYear() > 2024) break
      
      // اختيار نوع الإجازة (85% عادية، 10% مرضية، 5% طارئة)
      const rand = Math.random()
      let leaveType: LeaveType
      if (rand < 0.85) leaveType = 'REGULAR'
      else if (rand < 0.95) leaveType = 'SICK'
      else leaveType = 'EMERGENCY'
      
      // حساب تاريخ النهاية
      const leaveEnd = new Date(leaveStart)
      leaveEnd.setDate(leaveEnd.getDate() + emp.leave - 1)
      
      // 20% احتمال صرف بدل بدلاً من الإجازة
      const isPaidAllowance = Math.random() < 0.2
      
      try {
        const leave = await prisma.hR_EmployeeLeave.create({
          data: {
            leaveNumber: `LV-2024-${String(leaveCount + 1).padStart(4, '0')}`,
            employeeId: emp.id,
            leaveType,
            startDate: leaveStart,
            endDate: leaveEnd,
            totalDays: emp.leave,
            status: isPaidAllowance ? 'CANCELLED' : (leaveEnd < new Date() ? 'APPROVED' : 'PENDING'),
            allowanceAmount: isPaidAllowance ? emp.leave * 100 : null,
            allowanceSettled: isPaidAllowance ? false : null,
            reason: isPaidAllowance ? `تم صرف بدل إجازة ${emp.leave} أيام` : null,
          },
        })
        
        // إذا تم صرف بدل، أضف سجل في جدول البدلات
        if (isPaidAllowance) {
          await prisma.hR_LeaveAllowance.create({
            data: {
              employeeId: emp.id,
              amount: emp.leave * 100,
              reason: `بدل إجازة ${emp.leave} أيام (${leaveStart.toLocaleDateString('ar-EG')} - ${leaveEnd.toLocaleDateString('ar-EG')})`,
              isSettled: false,
            },
          })
        }
        
        leaveCount++
      } catch (error) {
        console.error(`❌ خطأ في إضافة إجازة ${emp.fullName}:`, error)
      }
      
      // الانتقال للدورة التالية
      currentDate = new Date(leaveEnd)
      currentDate.setDate(currentDate.getDate() + 1)
    }
  }

  console.log(`\n✨ تم إضافة ${leaveCount} إجازة بنجاح!\n`)
}
