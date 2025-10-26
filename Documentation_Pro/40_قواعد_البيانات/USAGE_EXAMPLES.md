# 📚 مرجع سريع: أمثلة استخدام السجلات التاريخية

## 🎯 دليل الاستخدام السريع

---

## 1️⃣ سجل حالات العامل (EmployeeStatusHistory)

### إضافة سجل تغيير حالة
```typescript
await prisma.employeeStatusHistory.create({
  data: {
    employeeId: 1,
    oldStatus: "ACTIVE",
    newStatus: "ON_LEAVE",
    statusDate: new Date(),
    reason: "إجازة دورة",
    notes: "الدورة رقم 3",
    changedBy: BigInt(userTelegramId)
  }
});
```

### استعلام: الحصول على تاريخ الحالات
```typescript
const statusHistory = await prisma.employeeStatusHistory.findMany({
  where: { employeeId: 1 },
  orderBy: { statusDate: 'desc' },
  take: 10
});
```

---

## 2️⃣ سجل الرواتب (EmployeeSalaryHistory)

### إضافة زيادة راتب
```typescript
await prisma.employeeSalaryHistory.create({
  data: {
    employeeId: 1,
    oldBasicSalary: 5000,
    newBasicSalary: 6000,
    oldAllowances: 500,
    newAllowances: 600,
    oldTotalSalary: 5500,
    newTotalSalary: 6600,
    changeDate: new Date(),
    effectiveDate: new Date('2025-01-01'),
    reason: "زيادة سنوية",
    increasePercent: 20,
    changedBy: BigInt(userTelegramId)
  }
});
```

### استعلام: حساب متوسط الزيادة السنوية
```typescript
const salaryChanges = await prisma.employeeSalaryHistory.findMany({
  where: {
    employeeId: 1,
    increasePercent: { gt: 0 }
  }
});

const avgIncrease = salaryChanges.reduce((sum, change) => 
  sum + (change.increasePercent || 0), 0
) / salaryChanges.length;
```

---

## 3️⃣ المعاملات المالية (EmployeeFinancialTransactions)

### تسجيل دفعة راتب
```typescript
await prisma.employeeFinancialTransactions.create({
  data: {
    employeeId: 1,
    transactionType: "salary",
    amount: 6600,
    currency: "EGP",
    transactionDate: new Date(),
    description: "راتب شهر ديسمبر 2024",
    referenceId: 123, // payroll_id
    referenceType: "monthly_payroll",
    status: "completed",
    createdBy: BigInt(userTelegramId)
  }
});
```

### استعلام: إجمالي المعاملات المالية
```typescript
const financialSummary = await prisma.employeeFinancialTransactions.aggregate({
  where: {
    employeeId: 1,
    transactionDate: {
      gte: new Date('2024-01-01'),
      lte: new Date('2024-12-31')
    }
  },
  _sum: { amount: true },
  _count: true
});
```

---

## 4️⃣ السلف (EmployeeAdvanceHistory)

### طلب سلفة جديدة
```typescript
await prisma.employeeAdvanceHistory.create({
  data: {
    employeeId: 1,
    amount: 2000,
    requestDate: new Date(),
    approvalStatus: "pending",
    monthlyDeduction: 400, // تقسيط على 5 أشهر
    notes: "سلفة لظروف طارئة"
  }
});
```

### الموافقة على سلفة
```typescript
await prisma.employeeAdvanceHistory.update({
  where: { id: advanceId },
  data: {
    approvalStatus: "approved",
    approvedBy: 1,
    approvalDate: new Date(),
    deductionStartDate: new Date('2025-01-01')
  }
});
```

### استعلام: السلف غير المسددة
```typescript
const unpaidAdvances = await prisma.employeeAdvanceHistory.findMany({
  where: {
    employeeId: 1,
    isPaidOff: false,
    approvalStatus: "approved"
  },
  select: {
    amount: true,
    remainingBalance: true,
    monthlyDeduction: true
  }
});
```

---

## 5️⃣ الرواتب الشهرية (EmployeePayrollHistory)

### إنشاء كشف راتب شهري
```typescript
await prisma.employeePayrollHistory.create({
  data: {
    employeeId: 1,
    month: 12,
    year: 2024,
    basicSalary: 6000,
    housingAllowance: 600,
    transportAllowance: 300,
    foodAllowance: 200,
    bonuses: 500,
    grossSalary: 7600,
    advanceDeductions: 400,
    penalties: 0,
    absenceDeductions: 0,
    taxDeductions: 380,
    insuranceDeductions: 300,
    totalDeductions: 1080,
    netSalary: 6520,
    paymentStatus: "pending"
  }
});
```

