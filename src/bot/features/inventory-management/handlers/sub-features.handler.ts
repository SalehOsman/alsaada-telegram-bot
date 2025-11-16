import type { Context } from '../../../context.js'
import { Composer } from 'grammy'

export const inventorySubFeaturesHandler = new Composer<Context>()

async function underConstruction(ctx: Context) {
  await ctx.answerCallbackQuery({
    text: '🚧 هذا القسم قيد الإنشاء.',
    show_alert: true,
  })
}

// Spare Parts Store - Now handled in spare-parts-main.handler.ts
// (Will be imported and registered in index.ts)

// Oils and Greases Store - Now handled in oils-greases/index.ts ✅

// Diesel Store
inventorySubFeaturesHandler.callbackQuery(/^menu:sub:inventory-management:diesel$/, underConstruction)

// Tools and Equipment Store
inventorySubFeaturesHandler.callbackQuery(/^menu:sub:inventory-management:tools_equipment$/, underConstruction)
