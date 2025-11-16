# 💻 مخزن قطع الغيار - دليل المطور

**النسخة:** 2.0  
**آخر تحديث:** نوفمبر 2025

---

## 🚀 البدء السريع

### التثبيت

```bash
# Clone المشروع
git clone <repo-url>

# تثبيت المكتبات
npm install

# إعداد قاعدة البيانات
npx prisma migrate dev

# تشغيل البوت
npm run dev
```

### متطلبات التطوير
- Node.js v20+
- PostgreSQL 15+
- TypeScript 5+
- Prisma 6.17+

---

## 📝 إضافة ميزة جديدة

### 1. إضافة Callback Handler

```typescript
// في spare-parts-items.handler.ts
sparePartsItemsHandler.callbackQuery('sp:items:new-feature', async (ctx) => {
  await ctx.answerCallbackQuery()
  
  // الكود هنا
  
  await ctx.editMessageText('النص', {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
})
```

### 2. إضافة Text Handler

```typescript
sparePartsItemsHandler.on('message:text', async (ctx) => {
  const state = ctx.session.inventoryForm
  if (!state) return
  
  switch (state.step) {
    case 'new_step':
      // معالجة الخطوة الجديدة
      break
  }
})
```

### 3. إضافة جدول جديد

```prisma
// في schema.prisma
model INV_NewTable {
  id        Int      @id @default(autoincrement())
  name      String
  createdAt DateTime @default(now())
}
```

```bash
# تطبيق التغييرات
npx prisma migrate dev --name add_new_table
npx prisma generate
```

---

## 🔍 Debugging

### Logging
```typescript
// استخدم console.warn للـ debug logs
console.warn('📨 Starting operation...')
console.warn('✅ Data:', data)
console.warn('❌ Error:', error)
```

### Session Inspection
```typescript
// عرض محتوى الـ session
console.warn('Session:', JSON.stringify(ctx.session, null, 2))
```

### Database Queries
```typescript
// استخدم Prisma Studio
npx prisma studio

// أو raw queries
const result = await prisma.$queryRaw`SELECT * FROM "INV_SparePart"`
```

---

## 🧪 الاختبار

### Unit Tests (قيد الإضافة)
```typescript
import { describe, it, expect } from 'vitest'

describe('generateInternalCode', () => {
  it('should generate correct code format', async () => {
    const code = await generateInternalCode('CAR')
    expect(code).toMatch(/^CAR-\d{5}$/)
  })
})
```

### Integration Tests
```typescript
// محاكاة callback query
const mockUpdate = {
  callback_query: {
    data: 'sp:items:add:start',
    from: { id: 123 },
  },
}
```

---

## 📊 مراجع API

### Prisma Operations
```typescript
// Create
await prisma.iNV_SparePart.create({ data })

// Read
await prisma.iNV_SparePart.findUnique({ where: { id } })
await prisma.iNV_SparePart.findMany({ where, include })

// Update
await prisma.iNV_SparePart.update({ where: { id }, data })

// Delete (soft)
await prisma.iNV_SparePart.update({ 
  where: { id }, 
  data: { isDeleted: true, deletedAt: new Date() } 
})
```

### Grammy Context
```typescript
// الرد على callback
await ctx.answerCallbackQuery()
await ctx.answerCallbackQuery({ text: 'رسالة' })

// تعديل رسالة
await ctx.editMessageText('نص جديد', { reply_markup, parse_mode })

// إرسال رسالة جديدة
await ctx.reply('نص', { reply_markup })

// إرسال صورة
await ctx.replyWithPhoto(new InputFile(buffer))
```

---

## 🔐 الأمان

### التحقق من الصلاحيات
```typescript
const user = await prisma.employee.findUnique({
  where: { telegramId: ctx.from.id },
})

if (!user || user.accessLevel !== 'ADMIN') {
  await ctx.answerCallbackQuery({ text: '❌ ليس لديك صلاحية' })
  return
}
```

### Input Validation
```typescript
// التحقق من الأرقام
const qty = parseInt(text)
if (isNaN(qty) || qty <= 0) {
  await ctx.reply('❌ الكمية يجب أن تكون رقماً موجباً')
  return
}

// التحقق من النصوص
if (!text.trim()) {
  await ctx.reply('❌ الحقل مطلوب')
  return
}
```

### SQL Injection Prevention
```typescript
// ✅ آمن (Prisma يحمي تلقائياً)
await prisma.iNV_SparePart.findMany({
  where: { nameAr: { contains: userInput } },
})

// ❌ غير آمن (تجنب)
await prisma.$queryRawUnsafe(`SELECT * FROM parts WHERE name = '${userInput}'`)
```

---

## 🎨 Code Style

### التنسيق
```typescript
// استخدم ESLint + Prettier
npm run lint
npm run format

// القواعد الأساسية
- استخدم const بدلاً من let
- استخدم async/await بدلاً من .then()
- استخدم template strings
- أضف trailing comma
```

### التسمية
```typescript
// PascalCase للـ classes و types
class BarcodeGenerator {}
interface SparePartData {}

// camelCase للـ functions و variables
async function generateCode() {}
const userData = {}

// UPPER_CASE للـ constants
const MAX_QUANTITY = 1000

// kebab-case للـ callback data
'sp:items:add:start'
```

---

## 📚 موارد إضافية

- [Grammy Documentation](https://grammy.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 🐛 المشاكل الشائعة

### Session غير محفوظة
```typescript
// ✅ الحل: تأكد من حفظ الـ session في الـ callback handler
ctx.session.inventoryForm = { action, step, data }
```

### Prisma Type Errors
```typescript
// ✅ الحل: أعد توليد الـ types
npx prisma generate
```

### Build Errors
```typescript
// ✅ الحل: امسح الـ build وأعد البناء
Remove-Item -Recurse -Force build
npm run build
```

---

## 🤝 المساهمة

1. Fork المشروع
2. أنشئ branch جديد (`git checkout -b feature/new-feature`)
3. Commit التغييرات (`git commit -m 'Add feature'`)
4. Push إلى البranch (`git push origin feature/new-feature`)
5. افتح Pull Request

---

**📞 للدعم:** راجع [11_TROUBLESHOOTING.md](./11_TROUBLESHOOTING.md)
