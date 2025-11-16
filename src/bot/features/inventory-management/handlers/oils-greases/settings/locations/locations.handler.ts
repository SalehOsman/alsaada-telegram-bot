import type { Context } from '../../../../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'

import { showLocationsMenu } from '../../../shared/locations/index.js'

export const locationsHandler = new Composer<Context>()

locationsHandler.callbackQuery('og:locations:menu', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showLocationsMenu(ctx, 'og:settings:menu', 'og')
})

// تم نقل جميع وظائف التعديل والحذف إلى shared-locations.handler.ts
