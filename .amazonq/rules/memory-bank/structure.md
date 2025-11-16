# Project Structure - Al-Saada ERP Telegram Bot

## Root Directory Organization

```
telegram-bot-template-main/
├── src/                    # Application source code
├── prisma/                 # Database schema and migrations
├── docs/                   # English documentation
├── Documentation/          # Legacy documentation
├── Documentation_Pro/      # Arabic documentation (comprehensive)
├── examples/               # Usage examples for modules
├── tests/                  # Test suites
├── scripts/                # Utility and maintenance scripts
├── locales/                # Internationalization files
├── uploads/                # File storage directory
└── generated/              # Auto-generated Prisma client
```

## Source Code Structure (`src/`)

### Bot Layer (`src/bot/`)
Core Telegram bot implementation using grammY framework.

```
bot/
├── features/              # Feature modules (main business logic)
│   ├── hr-management/     # Human resources features
│   ├── inventory-management/  # Warehouse and stock features
│   ├── admin-panel/       # Administrative features
│   ├── notifications-panel/   # Notification management
│   └── user-profile/      # User settings and profile
├── handlers/              # Generic message/callback handlers
├── helpers/               # Bot utility functions
├── middlewares/           # Bot-level middleware (auth, logging)
├── context.ts             # Extended context type definition
└── index.ts               # Bot initialization and setup
```

### Modules Layer (`src/modules/`)
Reusable business logic and infrastructure services.

```
modules/
├── analytics/             # Analytics and metrics tracking
├── company/               # Company and branch management
├── database/              # Database connection and utilities
├── input/                 # Input validation and parsing
│   └── validators/        # Valibot-based validators
├── interaction/           # User interaction utilities
│   ├── data-tables/       # Paginated table displays
│   ├── forms/             # Multi-step form builder
│   └── keyboards/         # Inline keyboard builders
├── notifications/         # Notification system
├── permissions/           # Role-based access control
├── reports/               # Report generation (Excel, PDF)
├── schedulers/            # Cron job scheduling
├── services/              # Business service layer
│   └── inventory/         # Inventory shared services
│       ├── shared/        # Cross-warehouse services
│       └── oils-greases/  # Warehouse-specific services
├── settings/              # System settings management
├── ui/                    # UI components and formatters
└── utils/                 # General utility functions
```

### Server Layer (`src/server/`)
HTTP server for webhooks and health checks.

```
server/
├── middlewares/           # Server middleware
├── environment.ts         # Server configuration
└── index.ts               # Hono server setup
```

## Feature Module Architecture

Each feature follows a consistent structure:

```
feature-name/
├── handlers/              # User interaction handlers
│   ├── subfolder/         # Grouped by functionality
│   │   ├── handler.ts     # Conversation flow logic
│   │   └── service.ts     # Business logic and DB operations
│   └── index.ts           # Handler registration
├── keyboards/             # Feature-specific keyboards
├── utils/                 # Feature utilities
└── index.ts               # Feature composer setup
```

### Example: HR Management Structure

```
hr-management/
├── handlers/
│   ├── employees/         # Employee CRUD operations
│   │   ├── add-employee/
│   │   ├── edit-employee/
│   │   ├── list-employees/
│   │   └── view-employee/
│   ├── leaves/            # Leave management
│   │   ├── request-leave/
│   │   ├── approve-leave/
│   │   └── leave-reports/
│   ├── payroll/           # Payroll operations
│   │   ├── calculate-payroll/
│   │   ├── payroll-reports/
│   │   └── monthly-payroll/
│   └── departments/       # Department management
├── keyboards/
│   ├── employee-keyboards.ts
│   └── payroll-keyboards.ts
└── index.ts
```

## Database Layer (`prisma/`)

```
prisma/
├── schema.prisma          # Main database schema
├── migrations/            # Migration history (50+ migrations)
├── seeds/                 # Seed data scripts
└── schemas/               # Modular schema files
```

### Schema Organization
- **User & Auth**: User, Role, Permission, JoinRequest
- **Company**: Company, Branch, Project, Department, Position
- **HR**: Employee, Leave, Mission, Penalty, Suspension
- **Payroll**: PayrollRecord, Allowance, Deduction, Bonus
- **Inventory**: Items, Transactions, Categories, Locations
- **Financial**: FinancialTransaction, Advance, Withdrawal
- **System**: Settings, NotificationTemplate, Analytics

## Documentation Structure

### Arabic Documentation (`Documentation_Pro/`)
Comprehensive Arabic documentation organized by topic:

```
Documentation_Pro/
├── 00_فهرس_رئيسي/         # Main index
├── 01_نظرة_عامة/          # Overview
├── 10_دليل_المطور/        # Developer guide
├── 20_دليل_المستخدم/      # User guide
├── 30_التشغيل/            # Operations
├── 40_قواعد_البيانات/     # Database documentation
├── 50_أدلة_عملية/         # Practical guides
├── 60_واجهات_المستخدم/    # UI documentation
├── 70_أدلة_التصميم/       # Design guidelines
├── 80_أمثلة_وتدفقات/      # Examples and flows
├── 90_وحدات_جاهزة/        # Ready modules
└── 99_تقييم_وتحليل/       # Analysis and evaluation
```

### English Documentation (`docs/`)
Technical documentation for developers:
- Getting started guides
- API reference
- Module documentation
- Testing guides
- Deployment instructions

## Architectural Patterns

### Layered Architecture
1. **Presentation Layer**: Bot handlers and UI
2. **Business Logic Layer**: Services and validators
3. **Data Access Layer**: Prisma ORM
4. **Infrastructure Layer**: Utilities and modules

### Feature-Based Organization
- Each feature is self-contained
- Features communicate through shared services
- Clear separation of concerns
- Easy to add/remove features

### Service Layer Pattern
- Business logic extracted to services
- Handlers remain thin (orchestration only)
- Services are reusable across features
- Shared services prevent code duplication

### Repository Pattern (via Prisma)
- Database access abstracted through Prisma
- Type-safe queries
- Migration management
- Seed data support

## Key Design Decisions

### Modular Structure
- Features are independent composers
- Shared functionality in modules
- Easy to scale and maintain

### TypeScript Throughout
- Full type safety
- Better IDE support
- Reduced runtime errors

### Conversation-Based UI
- Multi-step forms using grammY conversations
- State management in session
- Clear user flows

### Database-First Design
- Schema-driven development
- Migrations for version control
- Type generation from schema

### Comprehensive Testing
- Unit tests for business logic
- Integration tests for workflows
- E2E tests for critical paths
- Performance tests for optimization

## File Naming Conventions

- **Handlers**: `feature-name.handler.ts`
- **Services**: `feature-name.service.ts`
- **Keyboards**: `feature-name-keyboards.ts`
- **Validators**: `field-name.validator.ts`
- **Types**: `feature-name.types.ts`
- **Tests**: `feature-name.test.ts`

## Import Aliases

The project uses `#root/*` alias for clean imports:
```typescript
import { Database } from '#root/modules/database/index.js'
import { Context } from '#root/bot/context.js'
```

## Configuration Management

- Environment variables in `.env`
- Config validation in `src/config.ts`
- Settings stored in database
- Feature flags for gradual rollout