### تحديث حالة الدفع
```typescript
await prisma.employeePayrollHistory.update({
  where: {
    employeeId_month_year: {
      employeeId: 1,
      month: 12,
      year: 2024
    }
  },
  data: {
    paymentStatus: "paid",
    paymentDate: new Date(),
    paymentMethod: "bank_transfer"
  }
});
```

---

## 6️⃣ دورات العمل (EmployeeCycleLog)

### تسجيل دورة عمل مكتملة
```typescript
await prisma.employeeCycleLog.create({
  data: {
    employeeId: 1,
    cycleNumber: 5,
    cycleType: "work",
    startDate: new Date('2024-12-01'),
    endDate: new Date('2024-12-28'),
    plannedDays: 28,
    actualDays: 28,
    wasInterrupted: false,
    completionStatus: "completed",
    notes: "دورة عمل منتظمة"
  }
});
```

### تسجيل دورة إجازة
```typescript
await prisma.employeeCycleLog.create({
  data: {
    employeeId: 1,
    cycleNumber: 5,
    cycleType: "leave",
    startDate: new Date('2024-12-29'),
    endDate: new Date('2025-01-11'),
    plannedDays: 14,
    actualDays: 14,
    wasInterrupted: false,
    completionStatus: "completed"
  }
});
```

### استعلام: إحصائيات الدورات
```typescript
const cycleStats = await prisma.employeeCycleLog.aggregate({
  where: { 
    employeeId: 1,
    cycleType: "work"
  },
  _avg: { actualDays: true },
  _count: { cycleNumber: true }
});
```

---

## 7️⃣ رصيد الإجازات (EmployeeLeaveBalance)

### تحديث رصيد الإجازات
```typescript
await prisma.employeeLeaveBalance.upsert({
  where: { employeeId: 1 },
  create: {
    employeeId: 1,
    annualLeaveBalance: 21,
    sickLeaveBalance: 180,
    casualLeaveBalance: 7,
    usedAnnualLeave: 0,
    usedSickLeave: 0,
    usedCasualLeave: 0,
    yearStartDate: new Date('2024-01-01')
  },
  update: {
    usedAnnualLeave: { increment: 3 },
    lastUpdated: new Date()
  }
});
```

### استعلام: الرصيد المتبقي
```typescript
const balance = await prisma.employeeLeaveBalance.findUnique({
  where: { employeeId: 1 },
  select: {
    annualLeaveBalance: true,
    usedAnnualLeave: true
  }
});

const remainingLeave = balance.annualLeaveBalance - balance.usedAnnualLeave;
```

---

## 8️⃣ الإجازات (EmployeeLeaveHistory)

### طلب إجازة طارئة
```typescript
await prisma.employeeLeaveHistory.create({
  data: {
    employeeId: 1,
    leaveType: "emergency",
    startDate: new Date('2024-12-15'),
    endDate: new Date('2024-12-17'),
    totalDays: 3,
    requestDate: new Date(),
    approvalStatus: "pending",
    notes: "ظروف عائلية طارئة"
  }
});
```

### الموافقة على الإجازة
```typescript
await prisma.employeeLeaveHistory.update({
  where: { id: leaveId },
  data: {
    approvalStatus: "approved",
    approvedBy: 1,
    approvalDate: new Date()
  }
});
```

---

## 9️⃣ تقييمات الأداء (EmployeePerformanceHistory)

### إضافة تقييم أداء
```typescript
await prisma.employeePerformanceHistory.create({
  data: {
    employeeId: 1,
    evaluationDate: new Date(),
    evaluationType: "annual",
    overallRating: 4.5,
    maxRating: 5,
    qualityScore: 4.7,
    productivityScore: 4.5,
    attendanceScore: 4.8,
    teamworkScore: 4.3,
    evaluatorId: 2,
    evaluatorName: "أحمد محمود",
    strengths: "التزام عالي، جودة ممتازة في العمل",
    weaknesses: "يحتاج تحسين في العمل الجماعي",
    recommendations: "دورات تدريبية في القيادة",
    status: "completed"
  }
});
```

### استعلام: متوسط التقييمات
```typescript
const avgRating = await prisma.employeePerformanceHistory.aggregate({
  where: { employeeId: 1 },
  _avg: { overallRating: true }
});
```

---

## 🔟 الدورات التدريبية (EmployeeTrainingHistory)

### تسجيل دورة تدريبية
```typescript
await prisma.employeeTrainingHistory.create({
  data: {
    employeeId: 1,
    trainingTitle: "إدارة المشاريع الاحترافية",
    trainingType: "external",
    provider: "معهد الإدارة",
    startDate: new Date('2024-11-01'),
    endDate: new Date('2024-11-05'),
    duration: 40,
    location: "القاهرة",
    cost: 5000,
    currency: "EGP",
    status: "completed",
    certificateUrl: "https://...",
    grade: "ممتاز",
    skillsGained: "PMP, Agile, Scrum"
  }
});
```

