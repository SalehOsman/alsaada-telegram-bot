import type { Context } from '../../../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'

import { CategoryService } from '#root/modules/services/inventory/shared/category.service.js'

export const sharedCategoriesHandler = new Composer<Context>()

// عرض قائمة الفئات
export async function showCategoriesMenu(ctx: Context, backCallback: string, prefix: string) {
  const warehouse = prefix === 'og' ? 'oils-greases' : 'spare-parts'
  const categories = await CategoryService.getCategories(warehouse)
  
  let message = '🏷️ **إدارة الفئات**\n\n'
  message += `📊 **إجمالي الفئات:** ${categories.length}\n\n`
  
  if (categories.length > 0) {
    message += '📋 **الفئات المتاحة:**\n'
    for (const cat of categories) {
      message += `   • ${cat.nameAr} (${cat.code})\n`
    }
  } else {
    message += '❌ لا توجد فئات'
  }
  
  const keyboard = new InlineKeyboard()
  
  if (categories.length > 0) {
    keyboard.text('✏️ تعديل فئة', `${prefix}:categories:edit:list:${backCallback}`).row()
  }
  
  keyboard.text('➕ إضافة فئة', `${prefix}:categories:add:${backCallback}`).row()
  keyboard.text('⬅️ رجوع', backCallback)
  
  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

// (باقي الكود كما هو...)
