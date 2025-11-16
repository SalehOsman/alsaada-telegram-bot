# 📚 مرجع API - مختصر وسريع

> **مرجع سريع لجميع الوظائف المتاحة**

---

## 🛠️ Utils (15 أداة)

```typescript
// 1. arabic-formatter.util.ts
toArabicNumerals(1234) // "١٢٣٤"
formatArabicCurrency(5000) // "٥٬٠٠٠٫٠٠ جنيه"
formatArabicDate(new Date()) // "١٧ يناير ٢٠٢٥"

// 2. pagination.util.ts
buildPaginationButtons({ currentPage: 2, totalPages: 5, callbackPrefix: 'items:list' })
calculatePagination(2, 8, 50)

// 3. keyboard-builder.util.ts
buildItemsKeyboard(items, 'item:select')
buildConfirmKeyboard('confirm', 'cancel')

// 4. message-builder.util.ts
buildItemDetailsMessage({ name, code, quantity, price })
buildSuccessMessage('تمت العملية')

// 5. session-manager.util.ts
initInventorySession(ctx, 'purchase', 'oils-greases', 'step1')
getSessionData(ctx)
clearInventorySession(ctx)

// 6. input-validator.util.ts
validateQuantity(text, { min: 1, max: 10000 })
validatePrice(text)

// 7. error-handler.util.ts
handleError(ctx, error, 'operationName')

// 8. loading-indicator.util.ts
showLoading(ctx, LoadingMessages.PROCESSING)

// 9. confirmation-dialog.util.ts
showConfirmDialog(ctx, { title, message, confirmCallback, cancelCallback })

// 10. cache-helper.util.ts
categoriesCache.set('oils-greases', data, 300000)
categoriesCache.get('oils-greases')

// 11-15. باقي Utils
search-helper, notification-helper, callback-parser, excel-helper, transaction-summary
```

---

## 🔧 Services (12 خدمة)

### Shared Services (6)

```typescript
// 1. InventoryItemsService
await InventoryItemsService.getItems('oils-greases', page, limit, filters)
await InventoryItemsService.searchItems('oils-greases', query, 'name')
await InventoryItemsService.getItemById('oils-greases', id)

// 2. TransactionNumberService
await TransactionNumberService.generate('PUR-OILS', model)

// 3. StorageLocationsService
await StorageLocationsService.getLocations()
await StorageLocationsService.createLocation(data, userId)

// 4. ExcelExportService
await ExcelExportService.exportItems('oils-greases', items, filters)

// 5. CategoryService
await CategoryService.getCategories('oils-greases')
await CategoryService.createCategory('oils-greases', data, userId)

// 6. ReportsService
await ReportsService.getLowStockItems('oils-greases', threshold)
await ReportsService.getInventorySummary('oils-greases')
```

### Warehouse Services (6)

```typescript
// 1. OilsGreasesItemsService
await OilsGreasesItemsService.generateCode(categoryId)
await OilsGreasesItemsService.createItem(data, userId)

// 2-6. Transaction Services
await OilsGreasesPurchaseService.createPurchase(data)
await OilsGreasesIssueService.createIssue(data)
await OilsGreasesTransferService.createTransfer(data)
await OilsGreasesReturnService.createReturn(data)
await OilsGreasesAdjustService.createAdjustment(data)
```

---

## 📦 أنواع البيانات

```typescript
interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface ValidationResult {
  valid: boolean
  value?: any
  error?: string
}
```

---

**للتفاصيل الكاملة**: راجع [COMPLETE-GUIDE.md](COMPLETE-GUIDE.md)

**آخر تحديث**: 2025-01-17
