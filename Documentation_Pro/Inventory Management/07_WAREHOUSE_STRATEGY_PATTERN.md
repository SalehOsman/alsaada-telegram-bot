# 🎯 حل متوازن: معالجة مختلفة + واجهة موحدة

## ❓ السؤال

**ماذا لو كانت المعالجة مختلفة لكل مخزن؟**
- قطع الغيار: يحتاج تتبع بالقطع + ربط بالمعدات
- السولار: يحتاج تتبع باللترات + عرض مستوى التانك
- الزيوت: يحتاج تتبع بالجالونات + تاريخ انتهاء الصلاحية
- الأدوات: يحتاج تتبع بالقطع + إدارة العهد

**وواجهة المستخدم: هل سنستخدم واجهة واحدة أم واجهة لكل مخزن بوظيفة منفصلة؟**

---

## ✅ الحل المقترح: Strategy Pattern + واجهة موحدة قابلة للتخصيص

### المبدأ:
- **Handler موحد** (واجهة واحدة)
- **استراتيجيات مختلفة** (معالجة مختلفة حسب النوع)
- **تخصيص الواجهة** (عرض مختلف حسب النوع)

---

## 🏗️ التصميم المقترح

### 1. Handler موحد (واجهة واحدة)

```typescript
// handlers/warehouses.handler.ts
warehousesHandler.callbackQuery(/^inv:warehouse:(\d+)$/, async (ctx) => {
  const warehouseId = parseInt(ctx.match[1]);
  
  // جلب المخزن
  const warehouse = await Database.prisma.warehouse.findUnique({
    where: { id: warehouseId },
  });
  
  // استخدام الاستراتيجية المناسبة
  const strategy = WarehouseStrategyFactory.getStrategy(warehouse.type);
  
  // عرض القائمة (موحدة لكن قابلة للتخصيص)
  await strategy.showWarehouseMenu(ctx, warehouse);
});
```

### 2. استراتيجيات مختلفة (Strategy Pattern)

