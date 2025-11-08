/**
 * Warehouses Handler
 * معالج قائمة المخازن
 */

import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'

export const warehousesHandler = new Composer<Context>()

/**
 * عرض قائمة المخازن
 */
warehousesHandler.callbackQuery(/^inv:warehouse:(\d+)$/, async (ctx) => {
  const warehouseId = parseInt(ctx.match[1])
  await ctx.answerCallbackQuery()

  if (!ctx.dbUser) {
    await ctx.answerCallbackQuery('⛔ ليس لديك صلاحية الوصول')
    return
  }

  const warehouse = await Database.prisma.warehouse.findUnique({
    where: { id: warehouseId },
  })

  if (!warehouse) {
    await ctx.answerCallbackQuery('❌ المخزن غير موجود')
    return
  }

  // بناء القائمة حسب نوع المخزن
  const keyboard = new InlineKeyboard()

  // أزرار مشتركة
  keyboard
    .text('📋 عرض الأصناف', `inv:warehouse:${warehouseId}:items`)
    .row()
    .text('📥 استلام مشتريات', `inv:warehouse:${warehouseId}:receive`)
    .row()

  // أزرار حسب النوع
  if (warehouse.type === 'SPARE_PARTS') {
    keyboard
      .text('🔧 صرف للمعدات', `inv:warehouse:${warehouseId}:dispense`)
      .row()
      .text('📊 تقرير الاستهلاك', `inv:warehouse:${warehouseId}:consumption-report`)
  } else if (warehouse.type === 'DIESEL') {
    keyboard
      .text('⛽ عرض مستوى التانك', `inv:warehouse:${warehouseId}:tank-level`)
      .row()
      .text('🚛 صرف للمعدات', `inv:warehouse:${warehouseId}:dispense`)
      .row()
      .text('📊 تقرير الاستهلاك', `inv:warehouse:${warehouseId}:consumption-report`)
  } else if (warehouse.type === 'OILS_GREASES') {
    keyboard
      .text('🔧 صرف للمعدات', `inv:warehouse:${warehouseId}:dispense`)
      .row()
      .text('⚠️ تنبيهات انتهاء الصلاحية', `inv:warehouse:${warehouseId}:expiry-alerts`)
  } else if (warehouse.type === 'TOOLS') {
    keyboard
      .text('🔐 صرف عهدة', `inv:warehouse:${warehouseId}:custody:issue`)
      .row()
      .text('↩️ إرجاع عهدة', `inv:warehouse:${warehouseId}:custody:return`)
      .row()
      .text('📊 تقرير العهد', `inv:warehouse:${warehouseId}:custody-report`)
  }

  keyboard.row().text('⬅️ رجوع', 'menu:feature:inventory-management')

  const icon = getWarehouseIcon(warehouse.type)
  const description = getWarehouseDescription(warehouse.type)

  await ctx.editMessageText(
    `${icon} **${warehouse.name}**\n\n` +
    `📦 نوع المخزن: ${getWarehouseTypeName(warehouse.type)}\n\n` +
    description,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    },
  )
})

function getWarehouseIcon(type: string): string {
  const icons: Record<string, string> = {
    SPARE_PARTS: '⚙️',
    DIESEL: '⛽',
    OILS_GREASES: '🛢️',
    TOOLS: '🛠️',
  }
  return icons[type] || '📦'
}

function getWarehouseTypeName(type: string): string {
  const names: Record<string, string> = {
    SPARE_PARTS: 'قطع الغيار',
    DIESEL: 'السولار',
    OILS_GREASES: 'الزيوت والشحوم',
    TOOLS: 'العدد والأدوات',
  }
  return names[type] || type
}

function getWarehouseDescription(type: string): string {
  const descriptions: Record<string, string> = {
    SPARE_PARTS: '🔧 **ميزات خاصة:**\n• ربط مباشر بالمعدات\n• تتبع استهلاك كل معدة\n• تقارير الصيانة',
    DIESEL: '🚛 **ميزات خاصة:**\n• تتبع باللترات\n• عرض مستوى التانك\n• ربط مباشر بالمعدات',
    OILS_GREASES: '🛢️ **ميزات خاصة:**\n• تتبع بالجالونات/اللترات\n• تتبع تاريخ انتهاء الصلاحية\n• تنبيهات قبل انتهاء الصلاحية',
    TOOLS: '🔐 **ميزات خاصة:**\n• إدارة العهد للموظفين\n• تتبع الأدوات المسلمة\n• ربط بالرواتب (عند الفقدان)',
  }
  return descriptions[type] || ''
}

