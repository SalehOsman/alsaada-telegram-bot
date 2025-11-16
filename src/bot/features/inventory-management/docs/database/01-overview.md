# 📊 نظرة عامة - قاعدة بيانات المخازن

## الهيكل العام

**17 جدول** موزعة على 3 فئات:

### الجداول المشتركة (3)
- INV_StorageLocation
- INV_InventoryAudit  
- INV_ItemHistory

### قطع الغيار (10)
- INV_EquipmentCategory
- INV_SparePart
- INV_SparePartTransaction
- INV_SparePartUsage
- INV_StockAlert
- INV_DamageRecord
- INV_InventoryAuditItem

### الزيوت والشحوم (7)
- INV_OilsGreasesCategory
- INV_OilsGreasesItem
- INV_OilsGreasesPurchase
- INV_OilsGreasesIssuance
- INV_OilsGreasesTransfer
- INV_OilsGreasesReturn
- INV_OilsGreasesAdjustment

## الإحصائيات
- **إجمالي الحقول:** 294 حقل
- **العلاقات:** 45+ علاقة
- **الفهارس:** 120+ فهرس
