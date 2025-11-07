/**
 * خدمة إدارة عقوبات التأخير في الإجازات
 */

import type { DelayPenaltyType, PenaltyStatus } from '../../../generated/prisma/index.js'
import { Database } from '../database/index.js'
import type { Bot, Api } from 'grammy'
import type { Context } from '#root/bot/context.js'
import { PenaltiesNotificationsService } from './penalties-notifications.service.js'

export class DelayPenaltyService {
  /**
   * حساب وإنشاء عقوبة تلقائية عند تسجيل العودة بتأخير
   */
  static async createPenaltyForLeave(params: {
    leaveId: number
    employeeId: number
    delayDays: number
    createdBy: bigint
    api?: Api | Bot<Context>
  }) {
    const { leaveId, employeeId, delayDays, createdBy, api } = params
    const prisma = Database.prisma

    // إذا لا يوجد تأخير، لا داعي للعقوبة
    if (delayDays <= 0) {
      return null
    }

    // البحث عن السياسة المناسبة
    // نبحث عن أقرب سياسة أكبر من أو تساوي عدد أيام التأخير
    const policy = await prisma.hR_DelayPenaltyPolicy.findFirst({
      where: {
        isActive: true,
        delayDays: {
          lte: delayDays, // السياسة تغطي هذا العدد من الأيام أو أقل
        },
      },
      orderBy: {
        delayDays: 'desc', // نأخذ أكبر سياسة مناسبة
      },
    })

    if (!policy) {
      console.warn(`⚠️ لم يتم العثور على سياسة عقوبة لـ ${delayDays} أيام تأخير`)
      return null
    }

    // إنشاء العقوبة
    const penalty = await prisma.hR_AppliedPenalty.create({
      data: {
        leaveId,
        employeeId,
        delayDays,
        policyId: policy.id,
        penaltyType: policy.penaltyType as DelayPenaltyType,
        deductionDays: policy.deductionDays,
        suspensionDays: policy.suspensionDays,
        status: 'PENDING' as PenaltyStatus,
        createdBy,
      },
      include: {
        policy: true,
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
          },
        },
        leave: {
          select: {
            id: true,
            leaveNumber: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    })

    // تم إنشاء عقوبة تأخير بنجاح
    console.log(`✅ تم إنشاء عقوبة تأخير: ${penalty.id} للموظف ${penalty.employee?.fullName}`)
    
    // إرسال إشعار فوري للسوبر أدمنز
    if (api) {
      await PenaltiesNotificationsService.notifyNewPenalty(api, penalty.id)
        .catch(err => console.error('خطأ في إرسال إشعار العقوبة:', err))
    }
    
    return penalty
  }

  /**
   * اعتماد عقوبة
   */
  static async approvePenalty(penaltyId: number) {
    const prisma = Database.prisma

    // جلب معلومات العقوبة
    const penalty = await prisma.hR_AppliedPenalty.findUnique({
      where: { id: penaltyId },
      include: { employee: true },
    })

    if (!penalty) {
      throw new Error('العقوبة غير موجودة')
    }

    // تحديث العقوبة
    const updatedPenalty = await prisma.hR_AppliedPenalty.update({
      where: { id: penaltyId },
      data: {
        status: 'APPROVED' as PenaltyStatus,
        updatedAt: new Date(),
      },
    })

    // إذا كانت عقوبة إيقاف، تحديث حالة الموظف إلى SUSPENDED
    if (penalty.penaltyType === 'SUSPENSION') {
      await prisma.employee.update({
        where: { id: penalty.employeeId },
        data: {
          employmentStatus: 'SUSPENDED',
          updatedAt: new Date(),
        },
      })
      console.log(`✅ تم تحديث حالة الموظف ${penalty.employee.fullName} إلى SUSPENDED`)
    }

    return updatedPenalty
  }

  /**
   * إلغاء عقوبة مع ذكر السبب
   */
  static async cancelPenalty(params: {
    penaltyId: number
    cancelReason: string
    cancelledBy: bigint
  }) {
    const { penaltyId, cancelReason, cancelledBy } = params
    const prisma = Database.prisma

    return await prisma.hR_AppliedPenalty.update({
      where: { id: penaltyId },
      data: {
        status: 'CANCELLED' as PenaltyStatus,
        isCancelled: true,
        cancelReason,
        cancelledBy,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  /**
   * جلب العقوبات المعلقة للمراجعة
   */
  static async getPendingPenalties(limit = 20, offset = 0) {
    const prisma = Database.prisma

    return await prisma.hR_AppliedPenalty.findMany({
      where: {
        status: 'PENDING',
        isCancelled: false,
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            nickname: true,
          },
        },
        leave: {
          select: {
            id: true,
            leaveNumber: true,
            startDate: true,
            endDate: true,
            actualReturnDate: true,
          },
        },
        policy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    })
  }

  /**
   * جلب العقوبات المعتمدة ولم تُطبق على الراتب بعد
   */
  static async getApprovedPenaltiesForPayroll(params: {
    employeeId: number
    periodStart: Date
    periodEnd: Date
  }) {
    const { employeeId, periodStart, periodEnd } = params
    const prisma = Database.prisma

    return await prisma.hR_AppliedPenalty.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        isAppliedToPayroll: false,
        isCancelled: false,
        penaltyType: 'DEDUCTION', // فقط الخصومات
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: {
        leave: true,
        policy: true,
      },
    })
  }

  /**
   * تطبيق العقوبة على الراتب
   */
  static async markPenaltyAsApplied(penaltyId: number, payrollRecordId: number) {
    const prisma = Database.prisma

    return await prisma.hR_AppliedPenalty.update({
      where: { id: penaltyId },
      data: {
        isAppliedToPayroll: true,
        payrollRecordId,
        appliedToPayrollAt: new Date(),
        status: 'APPLIED' as PenaltyStatus,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * جلب جميع السياسات النشطة
   */
  static async getAllPolicies() {
    const prisma = Database.prisma

    return await prisma.hR_DelayPenaltyPolicy.findMany({
      where: { isActive: true },
      orderBy: { delayDays: 'asc' },
    })
  }

  /**
   * تحديث سياسة عقوبة
   */
  static async updatePolicy(params: {
    policyId: number
    deductionDays?: number
    suspensionDays?: number | null
    updatedBy: bigint
  }) {
    const { policyId, deductionDays, suspensionDays, updatedBy } = params
    const prisma = Database.prisma

    return await prisma.hR_DelayPenaltyPolicy.update({
      where: { id: policyId },
      data: {
        ...(deductionDays !== undefined && { deductionDays }),
        ...(suspensionDays !== undefined && { suspensionDays }),
        updatedBy,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * جلب سجل العقوبات لعامل معين
   */
  static async getEmployeePenalties(employeeId: number, limit = 50) {
    const prisma = Database.prisma

    return await prisma.hR_AppliedPenalty.findMany({
      where: { employeeId },
      include: {
        leave: {
          select: {
            leaveNumber: true,
            startDate: true,
            endDate: true,
            actualReturnDate: true,
          },
        },
        policy: true,
        payrollRecord: {
          select: {
            month: true,
            year: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })
  }

  /**
   * جلب الموظفين الموقوفين حالياً
   */
  static async getSuspendedEmployees() {
    const prisma = Database.prisma

    return await prisma.employee.findMany({
      where: {
        employmentStatus: 'SUSPENDED',
        isActive: true,
      },
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        nickname: true,
        position: {
          select: {
            titleAr: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        fullName: 'asc',
      },
    })
  }

  /**
   * جلب عقوبات الإيقاف النشطة للموظف
   */
  static async getActiveSuspensionPenalty(employeeId: number) {
    const prisma = Database.prisma

    return await prisma.hR_AppliedPenalty.findFirst({
      where: {
        employeeId,
        penaltyType: 'SUSPENSION',
        status: 'APPROVED',
        isCancelled: false,
      },
      include: {
        leave: {
          select: {
            leaveNumber: true,
            startDate: true,
            endDate: true,
            actualReturnDate: true,
          },
        },
        employee: {
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * رفع الإيقاف بدون عقوبة (مع عذر)
   */
  static async liftSuspensionWithoutPenalty(params: {
    penaltyId: number
    excuse: string
    liftedBy: bigint
  }) {
    const { penaltyId, excuse, liftedBy } = params
    const prisma = Database.prisma

    // جلب العقوبة
    const penalty = await prisma.hR_AppliedPenalty.findUnique({
      where: { id: penaltyId },
      include: { employee: true },
    })

    if (!penalty) {
      throw new Error('العقوبة غير موجودة')
    }

    if (penalty.penaltyType !== 'SUSPENSION') {
      throw new Error('هذه العقوبة ليست عقوبة إيقاف')
    }

    // إلغاء العقوبة
    await prisma.hR_AppliedPenalty.update({
      where: { id: penaltyId },
      data: {
        status: 'CANCELLED' as PenaltyStatus,
        isCancelled: true,
        cancelReason: excuse,
        cancelledBy: liftedBy,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // تحديث حالة الموظف إلى ACTIVE
    await prisma.employee.update({
      where: { id: penalty.employeeId },
      data: {
        employmentStatus: 'ACTIVE',
        updatedAt: new Date(),
      },
    })

    console.log(`✅ تم رفع الإيقاف عن الموظف ${penalty.employee.fullName} بدون عقوبة`)

    return { success: true, employee: penalty.employee }
  }

  /**
   * رفع الإيقاف مع عقوبة خصم
   */
  static async liftSuspensionWithPenalty(params: {
    penaltyId: number
    deductionDays: number
    liftedBy: bigint
  }) {
    const { penaltyId, deductionDays, liftedBy } = params
    const prisma = Database.prisma

    // جلب العقوبة الأصلية
    const originalPenalty = await prisma.hR_AppliedPenalty.findUnique({
      where: { id: penaltyId },
      include: { employee: true, leave: true },
    })

    if (!originalPenalty) {
      throw new Error('العقوبة غير موجودة')
    }

    if (originalPenalty.penaltyType !== 'SUSPENSION') {
      throw new Error('هذه العقوبة ليست عقوبة إيقاف')
    }

    // إلغاء عقوبة الإيقاف الأصلية
    await prisma.hR_AppliedPenalty.update({
      where: { id: penaltyId },
      data: {
        status: 'CANCELLED' as PenaltyStatus,
        isCancelled: true,
        cancelReason: `تم رفع الإيقاف واستبداله بعقوبة خصم ${deductionDays} يوم`,
        cancelledBy: liftedBy,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // إنشاء عقوبة خصم جديدة
    const newPenalty = await prisma.hR_AppliedPenalty.create({
      data: {
        leaveId: originalPenalty.leaveId,
        employeeId: originalPenalty.employeeId,
        delayDays: originalPenalty.delayDays,
        policyId: originalPenalty.policyId,
        penaltyType: 'DEDUCTION' as DelayPenaltyType,
        deductionDays,
        suspensionDays: null,
        status: 'APPROVED' as PenaltyStatus,
        notes: `عقوبة بديلة عن الإيقاف - تم رفع الإيقاف`,
        createdBy: liftedBy,
      },
    })

    // تحديث حالة الموظف إلى ACTIVE
    await prisma.employee.update({
      where: { id: originalPenalty.employeeId },
      data: {
        employmentStatus: 'ACTIVE',
        updatedAt: new Date(),
      },
    })

    console.log(`✅ تم رفع الإيقاف عن الموظف ${originalPenalty.employee.fullName} مع عقوبة خصم ${deductionDays} يوم`)

    return {
      success: true,
      employee: originalPenalty.employee,
      newPenalty,
    }
  }
}
