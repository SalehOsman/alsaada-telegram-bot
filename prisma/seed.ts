import { PrismaClient } from '../generated/prisma';
import { governorates } from './seeds/governorates';
import { equipmentCategories, equipmentTypes, defaultShifts } from './seeds/equipment-data';
import { departments } from './seeds/departments';
import { positionsData } from './seeds/positions';
import { seedEmployeesWithLeaves } from './seeds/employees-leaves';

const prisma = new PrismaClient();

async function seedGovernorates() {
  console.log('🌍 بدء إضافة بيانات المحافظات...');

  for (const gov of governorates) {
    await prisma.governorate.upsert({
      where: { code: gov.code },
      update: gov,
      create: gov,
    });
    console.log(`✅ تم إضافة: ${gov.nameAr} (${gov.nameEn})`);
  }

  console.log(`\n✨ تم إضافة ${governorates.length} محافظة بنجاح!`);
  
  // عرض الترتيب النهائي
  const allGovs = await prisma.governorate.findMany({
    orderBy: { orderIndex: 'asc' },
    select: { orderIndex: true, nameAr: true, nameEn: true },
  });
  
  console.log('\n📋 الترتيب النهائي:');
  allGovs.forEach(gov => {
    console.log(`${gov.orderIndex}. ${gov.nameAr} (${gov.nameEn})`);
  });
}

async function seedDepartments() {
  console.log('\n🏢 بدء إضافة بيانات الأقسام...');

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: dept,
      create: dept,
    });
    console.log(`✅ تم إضافة: ${dept.name} (${dept.nameEn})`);
  }

  console.log(`\n✨ تم إضافة ${departments.length} قسم بنجاح!`);
  
  // عرض الترتيب النهائي
  const allDepts = await prisma.department.findMany({
    orderBy: { orderIndex: 'asc' },
    select: { orderIndex: true, name: true, nameEn: true, code: true },
  });
  
  console.log('\n📋 الأقسام:');
  allDepts.forEach(dept => {
    console.log(`${dept.orderIndex}. ${dept.name} (${dept.code})`);
  });
}

async function seedPositions() {
  console.log('\n👔 بدء إضافة بيانات الوظائف...');

  // الحصول على جميع الأقسام للربط
  const allDepartments = await prisma.department.findMany();
  const deptMap = new Map(allDepartments.map(d => [d.code, d.id]));

  let successCount = 0;
  let skipCount = 0;

  for (const pos of positionsData) {
    const departmentId = deptMap.get(pos.departmentCode);
    
    if (!departmentId) {
      console.log(`⚠️  تحذير: القسم ${pos.departmentCode} غير موجود للوظيفة ${pos.code}`);
      skipCount++;
      continue;
    }

    const { departmentCode, ...positionData } = pos;
    
    await prisma.position.upsert({
      where: { code: pos.code },
      update: { ...positionData, departmentId },
      create: { ...positionData, departmentId },
    });
    
    console.log(`✅ تم إضافة: ${pos.titleAr} (${pos.code})`);
    successCount++;
  }

  console.log(`\n✨ تم إضافة ${successCount} وظيفة بنجاح!`);
  if (skipCount > 0) {
    console.log(`⚠️  تم تخطي ${skipCount} وظيفة بسبب عدم وجود القسم`);
  }
  
  // عرض الملخص
  const positionsByDept = await prisma.position.groupBy({
    by: ['departmentId'],
    _count: true,
  });

  console.log('\n📊 توزيع الوظائف على الأقسام:');
  for (const group of positionsByDept) {
    const dept = await prisma.department.findUnique({
      where: { id: group.departmentId },
      select: { name: true, code: true },
    });
    if (dept) {
      console.log(`   - ${dept.name} (${dept.code}): ${group._count} وظيفة`);
    }
  }
}

async function seedEquipment() {
  console.log('\n🚜 بدء إضافة بيانات المعدات...');

  // 1. إضافة التصنيفات
  console.log('\n📦 إضافة التصنيفات...');
  for (const category of equipmentCategories) {
    await prisma.equipmentCategory.upsert({
      where: { code: category.code },
      update: category,
      create: category,
    });
    console.log(`✅ ${category.nameAr} (${category.nameEn})`);
  }

  // 2. إضافة الأنواع
  console.log('\n🔧 إضافة أنواع المعدات...');
  for (const type of equipmentTypes) {
    const category = await prisma.equipmentCategory.findUnique({
      where: { code: type.categoryCode }
    });
    
    if (category) {
      const { categoryCode, ...typeData } = type;
      await prisma.equipmentType.upsert({
        where: { code: type.code },
        update: { ...typeData, categoryId: category.id },
        create: { ...typeData, categoryId: category.id },
      });
      console.log(`✅ ${type.nameAr} (${type.nameEn})`);
    }
  }

  // 3. إضافة الورديات - تم إزالة هذا الجزء لأن جدول shift غير موجود في المخطط
  console.log('\n⏰ الورديات - تم التخطي (الجدول غير موجود في المخطط)');

  console.log('\n✨ تم إضافة بيانات المعدات بنجاح!');
  
  // عرض الملخص
  const categoriesCount = await prisma.equipmentCategory.count();
  const typesCount = await prisma.equipmentType.count();
  
  console.log('\n📊 الملخص:');
  console.log(`   - التصنيفات: ${categoriesCount}`);
  console.log(`   - أنواع المعدات: ${typesCount}`);
}

async function main() {
  console.log('🚀 بدء عملية Seeding...\n');
  
  // تشغيل seed بالترتيب الصحيح
  await seedGovernorates();
  await seedDepartments();
  await seedPositions();
  await seedEquipment();
  await seedEmployeesWithLeaves();
  
  // عرض الملخص النهائي
  console.log('\n' + '='.repeat(50));
  console.log('📊 الملخص النهائي:');
  console.log('='.repeat(50));
  
  const counts = {
    governorates: await prisma.governorate.count(),
    departments: await prisma.department.count(),
    positions: await prisma.position.count(),
    equipmentCategories: await prisma.equipmentCategory.count(),
    equipmentTypes: await prisma.equipmentType.count(),
    employees: await prisma.employee.count(),
    leaves: await prisma.hR_EmployeeLeave.count(),
  };
  
  console.log(`✅ المحافظات: ${counts.governorates}`);
  console.log(`✅ الأقسام: ${counts.departments}`);
  console.log(`✅ الوظائف: ${counts.positions}`);
  console.log(`✅ تصنيفات المعدات: ${counts.equipmentCategories}`);
  console.log(`✅ أنواع المعدات: ${counts.equipmentTypes}`);
  console.log(`✅ العاملين: ${counts.employees}`);
  console.log(`✅ الإجازات: ${counts.leaves}`);
  console.log('='.repeat(50));
  
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
