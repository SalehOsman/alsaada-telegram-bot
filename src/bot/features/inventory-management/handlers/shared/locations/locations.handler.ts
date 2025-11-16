import { Composer, InlineKeyboard } from 'grammy'
import type { Context } from '../../../../../context.js'
import { StorageLocationsService } from '#root/modules/services/inventory/shared/storage-locations.service.js'

export const sharedLocationsHandler = new Composer<Context>()

// عرض قائمة المواقع
export async function showLocationsMenu(ctx: Context, backCallback: string, prefix: string = 'shared') {
  const locations = await StorageLocationsService.getLocations()
  
  let message = '📍 **إدارة المواقع**\n\n'
  message += `📊 **إجمالي المواقع:** ${locations.length}\n\n`
  
  if (locations.length > 0) {
    message += '📋 **المواقع المتاحة:**\n'
    for (const loc of locations) {
      message += `   • ${loc.nameAr} (${loc.code})\n`
    }
  } else {
    message += '❌ لا توجد مواقع'
  }
  
  const keyboard = new InlineKeyboard()
  
  if (locations.length > 0) {
    keyboard.text('✏️ تعديل موقع', `${prefix}:locations:edit:list:${backCallback}`).row()
  }
  
  keyboard.text('➕ إضافة موقع', `${prefix}:locations:add:${backCallback}`).row()
  keyboard.text('⬅️ رجوع', backCallback)
  
  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

// (باقي الكود كما هو...)
