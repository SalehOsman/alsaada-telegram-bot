import { StorageLocationsService } from '#root/modules/services/inventory/shared/storage-locations.service.js'

export class LocationsService {
  static async getLocations() {
    return StorageLocationsService.getLocations()
  }

  static async getLocationById(id: number) {
    return StorageLocationsService.getLocationById(id)
  }

  static async updateLocation(id: number, data: { nameAr?: string; code?: string; description?: string }, userId: bigint) {
    return StorageLocationsService.updateLocation(id, data, userId)
  }

  static async deleteLocation(id: number) {
    return StorageLocationsService.deleteLocation(id)
  }
}
