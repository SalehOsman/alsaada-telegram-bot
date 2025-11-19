/**
 * Session Manager Utility
 * أدوات إدارة الجلسات - يمكن استخدامها لأي قسم يحتاج إدارة جلسات
 * 
 * @description
 * يوفر واجهة موحدة لإدارة الجلسات (تهيئة، تحديث، مسح)
 * يمكن استخدامه مع أي نوع جلسة (مخازن، موظفين، مشاريع، إلخ)
 */

import type { Context } from '#root/bot/context.js'

export interface InventorySession {
  action: string
  step: string
  warehouse: string
  data: Record<string, any>
}

/**
 * تهيئة جلسة جديدة
 */
export function initInventorySession(
  ctx: Context,
  action: string,
  warehouse: string,
  step: string,
  data: Record<string, any> = {}
): void {
  ctx.session.inventoryForm = {
    action: action as any,
    step,
    warehouse: warehouse as any,
    data,
  }
}

/**
 * تحديث خطوة الجلسة
 */
export function updateSessionStep(
  ctx: Context,
  step: string,
  data?: Record<string, any>
): void {
  if (!ctx.session.inventoryForm) return
  
  ctx.session.inventoryForm = {
    ...ctx.session.inventoryForm,
    step,
    data: data ? { ...ctx.session.inventoryForm.data, ...data } : ctx.session.inventoryForm.data,
  }
}

/**
 * تحديث بيانات الجلسة
 */
export function updateSessionData(
  ctx: Context,
  data: Record<string, any>
): void {
  if (!ctx.session.inventoryForm) return
  
  ctx.session.inventoryForm.data = {
    ...ctx.session.inventoryForm.data,
    ...data,
  }
}

/**
 * الحصول على بيانات الجلسة
 */
export function getSessionData<T = Record<string, any>>(ctx: Context): T | null {
  return (ctx.session.inventoryForm?.data as T) || null
}

/**
 * الحصول على الخطوة الحالية
 */
export function getCurrentStep(ctx: Context): string | null {
  return ctx.session.inventoryForm?.step || null
}

/**
 * التحقق من نوع الإجراء
 */
export function isAction(ctx: Context, action: string): boolean {
  return ctx.session.inventoryForm?.action === action
}

/**
 * التحقق من المخزن
 */
export function isWarehouse(ctx: Context, warehouse: string): boolean {
  return ctx.session.inventoryForm?.warehouse === warehouse
}

/**
 * التحقق من الخطوة
 */
export function isStep(ctx: Context, step: string): boolean {
  return ctx.session.inventoryForm?.step === step
}

/**
 * مسح الجلسة
 */
export function clearInventorySession(ctx: Context): void {
  ctx.session.inventoryForm = undefined
}

/**
 * التحقق من وجود جلسة نشطة
 */
export function hasActiveSession(ctx: Context): boolean {
  return !!ctx.session.inventoryForm
}

