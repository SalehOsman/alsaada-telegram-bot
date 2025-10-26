# ⚡ خطوات التنفيذ السريعة

## 📋 ملخص ما تم إنجازه:

تم تصميم **نظام إدارة معدات شامل** يشمل:
- ✅ تصنيف وأنواع المعدات (قلاب، خدمات، لودر، بلدوزر، حفار)
- ✅ كود فريد لكل معدة (EQ001, EQ002, ...)
- ✅ **تتبع الزيوت بالكيلومتر أو الساعات** حسب نوع المعدة
- ✅ **صيانة دورية مجدولة** مع تذكيرات تلقائية
- ✅ **نظام ورديات** (صباحية/مسائية/ليلية)
- ✅ سجلات كاملة (صيانة، إصلاحات، وقود، تكاليف)
- ✅ **جاهز للربط مع المخازن** (قطع غيار، زيوت، سولار)

---

## 🎯 الخطوة 1: مراجعة التعديلات

افتح الملف:
```
prisma/equipment_schema_additions.prisma
```

هذا الملف يحتوي على:
1. الجداول الجديدة (ScheduledMaintenance, Shift, ShiftAssignment)
2. التعديلات المطلوبة على الجداول الموجودة
3. الـ Enums الجديدة

---

## 🎯 الخطوة 2: تطبيق التعديلات على schema.prisma

### أ) إضافة العلاقات في جدول Equipment:

ابحث عن:
```prisma
  // Relations
  maintenanceRecords    MaintenanceRecord[]
  usageRecords          EquipmentUsage[]
  costs                 EquipmentCost[]
  fuelLogs              FuelLog[]
```

أضف:
```prisma
  scheduledMaintenances ScheduledMaintenance[]
  shiftAssignments      ShiftAssignment[]
```

### ب) إضافة العلاقات في جدول Employee:

ابحث عن نهاية جدول Employee وأضف:
```prisma
  shiftAssignments      ShiftAssignment[] @relation("ShiftOperator")
```

### ج) إضافة العلاقات في جدول Project:

أضف:
```prisma
  shiftAssignments      ShiftAssignment[]
  equipmentUsages       EquipmentUsage[]
```

### د) إضافة الجداول الثلاثة الجديدة:

انسخ من `equipment_schema_additions.prisma`:
- `model ScheduledMaintenance { ... }`
- `model Shift { ... }`
- `model ShiftAssignment { ... }`

### هـ) إضافة الـ Enums:

الـ enums الجديدة موجودة بالفعل في نهاية الملف:
- ✅ `MaintenanceScheduleType`
- ✅ `MaintenanceByType`
- ✅ `ShiftType`
- ✅ `ShiftStatus`

---

## 🎯 الخطوة 3: تشغيل Migration

```powershell
cd F:\_Alsaada_Telegram_Bot\telegram-bot-template-main
npx prisma migrate dev --name add_equipment_system
```

---

## 🎯 الخطوة 4: إضافة البيانات الأساسية

### أ) إنشاء ملف seed للمعدات:

```powershell
# افتح ملف
prisma/seeds/equipment-data.ts
```

الملف جاهز ويحتوي على:
- 3 تصنيفات رئيسية
- 5 أنواع معدات (قلاب، خدمات، لودر، بلدوزر، حفار)
- 2 ورديات افتراضية (صباحية، مسائية)

### ب) إنشاء seed runner:

أضف في `prisma/seed.ts`:

