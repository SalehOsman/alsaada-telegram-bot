/**
 * Feature Loader
 *
 * Auto-discovers and loads features from the features directory.
 */

import type { FeatureModule, LoadResult } from './types.js'
import { readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from '../../../modules/services/logger/index.js'
import { featureRegistry } from './feature-registry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class FeatureLoader {
  private basePath: string

  constructor(basePath?: string) {
    this.basePath = basePath || join(__dirname, '..')
  }

  /**
   * Load all features from the features directory
   */
  async loadAll(): Promise<LoadResult> {
    const result: LoadResult = {
      loaded: 0,
      failed: 0,
      loadedFeatures: [],
      failedFeatures: [],
    }

    try {
      let items = readdirSync(this.basePath)

      // ✅ FIX للمشكلة #8: ترتيب تحميل الميزات
      // inventory-management يجب أن يُحمل قبل hr-management
      // لأن كلاهما يستخدم on('message:text') handlers
      items = items.sort((a, b) => {
        // inventory-management → أولوية 1 (يُحمل أولاً)
        if (a === 'inventory-management')
          return -1
        if (b === 'inventory-management')
          return 1
        // hr-management → أولوية 2
        if (a === 'hr-management')
          return -1
        if (b === 'hr-management')
          return 1
        // الباقي alphabetically
        return a.localeCompare(b)
      })

      for (const item of items) {
        const itemPath = join(this.basePath, item)

        // Skip non-directories
        if (!statSync(itemPath).isDirectory())
          continue

        // Skip registry directory
        if (item === 'registry')
          continue

        // Check for index.ts (source) or index.js (compiled)
        let indexPath = join(itemPath, 'index.js')
        let useSourceFile = false

        try {
          statSync(indexPath)
        }
        catch {
          // Try .ts file instead
          indexPath = join(itemPath, 'index.ts')
          try {
            statSync(indexPath)
            useSourceFile = true
          }
          catch {
            continue // Skip if neither exists
          }
        }

        // Try to load the feature
        try {
          await this.loadFeature(item, indexPath, useSourceFile)
          result.loaded++
          result.loadedFeatures.push(item)
        }
        catch (error) {
          result.failed++
          result.failedFeatures.push({
            id: item,
            path: itemPath,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }
    catch (error) {
      logger.error({ error }, 'Failed to load features')
    }

    return result
  }

  /**
   * Restore feature states from database
   * IMPORTANT: Must be called AFTER Database.connect()
   */
  async restoreFeatureStates(): Promise<void> {
    try {
      const { Database } = await import('#root/modules/database/index.js')
      const allFeatures = featureRegistry.getAll()

      for (const feature of allFeatures) {
        try {
          // First, try to get state from DepartmentConfig (source of truth)
          let departmentConfig = await Database.prisma.departmentConfig.findUnique({
            where: { code: feature.config.id },
          })

          // If DepartmentConfig doesn't exist, create it
          if (!departmentConfig) {
            logger.debug(`Creating DepartmentConfig for ${feature.config.id}`)
            departmentConfig = await Database.prisma.departmentConfig.create({
              data: {
                code: feature.config.id,
                name: feature.config.name,
                isEnabled: feature.config.enabled ?? true,
                minRole: 'ADMIN',
                order: feature.config.order ?? 0,
              },
            })
          }

          // Use DepartmentConfig.isEnabled as the source of truth
          feature.config.enabled = departmentConfig.isEnabled
          logger.debug(`Restored state for ${feature.config.id} from DepartmentConfig: ${departmentConfig.isEnabled}`)
        }
        catch (error) {
          // Log error but keep default state
          logger.debug(`Error restoring state for ${feature.config.id}, using default: ${error}`)
        }
      }

      logger.info('Feature states restored from database')
    }
    catch (error) {
      logger.error({ error }, 'Failed to restore feature states')
    }
  }

  /**
   * Load a single feature
   */
  private async loadFeature(featureId: string, indexPath: string, useSourceFile: boolean): Promise<void> {
    try {
      // Convert Windows path to file URL
      const normalizedPath = indexPath.replace(/\\/g, '/')
      const fileUrl = useSourceFile
        ? `file:///${normalizedPath}` // Direct TS import
        : `file:///${normalizedPath}` // JS import

      // Import the feature module
      const module = await import(fileUrl)

      // Check if module exports required fields
      if (!module.config) {
        throw new Error(`Feature '${featureId}' does not export 'config'`)
      }

      if (!module.composer && !module.default) {
        throw new Error(`Feature '${featureId}' does not export 'composer' or 'default'`)
      }

      const featureModule: FeatureModule = {
        config: module.config,
        composer: module.composer || module.default,
        init: module.init,
        cleanup: module.cleanup,
      }

      // Register the feature
      featureRegistry.register(featureModule, indexPath)

      // Run init if exists
      if (featureModule.init) {
        await featureModule.init()
      }

      logger.info({
        id: featureModule.config.id,
        enabled: featureModule.config.enabled,
      }, `Feature loaded: ${featureModule.config.name}`)
    }
    catch (error) {
      logger.error({ error }, `Failed to load feature: ${featureId}`)
      throw error
    }
  }

  /**
   * Reload all features
   */
  async reload(): Promise<LoadResult> {
    featureRegistry.clear()
    return await this.loadAll()
  }

  /**
   * Get features directory path
   */
  getBasePath(): string {
    return this.basePath
  }
}

// Singleton instance
export const featureLoader = new FeatureLoader()
