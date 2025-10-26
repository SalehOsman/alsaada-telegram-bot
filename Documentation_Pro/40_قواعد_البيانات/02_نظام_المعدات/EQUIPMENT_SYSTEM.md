# 🚜 نظام إدارة المعدات الشامل

## 📋 نظرة عامة

تم تصميم نظام متكامل لإدارة المعدات الثقيلة يشمل:
- ✅ تصنيف وأنواع المعدات
- ✅ سجل الصيانة والإصلاحات
- ✅ سجل استخدام المعدات
- ✅ سجل الوقود
- ✅ التكاليف التشغيلية
- ✅ **الصيانة الدورية المجدولة**
- ✅ **نظام الورديات (صباحية/مسائية)**
- ✅ **تتبع الزيوت بالكيلومتر أو الساعات**
- ✅ جاهز للربط مع المخازن لاحقاً

---

## 🏗️ البنية الهرمية

```
EquipmentCategory (التصنيف الرئيسي)
 ├─ معدات ثقيلة (Heavy Equipment)
 ├─ سيارات (Vehicles)
 └─ معدات رفع (Lifting Equipment)
    │
    ├──▶ EquipmentType (نوع المعدة)
    │     ├─ سيارة قلاب
    │     ├─ سيارة خدمات
    │     ├─ لودر
    │     ├─ بلدوزر
    │     └─ حفار
    │        │
    │        └──▶ Equipment (المعدة الفعلية)
    │              ├─ EQ001 (قلاب هيونداي)
    │              ├─ EQ002 (حفار كات)
    │              └─ EQ003 (لودر فولفو)
    │                 │
    │                 ├──▶ MaintenanceRecord (سجل الصيانة)
    │                 ├──▶ ScheduledMaintenance (صيانة مجدولة)
    │                 ├──▶ EquipmentUsage (سجل الاستخدام)
    │                 ├──▶ FuelLog (سجل الوقود)
    │                 ├──▶ EquipmentCost (التكاليف)
    │                 └──▶ ShiftAssignment (الورديات)
```

---

## 📊 الجداول الرئيسية

### 1. Equipment (المعدات)

**كل معدة لها كود فريد** مثل: EQ001, EQ002

**تتبع الصيانة حسب نوع المعدة:**
- **بالكيلومتر** (للسيارات): `maintenanceBy: MILEAGE`
- **بساعات العمل** (للمعدات الثقيلة): `maintenanceBy: HOURS`

**تتبع تغيير الزيت:**
```typescript
{
  oilChangeInterval: 5000,        // كل 5000 كم أو 250 ساعة
  lastOilChangeAt: 45000,         // آخر تغيير عند
  nextOilChangeAt: 50000,         // القادم عند
  oilType: "15W-40",              // نوع الزيت
  oilCapacity: 12.5               // السعة باللتر
}
```

**الحالات:**
- AVAILABLE (متاحة)
- IN_USE (قيد الاستخدام)
- MAINTENANCE (صيانة)
- REPAIR (إصلاح)
- OUT_OF_SERVICE (خارج الخدمة)

---

### 2. ScheduledMaintenance (الصيانة الدورية المجدولة)

**أنواع الجدولة:**
- يومي / أسبوعي / شهري / ربع سنوي / سنوي
- حسب الكيلومتر (كل 10,000 كم)
- حسب ساعات العمل (كل 500 ساعة)
- الاثنين معاً (أيهما يأتي أولاً)

**مثال: تغيير زيت تلقائي**
```typescript
{
  title: "تغيير زيت محرك",
  maintenanceType: "OIL_CHANGE",
  scheduleType: "BY_HOURS",
  intervalHours: 250,             // كل 250 ساعة
  nextDueHours: 750,              // القادم عند 750 ساعة
  reminderHoursBefore: 10,        // تذكير قبل 10 ساعات
  expectedOilType: "15W-40",
  expectedOilQuantity: 12.5,
  estimatedCost: 500
}
```

