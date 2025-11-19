#!/usr/bin/env tsx

import * as fs from 'node:fs'
import * as path from 'node:path'
import { glob } from 'glob'

/**
 * Script to update all code files to use the new unified inventory models
 * - iNV_OilsGreasesItem → INV_Item
 * - iNV_OilsGreasesCategory → INV_Category
 * - iNV_SparePart → INV_Item
 * - iNV_EquipmentCategory → equipmentCategory
 * - iNV_SparePartTransaction → INV_Transaction
 * - etc.
 */

const replacements = [
  // Oils & Greases models
  {
    from: /prisma\.iNV_OilsGreasesCategory/g,
    to: 'prisma.iNV_Category',
    description: 'Replace iNV_OilsGreasesCategory with INV_Category',
  },
  {
    from: /prisma\.iNV_OilsGreasesItem/g,
    to: 'prisma.iNV_Item',
    description: 'Replace iNV_OilsGreasesItem with INV_Item',
  },
  {
    from: /prisma\.iNV_OilsGreasesPurchase/g,
    to: 'prisma.iNV_Transaction',
    description: 'Replace iNV_OilsGreasesPurchase with INV_Transaction',
  },
  {
    from: /prisma\.iNV_OilsGreasesIssuance/g,
    to: 'prisma.iNV_Transaction',
    description: 'Replace iNV_OilsGreasesIssuance with INV_Transaction',
  },
  {
    from: /prisma\.iNV_OilsGreasesTransfer/g,
    to: 'prisma.iNV_Transaction',
    description: 'Replace iNV_OilsGreasesTransfer with INV_Transaction',
  },
  {
    from: /prisma\.iNV_OilsGreasesReturn/g,
    to: 'prisma.iNV_Transaction',
    description: 'Replace iNV_OilsGreasesReturn with INV_Transaction',
  },
  {
    from: /prisma\.iNV_OilsGreasesAdjustment/g,
    to: 'prisma.iNV_Transaction',
    description: 'Replace iNV_OilsGreasesAdjustment with INV_Transaction',
  },
  
  // Spare Parts models
  {
    from: /prisma\.iNV_SparePart\b/g,
    to: 'prisma.iNV_Item',
    description: 'Replace iNV_SparePart with INV_Item',
  },
  {
    from: /prisma\.iNV_SparePartTransaction/g,
    to: 'prisma.iNV_Transaction',
    description: 'Replace iNV_SparePartTransaction with INV_Transaction',
  },
  {
    from: /prisma\.iNV_EquipmentCategory/g,
    to: 'prisma.equipmentCategory',
    description: 'Replace iNV_EquipmentCategory with equipmentCategory',
  },
]

async function updateFile(filePath: string) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8')
    let updated = false

    for (const replacement of replacements) {
      if (replacement.from.test(content)) {
        content = content.replace(replacement.from, replacement.to)
        updated = true
        console.log(`  ✓ ${replacement.description}`)
      }
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf-8')
      return true
    }

    return false
  }
  catch (error) {
    console.error(`Error updating file ${filePath}:`, error)
    return false
  }
}

async function main() {
  console.log('🚀 Starting inventory models update...\n')

  // Find all TypeScript files in the inventory-management feature
  const files = glob.sync('src/bot/features/inventory-management/**/*.ts', {
    ignore: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
  })

  console.log(`Found ${files.length} files to process\n`)

  let updatedCount = 0

  for (const file of files) {
    console.log(`Processing: ${file}`)
    const wasUpdated = await updateFile(file)
    if (wasUpdated) {
      updatedCount++
      console.log(`  ✅ Updated\n`)
    }
    else {
      console.log(`  ⏭️  No changes needed\n`)
    }
  }

  console.log(`\n✅ Done! Updated ${updatedCount} out of ${files.length} files`)
}

main().catch(console.error)

