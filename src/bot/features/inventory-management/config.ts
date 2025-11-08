
import type { FeatureConfig, SubFeature } from '../registry/types.js';

const subFeatures: SubFeature[] = [
  {
    id: 'spare_parts',
    name: 'مخزن قطع الغيار',
    icon: '⚙️',
    description: 'إدارة مخزن قطع الغيار',
    enabled: true,
    permissions: ['ADMIN'],
    handler: 'sparePartsStoreHandler',
  },
  {
    id: 'oils_greases',
    name: 'مخزن الزيوت والشحوم',
    icon: '🛢️',
    description: 'إدارة مخزن الزيوت والشحوم',
    enabled: true,
    permissions: ['ADMIN'],
    handler: 'oilsGreasesStoreHandler',
  },
  {
    id: 'diesel',
    name: 'مخزن السولار',
    icon: '⛽',
    description: 'إدارة مخزن السولار',
    enabled: true,
    permissions: ['ADMIN'],
    handler: 'dieselStoreHandler',
  },
  {
    id: 'tools_equipment',
    name: 'مخزن العدد والادوات',
    icon: '🛠️',
    description: 'إدارة مخزن العدد والادوات',
    enabled: true,
    permissions: ['ADMIN'],
    handler: 'toolsEquipmentStoreHandler',
  },
  {
    id: 'management',
    name: 'إدارة قسم المخازن',
    icon: '📈',
    description: 'إدارة إعدادات قسم المخازن',
    enabled: true,
    permissions: ['SUPER_ADMIN'],
    handler: 'inventoryManagementHandler',
  },
];

const config: FeatureConfig = {
  id: 'inventory-management',
  name: 'المخازن',
  icon: '📦',
  description: 'إدارة المخازن والأصول',
  category: 'operations',
  order: 100,
  enabled: true,
  permissions: ['ADMIN'],
  subFeatures: subFeatures,
};

export { config };