**التذكيرات التلقائية:**
- قبل 3 أيام من موعد الصيانة
- قبل 100 كم من العداد المستهدف
- قبل 10 ساعات عمل

---

### 3. Shift (الورديات)

**الورديات المتاحة:**
- صباحية: 7:00 - 15:00
- مسائية: 15:00 - 23:00
- ليلية: 23:00 - 7:00

**مثال وردية:**
```typescript
{
  name: "الوردية الصباحية",
  shiftType: "MORNING",
  startTime: "07:00",
  endTime: "15:00",
  duration: 8,
  breakDuration: 60,              // 60 دقيقة راحة
  workDays: ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"]
}
```

---

### 4. ShiftAssignment (تعيين الورديات)

**ربط الموظف + المعدة + الوردية:**
```typescript
{
  operatorId: 5,                  // الموظف
  equipmentId: 2,                 // المعدة (EQ002)
  shiftId: 1,                     // الوردية الصباحية
  assignmentDate: "2025-10-23",
  status: "SCHEDULED",            // مجدولة
  startMileage: 45000,            // عداد البداية
  endMileage: 45120,              // عداد النهاية
  startHours: 500,                // ساعات البداية
  endHours: 508                   // ساعات النهاية
}
```

**الحالات:**
- SCHEDULED (مجدولة)
- IN_PROGRESS (قيد التنفيذ)
- COMPLETED (مكتملة)
- CANCELLED (ملغاة)
- NO_SHOW (لم يحضر)

---

### 5. MaintenanceRecord (سجل الصيانة والإصلاحات)

**أنواع الصيانة:**
- PREVENTIVE (صيانة دورية)
- CORRECTIVE (إصلاح)
- EMERGENCY (طارئة)
- OIL_CHANGE (تغيير زيت)
- TIRE_CHANGE (تغيير إطارات)

**مثال سجل صيانة:**
```typescript
{
  equipmentId: 2,
  maintenanceType: "OIL_CHANGE",
  maintenanceDate: "2025-10-23",
  description: "تغيير زيت محرك وفلتر",
  workPerformed: "تغيير 12.5 لتر زيت 15W-40 + فلتر زيت",
  laborCost: 150,
  partsCost: 350,
  totalCost: 500,
  performedBy: "ورشة المعدات الرئيسية",
  mileageBefore: 45000,
  mileageAfter: 45000,
  conditionBefore: "GOOD",
  conditionAfter: "EXCELLENT"
}
```

---

### 6. FuelLog (سجل الوقود)

```typescript
{
  equipmentId: 2,
  fuelDate: "2025-10-23",
  fuelType: "DIESEL",
  quantity: 200,                  // لتر
  pricePerUnit: 12.5,             // سعر اللتر
  totalCost: 2500,
  currentMileage: 45100,
  currentHours: 504,
  station: "محطة شل",
  isFull: true                    // تنك مليان
}
```

---

## 🔗 الربط مع المخازن (مستقبلاً)

النظام جاهز للربط مع:

### مخزن قطع الغيار:
```typescript
{
  partId: "PART001",
  partName: "فلتر زيت",
  quantity: 10,
  location: "مخزن قطع غيار"
}
```

### مخزن الزيوت:
```typescript
{
  oilId: "OIL001",
  oilType: "15W-40",
  quantity: 500,                  // لتر
  location: "مخزن زيوت"
}
```

### مخزن السولار:
```typescript
{
  fuelId: "FUEL001",
  fuelType: "DIESEL",
  quantity: 5000,                 // لتر
  location: "خزان السولار الرئيسي"
}
```

**الحقول الجاهزة في ScheduledMaintenance:**
- `expectedParts` (JSON array)
- `expectedOilType`
- `expectedOilQuantity`

---

## 📝 أمثلة الاستخدام

### مثال 1: إضافة معدة جديدة

