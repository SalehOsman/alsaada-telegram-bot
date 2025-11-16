
import type { Context } from '../../../context.js';
import { Composer } from 'grammy';
import { MenuBuilder } from '../../registry/menu-builder.js';

export const inventoryMainHandler = new Composer<Context>();

/**
 * Handler for the main inventory management menu.
 * Uses MenuBuilder to build the menu automatically from config.
 */
inventoryMainHandler.callbackQuery(/^menu:feature:inventory-management$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  if (!ctx.dbUser) {
    await ctx.answerCallbackQuery('⛔ You do not have permission to access this.');
    return;
  }

  // Use MenuBuilder to build the submenu automatically from config.ts
  const keyboard = await MenuBuilder.buildSubMenu('inventory-management', ctx.dbUser, {
    maxButtonsPerRow: 1,
    showBackButton: true,
    backButtonText: '⬅️ Go Back to Main Menu',
  });

  if (!keyboard) {
    await ctx.answerCallbackQuery('⚠️ This section is not available.');
    return;
  }

  await ctx.editMessageText(
    '📦 **إدارة المخازن**\n\n' +
    'إدارة شاملة للمخازن والأصول.\n\n' +
    '📌 الرجاء اختيار القسم المطلوب:',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  );
});
