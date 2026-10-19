import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { api } from '../../shared/api/endpoints'
import { getUsername } from '../../shared/auth/session'
import { showToast } from '../../shared/ui/toastStore'
import { deriveCompanies, normalizeVehicle, type Company, type Vehicle } from './lib'
import { updateTimestamp } from './store'

export const vehicleKeys = {
  all: ['vehicle'] as const,
  vehicles: ['vehicle', 'vehicles'] as const,
  companies: ['vehicle', 'companies'] as const,
}

// vehicle.js:114-144 loadVehicles. Khi lỗi giữ danh sách cũ (state.vehicles không bị ghi đè).
// Không đặt staleTime/initialData: nạp bằng refresh() qua fetchQuery (xem bên dưới), useQuery chỉ để đọc cache.
export function vehiclesQueryOptions() {
  return queryOptions({
    queryKey: vehicleKeys.vehicles,
    queryFn: async ({ client }): Promise<Vehicle[]> => {
      const previous = client.getQueryData<Vehicle[]>(vehicleKeys.vehicles) ?? []
      try {
        const res = await api.queryUserVehicle()
        if (res && res.result === 0) {
          const vehicles = Array.isArray(res.vehicles) ? (res.vehicles as Vehicle[]) : []
          // Chuẩn hóa theo payload FleetControl/808gps: nm là biển số, dl[] là danh sách thiết bị
          return vehicles.map(normalizeVehicle)
        }
        console.error('[VehicleModule] Error fetching vehicles:', res?.msg)
        showToast('Không thể tải danh sách xe', 'error')
      } catch (error) {
        console.error('[VehicleModule] Exception fetching vehicles:', error)
      }
      return previous
    },
  })
}

// vehicle.js:146-172 loadCompanies: suy ra từ danh sách xe đã nạp (phải chạy SAU loadVehicles).
export function companiesQueryOptions() {
  return queryOptions({
    queryKey: vehicleKeys.companies,
    queryFn: async ({ client }): Promise<Company[]> => {
      const vehicles = client.getQueryData<Vehicle[]>(vehicleKeys.vehicles) ?? []
      return deriveCompanies(vehicles, getUsername())
    },
  })
}

/**
 * vehicle.js:104-112 refresh(): cập nhật giờ, nạp xe rồi mới nạp đơn vị (tuần tự).
 * fetchQuery gộp lời gọi trùng khi đang nạp, tương đương cờ isLoading của loadVehicles.
 * Bản gốc gọi khi: init() lần đầu hiển thị app nếu hash là #vehicle, mỗi hashchange sang #vehicle,
 * và sau khi lưu/xóa thành công.
 */
export async function refresh(client: QueryClient): Promise<void> {
  updateTimestamp()
  await client.fetchQuery(vehiclesQueryOptions())
  await client.fetchQuery(companiesQueryOptions())
}
