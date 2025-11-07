/**
 * HR Management Feature Module
 */

import type { Context } from '../../context.js'
import { logger } from '#root/modules/services/logger/index.js'
import { Composer } from 'grammy'
import { hrManagementConfig } from './config.js'

import { advancesHandler } from './handlers/advances-main.handler.js'
import { newAdvanceHandler } from './handlers/advances-new.handler.js'
import { advancesReportsHandler } from './handlers/advances-reports.handler.js'
import { viewAdvancesHandler } from './handlers/advances-view.handler.js'
import { customReportsAdvancedHandler } from './handlers/custom-reports-advanced.handler.js'
import { customReportsEmployeeHandler } from './handlers/custom-reports-employee.handler.js'
import { customReportsHandler } from './handlers/custom-reports-main.handler.js'
import { departmentManagementHandler } from './handlers/department-management.handler.js'
import { employeeDetailsHandler } from './handlers/employee-details.handler.js'
import { employeeEditHandler } from './handlers/employee-edit.handler.js'
import { employeeExportHandler } from './handlers/employee-export.handler.js'
import { employeeFilterResultsHandler } from './handlers/employee-filter-results.handler.js'
// Import filter handlers (replaces view-current)
import { employeeFiltersHandler } from './handlers/employee-filters.handler.js'
import { employeePreviousFilterResultsHandler } from './handlers/employee-previous-filter-results.handler.js'
import { employeePreviousFiltersHandler } from './handlers/employee-previous-filters.handler.js'
import { employeeSearchHandler } from './handlers/employee-search.handler.js'
import { employeeStatusSimpleHandler } from './handlers/employee-status-simple.handler.js'
import { addEmployeeHandler } from './handlers/employees-add.handler.js'
// Import handlers
import { employeesListHandler } from './handlers/employees-list.handler.js'
// Import previous employees handlers
import { viewPreviousEmployeesHandler } from './handlers/employees-view-previous.handler.js'
// Import main handler
import { hrMainHandler } from './handlers/hr-main.handler.js'
import { leavesAddHandler } from './handlers/leaves-add.handler.js'
import { leavesAllowanceHandler } from './handlers/leaves-allowance.handler.js'
import { leavesCashSettlementsHandler } from './handlers/leaves-cash-settlements.handler.js'
import { leavesDeleteHandler } from './handlers/leaves-delete.handler.js'
import { leavesEditHandler } from './handlers/leaves-edit.handler.js'
import { leavesEmployeeHandler } from './handlers/leaves-employee.handler.js'
import { leavesListHandler } from './handlers/leaves-list.handler.js'
import { leavesPostponeHandler } from './handlers/leaves-postpone.handler.js'
import { leavesReportsHandler } from './handlers/leaves-reports.handler.js'
import { leavesReturnHandler } from './handlers/leaves-return.handler.js'
import { leavesScheduleFiltersHandler } from './handlers/leaves-schedule-filters.handler.js'
import { leavesScheduleHandler } from './handlers/leaves-schedule.handler.js'
import { leavesHandler } from './handlers/leaves.handler.js'
import { missionsHandler } from './handlers/missions.handler.js'
import { monthlyPayrollHandler } from './handlers/monthly-payroll.handler.js'
import { payrollAllowanceTypesHandler } from './handlers/payroll-allowance-types.handler.js'
import { payrollBonusesHandler } from './handlers/payroll-bonuses.handler.js'
import { payrollCalculateHandler } from './handlers/payroll-calculate.handler.js'
import { payrollEmployeeAllowancesHandler } from './handlers/payroll-employee-allowances.handler.js'
import payrollFinancialHistoryHandler from './handlers/payroll-financial-history.handler.js'
import { payrollMaterialEntitlementsHandler } from './handlers/payroll-material-entitlements.handler.js'
import { payrollPositionAllowancesHandler } from './handlers/payroll-position-allowances.handler.js'
import { payrollHandler } from './handlers/payroll.handler.js'
import { penaltiesHandler } from './handlers/penalties.handler.js'
import { liftSuspensionsHandler } from './handlers/lift-suspensions.handler.js'
import { sectionManagementHandler } from './handlers/section-management.handler.js'
import { sectionPermissionsHandler } from './handlers/section-permissions.handler.js'
import { settlementsHandler } from './handlers/settlements.handler.js'
import { transactionsItemsHandler } from './handlers/transactions-items.handler.js'
import { transactionsNewHandler } from './handlers/transactions-new.handler.js'
import { transactionsReportsHandler } from './handlers/transactions-reports.handler.js'
import { transactionsViewHandler } from './handlers/transactions-view.handler.js'
import { workLeaveCycleHandler } from './handlers/work-leave-cycle/index.js'

export const composer = new Composer<Context>()

// Register main handler first
composer.use(hrMainHandler)

// Register section management (SUPER_ADMIN only)
composer.use(sectionManagementHandler)
composer.use(sectionPermissionsHandler)
composer.use(workLeaveCycleHandler)

// Register department management (SUPER_ADMIN only)
composer.use(departmentManagementHandler)

// Register handlers with message handlers FIRST (ORDER MATTERS!)
// Handlers that process text input must be first to catch their forms

// Payroll handlers MUST come first (they have specific state checks)
composer.use(payrollAllowanceTypesHandler)
composer.use(payrollPositionAllowancesHandler)
composer.use(payrollEmployeeAllowancesHandler)
composer.use(payrollMaterialEntitlementsHandler)
composer.use(payrollBonusesHandler)
composer.use(payrollCalculateHandler)
composer.use(monthlyPayrollHandler)
composer.use(payrollFinancialHistoryHandler)

// Penalties handler - يجب أن يكون قبل باقي الـ handlers لضمان معالجة رسائل العذر
composer.use(penaltiesHandler)
composer.use(liftSuspensionsHandler) // 🔓 رفع الإيقافات

// Then employee-related handlers
composer.use(addEmployeeHandler)
composer.use(employeeEditHandler)
composer.use(employeeStatusSimpleHandler)

// Employee search must be early to catch search inputs
composer.use(employeeSearchHandler)

// ✅ Leaves allowance handler must come BEFORE transactions (has message:text handler)
composer.use(leavesAllowanceHandler)

// Transactions handlers must come BEFORE missions to catch their text inputs
composer.use(transactionsNewHandler)
composer.use(transactionsItemsHandler)
composer.use(transactionsViewHandler)
composer.use(transactionsReportsHandler)
composer.use(settlementsHandler)

// Missions must come before leaves to avoid conflicts
composer.use(missionsHandler)

// Register section handlers
composer.use(employeesListHandler)
composer.use(advancesHandler)
composer.use(leavesHandler)

// Register leaves sub-handlers
composer.use(leavesPostponeHandler)
// leavesAllowanceHandler moved up (before transactions)
composer.use(leavesAddHandler)
composer.use(leavesEditHandler) // ✅ تعديل الإجازات
composer.use(leavesDeleteHandler) // ✅ حذف الإجازات
composer.use(leavesListHandler)
composer.use(leavesCashSettlementsHandler) // 💰 عرض التسويات النقدية
composer.use(leavesReportsHandler) // 📊 تقارير الإجازات
composer.use(leavesReturnHandler)
composer.use(leavesEmployeeHandler)
composer.use(leavesScheduleHandler)
composer.use(leavesScheduleFiltersHandler)

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
composer.use(viewPreviousEmployeesHandler)
composer.use(employeeDetailsHandler)
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
