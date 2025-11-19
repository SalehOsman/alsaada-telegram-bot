import type { Context } from '../../../../../../context.js'
import { Composer, InlineKeyboard } from 'grammy'

import { Database } from '#root/modules/database/index.js'

export const unifiedListHandler = new Composer<Context>()

interface TransactionFilters {
  type?: 'purchase' | 'issue' | 'transfer' | 'return' | 'adjust' | 'all'
  page?: number
}

unifiedListHandler.callbackQuery('og:trans:unified', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showTransactionsList(ctx, { type: 'all', page: 1 })
})

unifiedListHandler.callbackQuery(/^og:trans:filter:type:(\w+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const type = ctx.match[1] as any
  const page = parseInt(ctx.match[2])
  await showTransactionsList(ctx, { type, page })
})

unifiedListHandler.callbackQuery(/^og:trans:page:(\w+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const type = ctx.match[1] as any
  const page = parseInt(ctx.match[2])
  await showTransactionsList(ctx, { type, page })
})

unifiedListHandler.callbackQuery(/^og:trans:filter:menu:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const page = parseInt(ctx.match[1])
  
  const counts = await getTypeCounts()
  
  const keyboard = new InlineKeyboard()
  keyboard.text(`📊 الكل (${counts.all})`, `og:trans:filter:type:all:${page}`).row()
  keyboard.text(`🛒 شراء (${counts.purchase})`, `og:trans:filter:type:purchase:${page}`).row()
  keyboard.text(`📤 صرف (${counts.issue})`, `og:trans:filter:type:issue:${page}`).row()
  keyboard.text(`🔄 نقل (${counts.transfer})`, `og:trans:filter:type:transfer:${page}`).row()
  keyboard.text(`↩️ إرجاع (${counts.return})`, `og:trans:filter:type:return:${page}`).row()
  keyboard.text(`⚖️ تسوية (${counts.adjust})`, `og:trans:filter:type:adjust:${page}`).row()
  keyboard.text('⬅️ رجوع', 'og:trans:unified')
  
  await ctx.editMessageText(
    '🔍 **اختر نوع المعاملة:**',
    { reply_markup: keyboard, parse_mode: 'Markdown' }
  )
})

async function showTransactionsList(ctx: Context, filters: TransactionFilters) {
  const { type = 'all', page = 1 } = filters
  const limit = 10
  const skip = (page - 1) * limit

  const transactions = await getTransactions(type, skip, limit)
  const totalCount = await getTransactionsCount(type)
  const totalPages = Math.ceil(totalCount / limit)

  let message = '📊 **الحركات والمعاملات**\n\n'
  message += '🔍 **الفلتر الحالي:**\n'
  message += `   النوع: ${getTypeLabel(type)}\n\n`
  message += `📋 **النتائج:** ${totalCount} معاملة\n\n`

  if (transactions.length === 0) {
    message += '❌ لا توجد معاملات'
  } else {
    message += '📝 **المعاملات:**\n\n'
    
    for (let i = 0; i < transactions.length; i++) {
      const trans = transactions[i]
      const num = skip + i + 1
      
      message += `${num}. ${trans.icon} **${trans.typeLabel}** - ${trans.number}\n`
      message += `   📅 ${formatDate(trans.date)}`
      
      if (trans.amount) {
        message += ` | 💰 ${trans.amount.toFixed(2)} جنيه`
      }
      if (trans.quantity) {
        message += ` | 📦 ${trans.quantity} ${trans.unit || ''}`
      }
      
      message += `\n   📦 ${trans.itemName}\n`
      
      if (trans.details) {
        message += `   ${trans.details}\n`
      }
      
      message += '\n'
    }
  }

  if (totalPages > 1) {
    message += `\n📄 الصفحة ${page} من ${totalPages}`
  }

  const keyboard = new InlineKeyboard()
  keyboard.text('🔽 تغيير النوع', `og:trans:filter:menu:${page}`).row()
  
  if (totalPages > 1) {
    const navRow = []
    if (page > 1) {
      navRow.push({ text: '⬅️ السابق', callback_data: `og:trans:page:${type}:${page - 1}` })
    }
    navRow.push({ text: `${page}/${totalPages}`, callback_data: 'noop' })
    if (page < totalPages) {
      navRow.push({ text: 'التالي ➡️', callback_data: `og:trans:page:${type}:${page + 1}` })
    }
    keyboard.row(...navRow)
  }
  
  keyboard.text('🔙 رجوع', 'og:transactions:menu')

  await ctx.editMessageText(message, {
    reply_markup: keyboard,
    parse_mode: 'Markdown',
  })
}

