# Testing Strategy - Al-Saada ERP Telegram Bot

## Overview

This document outlines the testing strategy for the inventory management system, specifically for the Oils-Greases warehouse module.

---

## Testing Approach

### Two-Phase Strategy

#### Phase 1: Manual Testing (Current)
- **Duration**: 30-45 minutes
- **Tools**: Telegram Bot + Prisma Studio
- **Coverage**: All 16 functions
- **Purpose**: 
  - Validate user experience
  - Test UI/UX flow
  - Verify data integrity
  - Identify obvious bugs

#### Phase 2: Automated Testing (Future)
- **Duration**: 2-3 hours setup
- **Tools**: Jest + Supertest
- **Coverage**: Services + Validators
- **Purpose**:
  - Regression prevention
  - CI/CD integration
  - Refactoring safety
  - Documentation

---

## Manual Testing Checklist

### Scope: 16 Functions

1. **Transactions** (5)
   - Purchase
   - Issue
   - Transfer
   - Return
   - Adjust

2. **Items Management** (5)
   - Add Item
   - List Items
   - Edit Item
   - Search Item
   - View Item

3. **Reports** (4)
   - Alerts
   - Export
   - Summary
   - Value

4. **Settings** (2)
   - Categories
   - Locations

---

## Test Scenarios

### For Each Function:

#### ✅ Happy Path
- Normal flow with valid inputs
- Expected behavior verification
- Data integrity check

#### ❌ Error Cases
- Invalid inputs
- Edge conditions
- Error message validation

#### 🔄 Edge Cases
- Boundary values
- Empty states
- Maximum limits

---

## Success Criteria

### ✅ Test Passes If:
1. Function works as expected
2. Data is correct in database
3. Messages are clear in Arabic
4. No errors in console
5. UI is responsive

### ❌ Test Fails If:
1. Unexpected error occurs
2. Data is incorrect
3. Error message is unclear
4. UI is broken
5. Performance is poor (> 3 seconds)

---

## Testing Tools

### 1. Telegram Bot
- Production bot instance
- Test user account

### 2. Prisma Studio
```bash
npm run prisma:studio
```
- Real-time database monitoring
- Data verification

### 3. Browser Console
- Error monitoring
- Network inspection

### 4. Documentation
- Checklist tracking
- Results documentation

---

## Test Documentation Template

```markdown
## [Function Name]

### Test Info
- Date: YYYY-MM-DD HH:MM
- Tester: [Name]
- Status: PASS/FAIL

### Happy Path
- ✅/❌ Status
- 📊 Before/After values
- ⏱️ Response time
- 📝 Notes

### Error Cases
- ✅/❌ Test results

### Edge Cases
- ✅/❌ Test results

### Issues Found
- List of issues

### Screenshots
- [Optional] Evidence
```

---

## Automated Testing (Future)

### Jest Test Structure

```typescript
// tests/integration/oils-greases/purchase.test.ts
describe('Purchase Service', () => {
  beforeAll(async () => {
    await Database.connect()
  })

  afterAll(async () => {
    await Database.disconnect()
  })

  it('should increase quantity on purchase', async () => {
    // Arrange
    const itemId = 1
    const initialItem = await getItem(itemId)
    const quantityToAdd = 50

    // Act
    await PurchaseService.createPurchase({
      itemId,
      quantity: quantityToAdd,
      unitPrice: 100,
      userId: BigInt(123)
    })

    // Assert
    const updatedItem = await getItem(itemId)
    expect(updatedItem.quantity).toBe(
      initialItem.quantity + quantityToAdd
    )
  })

  it('should reject negative quantity', async () => {
    await expect(
      PurchaseService.createPurchase({
        itemId: 1,
        quantity: -10,
        unitPrice: 100,
        userId: BigInt(123)
      })
    ).rejects.toThrow()
  })
})
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- purchase.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## CI/CD Integration (Future)

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

## Test Coverage Goals

### Current (Manual)
- **Coverage**: 100% of features
- **Depth**: User flow validation
- **Speed**: Fast (30-45 min)

### Future (Automated)
- **Coverage**: 70%+ code coverage
- **Depth**: Unit + Integration
- **Speed**: < 5 minutes

---

## Best Practices

### Manual Testing
1. ✅ Follow checklist systematically
2. ✅ Document all findings
3. ✅ Test in production-like environment
4. ✅ Verify database changes
5. ✅ Take screenshots for issues

### Automated Testing
1. ✅ Test business logic, not UI
2. ✅ Use descriptive test names
3. ✅ Keep tests independent
4. ✅ Mock external dependencies
5. ✅ Maintain test data fixtures

---

## Common Issues & Solutions

### Issue: Test data pollution
**Solution**: Use transactions and rollback
```typescript
beforeEach(async () => {
  await Database.prisma.$executeRaw`BEGIN`
})

afterEach(async () => {
  await Database.prisma.$executeRaw`ROLLBACK`
})
```

### Issue: Async timing issues
**Solution**: Use proper async/await
```typescript
// ❌ Bad
it('should work', () => {
  someAsyncFunction()
  expect(result).toBe(expected)
})

// ✅ Good
it('should work', async () => {
  await someAsyncFunction()
  expect(result).toBe(expected)
})
```

### Issue: Flaky tests
**Solution**: Avoid time-dependent tests
```typescript
// ❌ Bad
expect(item.createdAt).toBe(new Date())

// ✅ Good
expect(item.createdAt).toBeInstanceOf(Date)
expect(item.createdAt.getTime()).toBeCloseTo(
  Date.now(), 
  -3 // within 1 second
)
```

---

## Testing Workflow

### Current Workflow
```
1. Manual Testing
   ↓
2. Document Results
   ↓
3. Fix Issues
   ↓
4. Re-test
   ↓
5. Deploy
```

### Future Workflow
```
1. Write Code
   ↓
2. Write Tests
   ↓
3. Run Tests Locally
   ↓
4. Commit & Push
   ↓
5. CI/CD Runs Tests
   ↓
6. Deploy if Pass
```

---

## Resources

### Documentation
- Testing Plan: `src/bot/features/inventory-management/docs/testing-plan.md`
- Test Results: `src/bot/features/inventory-management/docs/test-results.md`

### Tools
- Jest: https://jestjs.io/
- Supertest: https://github.com/visionmedia/supertest
- Prisma Testing: https://www.prisma.io/docs/guides/testing

### Examples
- Test examples: `tests/` directory
- Mock helpers: `tests/helpers/`

---

## Next Steps

### Immediate (This Week)
1. ✅ Complete manual testing
2. ✅ Document all results
3. ✅ Fix critical issues

### Short-term (Next Week)
4. ⏳ Write Jest tests for Services
5. ⏳ Setup CI/CD pipeline
6. ⏳ Achieve 70% coverage

### Long-term (Next Month)
7. ⏳ E2E tests with Playwright
8. ⏳ Performance testing with K6
9. ⏳ Visual regression testing

---

**Last Updated**: 2025-01-17
**Status**: Manual testing in progress
**Next Review**: After Spare-Parts implementation
