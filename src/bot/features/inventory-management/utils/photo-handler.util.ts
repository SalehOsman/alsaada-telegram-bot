/**
 * Photo Handler Utility
 * معالجة الصور بشكل موحد
 */

import type { Context } from '#root/bot/context.js'
import { Buffer } from 'node:buffer'

export class PhotoHandler {
  /**
   * تحميل صورة من Telegram
   */
  static async downloadPhoto(ctx: Context): Promise<Buffer | null> {
    try {
      const photos = ctx.message?.photo
      if (!photos || photos.length === 0) return null

      const photo = photos[photos.length - 1]
      const file = await ctx.api.getFile(photo.file_id)
      const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
      const response = await fetch(fileUrl)

      return Buffer.from(await response.arrayBuffer())
    }
    catch (error) {
      console.error('Error downloading photo:', error)
      return null
    }
  }

  /**
   * حفظ صورة في المجلد
   */
  static async savePhoto(
    buffer: Buffer,
    directory: string,
    fileName: string,
  ): Promise<string> {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const process = await import('node:process')

    const uploadDir = path.join(process.cwd(), 'uploads', directory)
    await fs.mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, fileName)
    await fs.writeFile(filePath, buffer)

    return `uploads/${directory}/${fileName}`
  }

  /**
   * مسح باركود من صورة
   */
  static async scanBarcode(buffer: Buffer): Promise<string | null> {
    try {
      const { BarcodeScannerService } = await import('#root/modules/services/barcode-scanner/index.js')
      const result = await BarcodeScannerService.scanBarcode(buffer)
      return result?.data?.trim() || null
    }
    catch (error) {
      console.error('Error scanning barcode:', error)
      return null
    }
  }

  /**
   * معالجة صورة باركود
   */
  static async handleBarcodePhoto(ctx: Context): Promise<{
    success: boolean
    barcode?: string
    error?: string
  }> {
    const buffer = await this.downloadPhoto(ctx)
    if (!buffer) {
      return { success: false, error: 'لم يتم العثور على صورة' }
    }

    const barcode = await this.scanBarcode(buffer)
    if (!barcode) {
      return { success: false, error: 'لم يتم التعرف على الباركود' }
    }

    return { success: true, barcode }
  }

  /**
   * معالجة صورة منتج
   */
  static async handleProductPhoto(
    ctx: Context,
    barcode: string,
    existingImages: string[] = [],
  ): Promise<{
    success: boolean
    images?: string[]
    error?: string
  }> {
    const buffer = await this.downloadPhoto(ctx)
    if (!buffer) {
      return { success: false, error: 'لم يتم العثور على صورة' }
    }

    try {
      const imageIndex = existingImages.length
      const fileName = `${barcode}-${imageIndex}.jpg`
      const relativePath = await this.savePhoto(buffer, 'inventory/products', fileName)

      return {
        success: true,
        images: [...existingImages, relativePath],
      }
    }
    catch (error) {
      console.error('Error saving product photo:', error)
      return { success: false, error: 'حدث خطأ أثناء حفظ الصورة' }
    }
  }

  /**
   * حذف صورة
   */
  static async deletePhoto(relativePath: string): Promise<boolean> {
    try {
      const fs = await import('node:fs/promises')
      const path = await import('node:path')
      const process = await import('node:process')

      const fullPath = path.join(process.cwd(), relativePath)
      await fs.unlink(fullPath)
      return true
    }
    catch (error) {
      console.error('Error deleting photo:', error)
      return false
    }
  }

  /**
   * حذف عدة صور
   */
  static async deletePhotos(relativePaths: string[]): Promise<number> {
    let deleted = 0
    for (const path of relativePaths) {
      if (await this.deletePhoto(path)) {
        deleted++
      }
    }
    return deleted
  }
}
