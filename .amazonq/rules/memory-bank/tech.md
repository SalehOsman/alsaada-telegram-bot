# Technology Stack - Al-Saada ERP Telegram Bot

## Core Technologies

### Runtime & Language
- **Node.js**: >=20.0.0 (ES Modules)
- **TypeScript**: 5.7.3 (strict mode enabled)
- **Package Manager**: npm >=8.0.0

### Bot Framework
- **grammY**: 1.35.0 - Modern Telegram bot framework
  - Type-safe API wrapper
  - Middleware system
  - Plugin ecosystem
  - Conversation management

### Database
- **Prisma ORM**: 6.17.1
  - Type-safe database client
  - Migration management
  - Schema-first development
  - SQLite (development) / PostgreSQL (production-ready)

### Web Server
- **Hono**: 4.10.0 - Ultrafast web framework
  - Multi-runtime support
  - Minimal overhead
  - Webhook handling

## grammY Plugins & Extensions

### Official Plugins
- **@grammyjs/conversations**: 2.1.0 - Multi-step conversation flows
- **@grammyjs/auto-chat-action**: 0.1.1 - Automatic typing indicators
- **@grammyjs/commands**: 1.0.5 - Command handling
- **@grammyjs/hydrate**: 1.4.1 - Context hydration
- **@grammyjs/i18n**: 1.1.2 - Internationalization
- **@grammyjs/parse-mode**: 1.11.1 - Message formatting
- **@grammyjs/runner**: 2.0.3 - Long polling runner
- **@grammyjs/types**: 3.19.0 - TypeScript types

### Custom Extensions
- **callback-data**: 1.1.1 - Type-safe callback data builder

## Validation & Data Processing

### Validation
- **valibot**: 0.42.1 - Schema validation library
  - Type-safe validation
  - Minimal bundle size
  - Custom validators for Arabic text, dates, numbers

### Data Formats
- **iso-639-1**: 3.1.5 - Language code handling

## File Processing

### Images
- **sharp**: 0.34.4 - High-performance image processing
- **jimp**: 1.6.0 - JavaScript image manipulation
- **@types/sharp**: 0.31.1

### Barcodes & QR Codes
- **@zxing/library**: 0.21.3 - Barcode scanning
- **@zxing/browser**: 0.1.5 - Browser barcode scanning
- **qrcode-reader**: 1.0.4 - QR code reading

### Spreadsheets
- **exceljs**: 4.4.0 - Excel file generation
- **xlsx**: 0.18.5 - Excel file parsing

## Scheduling & Background Jobs

- **node-cron**: 4.2.1 - Cron job scheduling
- **@types/node-cron**: 3.0.11

## AI & Language Processing (Optional)

- **langchain**: 1.0.3 - LLM framework
- **@langchain/community**: 1.0.0 - Community integrations
- **@langchain/ollama**: 1.0.0 - Local LLM support

## Logging & Monitoring

- **pino**: 9.13.1 - Fast JSON logger
- **pino-pretty**: 13.0.0 - Pretty log formatting

## Development Tools

### Build & Compilation
- **typescript**: 5.7.3 - TypeScript compiler
- **tsx**: 4.19.3 - TypeScript execution
- **tsc-watch**: 6.2.1 - TypeScript watch mode

### Testing
- **jest**: 30.2.0 - Testing framework
- **ts-jest**: 29.4.5 - TypeScript Jest transformer
- **@types/jest**: 30.0.0

### Code Quality
- **eslint**: 9.20.1 - Linting
- **@antfu/eslint-config**: 4.3.0 - ESLint configuration
- **husky**: 9.1.7 - Git hooks
- **lint-staged**: 15.4.3 - Staged file linting

### Development Workflow
- **concurrently**: 9.1.2 - Run multiple commands
- **@hono/node-server**: 1.13.8 - Node.js server adapter

## Database Technology

### Prisma Configuration
```json
{
  "seed": "tsx ./prisma/seed.ts"
}
```

### Migration System
- 50+ migrations tracking schema evolution
- Automated migration generation
- Rollback support
- Seed data management

## Development Commands

### Core Commands
```bash
# Development
npm run dev              # Start bot + Prisma Studio
npm run dev:bot          # Start bot only (watch mode)

# Production
npm start                # Build and start
npm start:force          # Start without type checking

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations (dev)
npm run prisma:migrate:prod  # Deploy migrations (prod)
npm run prisma:studio    # Open Prisma Studio
npm run db:push          # Push schema changes
npm run db:seed          # Seed database

# Code Quality
npm run lint             # Lint code
npm run format           # Format code
npm run typecheck        # Type checking
npm run build            # Build TypeScript

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:performance # Performance tests
```

### Custom Scripts
```bash
# Seeding
npm run seed:branches-projects
npm run seed:notification-templates
npm run add:more-data

# Utilities
npm run test:cache-timeout
npm run migrate:join-request-data
npm run test:runner
```

## Environment Configuration

### Required Variables
- `BOT_TOKEN` - Telegram bot token
- `BOT_MODE` - polling | webhook
- `DATABASE_URL` - Database connection string

### Optional Variables
- `LOG_LEVEL` - Logging level (default: info)
- `DEBUG` - Debug mode flag
- `BOT_WEBHOOK` - Webhook URL (webhook mode)
- `BOT_WEBHOOK_SECRET` - Webhook secret
- `SERVER_HOST` - Server hostname (default: 0.0.0.0)
- `SERVER_PORT` - Server port (default: 80)
- `BOT_ALLOWED_UPDATES` - Update types array
- `BOT_ADMINS` - Admin user IDs array

## Type System

### Custom Types
- Extended Context with session and user data
- Prisma-generated database types
- Feature-specific type definitions
- Validator schemas as types

### Type Safety Features
- Strict TypeScript configuration
- No implicit any
- Strict null checks
- Full type inference

## Build Configuration

### TypeScript Config
- ES2022 target
- ESNext module
- Strict mode enabled
- Path aliases (#root/*)
- Source maps for debugging

### Module System
- ES Modules throughout
- .js extensions in imports
- Top-level await support

## Performance Optimizations

### Database
- Connection pooling
- Query optimization
- Indexed fields
- Efficient relations

### Bot
- Conversation state management
- Callback data compression
- Lazy loading of features
- Efficient middleware chain

### File Processing
- Sharp for fast image processing
- Streaming for large files
- Temporary file cleanup

## Security Measures

- Environment variable validation
- Input sanitization (valibot)
- SQL injection prevention (Prisma)
- Role-based access control
- Secure file uploads
- Webhook secret verification

## Deployment Support

### Docker
- Dockerfile ready
- Docker Compose configuration
- Multi-stage builds

### Vercel
- Serverless deployment support
- Webhook mode configuration

### Traditional Hosting
- PM2 process management
- Systemd service files
- Nginx reverse proxy

## Monitoring & Debugging

- Structured JSON logging (pino)
- Error tracking and reporting
- Performance metrics
- Database query logging
- Request/response logging

## Future-Ready

- PostgreSQL migration path
- Redis caching support
- Message queue integration
- Microservices architecture
- Horizontal scaling capability
