
import { Composer } from 'grammy';
import type { Context } from '../../context.js';
import { config } from './config.js';
import { inventoryMainHandler } from './handlers/inventory-main.handler.js';
import { inventorySubFeaturesHandler } from './handlers/sub-features.handler.js';
import { inventoryManagementHandler } from './handlers/management.handler.js';
import { warehousesHandler } from './handlers/warehouses.handler.js';
import { inventoryBarcodeHandler } from './handlers/barcode/barcode-scan.handler.js';
import { inventorySearchHandler } from './handlers/barcode/search.handler.js';
import { dispensingHandler } from './handlers/dispensing/dispensing.handler.js';
import { receivingHandler } from './handlers/receiving.handler.js';

const composer = new Composer<Context>();

// Register all handlers for this feature
composer.use(inventoryMainHandler);
composer.use(inventorySubFeaturesHandler);
composer.use(inventoryManagementHandler);
composer.use(warehousesHandler);
composer.use(inventoryBarcodeHandler);
composer.use(inventorySearchHandler);
composer.use(dispensingHandler);
composer.use(receivingHandler);

export { composer, config };
