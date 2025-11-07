import type { Context, SessionData } from '#root/bot/context.js'
import type { Config } from '#root/config.js'
import type { Logger } from '#root/modules/services/logger/index.js'
import type { BotConfig } from 'grammy'
import { adminFeature } from '#root/bot/features/admin.js'
import { languageFeature } from '#root/bot/features/language.js'
import { mainMenuComposer } from '#root/bot/features/main-menu.js'
import { sendNotificationConversation } from '#root/bot/features/notifications-panel/conversations/send-notification-conversation.js'
import { featureLoader, featureRegistry } from '#root/bot/features/registry/index.js'
import { settingsFeatureComposer } from '#root/bot/features/settings/index.js'
import { unhandledFeature } from '#root/bot/features/unhandled.js'
import { welcomeFeature, welcomeGenericHandler } from '#root/bot/features/welcome.js'
import { errorHandler } from '#root/bot/handlers/error.js'
import { banCheck } from '#root/bot/middlewares/ban-check.js'
import { session } from '#root/bot/middlewares/session.js'
import { updateLogger } from '#root/bot/middlewares/update-logger.js'
import { greetingConversation } from '#root/modules/interaction/wizards/greeting.js'
import { joinRequestConversation } from '#root/modules/interaction/wizards/join-request.js'
import { loadUserPermissions } from '#root/modules/permissions/index.js'
import { FileManagementService } from '#root/modules/services/file-management/index.js'
import { i18n, isMultipleLocales } from '#root/modules/services/i18n-extended/i18n.js'
import { registerDefaultSettings, settingsManager } from '#root/modules/settings/index.js'
// import { middlewareRegistry, rateLimiterHandler, startRateLimitCleanup } from '#root/modules/middleware/index.js'
import { autoChatAction } from '@grammyjs/auto-chat-action'
import { conversations } from '@grammyjs/conversations'
import { hydrate } from '@grammyjs/hydrate'
import { hydrateReply, parseMode } from '@grammyjs/parse-mode'
import { sequentialize } from '@grammyjs/runner'
import { MemorySessionStorage, Bot as TelegramBot } from 'grammy'

interface Dependencies {
  config: Config
  logger: Logger
}

function getSessionKey(ctx: Omit<Context, 'session'>) {
  return ctx.chat?.id.toString()
}

export async function createBot(token: string, dependencies: Dependencies, botConfig?: BotConfig<Context>) {
  const {
    config,
    logger,
  } = dependencies

  // Initialize Settings Manager
  registerDefaultSettings(settingsManager)
  logger.info('Settings Manager initialized')

  // Initialize File Storage (creates uploads/ and subfolders if missing)
  try {
    await FileManagementService.initialize()
    logger.info('File storage initialized')
  }
  catch (error) {
    logger.error({ error }, 'Failed to initialize file storage')
  }

  // Check maintenance mode
  const maintenanceMode = await settingsManager.get<boolean>('bot.maintenance_mode')
  if (maintenanceMode) {
    const maintenanceMsg = await settingsManager.get<string>('bot.maintenance_message')
    logger.warn({ message: maintenanceMsg }, 'Bot is in maintenance mode')
  }

  const bot = new TelegramBot<Context>(token, botConfig)

  bot.use(async (ctx, next) => {
    ctx.config = config
    ctx.logger = logger.child({
      update_id: ctx.update.update_id,
    })

    await next()
  })

  const protectedBot = bot.errorBoundary(errorHandler)

  // Middlewares
  bot.api.config.use(parseMode('HTML'))

  if (config.isPollingMode)
    protectedBot.use(sequentialize(getSessionKey))
  if (config.isDebug)
    protectedBot.use(updateLogger())
  protectedBot.use(autoChatAction(bot.api))
  protectedBot.use(hydrateReply)
  protectedBot.use(hydrate())
  protectedBot.use(session({
    getSessionKey,
    storage: new MemorySessionStorage<SessionData>(),
  }))
  protectedBot.use(i18n)

  // Load user permissions from database (but don't auto-create)
  protectedBot.use(async (ctx, next) => {
    // Don't auto-create users - they will be created only after join request approval
    await next()
  })

  // Load permissions context into ctx.dbUser
  protectedBot.use(loadUserPermissions())

  // Ban check - Block banned users from any interaction
  protectedBot.use(banCheck())

  // Rate Limiter - Protection from spam and abuse
  // protectedBot.use(rateLimiterHandler)
  // logger.info('Rate Limiter middleware enabled')

  // Start rate limit cleanup scheduler
  // startRateLimitCleanup()

  // Maintenance mode check (allow SUPER_ADMIN to bypass)
  protectedBot.use(async (ctx, next) => {
    const maintenanceMode = await settingsManager.get<boolean>('bot.maintenance_mode')
    if (maintenanceMode && ctx.dbUser?.role !== 'SUPER_ADMIN') {
      const maintenanceMsg = await settingsManager.get<string>('bot.maintenance_message') || 'البوت تحت الصيانة حالياً.'
      await ctx.reply(maintenanceMsg)
      return
    }
    await next()
  })

  protectedBot.use(conversations())
  protectedBot.use(greetingConversation())
  protectedBot.use(joinRequestConversation())
  protectedBot.use(sendNotificationConversation()) // MUST be registered with other conversations!

  // Register welcome feature specific handlers FIRST (commands and keyboard buttons)
  // This ensures main menu and profile buttons work immediately
  protectedBot.use(welcomeFeature)

  // Load features AFTER welcome buttons but BEFORE form handlers
  const loadResult = await featureLoader.loadAll()
  logger.info({
    loaded: loadResult.loaded,
    failed: loadResult.failed,
    features: loadResult.loadedFeatures,
  }, 'Features loaded')

  // Register all feature composers (for callbacks and FORM handling)
  // These have PRIORITY for handling active forms like addEmployee
  loadResult.loadedFeatures.forEach((featureId) => {
    const feature = featureRegistry.get(featureId)
    if (feature && feature.composer) {
      protectedBot.use(feature.composer)
      logger.info(`Registered composer for: ${featureId}`)
    }
  })

  // Then register general handlers
  protectedBot.use(settingsFeatureComposer) // Settings feature
  protectedBot.use(adminFeature)
  if (isMultipleLocales)
    protectedBot.use(languageFeature)

  // Main menu (should be AFTER feature composers so features handle their callbacks first)
  protectedBot.use(mainMenuComposer)

  // Generic text handler from welcome (LOWEST priority - only for profile editing)
  protectedBot.use(welcomeGenericHandler)

  // must be the last handler
  protectedBot.use(unhandledFeature)

  return bot
}

export type Bot = Awaited<ReturnType<typeof createBot>>