```typescript
// services/warehouse-strategies/base-warehouse-strategy.ts
export abstract class BaseWarehouseStrategy {
  abstract showWarehouseMenu(ctx: Context, warehouse: Warehouse): Promise<void>;
  abstract handleReceiving(ctx: Context, warehouse: Warehouse): Promise<void>;
  abstract handleDispensing(ctx: Context, warehouse: Warehouse): Promise<void>;
  abstract getStockDisplay(stock: Stock): string;
}

// services/warehouse-strategies/spare-parts-strategy.ts
export class SparePartsStrategy extends BaseWarehouseStrategy {
  async showWarehouseMenu(ctx: Context, warehouse: Warehouse) {
    // واجهة مخصصة لقطع الغيار
    const keyboard = new InlineKeyboard()
      .text('📋 عرض الأصناف', `inv:warehouse:${warehouse.id}:items`)
      .row()
      .text('📥 استلام مشتريات', `inv:warehouse:${warehouse.id}:receive`)
      .row()
      .text('🔧 صرف للمعدات', `inv:warehouse:${warehouse.id}:dispense:equipment`)
      .row()
      .text('📊 تقرير الاستهلاك', `inv:warehouse:${warehouse.id}:consumption-report`)
      .row()
      .text('⬅️ رجوع', 'menu:feature:inventory-management');
    
    await ctx.editMessageText(
      `⚙️ **${warehouse.name}**\n\n` +
      `📦 نوع المخزن: قطع الغيار\n\n` +
      `🔧 **ميزات خاصة:**\n` +
      `• ربط مباشر بالمعدات\n` +
      `• تتبع استهلاك كل معدة\n` +
      `• تقارير الصيانة`,
      { reply_markup: keyboard, parse_mode: 'Markdown' }
    );
  }
  
  async handleDispensing(ctx: Context, warehouse: Warehouse) {
    // منطق خاص بقطع الغيار:
    // 1. اختيار المعدة (إلزامي)
    // 2. اختيار الصنف
    // 3. ربط بالصيانة
    // ...
  }
  
  getStockDisplay(stock: Stock): string {
    return `${stock.item.name}\n` +
           `الكمية: ${stock.quantity} قطعة\n` +
           `التكلفة: ${stock.averageCost} جنيه\n` +
           `المعدات المستخدمة: ${stock.equipmentCount}`;
  }
}

// services/warehouse-strategies/diesel-strategy.ts
export class DieselStrategy extends BaseWarehouseStrategy {
  async showWarehouseMenu(ctx: Context, warehouse: Warehouse) {
    // واجهة مخصصة للسولار
    const tankLevel = await this.getTankLevel(warehouse.id);
    
    const keyboard = new InlineKeyboard()
      .text('⛽ عرض مستوى التانك', `inv:warehouse:${warehouse.id}:tank-level`)
      .row()
      .text('📥 استلام شحنة', `inv:warehouse:${warehouse.id}:receive`)
      .row()
      .text('🚛 صرف للمعدات', `inv:warehouse:${warehouse.id}:dispense:equipment`)
      .row()
      .text('📊 تقرير الاستهلاك', `inv:warehouse:${warehouse.id}:consumption-report`)
      .row()
      .text('⬅️ رجوع', 'menu:feature:inventory-management');
    
    await ctx.editMessageText(
      `⛽ **${warehouse.name}**\n\n` +
      `📦 نوع المخزن: السولار\n\n` +
      `⛽ **مستوى التانك:**\n` +
      `• الحالي: ${tankLevel.current} لتر\n` +
      `• السعة: ${tankLevel.capacity} لتر\n` +
      `• النسبة: ${tankLevel.percentage}%\n\n` +
      `🚛 **ميزات خاصة:**\n` +
      `• تتبع باللترات\n` +
      `• تنبيهات عند انخفاض المستوى\n` +
      `• ربط مباشر بالمعدات`,
      { reply_markup: keyboard, parse_mode: 'Markdown' }
    );
  }
  
  async handleDispensing(ctx: Context, warehouse: Warehouse) {
    // منطق خاص بالسولار:
    // 1. اختيار المعدة (إلزامي)
    // 2. إدخال الكمية باللترات
    // 3. التحقق من مستوى التانك
    // 4. ربط بالاستهلاك
    // ...
  }
  
  getStockDisplay(stock: Stock): string {
    return `${stock.item.name}\n` +
           `الكمية: ${stock.quantity} لتر\n` +
           `التكلفة: ${stock.averageCost} جنيه/لتر\n` +
           `مستوى التانك: ${this.calculateTankPercentage(stock.quantity)}%`;
  }
  
  private async getTankLevel(warehouseId: number) {
    // جلب مستوى التانك من قاعدة البيانات
    // ...
  }
}

// services/warehouse-strategies/oils-greases-strategy.ts
export class OilsGreasesStrategy extends BaseWarehouseStrategy {
  async showWarehouseMenu(ctx: Context, warehouse: Warehouse) {
    // واجهة مخصصة للزيوت
    const keyboard = new InlineKeyboard()
      .text('📋 عرض الأصناف', `inv:warehouse:${warehouse.id}:items`)
      .row()
      .text('📥 استلام مشتريات', `inv:warehouse:${warehouse.id}:receive`)
      .row()
      .text('🔧 صرف للمعدات', `inv:warehouse:${warehouse.id}:dispense:equipment`)
      .row()
      .text('⚠️ تنبيهات انتهاء الصلاحية', `inv:warehouse:${warehouse.id}:expiry-alerts`)
      .row()
      .text('⬅️ رجوع', 'menu:feature:inventory-management');
    
    await ctx.editMessageText(
      `🛢️ **${warehouse.name}**\n\n` +
      `📦 نوع المخزن: الزيوت والشحوم\n\n` +
      `🛢️ **ميزات خاصة:**\n` +
      `• تتبع بالجالونات/اللترات\n` +
      `• تتبع تاريخ انتهاء الصلاحية\n` +
      `• تنبيهات قبل انتهاء الصلاحية\n` +
      `• ربط بالمعدات`,
      { reply_markup: keyboard, parse_mode: 'Markdown' }
    );
  }
  
  async handleDispensing(ctx: Context, warehouse: Warehouse) {
    // منطق خاص بالزيوت:
    // 1. اختيار الصنف
    // 2. التحقق من تاريخ الصلاحية
    // 3. إدخال الكمية
    // 4. ربط بالمعدة
    // ...
  }
  
  getStockDisplay(stock: Stock): string {
    const expiryDate = stock.item.expiryDate;
    const daysUntilExpiry = expiryDate 
      ? Math.floor((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    return `${stock.item.name}\n` +
           `الكمية: ${stock.quantity} ${stock.item.unit}\n` +
           `التكلفة: ${stock.averageCost} جنيه\n` +
           (expiryDate 
             ? `⏰ انتهاء الصلاحية: ${expiryDate.toLocaleDateString('ar')} (${daysUntilExpiry} يوم)`
             : '');
  }
}

// services/warehouse-strategies/tools-equipment-strategy.ts
export class ToolsEquipmentStrategy extends BaseWarehouseStrategy {
  async showWarehouseMenu(ctx: Context, warehouse: Warehouse) {
    // واجهة مخصصة للأدوات
    const keyboard = new InlineKeyboard()
      .text('📋 عرض الأصناف', `inv:warehouse:${warehouse.id}:items`)
      .row()
      .text('📥 استلام مشتريات', `inv:warehouse:${warehouse.id}:receive`)
      .row()
      .text('🔐 صرف عهدة', `inv:warehouse:${warehouse.id}:custody:issue`)
      .row()
      .text('↩️ إرجاع عهدة', `inv:warehouse:${warehouse.id}:custody:return`)
      .row()
      .text('📊 تقرير العهد', `inv:warehouse:${warehouse.id}:custody-report`)
      .row()
      .text('⬅️ رجوع', 'menu:feature:inventory-management');
    
    await ctx.editMessageText(
      `🛠️ **${warehouse.name}**\n\n` +
      `📦 نوع المخزن: العدد والأدوات\n\n` +
      `🔐 **ميزات خاصة:**\n` +
      `• إدارة العهد للموظفين\n` +
      `• تتبع الأدوات المسلمة\n` +
      `• ربط بالرواتب (عند الفقدان)\n` +
      `• تقارير العهد`,
      { reply_markup: keyboard, parse_mode: 'Markdown' }
    );
  }
  
  async handleDispensing(ctx: Context, warehouse: Warehouse) {
    // منطق خاص بالأدوات:
    // 1. اختيار الصنف
    // 2. اختيار الموظف (إلزامي للعهدة)
    // 3. تسجيل العهدة
    // 4. ربط بنظام HR
    // ...
  }
  
  getStockDisplay(stock: Stock): string {
    const custodyCount = stock.custodyCount || 0;
    return `${stock.item.name}\n` +
           `الكمية المتاحة: ${stock.quantity} قطعة\n` +
           `في العهد: ${custodyCount} قطعة\n` +
           `التكلفة: ${stock.averageCost} جنيه`;
  }
}
```

