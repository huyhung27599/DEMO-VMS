import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/api/endpoints'
import type { ApiResponse } from '../../shared/api/client'
import { upstreamError } from '../../shared/api/upstream'
import { showToast } from '../../shared/ui/toastStore'
import { companiesFromVehicleResponse, vehicleKeys, type CompanyNode } from '../vehicle/queries'
import { toDevices, type DeviceFormValues } from './lib'
import type { Device } from './types'

type Row = Record<string, unknown>

export const deviceKeys = { list: ['devices', 'list'] as const }

export type DevicesData = {
  devices: Device[]
  companies: CompanyNode[]
  vehicles: { plate: string; enterpriseId: string }[]
}

const ok = (r: unknown): r is Row => !!r && (r as Row).result === 0

// shortcut: getLoadDeviceInfo gọi riêng từng thiết bị, tối đa 50; đội xe lớn hơn thì chuyển sang nạp ở màn chi tiết
const MAX_LOAD_INFO = 50

export function devicesQueryOptions() {
  return queryOptions({
    queryKey: deviceKeys.list,
    queryFn: async (): Promise<DevicesData> => {
      const [ve, st] = await Promise.all([api.queryUserVehicle(), api.getDeviceStatus('', '')])
      if (!ok(ve)) throw new Error(upstreamError(ve, 'Không tải được danh sách thiết bị'))
      const vehicles = Array.isArray(ve.vehicles) ? (ve.vehicles as Row[]) : []
      const statusRows = ok(st) && Array.isArray(st.status) ? (st.status as Row[]) : []
      const devIds = vehicles
        .flatMap((v) => (Array.isArray(v.dl) ? (v.dl as Row[]) : []))
        .map((d) => String(d?.id ?? ''))
        .filter(Boolean)
        .slice(0, MAX_LOAD_INFO)
      const loads = await Promise.all(devIds.map((id) => api.getLoadDeviceInfo(id).catch(() => null)))
      const loadByDev: Record<string, Row> = {}
      loads.forEach((r, i) => {
        const row = ok(r) && Array.isArray(r.devstaus) ? (r.devstaus as Row[])[0] : undefined
        if (row) loadByDev[devIds[i]] = row
      })
      const companies = companiesFromVehicleResponse(ve)
      return {
        devices: toDevices(vehicles, statusRows, loadByDev, Object.fromEntries(companies.map((c) => [c.id, c.name]))),
        companies,
        vehicles: vehicles
          .map((v) => ({ plate: String(v.nm || v.vehiIdno || ''), enterpriseId: String(v.pid ?? '') }))
          .filter((v) => v.plate),
      }
    },
  })
}

function useInvalidate() {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: deviceKeys.list })
    void client.invalidateQueries({ queryKey: vehicleKeys.all })
  }
}

function fail(res: unknown, msg: string): never {
  throw new Error(upstreamError(res as ApiResponse, msg))
}

export type SaveDeviceVars = { values: DeviceFormValues; editing: Device | null; companyName: string }

export function useSaveDeviceMutation({ onSaved }: { onSaved: () => void }) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ values, editing, companyName }: SaveDeviceVars) => {
      const devIdno = values.serial
      if (!editing) {
        // shortcut: protocol 3 (JT/T 1078 video), devType 7 (video), factoryType 0 — chỉnh khi biết đúng dòng thiết bị
        const add = await api.addDevice({ devIdno, protocol: 3, devType: 7, factoryType: 0, companyName, channelNum: 4 })
        if (!ok(add)) fail(add, 'Không tạo được thiết bị')
      } else if (editing.vehiclePlate && editing.vehiclePlate !== values.vehicleId) {
        const un = await api.uninstallDevice(devIdno, editing.vehiclePlate)
        if (!ok(un)) fail(un, 'Không gỡ được thiết bị khỏi xe cũ')
      }
      if (values.vehicleId && values.vehicleId !== editing?.vehiclePlate) {
        const ins = await api.installVehicle({ vehiIdno: values.vehicleId, devIdno })
        if (!ok(ins)) fail(ins, 'Không gắn được thiết bị lên xe')
      }
    },
    onSuccess: (_r, { editing }) => {
      showToast(editing ? 'Đã cập nhật thiết bị thành công' : 'Đã tạo thiết bị thành công', 'success')
      invalidate()
      onSaved()
    },
    onError: (e) => {
      invalidate() // bước trước có thể đã thành công
      showToast(e instanceof Error ? e.message : 'Lỗi kết nối máy chủ', 'error')
    },
  })
}

export function useDeleteDeviceMutation({ onDeleted }: { onDeleted: () => void }) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (device: Device) => {
      // deleteDevice thất bại nếu thiết bị còn gắn xe (doc 808gps)
      if (device.vehiclePlate) {
        const un = await api.uninstallDevice(device.id, device.vehiclePlate)
        if (!ok(un)) fail(un, 'Không gỡ được thiết bị khỏi xe')
      }
      const del = await api.deleteDevice(device.id)
      if (!ok(del)) fail(del, 'Không xóa được thiết bị')
    },
    onSuccess: () => {
      showToast('Đã xóa thiết bị', 'success')
      invalidate()
      onDeleted()
    },
    onError: (e) => {
      invalidate()
      showToast(e instanceof Error ? e.message : 'Lỗi kết nối máy chủ', 'error')
    },
  })
}
