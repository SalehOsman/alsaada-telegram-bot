import type { Context } from '../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'
import { Database } from '../../../../modules/database/index.js'
import { MenuBuilder } from '../../registry/menu-builder.js'

export const inventoryMainHandler = new Composer<Context>()

/**
 * Handler for the main inventory management menu.
 * Displays warehouses from database + management submenu
 */
inventoryMainHandler.callbackQuery(/^menu:feature:inventory-management$/, async (ctx) => {
  await ctx.answerCallbackQuery()

  if (!ctx.dbUser) {
    await ctx.answerCallbackQuery('⛔ You do not have permission to access this.')
    return
  }

  // جلب المخازن من قاعدة البيانات
  const warehouses = await Database.prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: { type: 'asc' },
  })

  const keyboard = new InlineKeyboard()

  // عرض المخازن
  warehouses.forEach(warehouse => {
    const icon = getWarehouseIcon(warehouse.type)
    keyboard.text(`${icon} ${warehouse.name}`, `inv:warehouse:${warehouse.id}`)
    keyboard.row()
  })

  // إضافة زر الإدارة
  keyboard.text('📈 إدارة قسم المخازن', 'menu:sub:inventory-management:management')
  keyboard.row()

  keyboard.text('⬅️ رجوع', 'menu:back')

  await ctx.editMessageText(
    '📦 **إدارة المخازن**\n\n'
    + 'إدارة شاملة للمخازن والأصول.\n\n'
    + '📌 الرجاء اختيار المخزن:',
    { parse_mode: 'Markdown', reply_markup: keyboard },
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
