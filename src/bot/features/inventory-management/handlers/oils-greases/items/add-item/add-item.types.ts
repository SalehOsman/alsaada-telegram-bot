/**
 * Types for Add Item functionality
 */

export interface AddItemData {
  barcode: string
  nameAr: string
  nameEn?: string
  categoryId: number
  code: string
  locationId?: number
  unit: string
  unitCapacity?: number
  quantity: number
  totalLiters?: number
  minQuantity?: number
  unitPrice: number
  supplierName?: string
  notes?: string
  images?: string[]
}

export type AddItemStep =
  | 'awaiting_barcode_image'
  | 'awaiting_name_ar'
  | 'awaiting_name_en'
  | 'awaiting_category'
  | 'awaiting_location'
  | 'awaiting_unit'
  | 'awaiting_unit_capacity'
  | 'awaiting_quantity'
  | 'awaiting_min_quantity'
  | 'awaiting_price'
  | 'awaiting_supplier'
  | 'awaiting_notes'
  | 'awaiting_images'