async function getTransactions(type: string, skip: number, limit: number) {
  const transactions: any[] = []

  if (type === 'all' || type === 'purchase') {
    const purchases = await Database.prisma.iNV_Transaction.findMany({
      include: { item: true },
      orderBy: { createdAt: 'desc' },
      skip: type === 'purchase' ? skip : 0,
      take: type === 'purchase' ? limit : undefined,
    })

    transactions.push(...purchases.map((p: any) => ({
      type: 'purchase',
      icon: '🛒',
      typeLabel: 'شراء',
      number: p.transactionNumber,
      date: p.transactionDate,
      amount: (p.unitPrice * p.quantity),
      quantity: p.quantity,
      unit: p.item?.unit || '',
      itemName: p.item?.nameAr || 'غير محدد',
      details: `📍 ${p.item?.supplierName || 'غير محدد'}`,
    })))
  }

  if (type === 'all' || type === 'issue') {
    const issues = await Database.prisma.iNV_Transaction.findMany({
      where: { transactionType: 'ISSUANCE' },
      include: { item: true, recipientEmployee: true, equipment: true },
      orderBy: { transactionDate: 'desc' },
      skip: type === 'issue' ? skip : 0,
      take: type === 'issue' ? limit : undefined,
    })

    transactions.push(...issues.map((i: any) => ({
      type: 'issue',
      icon: '📤',
      typeLabel: 'صرف',
      number: i.transactionNumber,
      date: i.transactionDate,
      quantity: i.quantity,
      unit: i.item?.unit || '',
      itemName: i.item?.nameAr || 'غير محدد',
      details: `👤 ${i.recipientEmployee?.fullName || 'غير محدد'}${i.equipment ? ` | 🚗 ${i.equipment.nameAr}` : ''}`,
    })))
  }

  if (type === 'all' || type === 'transfer') {
    const transfers = await Database.prisma.iNV_Transaction.findMany({
      orderBy: { createdAt: 'desc' },
      skip: type === 'transfer' ? skip : 0,
      take: type === 'transfer' ? limit : undefined,
    })

    transactions.push(...transfers.map((t: any) => ({
      type: 'transfer',
      icon: '🔄',
      typeLabel: 'نقل',
      number: t.transferNumber,
      date: t.transferDate,
      quantity: t.quantity,
      unit: t.item?.unit || '',
      itemName: 'غير محدد',
      details: `📍 نقل بين المواقع`,
    })))
  }

  if (type === 'all' || type === 'return') {
    const returns = await Database.prisma.iNV_Transaction.findMany({
      orderBy: { createdAt: 'desc' },
      skip: type === 'return' ? skip : 0,
      take: type === 'return' ? limit : undefined,
    })

    transactions.push(...returns.map((r: any) => ({
      type: 'return',
      icon: '↩️',
      typeLabel: 'إرجاع',
      number: r.returnNumber,
      date: r.returnDate,
      quantity: r.quantity,
      itemName: 'غير محدد',
      details: `💬 ${r.reason || ''}`,
      unit: ''
    })))
  }

  if (type === 'all' || type === 'adjust') {
    const adjustments = await Database.prisma.iNV_Transaction.findMany({
      orderBy: { createdAt: 'desc' },
      skip: type === 'adjust' ? skip : 0,
      take: type === 'adjust' ? limit : undefined,
    })

    transactions.push(...adjustments.map((a: any) => ({
      type: 'adjust',
      icon: '⚖️',
      typeLabel: 'تسوية',
      number: a.adjustmentNumber,
      date: a.adjustmentDate,
      quantity: Math.abs(a.quantityDifference),
      unit: '',
      itemName: 'غير محدد',
      details: `${a.quantityDifference > 0 ? '➕ زيادة' : '➖ نقص'} | 💬 ${a.reason || ''}`,
    })))
  }

  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (type === 'all') {
    return transactions.slice(skip, skip + limit)
  }

  return transactions
}

async function getTransactionsCount(type: string): Promise<number> {
  if (type === 'all') {
    const [purchases, issues, transfers, returns, adjustments] = await Promise.all([
      Database.prisma.iNV_Transaction.count(),
      Database.prisma.iNV_Transaction.count(),
      Database.prisma.iNV_Transaction.count(),
      Database.prisma.iNV_Transaction.count(),
      Database.prisma.iNV_Transaction.count(),
    ])
    return purchases + issues + transfers + returns + adjustments
  }

  if (type === 'purchase') return Database.prisma.iNV_Transaction.count()
  if (type === 'issue') return Database.prisma.iNV_Transaction.count()
  if (type === 'transfer') return Database.prisma.iNV_Transaction.count()
  if (type === 'return') return Database.prisma.iNV_Transaction.count()
  if (type === 'adjust') return Database.prisma.iNV_Transaction.count()
  return 0
}

async function getTypeCounts() {
  const [purchase, issue, transfer, returnCount, adjust] = await Promise.all([
    Database.prisma.iNV_Transaction.count(),
    Database.prisma.iNV_Transaction.count(),
    Database.prisma.iNV_Transaction.count(),
    Database.prisma.iNV_Transaction.count(),
    Database.prisma.iNV_Transaction.count(),
  ])

  return {
    all: purchase + issue + transfer + returnCount + adjust,
    purchase,
    issue,
    transfer,
    return: returnCount,
    adjust,
  }
}

function getTypeLabel(type: string): string {
  const labels = {
    all: 'الكل',
    purchase: 'شراء',
    issue: 'صرف',
    transfer: 'نقل',
    return: 'إرجاع',
    adjust: 'تسوية',
  }
  return labels[type as keyof typeof labels] || 'الكل'
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
