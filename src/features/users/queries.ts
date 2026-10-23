import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/api/endpoints'
import { upstreamError } from '../../shared/api/upstream'
import { showToast } from '../../shared/ui/toastStore'
import { toMergeUserParams, toRoles, toUsers, type UserFormValues } from './lib'
import type { Role, User, UserStatus } from './types'

// shortcut: một trang 1000 bản ghi; > 1000 tài khoản cần phân trang thật
const ALL = { currentPage: 1, pageRecords: 1000 }

export const userKeys = { all: ['users'] as const }

export type UsersData = { users: User[]; roles: Role[]; companies: { id: string; name: string }[] }

const rows = (res: Record<string, unknown> | null | undefined, key: string) =>
  res && res.result === 0 && Array.isArray(res[key]) ? (res[key] as Record<string, unknown>[]) : []

export function usersQueryOptions() {
  return queryOptions({
    queryKey: userKeys.all,
    queryFn: async (): Promise<UsersData> => {
      const [us, ro, co] = await Promise.all([api.findUserAccount(ALL), api.findUserRole(), api.findCompany(ALL)])
      if (us?.result !== 0) throw new Error(upstreamError(us, 'Không tải được danh sách người dùng'))
      return {
        users: toUsers(rows(us, 'infos')),
        roles: toRoles(rows(ro, 'role')),
        companies: rows(co, 'infos').map((c) => ({ id: String(c.id), name: String(c.name ?? '') })),
      }
    },
  })
}

function useUserMutation<V>(fn: (v: V) => ReturnType<typeof api.mergeUserAccount>, okMsg: (v: V) => string, onDone: () => void) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (res, v) => {
      if (res?.result === 0) {
        showToast(okMsg(v), 'success')
        void client.invalidateQueries({ queryKey: userKeys.all })
        onDone()
      } else showToast(upstreamError(res, 'Thao tác không thành công'), 'error')
    },
    onError: () => showToast('Lỗi kết nối máy chủ', 'error'),
  })
}

export function useSaveUserMutation(onDone: () => void) {
  return useUserMutation(
    ({ values, editId }: { values: UserFormValues; editId?: string }) =>
      api.mergeUserAccount(toMergeUserParams(editId ? { ...values, password: '' } : values, { id: editId })),
    ({ editId }) => (editId ? 'Đã cập nhật người dùng thành công' : 'Đã tạo người dùng thành công'),
    onDone,
  )
}

export function useSetUserStatusMutation(onDone: () => void) {
  return useUserMutation(
    ({ user, status }: { user: User; status: UserStatus }) =>
      api.mergeUserAccount(
        toMergeUserParams({ ...user, phone: user.phone ?? '', password: '' }, { id: user.id, status }),
      ),
    ({ status }) => (status === 'active' ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hóa tài khoản'),
    onDone,
  )
}

export function useDeleteUserMutation(onDone: () => void) {
  return useUserMutation((id: string) => api.deleteUserAccount(id), () => 'Đã xóa người dùng', onDone)
}
