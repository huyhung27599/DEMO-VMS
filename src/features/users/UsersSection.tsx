import { useMemo, useState } from 'react'
import { Button } from '../../shared/ui/Button'
import { ContentSection, SectionHeader } from '../../shared/ui/Section'
import { showToast } from '../../shared/ui/toastStore'
import { ConfirmDeactivateModal, ConfirmDeleteModal, ResetPasswordModal } from './components/UserConfirmModals'
import { UserFormModal } from './components/UserFormModal'
import {
  DEMO_ENTERPRISE_ID,
  ENTERPRISES,
  MOCK_USERS,
  ROLES,
  type MockUser,
  type Persona,
  type UserStatus,
} from './mockData'
import {
  EMPTY_USER_FORM,
  filterUsers,
  initials,
  PAGE_SIZE,
  paginate,
  roleNames,
  statusBadgeClass,
  statusLabel,
  type UserFilters,
  type UserFormValues,
} from './lib'

type Dialog =
  | { type: 'none' }
  | { type: 'form'; mode: 'create' | 'edit'; userId?: string }
  | { type: 'deactivate'; userId: string }
  | { type: 'delete'; userId: string }
  | { type: 'reset'; userId: string }

export function UsersSection({ hidden }: { hidden: boolean }) {
  const [persona, setPersona] = useState<Persona>('super-admin')
  const [users, setUsers] = useState<MockUser[]>(() => [...MOCK_USERS])
  const [filters, setFilters] = useState<UserFilters>({ search: '', roleId: '', status: '', enterpriseId: '' })
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<Dialog>({ type: 'none' })

  const filtered = useMemo(
    () => filterUsers(users, filters, persona, DEMO_ENTERPRISE_ID),
    [users, filters, persona],
  )
  const { rows, totalPages, page: safePage } = useMemo(() => paginate(filtered, page), [filtered, page])

  const findUser = (id: string) => users.find((u) => u.id === id) ?? null
  const dialogUser =
    dialog.type === 'deactivate' || dialog.type === 'delete' || dialog.type === 'reset'
      ? findUser(dialog.userId)
      : dialog.type === 'form' && dialog.mode === 'edit' && dialog.userId
        ? findUser(dialog.userId)
        : null

  const formInitial: UserFormValues = useMemo(() => {
    if (dialog.type !== 'form') return EMPTY_USER_FORM
    if (dialog.mode === 'edit' && dialog.userId) {
      const u = users.find((x) => x.id === dialog.userId)
      if (!u) return EMPTY_USER_FORM
      return {
        fullName: u.fullName,
        username: u.username,
        email: u.email,
        phone: u.phone ?? '',
        enterpriseId: u.enterpriseId,
        roleIds: [...u.roleIds],
      }
    }
    return {
      ...EMPTY_USER_FORM,
      enterpriseId: persona === 'enterprise-admin' ? DEMO_ENTERPRISE_ID : '',
    }
  }, [dialog, users, persona])

  const closeDialog = () => setDialog({ type: 'none' })

  const onPersonaChange = (next: Persona) => {
    setPersona(next)
    setFilters((f) => ({ ...f, enterpriseId: '' }))
    setPage(1)
  }

  const onCreateOrUpdate = (values: UserFormValues) => {
    const ent = ENTERPRISES.find((e) => e.id === values.enterpriseId)
    if (dialog.type !== 'form') return
    if (dialog.mode === 'create') {
      if (users.some((u) => u.username.toLowerCase() === values.username.toLowerCase())) {
        showToast('Tên đăng nhập đã tồn tại', 'error')
        return
      }
      if (users.some((u) => u.email.toLowerCase() === values.email.toLowerCase())) {
        showToast('Email đã tồn tại', 'error')
        return
      }
      const next: MockUser = {
        id: `u-${Date.now()}`,
        fullName: values.fullName,
        username: values.username,
        email: values.email,
        phone: values.phone || undefined,
        enterpriseId: values.enterpriseId,
        enterpriseName: ent?.name ?? values.enterpriseId,
        roleIds: values.roleIds,
        status: 'pending',
        lastLoginAt: null,
      }
      setUsers((list) => [next, ...list])
      showToast(`Đã tạo người dùng và gửi email kích hoạt tới ${values.email}`, 'success')
    } else if (dialog.userId) {
      setUsers((list) =>
        list.map((u) =>
          u.id === dialog.userId
            ? {
                ...u,
                fullName: values.fullName,
                email: values.email,
                phone: values.phone || undefined,
                enterpriseId: values.enterpriseId,
                enterpriseName: ent?.name ?? u.enterpriseName,
                roleIds: values.roleIds,
              }
            : u,
        ),
      )
      showToast('Đã cập nhật người dùng thành công', 'success')
    }
    closeDialog()
  }

  const onExport = () => {
    if (filtered.length === 0) {
      showToast('Không có dữ liệu để xuất', 'error')
      return
    }
    const stamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, '')
      .slice(0, 14)
    showToast(`Đã chuẩn bị file DanhSach_NguoiDung_${stamp}.xlsx (demo UI)`, 'success')
  }

  const availableRoles = ROLES.filter((r) => (persona === 'super-admin' ? true : !r.superOnly))

  return (
    <ContentSection id="users" hidden={hidden}>
      <SectionHeader title="Quản lý người dùng" subtitle="SRS 3.2 — UI demo với dữ liệu giả">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-white p-0.5 text-xs font-semibold">
            <button
              type="button"
              className={`cursor-pointer rounded-md border-none px-3 py-1.5 ${persona === 'super-admin' ? 'bg-danger text-white' : 'bg-transparent text-text-muted'}`}
              onClick={() => onPersonaChange('super-admin')}
            >
              Super Admin
            </button>
            <button
              type="button"
              className={`cursor-pointer rounded-md border-none px-3 py-1.5 ${persona === 'enterprise-admin' ? 'bg-danger text-white' : 'bg-transparent text-text-muted'}`}
              onClick={() => onPersonaChange('enterprise-admin')}
            >
              Quản trị DN
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={onExport}>
            <i className="fa-solid fa-file-excel mr-1.5" aria-hidden="true" />
            Xuất danh sách
          </Button>
          <Button variant="primary" size="sm" onClick={() => setDialog({ type: 'form', mode: 'create' })}>
            <i className="fa-solid fa-plus mr-1.5" aria-hidden="true" />
            Thêm người dùng
          </Button>
        </div>
      </SectionHeader>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Tìm họ tên, tài khoản, email…"
          className="min-w-[220px] flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          value={filters.search}
          onChange={(e) => {
            setFilters((f) => ({ ...f, search: e.target.value }))
            setPage(1)
          }}
        />
        {persona === 'super-admin' ? (
          <select
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
            value={filters.enterpriseId}
            onChange={(e) => {
              setFilters((f) => ({ ...f, enterpriseId: e.target.value }))
              setPage(1)
            }}
          >
            <option value="">Tất cả doanh nghiệp</option>
            {ENTERPRISES.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.name}
              </option>
            ))}
          </select>
        ) : null}
        <select
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          value={filters.roleId}
          onChange={(e) => {
            setFilters((f) => ({ ...f, roleId: e.target.value }))
            setPage(1)
          }}
        >
          <option value="">Tất cả vai trò</option>
          {availableRoles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          value={filters.status}
          onChange={(e) => {
            setFilters((f) => ({ ...f, status: e.target.value as '' | UserStatus }))
            setPage(1)
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Vô hiệu hóa</option>
          <option value="locked">Bị khóa</option>
          <option value="pending">Chờ kích hoạt</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-[#f8fafc] text-[0.75rem] tracking-wide text-text-muted uppercase">
              <th className="px-4 py-3 font-semibold">Người dùng</th>
              <th className="px-4 py-3 font-semibold">Tài khoản</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              {persona === 'super-admin' ? <th className="px-4 py-3 font-semibold">Doanh nghiệp</th> : null}
              <th className="px-4 py-3 font-semibold">Vai trò</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="px-4 py-3 font-semibold">Đăng nhập cuối</th>
              <th className="px-4 py-3 font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={persona === 'super-admin' ? 8 : 7} className="px-4 py-10 text-center text-text-muted">
                  Không có người dùng phù hợp bộ lọc
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-b border-border/80 hover:bg-[#fafbfc]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-xs font-bold text-danger">
                        {initials(u.fullName)}
                      </div>
                      <span className="font-medium text-text-main">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{u.username}</td>
                  <td className="px-4 py-3 text-text-muted">{u.email}</td>
                  {persona === 'super-admin' ? (
                    <td className="px-4 py-3 text-text-muted">{u.enterpriseName}</td>
                  ) : null}
                  <td className="px-4 py-3 text-text-muted">{roleNames(u.roleIds)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusBadgeClass(u.status)}`}
                    >
                      {statusLabel(u.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{u.lastLoginAt ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <IconBtn label="Sửa" icon="fa-pen" onClick={() => setDialog({ type: 'form', mode: 'edit', userId: u.id })} />
                      <IconBtn
                        label="Đặt lại mật khẩu"
                        icon="fa-key"
                        disabled={u.status === 'inactive'}
                        onClick={() => setDialog({ type: 'reset', userId: u.id })}
                      />
                      {u.status === 'inactive' ? (
                        <IconBtn
                          label="Kích hoạt"
                          icon="fa-toggle-on"
                          onClick={() => {
                            setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, status: 'active' } : x)))
                            showToast('Đã kích hoạt tài khoản', 'success')
                          }}
                        />
                      ) : (
                        <IconBtn
                          label="Vô hiệu hóa"
                          icon="fa-toggle-off"
                          onClick={() => setDialog({ type: 'deactivate', userId: u.id })}
                        />
                      )}
                      <IconBtn label="Xóa" icon="fa-trash" danger onClick={() => setDialog({ type: 'delete', userId: u.id })} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
        <span>
          {filtered.length} người dùng · trang {safePage}/{totalPages} ({PAGE_SIZE}/trang)
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </Button>
          <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Sau
          </Button>
        </div>
      </div>

      <UserFormModal
        open={dialog.type === 'form'}
        mode={dialog.type === 'form' ? dialog.mode : 'create'}
        persona={persona}
        initial={formInitial}
        onClose={closeDialog}
        onSubmit={onCreateOrUpdate}
      />
      <ConfirmDeactivateModal
        open={dialog.type === 'deactivate'}
        user={dialogUser}
        onClose={closeDialog}
        onConfirm={() => {
          if (dialog.type !== 'deactivate') return
          setUsers((list) => list.map((u) => (u.id === dialog.userId ? { ...u, status: 'inactive' } : u)))
          showToast('Đã vô hiệu hóa tài khoản', 'success')
          closeDialog()
        }}
      />
      <ConfirmDeleteModal
        open={dialog.type === 'delete'}
        user={dialogUser}
        onClose={closeDialog}
        onConfirm={() => {
          if (dialog.type !== 'delete') return
          setUsers((list) => list.filter((u) => u.id !== dialog.userId))
          showToast('Đã xóa người dùng', 'success')
          closeDialog()
        }}
      />
      <ResetPasswordModal
        open={dialog.type === 'reset'}
        user={dialogUser}
        onClose={closeDialog}
        onConfirm={() => {
          if (!dialogUser) return
          showToast(`Đã gửi liên kết đặt lại mật khẩu tới ${dialogUser.email}`, 'success')
          closeDialog()
        }}
      />
    </ContentSection>
  )
}

function IconBtn({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string
  icon: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? 'text-danger hover:bg-danger/10' : 'text-text-muted hover:bg-slate-100 hover:text-text-main'
      }`}
    >
      <i className={`fa-solid ${icon}`} aria-hidden="true" />
    </button>
  )
}
