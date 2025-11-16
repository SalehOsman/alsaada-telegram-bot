# 🔧 دليل المطور - إدارة قسم المخازن

## 📋 المحتويات
1. [البنية التقنية](#البنية-التقنية)
2. [دليل الملفات](#دليل-الملفات)
3. [Database Schema](#database-schema)
4. [Callback Patterns](#callback-patterns)
5. [إضافة وظائف جديدة](#إضافة-وظائف-جديدة)
6. [Testing & Debugging](#testing--debugging)

---

## 🏗️ البنية التقنية

### Technology Stack

```yaml
Framework: Grammy v1.35.0
Language: TypeScript (ES Modules)
Database: SQLite + Prisma ORM v6.17.1
Runtime: Node.js + tsx
Compiler: tsc-watch (hot-reload)
Linter: ESLint
```

### Project Structure

```
src/bot/features/inventory-management/
├── config.ts                          # Feature configuration
├── index.ts                          # Handler registration
└── handlers/
    ├── inventory-main.handler.ts     # Main department handler
    ├── sub-features.handler.ts       # SubFeature placeholders (4 stores)
    ├── section-management.handler.ts # Complete section management (~1400 LOC)
    └── management.handler.ts         # Legacy handler (to be removed)
```

### Dependencies

```json
{
  "grammy": "^1.35.0",
  "@prisma/client": "^6.17.1",
  "typescript": "^5.x",
  "tsx": "^4.x",
  "tsc-watch": "^6.x"
}
```

---

## 📁 دليل الملفات

### config.ts

**الوظيفة:** تعريف القسم والوظائف الفرعية

**الكود الرئيسي:**
```typescript
import type { FeatureConfig } from '../../types/feature.types.js'

export const config: FeatureConfig = {
  id: 'inventory-management',
  name: 'المخازن',
  description: 'إدارة شاملة للمخازن والأصول',
  emoji: '📦',
  category: 'operations',
  enabled: true,
  
  subFeatures: [
    {
      id: 'inv:spare-parts',
      name: 'مخزن قطع الغيار',
      description: 'إدارة قطع الغيار والمكونات',
      emoji: '⚙️',
      handler: 'sparePartsStoreHandler',
    },
    {
      id: 'inv:oils-greases',
      name: 'مخزن الزيوت والشحوم',
      description: 'إدارة الزيوت ومواد التشحيم',
      emoji: '🛢️',
      handler: 'oilsGreasesStoreHandler',
    },
    {
      id: 'inv:diesel',
      name: 'مخزن السولار',
      description: 'إدارة الوقود والسولار',
      emoji: '⛽',
      handler: 'dieselStoreHandler',
    },
    {
      id: 'inv:tools-equipment',
      name: 'مخزن العدد والأدوات',
      description: 'إدارة العدد والأدوات',
      emoji: '🛠️',
      handler: 'toolsEquipmentStoreHandler',
    },
    {
      id: 'inv:section-management',
      name: 'إدارة قسم المخازن',
      description: 'إدارة الصلاحيات والمسؤولين',
      emoji: '⚙️',
      handler: 'inventorySectionManagementHandler',
      superAdminOnly: true,  // ⭐ IMPORTANT
    },
  ],
}
```

**ملاحظات مهمة:**
1. ✅ جميع SubFeature IDs تبدأ بـ `inv:` (prefix موحد)
2. ✅ آخر subFeature محدد بـ `superAdminOnly: true`
3. ✅ Handler names محددة لكن لم يتم إنشاء الملفات بعد (إلا section-management)

---

### index.ts

**الوظيفة:** تسجيل جميع الـ handlers

**الكود الكامل:**
```typescript
import type { Context } from '../../context.js'
import { Composer } from 'grammy'
import { config } from './config.js'
import { inventoryMainHandler } from './handlers/inventory-main.handler.js'
import { inventoryManagementHandler } from './handlers/management.handler.js'
import { inventorySectionManagementHandler } from './handlers/section-management.handler.js'
import { inventorySubFeaturesHandler } from './handlers/sub-features.handler.js'

const composer = new Composer<Context>()

// Register section management handler (SUPER_ADMIN only)
composer.use(inventorySectionManagementHandler)  // 1️⃣ FIRST

// Register all handlers for this feature
composer.use(inventoryMainHandler)
composer.use(inventorySubFeaturesHandler)
composer.use(inventoryManagementHandler)         // 4️⃣ LAST (legacy)

export { composer, config }
```

**ترتيب التسجيل (مهم جداً!):**
```
Priority: High → Low
1. inventorySectionManagementHandler  (most specific)
2. inventoryMainHandler
3. inventorySubFeaturesHandler
4. inventoryManagementHandler         (least specific)
```

**لماذا الترتيب مهم؟**
```typescript
// Grammy checks handlers in order
// First match wins!

Callback: "menu:sub:inventory-management:inv:section-management"

✅ Check 1: inventorySectionManagementHandler
   Pattern: /^menu:sub:inventory-management:inv:section-management$/
   Match: YES → Execute ✓

❌ Never reaches handlers 2, 3, 4
```

---

### sub-features.handler.ts

**الوظيفة:** معالجة الوظائف الفرعية الأربعة (مؤقتاً)

**الكود الكامل:**
```typescript
import type { Context } from '../../../context.js'
import { Composer } from 'grammy'

export const inventorySubFeaturesHandler = new Composer<Context>()

async function underConstruction(ctx: Context) {
  await ctx.answerCallbackQuery({
    text: '🚧 هذا القسم قيد الإنشاء.',
    show_alert: true,
  })
}

// Spare Parts Store
inventorySubFeaturesHandler.callbackQuery(
  /^menu:sub:inventory-management:inv:spare-parts$/,
  underConstruction
)

// Oils and Greases Store
inventorySubFeaturesHandler.callbackQuery(
  /^menu:sub:inventory-management:inv:oils-greases$/,
  underConstruction
)

// Diesel Store
inventorySubFeaturesHandler.callbackQuery(
  /^menu:sub:inventory-management:inv:diesel$/,
  underConstruction
)

// Tools and Equipment Store
inventorySubFeaturesHandler.callbackQuery(
  /^menu:sub:inventory-management:inv:tools-equipment$/,
  underConstruction
)
```

**النقاط المهمة:**
- ✅ استخدام `async function` وليس arrow function (ESLint requirement)
- ✅ Regex patterns دقيقة ومطابقة لـ callback format
- ✅ سيتم استبدال هذا الـ handler بـ handlers منفصلة لاحقاً

---

### section-management.handler.ts

**الوظيفة:** النظام الكامل لإدارة القسم

**الهيكل العام:**
```typescript
// Imports (20 lines)
import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'

export const inventorySectionManagementHandler = new Composer<Context>()

// Constants (30 lines)
const ROLES = {
  SUPER_ADMIN: { value: 'SUPER_ADMIN', label: '🔴 سوبر أدمن' },
  // ... etc
}

// ════════════════════════════════════════════════════════
// Main Menu (50 lines)
// ════════════════════════════════════════════════════════
inventorySectionManagementHandler.callbackQuery(
  /^menu:sub:inventory-management:inv:section-management$/,
  async (ctx) => { ... }
)

// ════════════════════════════════════════════════════════
// Permissions Management (400 lines)
// ════════════════════════════════════════════════════════
// - Main permissions menu
// - Set department role
// - Set subfeature roles
// - View all permissions

// ════════════════════════════════════════════════════════
// Admins Management (600 lines)
// ════════════════════════════════════════════════════════
// - Main admins menu
// - Department admins (list, add, remove)
// - SubFeature admins (list, add, remove)

// ════════════════════════════════════════════════════════
// Control & Settings (200 lines)
// ════════════════════════════════════════════════════════
// - Toggle department status
// - View statistics
```

**إحصائيات الملف:**
```
Total Lines: ~1400
Handlers: 33
Database Queries: 40+
Callback Patterns: 20+
```

**أهم الـ Handlers:**

| Handler | Pattern | Functionality |
|---------|---------|---------------|
| Main Menu | `/^menu:sub:inventory-management:inv:section-management$/` | 3 main options |
| Permissions Menu | `'inv:section:permissions'` | Permissions management |
| Set Dept Role | `'inv:perm:set-dept-role'` | Choose role for dept |
| Apply Dept Role | `/^inv:perm:dept:(.+)$/` | Apply selected role |
| Admins Menu | `'inv:section:admins'` | Admins management |
| Add Dept Admin | `'inv:admins:dept:add'` | Add department admin |
| Control Menu | `'inv:section:control'` | Control panel |
| Toggle Status | `'inv:control:toggle'` | Enable/disable dept |
| View Stats | `'inv:control:stats'` | Show statistics |

---

## 💾 Database Schema

### الجداول المستخدمة

#### 1. DepartmentConfig

```prisma
model DepartmentConfig {
  id          Int       @id @default(autoincrement())
  code        String    @unique
  name        String
  enabled     Boolean   @default(true)
  minRole     String    @default("ADMIN")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  subFeatures SubFeatureConfig[]
  admins      DepartmentAdmin[]
}
```

**مثال:**
```sql
INSERT INTO DepartmentConfig (code, name, enabled, minRole)
VALUES ('inventory-management', 'المخازن', true, 'ADMIN');
```

#### 2. SubFeatureConfig

```prisma
model SubFeatureConfig {
  id              Int      @id @default(autoincrement())
  departmentCode  String
  code            String   @unique
  name            String
  minRole         String   @default("ADMIN")
  superAdminOnly  Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  department      DepartmentConfig @relation(fields: [departmentCode], references: [code])
  admins          SubFeatureAdmin[]
}
```

**مثال:**
```sql
INSERT INTO SubFeatureConfig (departmentCode, code, name, minRole, superAdminOnly)
VALUES 
  ('inventory-management', 'inv:spare-parts', 'مخزن قطع الغيار', 'ADMIN', false),
  ('inventory-management', 'inv:section-management', 'إدارة قسم المخازن', 'SUPER_ADMIN', true);
```

#### 3. DepartmentAdmin

```prisma
model DepartmentAdmin {
  id             Int      @id @default(autoincrement())
  userId         Int
  departmentCode String
  createdAt      DateTime @default(now())

  // Relations
  user           User             @relation(fields: [userId], references: [id])
  department     DepartmentConfig @relation(fields: [departmentCode], references: [code])

  @@unique([userId, departmentCode])
}
```

**مثال:**
```sql
INSERT INTO DepartmentAdmin (userId, departmentCode)
VALUES (1, 'inventory-management');
```

#### 4. SubFeatureAdmin

```prisma
model SubFeatureAdmin {
  id           Int      @id @default(autoincrement())
  userId       Int
  subFeatureId Int
  createdAt    DateTime @default(now())

  // Relations
  user         User             @relation(fields: [userId], references: [id])
  subFeature   SubFeatureConfig @relation(fields: [subFeatureId], references: [id])

  @@unique([userId, subFeatureId])
}
```

**مثال:**
```sql
INSERT INTO SubFeatureAdmin (userId, subFeatureId)
VALUES (2, 1);  -- User 2 is admin of SubFeature 1 (spare-parts)
```

### Relationships Diagram

```
User (1) ──────┬────── (N) DepartmentAdmin
               │
               └────── (N) SubFeatureAdmin

DepartmentConfig (1) ─── (N) SubFeatureConfig

DepartmentAdmin (N) ─── (1) DepartmentConfig
                  (N) ─── (1) User

SubFeatureAdmin (N) ─── (1) SubFeatureConfig
                  (N) ─── (1) User
```

---

## 🔗 Callback Patterns

### Pattern Format

```typescript
// General format
menu:sub:{departmentCode}:{subFeatureId}

// After entering a sub-feature
{prefix}:{section}:{action}
```

### Complete Pattern List

#### External Patterns (From MenuBuilder)

```typescript
// Feature selection
'menu:feature:inventory-management'

// SubFeature selection
'menu:sub:inventory-management:inv:spare-parts'
'menu:sub:inventory-management:inv:oils-greases'
'menu:sub:inventory-management:inv:diesel'
'menu:sub:inventory-management:inv:tools-equipment'
'menu:sub:inventory-management:inv:section-management'

// Back to main menu
'menu:back'
```

#### Internal Patterns (Within section-management)

**Main Sections:**
```typescript
'inv:section:permissions'  // Permissions menu
'inv:section:admins'       // Admins menu
'inv:section:control'      // Control menu
```

**Permissions:**
```typescript
'inv:perm:set-dept-role'      // Set department role
'inv:perm:dept:ADMIN'         // Apply role (dynamic)
'inv:perm:set-subfeatures'    // Set subfeature roles
'inv:perm:sf:1'               // Select subfeature (dynamic ID)
'inv:perm:sf-set:1:USER'      // Apply subfeature role (dynamic)
'inv:perm:view-all'           // View all permissions
```

**Admins:**
```typescript
'inv:admins:dept:list'        // List department admins
'inv:admins:dept:add'         // Add department admin
'inv:admins:dept:remove:1'    // Remove admin (dynamic ID)
'inv:admins:sf:list'          // List subfeature admins
'inv:admins:sf:add'           // Add subfeature admin
'inv:admins:sf:remove:1'      // Remove SF admin (dynamic ID)
```

**Control:**
```typescript
'inv:control:toggle'          // Toggle enabled/disabled
'inv:control:stats'           // View statistics
```

### Regex Patterns in Code

```typescript
// Exact match
.callbackQuery('inv:section:permissions', ...)

// Regex with capture group
.callbackQuery(/^inv:perm:dept:(.+)$/, (ctx) => {
  const role = ctx.match![1]  // Extract role from callback
})

// Complex regex
.callbackQuery(/^inv:perm:sf-set:(\d+):(.+)$/, (ctx) => {
  const subFeatureId = parseInt(ctx.match![1])
  const role = ctx.match![2]
})
```

---

## ➕ إضافة وظائف جديدة

### السيناريو: إضافة مخزن جديد

**مثال:** إضافة "مخزن الكيماويات"

#### الخطوة 1: تحديث config.ts

```typescript
export const config: FeatureConfig = {
  // ... existing config
  
  subFeatures: [
    // ... existing subFeatures
    
    {
      id: 'inv:chemicals',  // ✅ New SubFeature
      name: 'مخزن الكيماويات',
      description: 'إدارة المواد الكيماوية والمنظفات',
      emoji: '🧪',
      handler: 'chemicalsStoreHandler',
    },
  ],
}
```

#### الخطوة 2: إنشاء Handler منفصل

```typescript
// handlers/chemicals.handler.ts
import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'

export const chemicalsStoreHandler = new Composer<Context>()

// Main menu
chemicalsStoreHandler.callbackQuery(
  /^menu:sub:inventory-management:inv:chemicals$/,
  async (ctx) => {
    await ctx.answerCallbackQuery()
    
    const keyboard = new InlineKeyboard()
      .text('📋 قائمة المواد', 'inv:chemicals:list')
      .row()
      .text('➕ إضافة مادة', 'inv:chemicals:add')
      .row()
      .text('📊 التقارير', 'inv:chemicals:reports')
      .row()
      .text('⬅️ رجوع', 'menu:feature:inventory-management')
    
    await ctx.editMessageText('🧪 **مخزن الكيماويات**', {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  }
)

// List chemicals
chemicalsStoreHandler.callbackQuery('inv:chemicals:list', async (ctx) => {
  // Implementation
})

// Add chemical
chemicalsStoreHandler.callbackQuery('inv:chemicals:add', async (ctx) => {
  // Implementation
})
```

#### الخطوة 3: تسجيل Handler في index.ts

```typescript
import { chemicalsStoreHandler } from './handlers/chemicals.handler.js'

const composer = new Composer<Context>()

composer.use(inventorySectionManagementHandler)
composer.use(inventoryMainHandler)
composer.use(inventorySubFeaturesHandler)
composer.use(chemicalsStoreHandler)  // ✅ Add here
composer.use(inventoryManagementHandler)
```

#### الخطوة 4: إضافة سجل في قاعدة البيانات

```typescript
// scripts/add-chemicals-subfeature.ts
import { Database } from '../src/modules/database/index.js'

async function main() {
  await Database.prisma.subFeatureConfig.create({
    data: {
      departmentCode: 'inventory-management',
      code: 'inv:chemicals',
      name: 'مخزن الكيماويات',
      minRole: 'ADMIN',
      superAdminOnly: false,
    },
  })
  
  console.log('✅ SubFeature added successfully')
}

main()
```

#### الخطوة 5: الاختبار

```bash
# 1. Run initialization script
npm run script scripts/add-chemicals-subfeature.ts

# 2. Start bot
npm run dev

# 3. Test in Telegram:
#    - Open Inventory
#    - Click "مخزن الكيماويات"
#    - Verify menu appears
```

---

## 🧪 Testing & Debugging

### Development Workflow

```bash
# 1. Start development server
npm run dev

# This runs:
# - Prisma generate
# - tsc-watch (TypeScript compiler with hot-reload)
# - Prisma Studio (http://localhost:5555)
# - Bot execution

# 2. Make changes to code
# → tsc-watch detects changes
# → Recompiles automatically
# → Restarts bot

# 3. Test in Telegram

# 4. Check logs in terminal
```

### Logging Strategy

**Bot logs everything:**
```typescript
// Example log output
[DEBUG] Update received
  update_id: 268323084
  update: { callback_query: { data: "inv:section:control" } }

[DEBUG] Bot API call
  method: "answerCallbackQuery"
  payload: { callback_query_id: "..." }

[DEBUG] Update processed
  update_id: 268323084
  elapsed: 210.1ms
```

**استخدام Logs للتصحيح:**
```typescript
// 1. Check received callback
//    Look for: "data": "..."

// 2. Verify handler matched
//    Look for: "Bot API call" (means handler executed)

// 3. If "unhandled-callback-query":
//    → Pattern mismatch
//    → Handler not registered
```

### Database Inspection

**استخدام Prisma Studio:**
```
1. Open http://localhost:5555
2. Browse tables:
   - DepartmentConfig
   - SubFeatureConfig
   - DepartmentAdmin
   - SubFeatureAdmin
3. View/Edit/Delete records directly
```

**استخدام SQL queries:**
```typescript
// In scripts or handlers
const subFeatures = await Database.prisma.subFeatureConfig.findMany({
  where: { departmentCode: 'inventory-management' },
  include: { admins: true },
})

console.log(subFeatures)
```

### Common Debugging Scenarios

#### Scenario 1: Callback not handled

**Symptoms:**
```log
[DEBUG] Handle unhandled-callback-query
  data: "menu:sub:inventory-management:inv:spare-parts"
```

**Debugging:**
```typescript
// 1. Check callback data format
console.log('Received callback:', ctx.callbackQuery.data)

// 2. Check pattern in handler
.callbackQuery(/^menu:sub:inventory-management:inv:spare-parts$/, ...)
//              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//              Must match exactly!

// 3. Verify handler is registered
// Check index.ts
```

#### Scenario 2: Permission denied

**Symptoms:**
User can't access a subfeature

**Debugging:**
```typescript
// 1. Check user role
console.log('User role:', ctx.dbUser?.role)

// 2. Check subfeature minRole
const sf = await Database.prisma.subFeatureConfig.findUnique({
  where: { code: 'inv:spare-parts' }
})
console.log('Required role:', sf?.minRole)

// 3. Check role hierarchy
const roleHierarchy = {
  GUEST: 0,
  USER: 1,
  MODERATOR: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
}
```

#### Scenario 3: Database errors

**Symptoms:**
```
Prisma error: Unique constraint failed on ...
```

**Debugging:**
```sql
-- 1. Check existing records
SELECT * FROM SubFeatureConfig WHERE code = 'inv:spare-parts';

-- 2. Delete duplicates if needed
DELETE FROM SubFeatureConfig WHERE id = 5;

-- 3. Use upsert instead of create
await Database.prisma.subFeatureConfig.upsert({
  where: { code: 'inv:spare-parts' },
  update: { name: 'New Name' },
  create: { /* ... */ },
})
```

---

## 🛠️ Development Tools

### TypeScript Config

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

### ESLint Rules

```typescript
// Common violations to avoid:

// ❌ Arrow function at top level
const handler = async (ctx) => {}

// ✅ Function declaration
async function handler(ctx) {}

// ❌ Extra blank lines
<blank>
import ...

// ✅ No blank lines before imports
import ...

// ❌ Trailing spaces
const x = 'value'  

// ✅ No trailing spaces
const x = 'value'
```

### Useful Commands

```bash
# Lint specific file
npm run lint -- src/bot/features/inventory-management/handlers/section-management.handler.ts

# Fix lint errors automatically
npm run lint -- src/bot/features/inventory-management/ --fix

# Build project
npm run build

# Type checking only (no compilation)
npm run type-check

# Generate Prisma Client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Open Prisma Studio
npm run prisma:studio
```

---

## 📊 Performance Considerations

### Database Queries

**✅ Best Practices:**
```typescript
// Use select to limit fields
const subFeatures = await Database.prisma.subFeatureConfig.findMany({
  where: { departmentCode: 'inventory-management' },
  select: { id: true, name: true },  // Only needed fields
})

// Use include for relations
const dept = await Database.prisma.departmentConfig.findUnique({
  where: { code: 'inventory-management' },
  include: { subFeatures: true },  // Include related data
})

// Use transactions for multiple operations
await Database.prisma.$transaction([
  Database.prisma.departmentAdmin.create({ ... }),
  Database.prisma.subFeatureConfig.update({ ... }),
])
```

**❌ Anti-patterns:**
```typescript
// Don't query in loops
for (const sf of subFeatures) {
  const admins = await Database.prisma.subFeatureAdmin.findMany({
    where: { subFeatureId: sf.id }
  })
}

// ✅ Use single query with include
const subFeatures = await Database.prisma.subFeatureConfig.findMany({
  where: { departmentCode: 'inventory-management' },
  include: { admins: true },
})
```

### Memory Management

```typescript
// Use Map for deduplication
const uniqueItems = new Map()
for (const item of items) {
  if (!uniqueItems.has(item.code)) {
    uniqueItems.set(item.code, item)
  }
}

// Clear large objects
let hugeData = await fetchData()
processData(hugeData)
hugeData = null  // Allow GC
```

---

## 🔐 Security Best Practices

### Input Validation

```typescript
// Always validate user input
async function addDepartmentAdmin(ctx: Context) {
  const telegramId = ctx.message?.text
  
  // Validate format
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    await ctx.reply('❌ يرجى إرسال رقم Telegram ID صحيح')
    return
  }
  
  // Check user exists
  const user = await Database.prisma.user.findUnique({
    where: { telegramId }
  })
  
  if (!user) {
    await ctx.reply('❌ المستخدم غير موجود في النظام')
    return
  }
  
  // Check not already admin
  const existing = await Database.prisma.departmentAdmin.findUnique({
    where: { 
      userId_departmentCode: {
        userId: user.id,
        departmentCode: 'inventory-management'
      }
    }
  })
  
  if (existing) {
    await ctx.reply('⚠️ المستخدم مسؤول بالفعل')
    return
  }
  
  // Safe to proceed
  await Database.prisma.departmentAdmin.create({ ... })
}
```

### Permission Checks

```typescript
// Always check permissions
inventorySectionManagementHandler.callbackQuery(
  /^menu:sub:inventory-management:inv:section-management$/,
  async (ctx) => {
    // Check SUPER_ADMIN
    if (ctx.dbUser?.role !== 'SUPER_ADMIN') {
      await ctx.editMessageText('🔒 هذه الوظيفة متاحة فقط للسوبر أدمن', {
        reply_markup: new InlineKeyboard()
          .text('🔙 رجوع', 'menu:feature:inventory-management'),
      })
      return  // ⚠️ CRITICAL: Return early
    }
    
    // Proceed with functionality
  }
)
```

---

## 📝 Code Style Guide

### Naming Conventions

```typescript
// Variables: camelCase
const subFeatureId = 1
const departmentCode = 'inventory-management'

// Constants: UPPER_SNAKE_CASE
const ROLES = { ... }
const MAX_ADMINS_PER_DEPT = 10

// Functions: camelCase
async function handleCallback(ctx: Context) { }

// Types/Interfaces: PascalCase
interface SubFeatureConfig { }
type CallbackData = string

// Composers: camelCase + Handler suffix
export const inventorySectionManagementHandler = new Composer<Context>()
```

### File Naming

```
kebab-case for files:
section-management.handler.ts
sub-features.handler.ts
inventory-main.handler.ts
```

### Comment Style

```typescript
// ════════════════════════════════════════════════════════
// Section Title (Major Section)
// ════════════════════════════════════════════════════════

// Single line comment for functions
inventoryHandler.callbackQuery('pattern', async (ctx) => {
  // Explanation of complex logic
  const result = await complexOperation()
})

/**
 * Multi-line comment for exported functions
 * @param ctx - Grammy context
 * @returns Promise<void>
 */
export async function exportedFunction(ctx: Context): Promise<void> { }
```

---

## 🎯 الخلاصة

هذا الدليل يغطي جميع الجوانب التقنية لنظام إدارة قسم المخازن. للمساعدة في المشاكل التقنية، راجع:

- `03-PROBLEMS-AND-SOLUTIONS.md` - حلول للمشاكل الشائعة
- `02-FLOWS.md` - فهم التدفقات
- `04-USER-GUIDE.md` - منظور المستخدم النهائي

**Happy Coding! 🚀**
