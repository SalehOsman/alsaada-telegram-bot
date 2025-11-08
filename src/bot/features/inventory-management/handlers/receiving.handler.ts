
import type { Context } from '../../../context.js';
import { Composer } from 'grammy';

export const receivingHandler = new Composer<Context>();

receivingHandler.callbackQuery(/^inv:warehouse:(\d+):receive$/, async (ctx) => {
  const warehouseId = parseInt(ctx.match[1], 10);
  await ctx.answerCallbackQuery();
  await ctx.reply(`Starting receiving process for warehouse ${warehouseId}...`);
});
