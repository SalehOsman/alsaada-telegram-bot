import type { Context } from '#root/bot/context.js'

export async function logError(ctx: Context | undefined, error: any, where = ''): Promise<void> {
  try {
    const message = (error && error.message) ? error.message : String(error)
    if (ctx && ctx.logger) {
      ctx.logger.error({ where, error: message, stack: error?.stack ?? null })
    }
    else {
      console.error(`[${where}]`, message, error?.stack ?? '')
    }
  }
  catch (e) {
    console.error('Failed to log error', e)
  }
}
