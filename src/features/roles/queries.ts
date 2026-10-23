import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/api/endpoints'
import { upstreamError } from '../../shared/api/upstream'
import { showToast } from '../../shared/ui/toastStore'
import { matrixToPrivileges, toRoles } from './lib'
import type { PermissionMatrix, Role } from './types'

// shortcut: một trang 1000 bản ghi; > 1000 cần phân trang thật
const ALL = { currentPage: 1, pageRecords: 1000 }

export const roleKeys = { all: ['roles'] as const }

export type RolesData = { roles: Role[]; companies: { id: string; name: string }[] }

const rows = (res: Record<string, unknown> | null | undefined, key: string) =>
  res && res.result === 0 && Array.isArray(res[key]) ? (res[key] as Record<string, unknown>[]) : []

export function rolesQueryOptions() {
  return queryOptions({
    queryKey: roleKeys.all,
    queryFn: async (): Promise<RolesData> => {
      const [ro, us, co] = await Promise.all([api.findUserRole(), api.findUserAccount(ALL), api.findCompany(ALL)])
      if (ro?.result !== 0) throw new Error(upstreamError(ro, 'Không tải được danh sách vai trò'))
      return {
        roles: toRoles(rows(ro, 'role'), rows(us, 'infos')),
        companies: rows(co, 'infos').map((c) => ({ id: String(c.id), name: String(c.name ?? '') })),
      }
    },
  })
}

export type SaveRoleVars = { id?: string; name: string; companyId: string; permissions: PermissionMatrix; okMsg: string }

export function useSaveRoleMutation(onDone: () => void) {
  const client = useQueryClient()
  return useMutation({
    // mergeUserRole: có id → sửa privilege (doc: không đổi được doanh nghiệp)
    mutationFn: ({ id, name, companyId, permissions }: SaveRoleVars) =>
      api.mergeUserRole({ ...(id ? { id } : {}), name, cid: companyId, privilege: matrixToPrivileges(permissions) }),
    onSuccess: (res, { okMsg }) => {
      if (res?.result === 0) {
        showToast(okMsg, 'success')
        void client.invalidateQueries({ queryKey: roleKeys.all })
        void client.invalidateQueries({ queryKey: ['users'] })
        onDone()
      } else showToast(upstreamError(res, 'Không lưu được vai trò'), 'error')
    },
    onError: () => showToast('Lỗi kết nối máy chủ', 'error'),
  })
}

export function useDeleteRoleMutation(onDone: () => void) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteUserRole(id),
    onSuccess: (res) => {
      if (res?.result === 0) {
        showToast('Đã xóa vai trò', 'success')
        void client.invalidateQueries({ queryKey: roleKeys.all })
        void client.invalidateQueries({ queryKey: ['users'] })
        onDone()
      } else showToast(upstreamError(res, 'Không xóa được vai trò'), 'error')
    },
    onError: () => showToast('Lỗi kết nối máy chủ', 'error'),
  })
}
