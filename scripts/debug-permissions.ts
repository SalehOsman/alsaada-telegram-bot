/**
 * Script to debug permissions issue
 * Run: npx tsx scripts/debug-permissions.ts
 */

import { PrismaClient } from '../generated/prisma/index.js'

const prisma = new PrismaClient()

async function debugPermissions() {
  console.log('🔍 فحص نظام الصلاحيات...\n')

  const userId = 6272758666 // Saleh Osman

  // 1. معلومات المستخدم
  console.log('=' .repeat(60))
  console.log('1️⃣ معلومات المستخدم')
  console.log('=' .repeat(60))
  
  const user = await prisma.user.findUnique({
    where: { telegramId: userId },
  })

  if (!user) {
    console.log('❌ المستخدم غير موجود!')
    return
  }

  console.log('✅ المستخدم موجود:')
  console.log(`   - ID: ${user.id}`)
  console.log(`   - Username: ${user.username}`)
  console.log(`   - Full Name: ${user.fullName}`)
  console.log(`   - Role: ${user.role}`)
  console.log(`   - Active: ${user.isActive}`)
  console.log(`   - Banned: ${user.isBanned}`)

  // 2. معلومات القسم
  console.log('\n' + '='.repeat(60))
  console.log('2️⃣ معلومات قسم شئون العاملين')
  console.log('=' .repeat(60))

  const department = await prisma.departmentConfig.findUnique({
    where: { code: 'hr-management' },
  })

  if (!department) {
    console.log('❌ القسم غير موجود في قاعدة البيانات!')
    return
  }

  console.log('✅ القسم موجود:')
  console.log(`   - ID: ${department.id}`)
  console.log(`   - Code: ${department.code}`)
  console.log(`   - Name: ${department.name}`)
  console.log(`   - minRole: ${department.minRole}`)
  console.log(`   - isEnabled: ${department.isEnabled}`)

  // 3. تعيينات المستخدم كمسؤول قسم
  console.log('\n' + '='.repeat(60))
  console.log('3️⃣ تعيينات المستخدم كمسؤول قسم')
  console.log('=' .repeat(60))

  const deptAdmins = await prisma.departmentAdmin.findMany({
    where: {
      telegramId: userId,
    },
    include: {
      department: true,
    },
  })

  if (deptAdmins.length === 0) {
    console.log('❌ المستخدم غير معيّن كمسؤول قسم')
  }
  else {
    console.log(`✅ المستخدم معيّن كمسؤول على ${deptAdmins.length} قسم:`)
    for (const admin of deptAdmins) {
      console.log(`   - القسم: ${admin.department.name} (${admin.department.code})`)
      console.log(`     Active: ${admin.isActive}`)
      console.log(`     Assigned At: ${admin.assignedAt}`)
    }
  }

  // 4. الوظائف الفرعية في قاعدة البيانات
  console.log('\n' + '='.repeat(60))
  console.log('4️⃣ الوظائف الفرعية المسجلة')
  console.log('=' .repeat(60))

  const subFeatures = await prisma.subFeatureConfig.findMany({
    where: {
      departmentCode: 'hr-management',
    },
    orderBy: {
      code: 'asc',
    },
  })

  if (subFeatures.length === 0) {
    console.log('❌ لا توجد وظائف فرعية مسجلة في قاعدة البيانات!')
    console.log('   هذا يفسر لماذا لا يستطيع المستخدم رؤية أي شيء!')
  }
  else {
    console.log(`✅ عدد الوظائف المسجلة: ${subFeatures.length}`)
    for (const sf of subFeatures) {
      console.log(`   - ${sf.code}`)
      console.log(`     Name: ${sf.name}`)
      console.log(`     minRole: ${sf.minRole || 'NULL (يرث من القسم)'}`)
      console.log(`     isEnabled: ${sf.isEnabled}`)
      console.log(`     superAdminOnly: ${sf.superAdminOnly}`)
    }
  }

  // 5. تعيينات المستخدم على وظائف فرعية
  console.log('\n' + '='.repeat(60))
  console.log('5️⃣ تعيينات المستخدم على وظائف فرعية')
  console.log('=' .repeat(60))

  const sfAdmins = await prisma.subFeatureAdmin.findMany({
    where: {
      telegramId: userId,
    },
    include: {
      subFeature: true,
    },
  })

  if (sfAdmins.length === 0) {
    console.log('❌ المستخدم غير معيّن على أي وظيفة فرعية')
  }
  else {
    console.log(`✅ المستخدم معيّن على ${sfAdmins.length} وظيفة:`)
    for (const admin of sfAdmins) {
      console.log(`   - ${admin.subFeature.code}`)
      console.log(`     Active: ${admin.isActive}`)
    }
  }

  // 6. التحليل النهائي
  console.log('\n' + '='.repeat(60))
  console.log('6️⃣ التحليل والتشخيص')
  console.log('=' .repeat(60))

  const userRole = user.role
  const deptMinRole = department.minRole || 'ADMIN'
  const isDeptAdmin = deptAdmins.some(a => a.departmentId === department.id && a.isActive)

  console.log('\n🔍 فحص الصلاحيات:')
  
  // Check 1: SUPER_ADMIN
  if (userRole === 'SUPER_ADMIN') {
    console.log('   ✅ المستخدم SUPER_ADMIN - يجب أن يرى كل شيء')
  }
  else {
    console.log(`   ℹ️  المستخدم ${userRole} (ليس SUPER_ADMIN)`)
  }

  // Check 2: Department Admin
  if (isDeptAdmin) {
    console.log('   ✅ المستخدم مسؤول قسم - يجب أن يرى جميع الوظائف')
  }
  else {
    console.log('   ❌ المستخدم ليس مسؤول قسم')
  }

  // Check 3: Role comparison
  const roleHierarchy: Record<string, number> = {
    GUEST: 1,
    USER: 2,
    MODERATOR: 2,
    ADMIN: 3,
    SUPER_ADMIN: 4,
  }

  const userRoleLevel = roleHierarchy[userRole] || 0
  const requiredRoleLevel = roleHierarchy[deptMinRole] || 3

  if (userRoleLevel >= requiredRoleLevel) {
    console.log(`   ✅ رتبة المستخدم (${userRole}=${userRoleLevel}) >= minRole (${deptMinRole}=${requiredRoleLevel})`)
  }
  else {
    console.log(`   ❌ رتبة المستخدم (${userRole}=${userRoleLevel}) < minRole (${deptMinRole}=${requiredRoleLevel})`)
  }

  // Check 4: SubFeatures
  if (subFeatures.length === 0) {
    console.log('\n🔴 المشكلة الرئيسية:')
    console.log('   لا توجد وظائف فرعية مسجلة في SubFeatureConfig!')
    console.log('   الحل: تسجيل الوظائف في قاعدة البيانات')
  }
  else {
    console.log('\n✅ الوظائف الفرعية موجودة في قاعدة البيانات')
  }

  // Check 5: Department enabled
  if (!department.isEnabled) {
    console.log('\n🔴 مشكلة: القسم معطّل (isEnabled = false)')
  }

  // Check 6: User active
  if (!user.isActive || user.isBanned) {
    console.log('\n🔴 مشكلة: المستخدم غير نشط أو محظور')
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ انتهى الفحص')
  console.log('=' .repeat(60))
}

debugPermissions()
  .catch((e) => {
    console.error('❌ خطأ:', e)
  })
  .finally(() => {
    prisma.$disconnect()
  })
