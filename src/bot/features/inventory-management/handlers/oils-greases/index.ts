/**
 * 🛢️ Oils & Greases Warehouse - Main Export
 * تجميع جميع handlers مخزن الزيوت والشحوم
 */

import { Composer } from 'grammy'
import type { Context } from '../../../../context.js'

// Main handler
import { oilsGreasesMainHandler } from './oils-greases-main.handler.js'

// Items handlers
import { addItemHandler } from './items/add-item/add-item.handler.js'
import { searchItemHandler } from './items/search-item/search-item.handler.js'
import { listItemsHandler } from './items/list-items/list-items.handler.js'
import { viewItemHandler } from './items/view-item/view-item.handler.js'
import { editItemHandler } from './items/edit-item/edit-item.handler.js'

// Transactions handlers
import { purchaseHandler } from './transactions/purchase/purchase.handler.js'
import { issueHandler } from './transactions/issue/issue.handler.js'
import { transferHandler } from './transactions/transfer/transfer.handler.js'
import { returnHandler } from './transactions/return/return.handler.js'
import { adjustHandler } from './transactions/adjust/adjust.handler.js'
import { transactionsListHandler } from './transactions/list/list.handler.js'
import { unifiedListHandler } from './transactions/list/unified-list.handler.js'

// Reports handlers
import { summaryReportHandler } from './reports/summary/summary.handler.js'
import { alertsReportHandler } from './reports/alerts/alerts.handler.js'
import { valueReportHandler } from './reports/value/value.handler.js'
import { exportReportHandler } from './reports/export/export.handler.js'

// Settings handlers
import { categoriesHandler } from './settings/categories/categories.handler.js'
import { locationsHandler } from './settings/locations/locations.handler.js'

// Shared handlers
import { sharedLocationsHandler } from '../shared/locations/index.js'
import { sharedCategoriesHandler } from '../shared/categories/index.js'

// Create main composer
export const oilsGreasesComposer = new Composer<Context>()

// Register all handlers
oilsGreasesComposer.use(oilsGreasesMainHandler)

// Items
oilsGreasesComposer.use(addItemHandler)
oilsGreasesComposer.use(searchItemHandler)
oilsGreasesComposer.use(listItemsHandler)
oilsGreasesComposer.use(viewItemHandler)
oilsGreasesComposer.use(editItemHandler)

// Transactions
oilsGreasesComposer.use(purchaseHandler)
oilsGreasesComposer.use(issueHandler)
oilsGreasesComposer.use(transferHandler)
oilsGreasesComposer.use(returnHandler)
oilsGreasesComposer.use(adjustHandler)
oilsGreasesComposer.use(transactionsListHandler)
oilsGreasesComposer.use(unifiedListHandler)

// Reports
oilsGreasesComposer.use(summaryReportHandler)
oilsGreasesComposer.use(alertsReportHandler)
oilsGreasesComposer.use(valueReportHandler)
oilsGreasesComposer.use(exportReportHandler)

// Settings
oilsGreasesComposer.use(categoriesHandler)
oilsGreasesComposer.use(locationsHandler)

// Shared
oilsGreasesComposer.use(sharedLocationsHandler)
oilsGreasesComposer.use(sharedCategoriesHandler)
