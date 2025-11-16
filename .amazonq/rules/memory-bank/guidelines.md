# Development Guidelines - Al-Saada ERP Telegram Bot

## Code Quality Standards

### TypeScript Configuration
- **Strict Mode**: Enabled throughout the project
- **ES2022 Target**: Modern JavaScript features
- **ESNext Modules**: Full ES module support with .js extensions in imports
- **Path Aliases**: Use `#root/*` for clean imports
- **No Implicit Any**: All types must be explicit

### Code Formatting
- **Indentation**: 2 spaces (consistent across all files)
- **Quotes**: Single quotes for strings
- **Semicolons**: Not required (ESLint configured)
- **Line Length**: Aim for 100-120 characters maximum
- **Trailing Commas**: Used in multi-line objects and arrays

### Naming Conventions
- **Files**: kebab-case (e.g., `payroll-calculate.handler.ts`)
- **Classes**: PascalCase (e.g., `NotificationService`)
- **Functions**: camelCase (e.g., `calculatePayroll`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Interfaces/Types**: PascalCase (e.g., `PayrollData`)
- **Private Properties**: Prefix with underscore (e.g., `_internalState`)

### Arabic Language Support
- **UI Text**: All user-facing text in Arabic
- **Comments**: Arabic for business logic, English for technical details
- **Variable Names**: English only
- **Documentation**: Bilingual (Arabic for users, English for developers)
- **Number Formatting**: Arabic numerals (٠-٩) for display using formatArabicNumber()

## Architectural Patterns

### Feature-Based Organization
Each feature follows this structure:
```
feature-name/
├── handlers/           # User interaction logic
│   ├── action.handler.ts
│   └── action.service.ts
├── keyboards/          # Inline keyboard builders
├── utils/             # Feature-specific utilities
└── index.ts           # Feature composer
```

### Service Layer Pattern
- **Handlers**: Thin orchestration layer (UI logic only)
- **Services**: Business logic and database operations
- **Separation**: Never mix UI and business logic

Example from payroll-calculate.handler.ts:
```typescript
// Handler - orchestration only
payrollCalculateHandler.callbackQuery('payroll:create', async (ctx) => {
  await ctx.answerCallbackQuery()
  calculateStates.set(userId, { step: 'select_employee' })
  await showEmployeeSelection(ctx)
})

// Service - business logic
async function calculateAndShowPayroll(ctx, employeeId, month, year) {
  const employee = await Database.prisma.employee.findUnique(...)
  const payrollData = calculatePayroll(employee, month, year)
  await savePayrollRecord(payrollData)
}
```

### State Management
- **Session-Based**: Use ctx.session for conversation state
- **In-Memory Maps**: For temporary calculation data
- **Cache Pattern**: Store computed results with TTL

Example:
```typescript
const calculateStates = new Map<number, CalculatePayrollState>()
const payrollDataCache = new Map<string, PayrollData>()

// Store state
calculateStates.set(userId, { step: 'select_month', employeeId })

// Retrieve and validate
const state = calculateStates.get(userId)
if (!state) {
  await ctx.answerCallbackQuery('❌ انتهت الجلسة')
  return
}
```

### Database Access Pattern
- **Prisma ORM**: All database operations through Prisma
- **Type Safety**: Leverage Prisma's generated types
- **Transactions**: Use for multi-step operations
- **Includes**: Fetch related data efficiently

Example:
```typescript
const employee = await Database.prisma.employee.findUnique({
  where: { id: employeeId },
  include: {
    position: true,
    department: true,
  },
})
```

## Common Implementation Patterns

### Callback Query Handlers
Pattern used throughout the codebase:
```typescript
handler.callbackQuery(/^prefix:action:(\\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const id = Number.parseInt(ctx.match![1])
  
  // Validation
  if (!id) {
    await ctx.answerCallbackQuery('❌ خطأ')
    return
  }
  
  // Business logic
  await performAction(ctx, id)
})
```

### Inline Keyboard Building
Consistent pattern from templates.ts:
```typescript
const keyboard = new InlineKeyboard()
  .text('Option 1', 'callback:data:1')
  .text('Option 2', 'callback:data:2')
  .row()
  .text('⬅️ رجوع', 'back:action')

await ctx.editMessageText('Message', {
  parse_mode: 'Markdown',
  reply_markup: keyboard,
})
```

### Pagination Implementation
Standard pagination pattern:
```typescript
const page = 1
const limit = 8
const skip = (page - 1) * limit

const [items, total] = await Promise.all([
  Database.prisma.model.findMany({ skip, take: limit }),
  Database.prisma.model.count(),
])

return {
  items,
  total,
  page,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
}
```

### Error Handling
Comprehensive try-catch with user feedback:
```typescript
try {
  await performOperation()
  await ctx.editMessageText('✅ نجحت العملية')
} catch (error) {
  console.error('Error in operation:', error)
  await ctx.editMessageText(
    '❌ حدث خطأ\\n\\nالرجاء المحاولة مرة أخرى.',
    { reply_markup: backButton }
  )
}
```

### Validation Pattern
Input validation using valibot:
```typescript
import * as v from 'valibot'

const QuantitySchema = v.pipe(
  v.number(),
  v.minValue(0, 'الكمية يجب أن تكون أكبر من صفر'),
  v.maxValue(1000000, 'الكمية كبيرة جداً')
)

export function validateQuantity(value: string): number {
  const parsed = Number.parseFloat(value)
  return v.parse(QuantitySchema, parsed)
}
```

### Date Validation
Comprehensive date utilities (from date.validator.ts):
```typescript
// Basic validation
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime())
}

// Range validation
export function isDateInRange(date: Date, start?: Date, end?: Date): boolean {
  if (!isValidDate(date)) return false
  const dateTime = date.getTime()
  if (start && dateTime < start.getTime()) return false
  if (end && dateTime > end.getTime()) return false
  return true
}

// Business logic helpers
export function getAge(birthDate: Date): number | null {
  if (!isValidDate(birthDate)) return null
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  const monthDiff = now.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}
```

### Settings Management
Configuration pattern from default-settings.ts:
```typescript
export const settingDefinition: SettingDefinition = {
  key: 'category.setting_name',
  scope: 'global',
  category: 'category',
  type: 'string' | 'number' | 'boolean',
  defaultValue: 'value',
  description: 'وصف الإعداد',
  validation: {
    required: true,
    min: 1,
    max: 100,
    enum: ['option1', 'option2'],
  },
  isEditable: true,
  requiresRestart: false,
  group: 'group_name',
  order: 1,
}
```

## Frequently Used Code Idioms

### Arabic Number Formatting
```typescript
function formatArabicNumber(num: number): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return num.toString().split('').map((digit) => {
    if (digit === '.' || digit === '-') return digit
    const numDigit = Number.parseInt(digit, 10)
    return Number.isNaN(numDigit) ? digit : arabicNumerals[numDigit]
  }).join('')
}

function formatCurrency(amount: number): string {
  return `${formatArabicNumber(Number(amount.toFixed(2)))} جنيه`
}
```

### Date Formatting
```typescript
function formatArabicDate(date: Date): string {
  const day = formatArabicNumber(date.getDate())
  const month = formatArabicNumber(date.getMonth() + 1)
  const year = formatArabicNumber(date.getFullYear())
  return `${day}/${month}/${year}`
}
```

### Audit Logging
```typescript
await createAuditLog({
  payrollRecordId,
  action: 'CREATED',
  actionBy: BigInt(ctx.from!.id),
  newData: { netSalary, paymentStatus: 'UNPAID' },
  notes: 'تم إنشاء كشف راتب جديد',
})
```

### Notification Templates
```typescript
const template = {
  id: 'template-id',
  name: 'اسم القالب',
  message: 'مرحباً {{fullName}}! {{companyName}}',
  type: 'success' as const,
  priority: 'normal' as const,
  variables: ['fullName', 'companyName'],
}

// Variable replacement
let message = template.message
for (const [key, value] of Object.entries(variables)) {
  const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
  message = message.replace(regex, value)
}
```

## Best Practices

### Performance
- **Batch Database Queries**: Use Promise.all for parallel operations
- **Pagination**: Always paginate large datasets (default: 8 items per page)
- **Caching**: Cache frequently accessed data (settings, categories)
- **Lazy Loading**: Load features on-demand

### Security
- **Role-Based Access**: Check ctx.dbUser.role before sensitive operations
- **Input Validation**: Validate all user inputs
- **SQL Injection Prevention**: Use Prisma parameterized queries
- **BigInt for User IDs**: Store Telegram user IDs as BigInt

### User Experience
- **Loading Indicators**: Use answerCallbackQuery('⏳ جاري...')
- **Clear Feedback**: Always confirm actions with ✅ or ❌
- **Back Buttons**: Every screen should have a back button
- **Markdown Formatting**: Use bold (**text**) for emphasis

### Code Organization
- **Single Responsibility**: Each function does one thing
- **DRY Principle**: Extract common logic to utilities
- **Meaningful Names**: Functions and variables should be self-documenting
- **Small Functions**: Keep functions under 50 lines when possible

### Testing
- **Unit Tests**: Test business logic in services
- **Integration Tests**: Test database operations
- **E2E Tests**: Test critical user workflows
- **Test Coverage**: Aim for 70%+ coverage

### Documentation
- **JSDoc Comments**: Document all public functions
- **Inline Comments**: Explain complex business logic in Arabic
- **README Files**: Each major feature should have documentation
- **Type Definitions**: Use TypeScript types as documentation

## Common Pitfalls to Avoid

1. **Don't mix UI and business logic** - Keep handlers thin
2. **Don't forget error handling** - Always wrap async operations in try-catch
3. **Don't hardcode values** - Use settings or constants
4. **Don't ignore TypeScript errors** - Fix them, don't suppress
5. **Don't forget to clean up state** - Clear maps and caches after use
6. **Don't use any type** - Always provide explicit types
7. **Don't forget .js extensions** - Required for ES modules
8. **Don't skip validation** - Validate all user inputs
9. **Don't forget audit logs** - Log important operations
10. **Don't ignore Arabic formatting** - Use formatArabicNumber for display

## Development Workflow

1. **Create Feature Branch**: `feature/feature-name`
2. **Follow Structure**: Use established patterns
3. **Write Tests**: Test as you develop
4. **Run Linter**: `npm run lint`
5. **Type Check**: `npm run typecheck`
6. **Test Locally**: `npm run dev`
7. **Commit**: Clear, descriptive messages
8. **Code Review**: Before merging to main

## Useful Commands

```bash
# Development
npm run dev              # Start with hot reload
npm run dev:bot          # Bot only (no Prisma Studio)

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run db:seed          # Seed database

# Quality
npm run lint             # Check code style
npm run format           # Fix code style
npm run typecheck        # Check types
npm test                 # Run tests

# Production
npm start                # Build and start
npm run start:force      # Start without type check
```
