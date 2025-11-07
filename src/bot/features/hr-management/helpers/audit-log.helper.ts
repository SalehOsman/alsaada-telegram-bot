/**
 * دوال مساعدة لسجل التدقيق (Audit Log)
 */

import type { AuditAction } from '../types/payroll-payment.types.js'
import { Database } from '#root/modules/database/index.js'

interface CreateAuditLogParams {
  payrollRecordId: number
  action: AuditAction
  actionBy: bigint
  oldData?: any
  newData?: any
  changes?: Record<string, { old: any, new: any }>
  notes?: string
}

/**
 * إنشاء سجل تدقيق جديد
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await Database.prisma.hR_PayrollAuditLog.create({
      data: {
        payrollRecordId: params.payrollRecordId,
        action: params.action,
        actionBy: params.actionBy,
        oldData: params.oldData ?? undefined,
        newData: params.newData ?? undefined,
        changes: params.changes ?? undefined,
        notes: params.notes ?? undefined,
      },
    })
  }
  catch (error) {
    console.error('Error creating audit log:', error)
    // لا نريد أن يفشل العملية الأساسية بسبب خطأ في Audit Log
  }
}

/**
 * حساب التغييرات بين بيانات قديمة وجديدة
 */
export function calculateChanges(oldData: any, newData: any): Record<string, { old: any, new: any }> {
  const changes: Record<string, { old: any, new: any }> = {}

  const fieldsToTrack = [
    'paymentStatus',
    'amountPaid',
    'paymentDate',
    'paymentNotes',
    'netSalary',
    'totalAllowances',
    'totalBonuses',
    'totalDeductions',
    'isDeleted',
  ]

  for (const field of fieldsToTrack) {
    if (oldData[field] !== newData[field]) {
      changes[field] = {
        old: oldData[field],
        new: newData[field],
      }
    }
  }

  return changes
}

/**
 * جلب سجلات التدقيق لكشف راتب معين
 */
export async function getAuditLogs(payrollRecordId: number) {
  return await Database.prisma.hR_PayrollAuditLog.findMany({
    where: { payrollRecordId },
    orderBy: { actionAt: 'desc' },
  })
}

/**
 * جلب آخر عملية تدقيق
 */
export async function getLastAuditLog(payrollRecordId: number) {
  return await Database.prisma.hR_PayrollAuditLog.findFirst({
    where: { payrollRecordId },
    orderBy: { actionAt: 'desc' },
  })
}
