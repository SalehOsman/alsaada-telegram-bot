import type { Context } from '../../context.js'
import { Composer } from 'grammy'

import { config } from './config.js'
import { inventoryMainHandler } from './handlers/inventory-main.handler.js'
import { inventorySectionManagementHandler } from './handlers/section-management.handler.js'
import { inventorySubFeaturesHandler } from './handlers/sub-features.handler.js'
import { oilsGreasesComposer } from './handlers/oils-greases/index.js'
import { sparePartsItemsHandler } from './handlers/spare-parts-items.handler.js'
import { sparePartsMainHandler } from './handlers/spare-parts-main.handler.js'
import { sparePartsReportsHandler } from './handlers/spare-parts-reports.handler.js'
import { sparePartsSettingsHandler } from './handlers/spare-parts-settings.handler.js'
import { sparePartsTransactionsHandler } from './handlers/spare-parts-transactions.handler.js'

const composer = new Composer<Context>()

console.error('🔵 ========================================')
console.error('🔵 INVENTORY-MANAGEMENT FEATURE LOADING...')
console.error('🔵 ========================================')

// ⚠️ CRITICAL: Register oils-greases FIRST (has warehouse check)
console.error('🔵 Step 1: Registering oils-greases warehouse handler...')
composer.use(oilsGreasesComposer)
console.error('🔵 ✅ Oils-greases warehouse handler registered')

// Then register spare parts handlers
console.error('🔵 Step 2: Registering spare parts items handler...')
composer.use(sparePartsItemsHandler)
console.error('🔵 ✅ Spare parts items handler registered')

console.error('🔵 Step 3: Registering spare parts settings handler...')
composer.use(sparePartsSettingsHandler)
console.error('🔵 ✅ Spare parts settings handler registered')

console.error('🔵 Step 4: Registering spare parts transactions handler...')
composer.use(sparePartsTransactionsHandler)
console.error('🔵 ✅ Spare parts transactions handler registered')

console.error('🔵 Step 5: Registering spare parts reports handler...')
composer.use(sparePartsReportsHandler)
console.error('🔵 ✅ Spare parts reports handler registered')

// Register all other handlers for this feature
console.error('🔵 Step 6: Registering other inventory handlers...')
composer.use(inventoryMainHandler)
composer.use(inventorySubFeaturesHandler)
composer.use(inventorySectionManagementHandler)
composer.use(sparePartsMainHandler)
console.error('🔵 ✅ Other inventory handlers registered')

console.error('🔵 ========================================')
console.error('🔵 INVENTORY-MANAGEMENT FEATURE LOADED ✅')
console.error('🔵 ========================================')

export { composer, config }
