import { PrismaClient } from '../generated/prisma';
import { governorates } from './seeds/governorates';
import { equipmentCategories, equipmentTypes, defaultShifts } from './seeds/equipment-data';
import { departments } from './seeds/departments';
import { positionsData } from './seeds/positions';
import { seedEmployeesWithLeaves } from './seeds/employees-leaves';
import { seedRealisticLeaves } from './seeds/realistic-leaves';

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

async function seedFeatureConfigs() {
  console.log('\n⚙️ بدء إضافة بيانات الوظائف والأقسام...');

  // 1. إضافة/تحديث DepartmentConfig لقسم شئون العاملين
  console.log('\n📂 إضافة تكوين الأقسام...');
  
  await prisma.departmentConfig.upsert({
    where: { code: 'hr-management' },
    update: {
      name: 'شئون العاملين',
      nameEn: 'HR Management',
      icon: '👥',
      description: 'إدارة شاملة للموارد البشرية',
      isEnabled: true,
      order: 2,
      minRole: 'ADMIN',
    },
    create: {
      code: 'hr-management',
      name: 'شئون العاملين',
      nameEn: 'HR Management',
      icon: '👥',
      description: 'إدارة شاملة للموارد البشرية',
      isEnabled: true,
      order: 2,
      minRole: 'ADMIN',
    },
  });
  console.log(`✅ تم إضافة: شئون العاملين (hr-management)`);

  // 2. إضافة SubFeatureConfig لجميع الوظائف الفرعية
  console.log('\n📋 إضافة الوظائف الفرعية...');

  const subFeatures = [
    {
      code: 'hr:employees-list',
      departmentCode: 'hr-management',
      name: 'قوائم العاملين',
      nameEn: 'Employees List',
      icon: '📋',
      description: 'إدارة بيانات العاملين الحاليين والسابقين',
      isEnabled: true,
      order: 1,
      minRole: 'ADMIN',
      superAdminOnly: false,
    },
    {
      code: 'hr:advances',
      departmentCode: 'hr-management',
      name: 'السلف والمسحوبات',
      nameEn: 'Advances',
      icon: '💰',
      description: 'إدارة السلف والمسحوبات المالية',
      isEnabled: true,
      order: 2,
      minRole: 'ADMIN',
      superAdminOnly: false,
    },
    {
      code: 'hr:leaves',
      departmentCode: 'hr-management',
      name: 'الإجازات والماموريات',
      nameEn: 'Leaves',
      icon: '🏖️',
      description: 'إدارة الإجازات والماموريات الرسمية',
      isEnabled: true,
      order: 3,
      minRole: 'ADMIN',
      superAdminOnly: false,
    },
    {
      code: 'hr:payroll',
      departmentCode: 'hr-management',
      name: 'الرواتب والأجور',
      nameEn: 'Payroll',
      icon: '💵',
      description: 'إدارة الرواتب والأجور (SUPER_ADMIN فقط)',
      isEnabled: true,
      order: 4,
      minRole: 'SUPER_ADMIN',
      superAdminOnly: true,
    },
    {
      code: 'hr:custom-reports',
      departmentCode: 'hr-management',
      name: 'التقارير المخصصة',
      nameEn: 'Custom Reports',
      icon: '📊',
      description: 'إنشاء تقارير احترافية مخصصة (SUPER_ADMIN فقط)',
      isEnabled: true,
      order: 5,
      minRole: 'SUPER_ADMIN',
      superAdminOnly: true,
    },
    {
      code: 'hr:section-management',
      departmentCode: 'hr-management',
      name: 'إدارة قسم شئون العاملين',
      nameEn: 'Section Management',
      icon: '⚙️',
      description: 'تعيين الأدمن وإدارة صلاحيات القسم والوظائف (SUPER_ADMIN فقط)',
      isEnabled: true,
      order: 6,
      minRole: 'SUPER_ADMIN',
      superAdminOnly: true,
    },
  ];

  for (const subFeature of subFeatures) {
    await prisma.subFeatureConfig.upsert({
      where: { code: subFeature.code },
      update: {
        name: subFeature.name,
        nameEn: subFeature.nameEn,
        icon: subFeature.icon,
        description: subFeature.description,
        isEnabled: subFeature.isEnabled,
        order: subFeature.order,
        minRole: subFeature.minRole,
        superAdminOnly: subFeature.superAdminOnly,
      },
      create: subFeature,
    });
    console.log(`✅ تم إضافة: ${subFeature.name} (${subFeature.code})`);
  }

  console.log(`\n✨ تم إضافة ${subFeatures.length} وظيفة فرعية بنجاح!`);
  
  // عرض الملخص
  const departmentsCount = await prisma.departmentConfig.count();
  const subFeaturesCount = await prisma.subFeatureConfig.count();
  
  console.log('\n📊 الملخص:');
  console.log(`   - الأقسام: ${departmentsCount}`);
  console.log(`   - الوظائف الفرعية: ${subFeaturesCount}`);
}

