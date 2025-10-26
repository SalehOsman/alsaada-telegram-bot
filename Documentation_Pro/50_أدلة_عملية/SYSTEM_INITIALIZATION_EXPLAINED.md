# System Initialization Explained
## Super Admin & Company Data

This document answers critical questions about how the bot system initializes and where it gets data from.

---

## 1. Super Admin Information

### ❓ Where does the bot get Super Admin information from?

**Answer:** The bot gets Super Admin information from **TWO SOURCES**:

#### **Source 1: Environment Variable (.env file)**
```env
SUPER_ADMIN_ID=7594239391
```

#### **Source 2: Automatic Database Initialization**

The bot **automatically creates/updates** the Super Admin user in the database when it starts.

**Location:** `src/main.ts` (lines 32-33 and 86-87)
```typescript
// Initialize Super Admin from environment
await initSuperAdmin(config)
```

**Process:** `src/modules/permissions/init-super-admin.ts`
```typescript
export async function initSuperAdmin(config: Config): Promise<void> {
  if (!config.superAdminId) {
    logger.warn('No SUPER_ADMIN_ID configured in environment')
    return
  }

  const telegramId = BigInt(config.superAdminId)

  // Check if user exists
  let user = await Database.prisma.user.findUnique({
    where: { telegramId },
  })

  if (!user) {
    // CREATE new super admin
    user = await Database.prisma.user.create({
      data: {
        telegramId,
        role: 'SUPER_ADMIN',
        isActive: true,
        firstName: 'Super Admin',
      },
    })
  }
  else if (user.role !== 'SUPER_ADMIN') {
    // UPDATE existing user to SUPER_ADMIN
    user = await Database.prisma.user.update({
      where: { telegramId },
      data: { role: 'SUPER_ADMIN', isActive: true },
    })
  }
}
```

### 🔍 Why does the bot recognize the Super Admin even without database record?

**It DOESN'T!** The bot actually **creates the database record automatically** when it starts.

**Startup Sequence:**
1. Bot starts → `src/main.ts`
2. Database connects → `await Database.connect()`
3. Super Admin initialized → `await initSuperAdmin(config)`
4. Bot is ready

**So the Super Admin IS recorded in the database**, it just happens automatically during bot startup.

---

## 2. Company Information

### ❓ Where does the company name come from?

**Answer:** The bot **automatically creates a default company** when it starts.

**Location:** `src/main.ts` (lines 35-38 and 89-92)
```typescript
// Initialize default company
const { CompanyService } = await import('#root/modules/company/index.js')
await CompanyService.getOrCreate()
logger.info('Company initialized')
```

**Process:** `src/modules/company/company-service.ts`
```typescript
static async getOrCreate(createdBy?: number): Promise<Company> {
  // Try to get existing company
  let company = await Database.prisma.company.findFirst({
    where: { isActive: true },
  })

  if (!company) {
    // Create default company
    company = await Database.prisma.company.create({
      data: {
        name: 'الشركة',  // ← Default company name
        isActive: true,
      },
    })
    logger.info({ companyId: company.id }, 'Company created')
  }

  return company
}
```

### 📋 Default Company Details

When the bot starts and finds no company in the database, it creates one with:
- **Name (Arabic):** `الشركة`
- **Name (English):** `null` (not set)
- **isActive:** `true`
- All other fields: `null` or default values

### 🔄 Where is the company name used?

The company name appears in join request messages, but looking at the code in `src/modules/interaction/wizards/join-request.ts`, I **DON'T** see the company name being included in the notification message to admins.

**Current notification message (lines 353-361):**
```typescript
const message
  = '🔔 **طلب انضمام جديد!**\n\n'
    + `👤 **الاسم الكامل:** ${request.fullName}\n`
    + `🏷️ **اسم الشهرة:** ${request.nickname || 'غير محدد'}\n`
    + `📱 **رقم الموبايل:** ${request.phone}\n`
    + `🆔 **Telegram ID:** \`${request.telegramId}\`\n`
    + `📋 **رقم الطلب:** \`${request.id}\`\n\n`
    + `📅 **تاريخ التقديم:** ${formattedDate}\n\n`
    + '⬇️ اختر إجراء:'
```

❗ **The company name is NOT currently included in this message.**

If you're seeing a company name somewhere, it might be:
1. In the conversation start message (line 54): `'📝 **طلب انضمام للشركة**\n\n'` - This is just static text
2. In another part of the bot that I haven't seen yet
3. Added by a customization you made

---

## 3. Complete Bot Startup Sequence

```
1. main.ts starts
   ↓
2. Database.connect()
   ↓
3. initSuperAdmin(config) ← Creates/updates Super Admin from .env
   ↓
4. CompanyService.getOrCreate() ← Creates default company "الشركة"
   ↓
5. bot.init()
   ↓
6. Bot is ready and running
```

---

## 4. Database Seeding

### Current State
The database tables are empty because the seed script hasn't been run yet.

### What needs to be populated

| Table | Status | Source | Command |
|-------|--------|--------|---------|
| **User** | ✅ Auto-populated | Created automatically when bot starts (Super Admin) and when users interact with bot | N/A |
| **Company** | ✅ Auto-populated | Created automatically when bot starts | N/A |
| **Governorates** | ❌ Empty | Seed file exists: `prisma/seeds/governorates.ts` | `npm run db:seed` |
| **Departments** | ❌ Empty | Seed file exists: `prisma/seeds/departments.ts` | `npm run db:seed` |
| **Positions** | ❌ Empty | Seed file exists: `prisma/seeds/positions.ts` | `npm run db:seed` |
| **Equipment** | ❌ Empty | Seed file exists: `prisma/seeds/equipment-data.ts` | `npm run db:seed` |

### How to Populate

**Run the main seed command:**
```bash
npm run db:seed
```

This will populate:
- ✅ 27 Egyptian Governorates
- ✅ 11 Departments (Engineering, HR, Finance, etc.)
- ✅ 23 Job Positions across all departments
- ✅ Equipment Categories & Types

### Alternative: Individual Seeds
```bash
# Departments only
tsx ./prisma/seed-departments.ts

# Positions only (requires departments first)
tsx ./prisma/seed-positions.ts

# Governorates only
tsx ./prisma/seed-governorates.ts
```

---

## 5. Summary

### Super Admin
- ✅ Defined in `.env` file: `SUPER_ADMIN_ID=7594239391`
- ✅ Automatically created/updated in database when bot starts
- ✅ Role: `SUPER_ADMIN`
- ✅ Always active and recognized by the bot

### Company
- ✅ Automatically created when bot starts
- ✅ Default name: `الشركة`
- ✅ Can be updated later through the bot admin panel
- ✅ Only ONE company record exists (singleton pattern)

### Other Data
- ❌ Must be manually seeded using `npm run db:seed`
- ✅ Seed files exist and are ready to use
- ✅ Will populate: Governorates, Departments, Positions, Equipment

---

## 6. Next Steps

1. **Run the seed command:**
   ```bash
   npm run db:seed
   ```

2. **Verify the data:**
   ```bash
   npm run prisma:studio
   ```
   This opens a web interface to view all database records.

3. **Update company information:**
   - Start the bot
   - Use the admin panel to update company details
   - Or use Prisma Studio to edit directly

4. **Start working with the populated database!**

---

**Date Created:** 2025-10-25  
**Last Updated:** 2025-10-25
