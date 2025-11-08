
import type { Context } from '../../../context.js';
import { Composer } from 'grammy';
import { Database } from '../../../../modules/database/index.js';

export const inventorySubFeaturesHandler = new Composer<Context>();

/**
 * تحويل sub-feature callbacks القديمة إلى warehouse handlers
 */
const mapSubFeatureToWarehouse = async (ctx: Context, warehouseType: string) => {
  await ctx.answerCallbackQuery();

  if (!ctx.dbUser) {
    await ctx.answerCallbackQuery('⛔ ليس لديك صلاحية الوصول');
    return;
  }

  // البحث عن المخزن حسب النوع
  const warehouse = await Database.prisma.warehouse.findFirst({
    where: {
      type: warehouseType as any,
      isActive: true,
    },
  });

  if (!warehouse) {
    await ctx.answerCallbackQuery({ text: '❌ المخزن غير موجود', show_alert: true });
    return;
  }

  // استدعاء نفس الكود الموجود في warehouses.handler.ts
  const { InlineKeyboard } = await import('grammy');
  const keyboard = new InlineKeyboard();

  // أزرار مشتركة
  keyboard
    .text('📋 عرض الأصناف', `inv:warehouse:${warehouse.id}:items`)
    .row()
    .text('📥 استلام مشتريات', `inv:warehouse:${warehouse.id}:receive`)
    .row();

  // أزرار حسب النوع
  if (warehouse.type === 'SPARE_PARTS') {
    keyboard
      .text('🔧 صرف للمعدات', `inv:warehouse:${warehouse.id}:dispense`)
      .row()
      .text('📊 تقرير الاستهلاك', `inv:warehouse:${warehouse.id}:consumption-report`);
  } else if (warehouse.type === 'DIESEL') {
    keyboard
      .text('⛽ عرض مستوى التانك', `inv:warehouse:${warehouse.id}:tank-level`)
      .row()
      .text('🚛 صرف للمعدات', `inv:warehouse:${warehouse.id}:dispense`)
      .row()
      .text('📊 تقرير الاستهلاك', `inv:warehouse:${warehouse.id}:consumption-report`);
  } else if (warehouse.type === 'OILS_GREASES') {
    keyboard
      .text('🔧 صرف للمعدات', `inv:warehouse:${warehouse.id}:dispense`)
      .row()
      .text('⚠️ تنبيهات انتهاء الصلاحية', `inv:warehouse:${warehouse.id}:expiry-alerts`);
  } else if (warehouse.type === 'TOOLS') {
    keyboard
      .text('🔐 صرف عهدة', `inv:warehouse:${warehouse.id}:custody:issue`)
      .row()
      .text('↩️ إرجاع عهدة', `inv:warehouse:${warehouse.id}:custody:return`)
      .row()
      .text('📊 تقرير العهد', `inv:warehouse:${warehouse.id}:custody-report`);
  }

  keyboard.row().text('⬅️ رجوع', 'menu:feature:inventory-management');

  const icon = getWarehouseIcon(warehouse.type);
  const description = getWarehouseDescription(warehouse.type);

  await ctx.editMessageText(
    `${icon} **${warehouse.name}**\n\n` +
    `📦 نوع المخزن: ${getWarehouseTypeName(warehouse.type)}\n\n` +
    description,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  );
};

function getWarehouseIcon(type: string): string {
  const icons: Record<string, string> = {
    SPARE_PARTS: '⚙️',
    DIESEL: '⛽',
    OILS_GREASES: '🛢️',
    TOOLS: '🛠️',
  };
  return icons[type] || '📦';
}

function getWarehouseTypeName(type: string): string {
  const names: Record<string, string> = {
    SPARE_PARTS: 'قطع الغيار',
    DIESEL: 'السولار',
    OILS_GREASES: 'الزيوت والشحوم',
    TOOLS: 'العدد والأدوات',
  };
  return names[type] || type;
}

function getWarehouseDescription(type: string): string {
  const descriptions: Record<string, string> = {
    SPARE_PARTS: '🔧 **ميزات خاصة:**\n• ربط مباشر بالمعدات\n• تتبع استهلاك كل معدة\n• تقارير الصيانة',
    DIESEL: '🚛 **ميزات خاصة:**\n• تتبع باللترات\n• عرض مستوى التانك\n• ربط مباشر بالمعدات',
    OILS_GREASES: '🛢️ **ميزات خاصة:**\n• تتبع بالجالونات/اللترات\n• تتبع تاريخ انتهاء الصلاحية\n• تنبيهات قبل انتهاء الصلاحية',
    TOOLS: '🔐 **ميزات خاصة:**\n• إدارة العهد للموظفين\n• تتبع الأدوات المسلمة\n• ربط بالرواتب (عند الفقدان)',
  };
  return descriptions[type] || '';
}

// Spare Parts Store
inventorySubFeaturesHandler.callbackQuery(/^menu:sub:inventory-management:spare_parts$/, async (ctx) => {
  await mapSubFeatureToWarehouse(ctx, 'SPARE_PARTS');
});

// Oils and Greases Store
inventorySubFeaturesHandler.callbackQuery(/^menu:sub:inventory-management:oils_greases$/, async (ctx) => {
  await mapSubFeatureToWarehouse(ctx, 'OILS_GREASES');
});

// Diesel Store
inventorySubFeaturesHandler.callbackQuery(/^menu:sub:inventory-management:diesel$/, async (ctx) => {
  await mapSubFeatureToWarehouse(ctx, 'DIESEL');
});

// Tools and Equipment Store
inventorySubFeaturesHandler.callbackQuery(/^menu:sub:inventory-management:tools_equipment$/, async (ctx) => {
  await mapSubFeatureToWarehouse(ctx, 'TOOLS');
});

// Inventory Department Management - (This is now handled in management.handler.ts)