```typescript
import { PrismaClient } from '../generated/prisma';
import { governorates } from './seeds/governorates';
import { equipmentCategories, equipmentTypes, defaultShifts } from './seeds/equipment-data';

const prisma = new PrismaClient();

async function seedEquipment() {
  console.log('🚜 بدء إضافة بيانات المعدات...');

  // 1. إضافة التصنيفات
  for (const category of equipmentCategories) {
    await prisma.equipmentCategory.upsert({
      where: { code: category.code },
      update: category,
      create: category,
    });
    console.log(`✅ تصنيف: ${category.nameAr}`);
  }

  // 2. إضافة الأنواع
  for (const type of equipmentTypes) {
    const category = await prisma.equipmentCategory.findUnique({
      where: { code: type.categoryCode }
    });
    
    if (category) {
      await prisma.equipmentType.upsert({
        where: { code: type.code },
        update: { ...type, categoryId: category.id },
        create: { ...type, categoryId: category.id },
      });
      console.log(`✅ نوع: ${type.nameAr}`);
    }
  }

  // 3. إضافة الورديات
  for (const shift of defaultShifts) {
    await prisma.shift.create({
      data: shift
    });
    console.log(`✅ وردية: ${shift.name}`);
  }

  console.log('\n✨ تم إضافة بيانات المعدات بنجاح!');
}

async function seedGovernorates() {
  // ... الكود الموجود
}

async function main() {
  console.log('🚀 بدء عملية Seeding...\n');
  
  await seedGovernorates();
  await seedEquipment();
  
  console.log('\n✅ اكتملت عملية Seeding بنجاح!');
}

main()
  .catch((e) => {
    console.error('❌ خطأ في Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### ج) تشغيل seed:

```powershell
npx tsx prisma/seed.ts
```

---

## 🎯 الخطوة 5: التحقق من النتيجة

```powershell
npx prisma studio
```

ستجد:
- ✅ **Equipment_Category** (3 تصنيفات)
- ✅ **Equipment_Type** (5 أنواع)
- ✅ **Equipment_Shift** (2 ورديات)
- ✅ **Location_Governorate** (27 محافظة)

---

## 📊 الجداول النهائية:

### المعدات:
1. `Equipment_Category` - التصنيفات
2. `Equipment_Type` - الأنواع
3. `Equipment` - المعدات الفعلية
4. `Equipment_Maintenance` - سجل الصيانة
5. `Equipment_Scheduled_Maintenance` - الصيانة المجدولة ⭐
6. `Equipment_Usage` - سجل الاستخدام
7. `Equipment_Cost` - التكاليف
8. `Equipment_Fuel_Log` - سجل الوقود
9. `Equipment_Shift` - الورديات ⭐
10. `Equipment_Shift_Assignment` - تعيين الورديات ⭐

---

## 💡 استخدامات سريعة:

### 1. إضافة معدة:
```typescript
await prisma.equipment.create({
  data: {
    code: "EQ001",
    nameAr: "قلاب هيونداي",
    equipmentTypeId: 1,
    companyId: 1,
    maintenanceBy: "MILEAGE",  // تتبع بالكيلومتر
    oilChangeInterval: 5000,
    status: "AVAILABLE"
  }
});
```

### 2. جدولة صيانة:
```typescript
await prisma.scheduledMaintenance.create({
  data: {
    equipmentId: 1,
    maintenanceType: "OIL_CHANGE",
    title: "تغيير زيت",
    scheduleType: "BY_MILEAGE",
    intervalKm: 5000,
    nextDueKm: 5000
  }
});
```

### 3. تعيين وردية:
```typescript
await prisma.shiftAssignment.create({
  data: {
    operatorId: 5,
    equipmentId: 1,
    shiftId: 1,
    assignmentDate: new Date(),
    status: "SCHEDULED"
  }
});
```

---

## 📚 المستندات:

- `EQUIPMENT_SYSTEM.md` - التوثيق الكامل
- `equipment_schema_additions.prisma` - الإضافات المطلوبة
- `seeds/equipment-data.ts` - البيانات الجاهزة

---

## ✅ قائمة المراجعة:

- [ ] مراجعة `equipment_schema_additions.prisma`
- [ ] تطبيق التعديلات على `schema.prisma`
- [ ] تشغيل `npx prisma migrate dev`
- [ ] تعديل `seed.ts`
- [ ] تشغيل `npx tsx prisma/seed.ts`
- [ ] فتح `npx prisma studio` للتحقق

---

**هل أنت جاهز للبدء؟** 🚀
