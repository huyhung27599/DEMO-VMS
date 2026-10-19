import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/api/endpoints'
import { showToast } from '../../shared/ui/toastStore'
import { buildSavePayload, type VehicleFormValues } from './lib'
import { refresh } from './queries'

// vehicle.js:267-303 handleSave. `editing` = state.currentEditId có giá trị.
export type SaveVehicleVars = { values: VehicleFormValues; editing: boolean; companyUnmatched?: boolean }

export function useSaveVehicleMutation({ onSaved }: { onSaved: () => void }) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ values, editing, companyUnmatched }: SaveVehicleVars) => {
      const data = buildSavePayload(values, { companyUnmatched })
      return editing ? api.editVehicle(data) : api.addVehicle(data)
    },
    onSuccess: (res, { editing }) => {
      if (res && res.result === 0) {
        showToast(editing ? 'Cập nhật thành công' : 'Thêm phương tiện mới thành công', 'success')
        onSaved() // closeModal()
        void refresh(client) // không await, như bản gốc
      } else {
        showToast(res?.msg || 'Có lỗi xảy ra khi lưu dữ liệu', 'error')
      }
    },
    onError: (e) => {
      console.error('[VehicleModule] Save error:', e)
      showToast('Lỗi kết nối máy chủ', 'error')
    },
  })
}

// vehicle.js:316-337 confirmDelete
export function useDeleteVehicleMutation({ onDeleted }: { onDeleted: () => void }) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (plate: string) => api.deleteVehicle(plate),
    onSuccess: (res) => {
      if (res && res.result === 0) {
        showToast('Đã xóa phương tiện', 'success')
        onDeleted() // closeDeleteModal()
        void refresh(client)
      } else {
        showToast(res?.msg || 'Không thể xóa phương tiện này', 'error')
      }
    },
    onError: () => {
      showToast('Lỗi khi kết nối API', 'error')
    },
  })
}
