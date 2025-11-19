import type { Config } from '#root/config.js'
import type { UserPermissionContext } from '#root/modules/permissions/index.js'
import type { Logger } from '#root/modules/services/logger/index.js'
import type { AutoChatActionFlavor } from '@grammyjs/auto-chat-action'
import type { ConversationFlavor } from '@grammyjs/conversations'
import type { HydrateFlavor } from '@grammyjs/hydrate'
import type { I18nFlavor } from '@grammyjs/i18n'
import type { ParseModeFlavor } from '@grammyjs/parse-mode'
import type { Context as DefaultContext, SessionFlavor } from 'grammy'

export interface SessionData {
  awaitingInput?: {
    type: string
    messageId?: number
    data?: any
  }
  notificationData?: {
    type: string
    priority: string
    targetAudience: string
    targetRole?: string
    targetUserIds?: number[]
    message?: string
  }
  templateData?: {
    templateId: string
    variables: Record<string, string>
  }
  profileEditField?: string
  qrGenerationMode?: boolean
  // Template management
  conversationState?: string
  templateCreationMode?: string
  templateCreationData?: any
  templateEditMode?: boolean
  templateEditData?: {
    templateId: string
    originalTemplate: any
    currentTemplate?: any
  }
  templateVariableEdit?: {
    templateId: string
    variables: any[]
    selectedVariableIndex?: number
  }
  // Employee editing
  editingField?: {
    employeeId: number
    fieldName: string
    fieldLabel: string
    inputType: string
  }
  // Sequential editing for transfer numbers
  sequentialEdit?: {
    employeeId: number
    step: 'number' | 'type'
    transferField: 'transferNumber1' | 'transferNumber2'
    transferTypeField: 'transferType1' | 'transferType2'
    newValue?: string
  }
  // Date management for status changes
  statusChangeEdit?: {
    employeeId: number
    newStatus: string
    step: 'confirm' | 'date' | 'awaiting_date_selection' | 'awaiting_date_input'
    dateField: 'resignationDate' | 'terminationDate' | 'retirementDate'
    dateType: 'today' | 'custom'
  }
  // Employee filter state
  lastFilter?: {
    type: 'department' | 'governorate' | 'position' | 'status' | 'all'
    value: number | string | null
    name: string
  }
  // Custom reports
  customReport?: {
    fields: string[]
    filters: Record<string, any>
    advancedFilters?: {
      hireDateFrom?: string
      hireDateTo?: string
      salaryFrom?: number
      salaryTo?: number
      ageFrom?: number
      ageTo?: number
      experienceFrom?: number
      experienceTo?: number
    }
  }
  // Leaves schedule filter
  leavesScheduleFilter?: {
    departmentId?: number
    positionId?: number
    governorateId?: number
    period?: 'week' | 'month' | 'all'
  }
  // Mission form data
  missionForm?: {
    step: string
    employeeId?: number
    missionType?: string
    startDate?: string
    endDate?: string
    location?: string
    purpose?: string
    allowanceAmount?: number
    notes?: string
    messageIdsToDelete?: number[]
  }
  // Employee search state
  employeeSearch?: {
    filterType: 'department' | 'governorate' | 'position' | 'status' | 'all'
    filterId?: number
    filterValue?: string
    searchTerm?: string
    employeeIds?: number[]
  }
  // Settlement state
  settlementState?: {
    mode: 'custom-period' | 'bulk-employee' | 'bulk-period' | 'bulk-type'
    step: 'start-date' | 'end-date' | 'select-employee' | 'confirm'
    employeeId?: number
    employeeName?: string
    transactionIds?: number[]
    startDate?: string
    endDate?: string
  }
  // Work/Leave cycle management
  workLeaveCycle?: {
    type: 'position' | 'employee' | 'search'
    entityId?: number
    fieldType?: 'work' | 'leave' | 'both'
    step?: 'awaiting_value' | 'awaiting_name'
    data?: any
  }
  // Penalty cancellation
  penaltyCancel?: {
    penaltyId: number
    step: 'waiting_reason'
  }
  // Inventory management - Spare parts form
  inventoryForm?: {
    action: 'add' | 'edit' | 'search' | 'purchase' | 'issue' | 'transfer' | 'return'
    step: string
    warehouse?: 'spare-parts' | 'oils-greases' | 'diesel' | 'tools'
    categoryId?: number
    partId?: number
    data?: any
    messageIds?: number[] // For tracking intermediate messages to delete
    // Navigation & Edit features (v3.0+)
    navigationHistory?: Array<{
      step: string
      timestamp: number
      data?: Record<string, any>
    }>
    editMode?: boolean // True when editing a field from review
    editingField?: string // Field being edited
    returnToStep?: string // Step to return to after edit
  }
  // Inventory - Image upload
  uploadingImageFor?: {
    type: 'spare-part' | 'equipment'
    id: number
    barcode?: string
  }
  // Inventory - Audit system
  currentAuditId?: number
  auditItems?: number[]
  currentAuditIndex?: number
  currentAuditItem?: any
  waitingForAuditQuantity?: boolean
  waitingForSingleAuditCode?: boolean
  waitingForSingleAuditBarcode?: boolean
  waitingForSingleAuditName?: boolean
  // Storage location form
  locationForm?: {
    prefix: string
    backCallback: string
    step: 'code' | 'nameAr' | 'nameEn' | 'edit'
    code?: string
    nameAr?: string
    locationId?: number
    field?: string
  }
  // Category form
  categoryForm?: {
    prefix: string
    backCallback: string
    step: 'code' | 'nameAr' | 'nameEn' | 'edit'
    code?: string
    nameAr?: string
    categoryId?: number
    field?: string
  }
}

interface ExtendedContextFlavor {
  logger: Logger
  config: Config
  dbUser?: UserPermissionContext
}

export type Context = ConversationFlavor<
  ParseModeFlavor<
    HydrateFlavor<
      DefaultContext &
      ExtendedContextFlavor &
      SessionFlavor<SessionData> &
      I18nFlavor &
      AutoChatActionFlavor
    >
  >
>
