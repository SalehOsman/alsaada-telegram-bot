
import { Database } from '../src/modules/database/index.js';
import { config as inventoryConfig } from '../src/bot/features/inventory-management/config.js';

async function main() {
  await Database.connect();
  console.log('Start seeding inventory management sub-features...');

  if (!inventoryConfig.subFeatures) {
    console.log('No sub-features to seed.');
    return;
  }

  const departmentCode = inventoryConfig.id;

  for (const subFeature of inventoryConfig.subFeatures) {
    // The sub-feature code in the DB is just the ID, not the full path.
    // The menu builder constructs the full path.
    const subFeatureId = subFeature.id;
    
    await Database.prisma.subFeatureConfig.upsert({
      where: { code: subFeatureId }, // The 'code' in the DB is the unique ID from config
      update: {
        name: subFeature.name,
        description: subFeature.description || '',
        minRole: subFeature.permissions?.[0] || 'ADMIN',
        isEnabled: subFeature.enabled,
        departmentCode: departmentCode,
      },
      create: {
        code: subFeatureId,
        name: subFeature.name,
        description: subFeature.description || '',
        minRole: subFeature.permissions?.[0] || 'ADMIN',
        isEnabled: subFeature.enabled,
        departmentCode: departmentCode,
      },
    });
    console.log(`Upserted sub-feature: ${subFeature.name} (${subFeatureId})`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await Database.disconnect();
  });
