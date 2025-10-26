/**
 * HR Management Feature Module
 */

import type { Context } from '../../context.js'
import { logger } from '#root/modules/services/logger/index.js'
import { Composer } from 'grammy'
import { hrManagementConfig } from './config.js'

import { advancesHandler } from './handlers/advances-main.handler.js'
import { customReportsHandler } from './handlers/custom-reports-main.handler.js'
import { customReportsEmployeeHandler } from './handlers/custom-reports-employee.handler.js'
import { customReportsAdvancedHandler } from './handlers/custom-reports-advanced.handler.js'
import { newAdvanceHandler } from './handlers/advances-new.handler.js'
import { advancesReportsHandler } from './handlers/advances-reports.handler.js'
import { viewAdvancesHandler } from './handlers/advances-view.handler.js'
import { employeeDetailsHandler } from './handlers/employee-details.handler.js'
import { employeeEditHandler } from './handlers/employee-edit.handler.js'
import { employeeStatusSimpleHandler } from './handlers/employee-status-simple.handler.js'
import { addEmployeeHandler } from './handlers/employees-add.handler.js'
// Import handlers
import { employeesListHandler } from './handlers/employees-list.handler.js'
// Import filter handlers (replaces view-current)
import { employeeFiltersHandler } from './handlers/employee-filters.handler.js'
import { employeeFilterResultsHandler } from './handlers/employee-filter-results.handler.js'
import { employeeExportHandler } from './handlers/employee-export.handler.js'
// Import previous employees handlers
import { viewPreviousEmployeesHandler } from './handlers/employees-view-previous.handler.js'
import { employeePreviousFiltersHandler } from './handlers/employee-previous-filters.handler.js'
import { employeePreviousFilterResultsHandler } from './handlers/employee-previous-filter-results.handler.js'
// Import main handler
import { hrMainHandler } from './handlers/hr-main.handler.js'
import { leavesHandler } from './handlers/leaves.handler.js'
import { leavesAddHandler } from './handlers/leaves-add.handler.js'
import { payrollHandler } from './handlers/payroll.handler.js'

export const composer = new Composer<Context>()

// Register main handler first
composer.use(hrMainHandler)

// Register section handlers
composer.use(employeesListHandler)
composer.use(advancesHandler)
composer.use(leavesHandler)
composer.use(leavesAddHandler)
composer.use(payrollHandler)
composer.use(customReportsHandler)
composer.use(customReportsEmployeeHandler)
composer.use(customReportsAdvancedHandler)

// Register NEW filter handlers
composer.use(employeeFiltersHandler)
composer.use(employeeFilterResultsHandler)
composer.use(employeeExportHandler)

// Register previous employee filter handlers
composer.use(employeePreviousFiltersHandler)
composer.use(employeePreviousFilterResultsHandler)

// Register sub-handlers
composer.use(addEmployeeHandler)
composer.use(viewPreviousEmployeesHandler)
composer.use(employeeDetailsHandler)
composer.use(employeeEditHandler)
composer.use(employeeStatusSimpleHandler)
composer.use(newAdvanceHandler)
composer.use(viewAdvancesHandler)
composer.use(advancesReportsHandler)

export { hrManagementConfig as config }

export async function init(): Promise<void> {
  logger.info('✅ HR Management Feature initialized')
}

export async function cleanup(): Promise<void> {
  logger.info('🔄 HR Management Feature cleaned up')
}
