# 🗄️ دليل تطبيق Schema على قاعدة البيانات

## 🚀 الطريقة السريعة (باستخدام Script)

### 1️⃣ شغّل الـ Script:
```powershell
cd "F:\_Alsaada_Telegram_Bot\telegram-bot-template-main"
.\apply-schema.ps1
```

**الـ Script سيقوم بـ:**
- ✅ فحص حالة Migrations
- ✅ التحقق من صحة Schema
- ✅ عرض التغييرات المطلوبة
- ✅ إنشاء Migration جديد
- ✅ تطبيق التغييرات
- ✅ توليد Prisma Client
- ✅ فتح Prisma Studio للمراجعة

---

## 🔧 الطريقة اليدوية (خطوة بخطوة)

### الخطوة 1: الانتقال للمشروع
```powershell
cd "F:\_Alsaada_Telegram_Bot\telegram-bot-template-main"
```

### الخطوة 2: فحص حالة Migrations
```powershell
npx prisma migrate status
```

**النتائج المحتملة:**
- ✅ `Database and migrations are in sync` - كل شيء محدّث
- ⚠️ `Following migrations have not yet been applied` - يوجد migrations معلقة
- 🔴 `Database schema is not in sync` - يوجد تغييرات غير مطبقة

---

### الخطوة 3: التحقق من صحة Schema
```powershell
npx prisma validate
```

**إذا ظهرت أخطاء:**
- راجع ملف `prisma/schema.prisma`
- تأكد من صحة العلاقات (Relations)
- تأكد من عدم وجود جداول مكررة

---

### الخطوة 4: إنشاء Migration جديد
```powershell
npx prisma migrate dev --name complete_database_system
```

**ماذا يفعل هذا الأمر:**
1. يقرأ التغييرات في `schema.prisma`
2. يقارنها مع قاعدة البيانات الحالية
3. ينشئ ملف migration في `prisma/migrations/`
4. يطبق التغييرات على قاعدة البيانات
5. يولّد Prisma Client تلقائياً

---

### الخطوة 5: توليد Prisma Client (إذا لزم)
```powershell
npx prisma generate
```

---

### الخطوة 6: فتح Prisma Studio للمراجعة
```powershell
npx prisma studio
```

**سيفتح متصفح على:** `http://localhost:5555`

**يمكنك:**
- ✅ عرض جميع الجداول
- ✅ التحقق من الحقول
- ✅ إضافة بيانات تجريبية
- ✅ فحص العلاقات

---

## 🔄 في حالة المشاكل

### مشكلة: Schema غير صحيح
```powershell
# راجع الأخطاء
npx prisma validate

# افتح Schema للتعديل
code prisma/schema.prisma
```

### مشكلة: Migration فشل
```powershell
# راجع آخر migration
cd prisma/migrations
ls -Sort CreationTime -Descending | Select-Object -First 1

# احذف آخر migration إذا كان خاطئاً
Remove-Item "prisma/migrations/MIGRATION_NAME" -Recurse
```

### مشكلة: قاعدة البيانات فاسدة
```powershell
# ⚠️ هذا سيحذف جميع البيانات!
npx prisma migrate reset

# ثم أعد تطبيق كل شيء
npx prisma migrate dev
```

---

## 📊 التحقق من النجاح

### 1️⃣ فحص الجداول الجديدة:
```powershell
npx prisma studio
```

**يجب أن ترى:**
- ✅ Employee (جدول الموظفين)
- ✅ Equipment (المعدات)
- ✅ Equipment_Type
- ✅ Equipment_Category
- ✅ Equipment_Maintenance
- ✅ Equipment_Shift
- ✅ وغيرها...

### 2️⃣ اختبار الاتصال:
```powershell
npx prisma db pull
```

### 3️⃣ عرض Schema الحالي:
```powershell
npx prisma db execute --stdin < "SELECT name FROM sqlite_master WHERE type='table';"
```

---

## 🎯 ماذا بعد التطبيق؟

### 1. إضافة بيانات أولية (Seed)
```powershell
npx prisma db seed
```

### 2. نسخ احتياطي
```powershell
# انسخ ملف قاعدة البيانات
Copy-Item "prisma/dev.db" "prisma/dev.db.backup"
```

### 3. اختبار في الكود
```typescript
// في src/index.ts أو أي ملف
import { prisma } from './lib/prisma';

// اختبار
const companies = await prisma.company.findMany();
console.log('Companies:', companies.length);
```

---

## 📝 ملاحظات مهمة

### ⚠️ قبل التطبيق:
- ✅ **احفظ نسخة احتياطية** من `prisma/dev.db`
- ✅ **راجع Schema** وتأكد من صحته
- ✅ **اختبر على بيئة تطوير** أولاً

### ✨ بعد التطبيق:
- ✅ **راجع Prisma Studio** للتحقق
- ✅ **اختبر العلاقات** بين الجداول
- ✅ **أضف بيانات تجريبية** للاختبار

---

## 🆘 الدعم

إذا واجهت مشاكل:
1. راجع [Prisma Docs](https://www.prisma.io/docs)
2. تحقق من `prisma/migrations/` للأخطاء
3. راجع ملف `.env` للاتصال بقاعدة البيانات

---

**آخر تحديث:** أكتوبر 2025  
**الحالة:** ✅ جاهز للتطبيق