async function seedInventory() {
  console.log('\n📦 بدء إضافة بيانات المخازن الموحدة...');
  
  // الفئات الموحدة
  const categories = [
    { code: 'SPARE_PART', nameAr: 'قطع غيار', nameEn: 'Spare Parts', icon: '⚙️', prefix: 'SP', orderIndex: 1 },
    { code: 'OILS_GREASE', nameAr: 'زيوت وشحوم', nameEn: 'Oils & Greases', icon: '🛢️', prefix: 'OG', orderIndex: 2 },
    { code: 'FUEL', nameAr: 'سولار', nameEn: 'Fuel', icon: '⛽', prefix: 'FL', orderIndex: 3 },
    { code: 'TOOLS', nameAr: 'عدد وأدوات', nameEn: 'Tools', icon: '🛠️', prefix: 'TL', orderIndex: 4 },
  ];
  
  for (const cat of categories) {
    await prisma.iNV_Category.upsert({
      where: { code: cat.code },
      update: cat,
      create: { ...cat, isActive: true, createdBy: BigInt(0) },
    });
    console.log(`   ✅ ${cat.nameAr}`);
  }
  
  // مواقع التخزين
  const locations = [
    { code: 'CONT-1', nameAr: 'كرستر رقم 1', nameEn: 'Container 1', locationType: 'CONTAINER', orderIndex: 1 },
    { code: 'SHELF-A1', nameAr: 'رف A1', nameEn: 'Shelf A1', locationType: 'SHELF', orderIndex: 2 },
  ];
  
  for (const loc of locations) {
    await prisma.iNV_StorageLocation.upsert({
      where: { code: loc.code },
      update: loc,
      create: { ...loc, isActive: true, createdBy: BigInt(0) },
    });
    console.log(`   ✅ ${loc.nameAr}`);
  }
  
  console.log(`\n✨ تم إضافة ${categories.length} فئة و ${locations.length} موقع تخزين!`);
}

async function main() {
  console.log('🚀 بدء عملية Seeding...\n');
  
  // تشغيل seed بالترتيب الصحيح
  await seedGovernorates();
  await seedDepartments();
  await seedPositions();
  await seedEquipment();
  await seedFeatureConfigs(); // إضافة تكوين الوظائف والأقسام
  await seedInventory(); // إضافة بيانات المخازن الموحدة
  // await seedEmployeesWithLeaves();
  await seedRealisticLeaves();
  
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
    departmentConfigs: await prisma.departmentConfig.count(),
    subFeatureConfigs: await prisma.subFeatureConfig.count(),
    invCategories: await prisma.iNV_Category.count(),
    invLocations: await prisma.iNV_StorageLocation.count(),
    employees: await prisma.employee.count(),
    leaves: await prisma.hR_EmployeeLeave.count(),
  };
  
  console.log(`✅ المحافظات: ${counts.governorates}`);
  console.log(`✅ الأقسام: ${counts.departments}`);
  console.log(`✅ الوظائف: ${counts.positions}`);
  console.log(`✅ تصنيفات المعدات: ${counts.equipmentCategories}`);
  console.log(`✅ أنواع المعدات: ${counts.equipmentTypes}`);
  console.log(`✅ تكوين الأقسام: ${counts.departmentConfigs}`);
  console.log(`✅ تكوين الوظائف الفرعية: ${counts.subFeatureConfigs}`);
  console.log(`✅ فئات المخازن: ${counts.invCategories}`);
  console.log(`✅ مواقع التخزين: ${counts.invLocations}`);
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