### 3. Factory Pattern (اختيار الاستراتيجية)

```typescript
// services/warehouse-strategies/warehouse-strategy-factory.ts
export class WarehouseStrategyFactory {
  private static strategies: Map<WarehouseType, BaseWarehouseStrategy> = new Map([
    [WarehouseType.SPARE_PARTS, new SparePartsStrategy()],
    [WarehouseType.DIESEL, new DieselStrategy()],
    [WarehouseType.OILS_GREASES, new OilsGreasesStrategy()],
    [WarehouseType.TOOLS, new ToolsEquipmentStrategy()],
  ]);
  
  static getStrategy(type: WarehouseType): BaseWarehouseStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new Error(`No strategy found for warehouse type: ${type}`);
    }
    return strategy;
  }
}
```

---

## 📊 المقارنة: الوضع الحالي vs المقترح

| الجانب | الوضع الحالي | المقترح |
|--------|--------------|---------|
| **عدد Handlers** | 4 handlers منفصلة | 1 handler موحد |
| **الواجهة** | 4 واجهات منفصلة | واجهة موحدة قابلة للتخصيص |
| **المعالجة** | منطق مكرر | استراتيجيات منفصلة |
| **إضافة مخزن جديد** | كتابة handler جديد | إضافة استراتيجية جديدة |
| **الصيانة** | تعديل 4 ملفات | تعديل استراتيجية واحدة |
| **المرونة** | ❌ محدودة | ✅ عالية |

---

## 🎯 مثال عملي: عرض قائمة الأصناف

### الوضع الحالي (مشكلة):