```typescript
const equipment = await prisma.equipment.create({
  data: {
    code: "EQ001",
    nameAr: "قلاب هيونداي HD270",
    equipmentTypeId: 1,             // سيارة قلاب
    companyId: 1,
    
    // المواصفات
    manufacturer: "Hyundai",
    model: "HD270",
    yearOfManufacture: 2023,
    plateNumber: "م ق ح 1234",
    capacity: "15 طن",
    fuelType: "DIESEL",
    
    // الصيانة
    maintenanceBy: "MILEAGE",       // تتبع بالكيلومتر
    oilChangeInterval: 5000,
    nextOilChangeAt: 5000,
    
    // الحالة
    status: "AVAILABLE",
    condition: "EXCELLENT",
    currentMileage: 0,
    totalWorkingHours: 0
  }
});
```

### مثال 2: جدولة صيانة دورية

```typescript
const scheduled = await prisma.scheduledMaintenance.create({
  data: {
    equipmentId: 1,
    maintenanceType: "OIL_CHANGE",
    title: "تغيير زيت محرك",
    scheduleType: "BY_MILEAGE",
    intervalKm: 5000,
    nextDueKm: 5000,
    reminderKmBefore: 500,
    estimatedCost: 500,
    expectedOilType: "15W-40",
    expectedOilQuantity: 12.5
  }
});
```

### مثال 3: تعيين وردية

```typescript
const assignment = await prisma.shiftAssignment.create({
  data: {
    operatorId: 5,                  // الموظف
    equipmentId: 1,                 // المعدة
    shiftId: 1,                     // الوردية الصباحية
    assignmentDate: new Date(),
    status: "SCHEDULED",
    projectId: 2,                   // المشروع
    startMileage: 5000,
    startHours: 100
  }
});
```

### مثال 4: تسجيل صيانة

```typescript
const maintenance = await prisma.maintenanceRecord.create({
  data: {
    equipmentId: 1,
    maintenanceType: "OIL_CHANGE",
    maintenanceDate: new Date(),
    description: "تغيير زيت محرك دوري",
    workPerformed: "تغيير 12.5 لتر زيت 15W-40 + فلتر",
    laborCost: 150,
    partsCost: 350,
    totalCost: 500,
    performedBy: "الورشة الرئيسية",
    mileageBefore: 5000,
    mileageAfter: 5000,
    conditionBefore: "GOOD",
    conditionAfter: "EXCELLENT"
  }
});

// تحديث معلومات المعدة
await prisma.equipment.update({
  where: { id: 1 },
  data: {
    lastOilChangeAt: 5000,
    nextOilChangeAt: 10000,
    lastMaintenanceDate: new Date()
  }
});
```

---

## 🚀 الخطوات المطلوبة

الآن الملفات جاهزة ويجب:

1. ✅ **مراجعة schema الأساسي** في `schema.prisma`
2. ✅ **إضافة التعديلات** من `equipment_schema_additions.prisma`
3. ✅ **تشغيل migration**
4. ✅ **إضافة البيانات الأساسية** من `seeds/equipment-data.ts`

---

## 📦 الملفات المنشأة:

1. `prisma/schema.prisma` - معدل جزئياً
2. `prisma/equipment_schema_additions.prisma` - الإضافات المطلوبة
3. `prisma/seeds/equipment-data.ts` - البيانات الجاهزة
4. `prisma/EQUIPMENT_SYSTEM.md` - هذا الملف

---

## ⚡ الميزات الجاهزة:

✅ كود فريد لكل معدة
✅ تتبع الزيوت بالكيلومتر أو الساعات
✅ صيانة دورية مجدولة تلقائية
✅ نظام ورديات متكامل
✅ ربط بالموظفين والمشاريع
✅ جاهز للربط مع المخازن
✅ سجلات كاملة (صيانة، وقود، تكاليف)

---

هل تريد البدء في تطبيق النظام؟ 🎯
