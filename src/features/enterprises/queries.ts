import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/api/endpoints'
import { upstreamError } from '../../shared/api/upstream'
import { showToast } from '../../shared/ui/toastStore'
import { vehicleKeys } from '../vehicle/queries'
import { toUnits, type UnitFormValues } from './lib'
import type { Unit } from './types'

// shortcut: lấy 1 trang 1000 bản ghi; > 1000 đơn vị/người dùng thì cần phân trang thật
const ALL = { currentPage: 1, pageRecords: 1000 }

export const enterpriseKeys = { units: ['enterprises', 'units'] as const }

const rows = (res: Record<string, unknown> | null | undefined, key: string) =>
  res && res.result === 0 && Array.isArray(res[key]) ? (res[key] as Record<string, unknown>[]) : []

export function unitsQueryOptions() {
  return queryOptions({
    queryKey: enterpriseKeys.units,
    queryFn: async (): Promise<Unit[]> => {
      const [co, us, ve] = await Promise.all([api.findCompany(ALL), api.findUserAccount(ALL), api.queryUserVehicle()])
      if (co?.result !== 0) throw new Error(upstreamError(co, 'Không tải được danh sách doanh nghiệp'))
      return toUnits(rows(co, 'infos'), rows(us, 'infos'), rows(ve, 'vehicles'))
    },
  })
}

function useInvalidate() {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: enterpriseKeys.units })
    void client.invalidateQueries({ queryKey: vehicleKeys.companyOptions })
  }
}

export type SaveUnitVars = { values: UnitFormValues; editId?: string }

export function useSaveUnitMutation({ onSaved }: { onSaved: () => void }) {
  const invalidate = useInvalidate()
  return useMutation({
    // mergeCompany: có id → chỉ đổi tên (doc 808gps); tạo mới cần account (+ password, mặc định 000000)
    mutationFn: ({ values, editId }: SaveUnitVars) =>
      api.mergeCompany(
        editId
          ? { id: editId, name: values.name }
          : {
              name: values.name,
              parentId: values.parentId || 0,
              account: values.account.trim(),
              password: values.password || undefined,
            },
      ),
    onSuccess: (res, { editId }) => {
      if (res?.result === 0) {
        showToast(editId ? 'Đã cập nhật đơn vị thành công' : 'Đã tạo đơn vị thành công', 'success')
        invalidate()
        onSaved()
      } else showToast(upstreamError(res, 'Không lưu được đơn vị'), 'error')
    },
    onError: () => showToast('Lỗi kết nối máy chủ', 'error'),
  })
}

export function useDeleteUnitMutation({ onDeleted }: { onDeleted: () => void }) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.deleteCompany(id),
    onSuccess: (res) => {
      if (res?.result === 0) {
        showToast('Đã xóa đơn vị', 'success')
        invalidate()
        onDeleted()
      } else showToast(upstreamError(res, 'Không xóa được đơn vị'), 'error')
    },
    onError: () => showToast('Lỗi kết nối máy chủ', 'error'),
  })
}
