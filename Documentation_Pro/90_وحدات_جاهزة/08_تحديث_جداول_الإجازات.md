# 📋 تحديث جداول الإجازات والمأموريات

**التاريخ:** 2025-01-26  
**Migration:** `20251026151253_add_leave_mission_fields`

---

## ✅ التعديلات المنفذة

### 1. تحديث جدول HR_EmployeeLeave

#### الحقول المضافة:
- ✅ `leaveNumber` (String, unique) - رقم الإجازة الفريد (مثل: LV-2025-001)
- ✅ `isActive` (Boolean) - هل الإجازة نشطة
- ✅ `actualReturnDate` (DateTime?) - تاريخ العودة الفعلي
- ✅ `delayDays` (Int) - عدد أيام التأخير
- ✅ `isPostponed` (Boolean) - هل تم التأجيل
- ✅ `postponedTimes` (Int) - عدد مرات التأجيل
- ✅ `allowanceAmount` (Float?) - مبلغ البدل
- ✅ `allowanceSettled` (Boolean) - هل تم تسوية البدل
- ✅ `medicalReportPath` (String?) - مسار التقرير الطبي
- ✅ `affectsNextLeave` (Boolean) - هل تؤثر على الإجازة القادمة

#### الحقول المعدلة:
- ✅ `leaveType` تم تغييره من String إلى LeaveType enum

#### الفهارس المضافة:
- `leaveNumber` (unique)
- `leaveType`
- `isActive`
- `employeeId, isActive` (composite)

---

### 2. إنشاء جدول HR_EmployeeMission (جديد)

#### الحقول:
- `id` (Int, PK)
- `missionNumber` (String, unique) - رقم المأمورية (مثل: MS-2025-001)
- `employeeId` (Int, FK)
- `missionType` (MissionType enum) - نوع المأمورية
- `startDate` (DateTime) - تاريخ البداية
- `endDate` (DateTime) - تاريخ النهاية
- `totalDays` (Int) - عدد الأيام
- `location` (String) - مكان المأمورية
- `purpose` (String) - سبب المأمورية
- `allowanceAmount` (Float?) - مبلغ العهدة
- `status` (GeneralStatus) - الحالة
- `isActive` (Boolean) - نشطة
- `actualReturnDate` (DateTime?) - تاريخ العودة الفعلي
- `notes` (String?) - ملاحظات
- `approvedBy` (Int?) - من وافق
- `approvedAt` (DateTime?) - تاريخ الموافقة
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

#### الفهارس:
- `missionNumber` (unique)
- `employeeId`
- `missionType`
- `status`
- `isActive`
- `startDate, endDate` (composite)
- `employeeId, isActive` (composite)

---

### 3. إضافة Enum جديد: MissionType

```prisma
enum MissionType {
  TASK_EXECUTION   // مأمورية لتنفيذ مهمة
  EXTERNAL_WORK    // عمل من الخارج
}
```

---

### 4. تحديث جدول Employee

#### العلاقة المضافة:
```prisma
missions  HR_EmployeeMission[] @relation("EmployeeMissions")
```

---

## 📊 الحقول الموجودة مسبقاً في Employee

الحقول التالية كانت موجودة بالفعل ولم تحتاج تعديل:
- ✅ `isOnLeave`
- ✅ `isOnMission`
- ✅ `currentLeaveId`
- ✅ `currentMissionId`
- ✅ `lastLeaveEndDate`
- ✅ `nextLeaveStartDate`
- ✅ `totalLeaveDays`
- ✅ `totalDelayDays`
- ✅ `workDaysPerCycle`
- ✅ `leaveDaysPerCycle`

---

## 🔄 Migration Details

### الملف: `20251026151253_add_leave_mission_fields/migration.sql`

**التعديلات:**
1. إنشاء جدول `HR_EmployeeMission` كامل
2. إعادة بناء جدول `HR_EmployeeLeave` مع الحقول الجديدة
3. نقل البيانات القديمة (إن وجدت)
4. إنشاء جميع الفهارس

**ملاحظة:** الـ migration يحتوي على تحذير بخصوص `leaveNumber` لأنه حقل مطلوب، لكن هذا لن يسبب مشكلة إذا كان الجدول فارغاً.

---

## 🎯 الخطوات التالية

### المرحلة 2: الخدمات الأساسية
- [ ] إنشاء `leave-schedule.service.ts` - حساب مواعيد الإجازات
- [ ] إنشاء `leave-notifications.ts` - نظام الإشعارات
- [ ] إنشاء `leave-number-generator.ts` - توليد أرقام الإجازات

### المرحلة 3: مكونات الواجهة
- [ ] إنشاء `calendar.ts` - مكون التقويم

### المرحلة 4: الوظائف الأساسية
- [ ] `leaves.handler.ts` - القائمة الرئيسية
- [ ] `leaves-add.handler.ts` - تسجيل إجازة
- [ ] `leaves-list.handler.ts` - قائمة الإجازات
- [ ] `leaves-return.handler.ts` - تسجيل العودة

### المرحلة 5: الوظائف المتقدمة
- [ ] `leaves-schedule.handler.ts` - جدول الأدوار
- [ ] `leaves-employee.handler.ts` - إجازات عامل
- [ ] `leaves-postpone.handler.ts` - تأجيل الإجازة
- [ ] `leaves-allowance.handler.ts` - بدل الإجازة

### المرحلة 6: المأموريات
- [ ] `missions.handler.ts` - إدارة المأموريات

### المرحلة 7: التقارير
- [ ] `leave-reports.service.ts` - التقارير
- [ ] تصدير Excel
- [ ] طباعة كصورة

### المرحلة 8: البيانات التجريبية
- [ ] `employees-leaves.seed.ts` - بيانات تجريبية

---

## 📝 ملاحظات مهمة

1. **رقم الإجازة (leaveNumber):**
   - يجب أن يكون فريداً
   - الصيغة المقترحة: `LV-YYYY-NNN` (مثل: LV-2025-001)
   - يتم توليده تلقائياً عند إنشاء إجازة جديدة

2. **رقم المأمورية (missionNumber):**
   - يجب أن يكون فريداً
   - الصيغة المقترحة: `MS-YYYY-NNN` (مثل: MS-2025-001)
   - يتم توليده تلقائياً عند إنشاء مأمورية جديدة

3. **حساب التأخير:**
   - يتم حسابه تلقائياً: `actualReturnDate - endDate - 1`
   - يُخزن في حقل `delayDays`

4. **التأجيل:**
   - عند التأجيل يتم تحديث `isPostponed = true`
   - يزيد `postponedTimes` بمقدار 1
   - يتم تحديث `nextLeaveStartDate` في جدول Employee

5. **بدل الإجازة:**
   - يُخزن في `allowanceAmount`
   - حالة التسوية في `allowanceSettled`
   - يمكن ربطه بجدول `HR_LeaveAllowance` للتفاصيل المالية

---

## ✅ التحقق من التطبيق

```bash
# التحقق من الـ schema
npx prisma validate

# عرض الجداول
npx prisma studio

# التحقق من الـ migration
npx prisma migrate status
```

---

**تم التنفيذ بنجاح! ✅**
