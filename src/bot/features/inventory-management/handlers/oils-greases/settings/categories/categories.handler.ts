import type { Context } from '../../../../../../context.js'
import { Composer } from 'grammy'

import { showCategoriesMenu } from '../../../shared/categories/index.js'

export const categoriesHandler = new Composer<Context>()

categoriesHandler.callbackQuery('og:categories:menu', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showCategoriesMenu(ctx, 'og:settings:menu', 'og')
})