---

## 1️⃣1️⃣ الإجراءات التأديبية (EmployeeDisciplinaryHistory)

### إصدار إنذار
```typescript
await prisma.employeeDisciplinaryHistory.create({
  data: {
    employeeId: 1,
    actionType: "written_warning",
    severity: "moderate",
    violationType: "late",
    incidentDate: new Date('2024-12-10'),
    issueDate: new Date('2024-12-11'),
    description: "تأخر 3 أيام متتالية بدون عذر",
    actionTaken: "إنذار كتابي",
    penaltyAmount: 0,
    issuedBy: 2,
    isActive: true,
    expiryDate: new Date('2025-06-11'), // 6 أشهر
    notes: "أول إنذار"
  }
});
```

---

## 1️⃣2️⃣ السجل الشامل (EmployeeAuditLog)

### تسجيل حدث في النظام
```typescript
await prisma.employeeAuditLog.create({
  data: {
    employeeId: 1,
    eventType: "salary_change",
    eventCategory: "financial",
    description: "تم زيادة الراتب الأساسي",
    oldData: JSON.stringify({ basicSalary: 5000 }),
    newData: JSON.stringify({ basicSalary: 6000 }),
    severity: "info",
    eventDate: new Date(),
    performedBy: BigInt(userTelegramId),
    affectedTables: JSON.stringify(["Employee", "EmployeeSalaryHistory"]),
    referenceId: salaryHistoryId,
    referenceType: "salary_history",
    ipAddress: "192.168.1.1",
    userAgent: "Telegram Bot"
  }
});
```

### استعلام: آخر 20 حدث
```typescript
const recentEvents = await prisma.employeeAuditLog.findMany({
  where: { employeeId: 1 },
  orderBy: { eventDate: 'desc' },
  take: 20,
  select: {
    eventType: true,
    description: true,
    eventDate: true,
    performedBy: true
  }
});
```

---

## 🔍 استعلامات متقدمة

### 1. التقرير المالي الشامل للعامل
```typescript
const financialReport = await prisma.employee.findUnique({
  where: { id: 1 },
  include: {
    salaryHistory: {
      orderBy: { changeDate: 'desc' },
      take: 5
    },
    financialTransactions: {
      where: {
        transactionDate: {
          gte: new Date('2024-01-01')
        }
      }
    },
    advanceHistory: {
      where: { isPaidOff: false }
    },
    payrollHistory: {
      where: { year: 2024 },
      orderBy: { month: 'desc' }
    }
  }
});
```

### 2. تقرير الحضور والإجازات
```typescript
const attendanceReport = await prisma.employee.findUnique({
  where: { id: 1 },
  include: {
    cycleLog: {
      where: {
        startDate: {
          gte: new Date('2024-01-01')
        }
      }
    },
    leaveHistoryRecords: {
      where: { 
        approvalStatus: 'approved',
        startDate: {
          gte: new Date('2024-01-01')
        }
      }
    },
    leaveBalance: true
  }
});
```

### 3. تقرير الأداء والتطوير
```typescript
const performanceReport = await prisma.employee.findUnique({
  where: { id: 1 },
  include: {
    performanceHistory: {
      orderBy: { evaluationDate: 'desc' }
    },
    trainingHistory: {
      orderBy: { startDate: 'desc' }
    },
    disciplinaryHistory: {
      where: { isActive: true }
    }
  }
});
```

---

## 💡 نصائح الاستخدام

### 1. استخدم Transactions للعمليات المتعددة
```typescript
await prisma.$transaction([
  prisma.employee.update({
    where: { id: 1 },
    data: { basicSalary: 6000, totalSalary: 6600 }
  }),
  prisma.employeeSalaryHistory.create({
    data: { /* ... */ }
  }),
  prisma.employeeAuditLog.create({
    data: { /* ... */ }
  })
]);
```

### 2. استخدم Select للحصول على حقول محددة فقط
```typescript
const employee = await prisma.employee.findUnique({
  where: { id: 1 },
  select: {
    fullName: true,
    salaryHistory: {
      select: {
        newBasicSalary: true,
        changeDate: true
      },
      orderBy: { changeDate: 'desc' },
      take: 1
    }
  }
});
```

### 3. استخدم Include للعلاقات المترابطة
```typescript
const employeeWithHistory = await prisma.employee.findUnique({
  where: { id: 1 },
  include: {
    statusHistory: true,
    salaryHistory: true,
    leaveBalance: true
  }
});
```

---

## 🎯 الخطوات التالية

1. جرب الأمثلة أعلاه في مشروعك
2. أنشئ handlers مخصصة للبوت
3. أضف واجهات مستخدم لعرض السجلات
4. قم بإنشاء تقارير دورية

**حظاً موفقاً في الاستخدام! 🚀**