```typescript
// handlers/spare-parts.handler.ts
sparePartsHandler.callbackQuery('inv:spare_parts:items', async (ctx) => {
  const items = await getItemsForSpareParts();
  // عرض بسيط...
});

// handlers/diesel.handler.ts
dieselHandler.callbackQuery('inv:diesel:items', async (ctx) => {
  const items = await getItemsForDiesel();
  // عرض بسيط... (نفس الكود!)
});
```

### الوضع المقترح (حل):

```typescript
// handlers/warehouses.handler.ts
warehousesHandler.callbackQuery(/^inv:warehouse:(\d+):items$/, async (ctx) => {
  const warehouseId = parseInt(ctx.match[1]);
  
  const warehouse = await Database.prisma.warehouse.findUnique({
    where: { id: warehouseId },
    include: { stocks: { include: { item: true } } },
  });
  
  // استخدام الاستراتيجية المناسبة
  const strategy = WarehouseStrategyFactory.getStrategy(warehouse.type);
  
  // عرض مخصص حسب النوع
  let message = `📋 **${warehouse.name}**\n\n`;
  
  for (const stock of warehouse.stocks) {
    message += strategy.getStockDisplay(stock) + '\n\n';
  }
  
  await ctx.editMessageText(message, { parse_mode: 'Markdown' });
});
```

**النتيجة:**
- ✅ قطع الغيار: يعرض "المعدات المستخدمة"
- ✅ السولار: يعرض "مستوى التانك"
- ✅ الزيوت: يعرض "تاريخ انتهاء الصلاحية"
- ✅ الأدوات: يعرض "العهد النشطة"

---

## 🎨 واجهة المستخدم: موحدة لكن قابلة للتخصيص

### المبدأ:
- **هيكل موحد:** نفس الأزرار الأساسية (عرض، استلام، صرف)
- **تخصيص حسب النوع:** أزرار إضافية حسب الحاجة

### مثال:

#### قطع الغيار:
```
⚙️ مخزن قطع الغيار
├── 📋 عرض الأصناف
├── 📥 استلام مشتريات
├── 🔧 صرف للمعدات        ← خاص بقطع الغيار
└── 📊 تقرير الاستهلاك
```

#### السولار:
```
⛽ مخزن السولار
├── ⛽ عرض مستوى التانك    ← خاص بالسولار
├── 📥 استلام شحنة
├── 🚛 صرف للمعدات
└── 📊 تقرير الاستهلاك
```

#### الأدوات:
```
🛠️ مخزن الأدوات
├── 📋 عرض الأصناف
├── 📥 استلام مشتريات
├── 🔐 صرف عهدة            ← خاص بالأدوات
├── ↩️ إرجاع عهدة          ← خاص بالأدوات
└── 📊 تقرير العهد         ← خاص بالأدوات
```

---

## ✅ المزايا

### 1. **مرونة عالية:**
- كل مخزن له منطق خاص
- سهولة إضافة ميزات جديدة

### 2. **كود نظيف:**
- فصل الاهتمامات (Separation of Concerns)
- سهولة الصيانة

### 3. **واجهة موحدة:**
- نفس الهيكل الأساسي
- تخصيص حسب الحاجة

### 4. **قابلية التوسع:**
- إضافة مخزن جديد = إضافة استراتيجية جديدة
- لا حاجة لتعديل الكود الموجود

---

## 🚀 الخلاصة

### ✅ ما نحققه:

1. **Handler موحد:** واجهة واحدة للجميع
2. **معالجة مختلفة:** استراتيجيات منفصلة لكل نوع
3. **واجهة قابلة للتخصيص:** نفس الهيكل، محتوى مختلف
4. **مرونة عالية:** سهولة الإضافة والتعديل

### ❌ ما لا نريده:

1. ❌ 4 handlers منفصلة (تكرار الكود)
2. ❌ واجهات مختلفة تماماً (صعوبة الصيانة)
3. ❌ منطق مكرر (مشاكل في التحديث)

---

## 📝 الخطوة التالية

إذا وافقت على هذا التصميم، سنقوم بـ:

1. **إنشاء BaseWarehouseStrategy** (الفئة الأساسية)
2. **إنشاء الاستراتيجيات** (لكل نوع مخزن)
3. **إنشاء Factory** (لاختيار الاستراتيجية)
4. **تحديث Handler** (ليستخدم الاستراتيجيات)

**النتيجة:** نظام مرن وقوي، مع الحفاظ على واجهة موحدة ومعالجة مختلفة حسب الحاجة.

