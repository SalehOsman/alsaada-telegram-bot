#!/usr/bin/env tsx
/* eslint-disable antfu/no-top-level-await */

import type { PollingConfig, WebhookConfig } from '#root/config.js'
import type { RunnerHandle } from '@grammyjs/runner'
import process from 'node:process'
import { createBot } from '#root/bot/index.js'
import { config } from '#root/config.js'
import { Database } from '#root/modules/database/index.js'
import { initSuperAdmin } from '#root/modules/permissions/init-super-admin.js'
import { logger } from '#root/modules/services/logger/index.js'
import { createServer, createServerManager } from '#root/server/index.js'
import { run } from '@grammyjs/runner'

async function startPolling(config: PollingConfig) {
  const bot = await createBot(config.botToken, {
    config,
    logger,
  })
  let runner: undefined | RunnerHandle

  // graceful shutdown
  onShutdown(async () => {
    logger.info('Shutdown')
    await runner?.stop()
    await Database.disconnect()
  })

  // Initialize database connection
  await Database.connect()

  // Initialize Super Admin from environment
  await initSuperAdmin(config)

  // Initialize default company
  const { CompanyService } = await import('#root/modules/company/index.js')
  await CompanyService.getOrCreate()
  logger.info('Company initialized')

  // Restore feature states from database (MUST be after Database.connect())
  const { featureLoader } = await import('#root/bot/features/registry/index.js')
  await featureLoader.restoreFeatureStates()

  // Initialize bot
  await bot.init()

  // Initialize Leave Notifications Scheduler
  const { LeaveNotificationsScheduler, AutoPenaltiesScheduler } = await import('./modules/schedulers/index.js')
  const leaveScheduler = new LeaveNotificationsScheduler(bot.api)
  leaveScheduler.start()
  logger.info('Leave notifications scheduler initialized')

  // Initialize Auto Penalties Scheduler
  AutoPenaltiesScheduler.start(bot)
  logger.info('Auto penalties scheduler initialized')

  // Try to delete webhook with retry logic
  await deleteWebhookWithRetry(bot.api, logger)

  // start bot
  runner = run(bot, {
    runner: {
      fetch: {
        allowed_updates: config.botAllowedUpdates,
      },
    },
  })

  logger.info({
    msg: 'Bot running...',
    username: bot.botInfo.username,
  })
}

async function startWebhook(config: WebhookConfig) {
  const bot = await createBot(config.botToken, {
    config,
    logger,
  })
  const server = createServer({
    bot,
    config,
    logger,
  })
  const serverManager = createServerManager(server, {
    host: config.serverHost,
    port: config.serverPort,
  })

  // graceful shutdown
  onShutdown(async () => {
    logger.info('Shutdown')
    await serverManager.stop()
    await Database.disconnect()
  })

  // Initialize database connection
  await Database.connect()

  // Initialize Super Admin from environment
  await initSuperAdmin(config)

  // Initialize default company
  const { CompanyService } = await import('#root/modules/company/index.js')
  await CompanyService.getOrCreate()
  logger.info('Company initialized')

  // Restore feature states from database (MUST be after Database.connect())
  const { featureLoader } = await import('#root/bot/features/registry/index.js')
  await featureLoader.restoreFeatureStates()

  // to prevent receiving updates before the bot is ready
  await bot.init()

  // Initialize Leave Notifications Scheduler
  const { LeaveNotificationsScheduler, AutoPenaltiesScheduler } = await import('./modules/schedulers/index.js')
  const leaveScheduler = new LeaveNotificationsScheduler(bot.api)
  leaveScheduler.start()
  logger.info('Leave notifications scheduler initialized')

  // Initialize Auto Penalties Scheduler
  AutoPenaltiesScheduler.start(bot)
  logger.info('Auto penalties scheduler initialized')

  // start server
  const info = await serverManager.start()
  logger.info({
    msg: 'Server started',
    url: info.url,
  })

  // set webhook with retry logic
  await setWebhookWithRetry(bot.api, config, logger)
}

try {
  if (config.isWebhookMode)
    await startWebhook(config)
  else if (config.isPollingMode)
    await startPolling(config)
}
catch (error) {
  logger.error(error)
  process.exit(1)
}

// Utils

async function deleteWebhookWithRetry(api: any, logger: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await api.deleteWebhook()
      logger.info('Webhook deleted successfully')
      return
    }
    catch (error: any) {
      logger.warn({
        attempt,
        maxRetries,
        error: error.message || error,
      }, `Failed to delete webhook (attempt ${attempt}/${maxRetries})`)

      if (attempt === maxRetries) {
        logger.error({
          error: error.message || error,
        }, 'Failed to delete webhook after all retries. Bot will continue in polling mode.')
        return
      }

      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * (2 ** (attempt - 1)), 5000)
      logger.info(`Retrying webhook deletion in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

async function setWebhookWithRetry(api: any, config: any, logger: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await api.setWebhook(config.botWebhook, {
        allowed_updates: config.botAllowedUpdates,
        secret_token: config.botWebhookSecret,
      })
      logger.info({
        msg: 'Webhook was set',
        url: config.botWebhook,
      })
      return
    }
    catch (error: any) {
      logger.warn({
        attempt,
        maxRetries,
        error: error.message || error,
      }, `Failed to set webhook (attempt ${attempt}/${maxRetries})`)

      if (attempt === maxRetries) {
        logger.error({
          error: error.message || error,
        }, 'Failed to set webhook after all retries. Server will continue but webhook may not work.')
        return
      }

      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * (2 ** (attempt - 1)), 5000)
      logger.info(`Retrying webhook setup in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

function onShutdown(cleanUp: () => Promise<void>) {
  let isShuttingDown = false
  const handleShutdown = async () => {
    if (isShuttingDown)
      return
    isShuttingDown = true
    await cleanUp()
  }
  process.on('SIGINT', handleShutdown)
  process.on('SIGTERM', handleShutdown)
}
