import { useMemo, useState } from 'react'
import { Button } from '../../shared/ui/Button'
import { ContentSection } from '../../shared/ui/Section'
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
  paginate,
  roleChipClass,
  rolesOf,
  statusDotClass,
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
  const [draftFilters, setDraftFilters] = useState<UserFilters>({
    search: '',
    roleId: '',
    status: '',
    enterpriseId: '',
  })
  const [filters, setFilters] = useState<UserFilters>(draftFilters)
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<Dialog>({ type: 'none' })

  const filtered = useMemo(
    () => filterUsers(users, filters, persona, DEMO_ENTERPRISE_ID),
    [users, filters, persona],
  )
  const { rows, totalPages, page: safePage, from, to } = useMemo(
    () => paginate(filtered, page),
    [filtered, page],
  )

  const findUser = (id: string) => users.find((u) => u.id === id) ?? null
  const dialogUser =
    dialog.type === 'deactivate' || dialog.type === 'delete' || dialog.type === 'reset'
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

  const editStatus =
    dialog.type === 'form' && dialog.mode === 'edit' && dialog.userId
      ? findUser(dialog.userId)?.status
      : undefined

  const closeDialog = () => setDialog({ type: 'none' })

  const applyFilters = () => {
    setFilters({ ...draftFilters })
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
      setUsers((list) => [
        {
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
        },
        ...list,
      ])
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

  const availableRoles = ROLES.filter((r) => (persona === 'super-admin' ? true : !r.superOnly))
  const showEnterprise = persona === 'super-admin'

  return (
    <ContentSection id="users" hidden={hidden} className="bg-[#f8fafc]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-2xl font-bold text-text-main">Quản lý người dùng</h2>
          <p className="mt-1 mb-0 text-sm text-text-muted">
            Quản lý tài khoản truy cập VMS · Phân quyền theo vai trò &amp; doanh nghiệp
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 flex rounded-lg border border-border bg-white p-0.5 text-[0.7rem] font-semibold">
            <button
              type="button"
              className={`cursor-pointer rounded-md border-none px-2.5 py-1 ${persona === 'super-admin' ? 'bg-danger text-white' : 'bg-transparent text-text-muted'}`}
              onClick={() => {
                setPersona('super-admin')
                setDraftFilters((f) => ({ ...f, enterpriseId: '' }))
                setFilters((f) => ({ ...f, enterpriseId: '' }))
                setPage(1)
              }}
            >
              Super Admin
            </button>
            <button
              type="button"
              className={`cursor-pointer rounded-md border-none px-2.5 py-1 ${persona === 'enterprise-admin' ? 'bg-danger text-white' : 'bg-transparent text-text-muted'}`}
              onClick={() => {
                setPersona('enterprise-admin')
                setDraftFilters((f) => ({ ...f, enterpriseId: '' }))
                setFilters((f) => ({ ...f, enterpriseId: '' }))
                setPage(1)
              }}
            >
              Quản trị DN
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (filtered.length === 0) showToast('Không có dữ liệu để xuất', 'error')
              else showToast('Đã chuẩn bị file xuất danh sách (demo UI)', 'success')
            }}
          >
            <i className="fa-solid fa-download mr-1.5" aria-hidden="true" />
            Xuất danh sách
          </Button>
          <Button variant="primary" size="sm" onClick={() => setDialog({ type: 'form', mode: 'create' })}>
            <i className="fa-solid fa-plus mr-1.5" aria-hidden="true" />
            Thêm người dùng
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-3 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <i className="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#94a3b8]" aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm theo tên, tài khoản, email..."
            className="w-full rounded-lg border border-border bg-white py-2 pr-3 pl-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            value={draftFilters.search}
            onChange={(e) => setDraftFilters((f) => ({ ...f, search: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters()
            }}
          />
        </div>
        {showEnterprise ? (
          <select
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
            value={draftFilters.enterpriseId}
            onChange={(e) => setDraftFilters((f) => ({ ...f, enterpriseId: e.target.value }))}
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
          value={draftFilters.roleId}
          onChange={(e) => setDraftFilters((f) => ({ ...f, roleId: e.target.value }))}
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
          value={draftFilters.status}
          onChange={(e) => setDraftFilters((f) => ({ ...f, status: e.target.value as '' | UserStatus }))}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Vô hiệu hóa</option>
          <option value="locked">Bị khóa</option>
          <option value="pending">Chờ kích hoạt</option>
        </select>
        <Button variant="outline" size="sm" onClick={applyFilters}>
          <i className="fa-solid fa-filter mr-1.5" aria-hidden="true" />
          Lọc
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[0.7rem] tracking-[0.06em] text-[#94a3b8] uppercase">
              <th className="px-4 py-3 font-semibold">Người dùng</th>
              <th className="px-4 py-3 font-semibold">Tài khoản</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              {showEnterprise ? <th className="px-4 py-3 font-semibold">Doanh nghiệp</th> : null}
              <th className="px-4 py-3 font-semibold">Vai trò</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="px-4 py-3 font-semibold">Đăng nhập cuối</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showEnterprise ? 8 : 7} className="px-4 py-12 text-center text-text-muted">
                  Không có người dùng phù hợp bộ lọc
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-b border-border/70 last:border-0 hover:bg-[#fafbfc]">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fee2e2] text-xs font-bold text-danger">
                        {initials(u.fullName)}
                      </div>
                      <span className="font-semibold text-text-main">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-text-muted">{u.username}</td>
                  <td className="px-4 py-3.5 text-text-muted">{u.email}</td>
                  {showEnterprise ? <td className="px-4 py-3.5 text-text-muted">{u.enterpriseName}</td> : null}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {rolesOf(u.roleIds).map((r) => (
                        <span
                          key={r.id}
                          className={`inline-flex rounded-md px-2 py-0.5 text-[0.7rem] font-semibold ring-1 ring-inset ${roleChipClass(r.chip)}`}
                        >
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-2 text-sm text-text-main">
                      <span className={`size-2 rounded-full ${statusDotClass(u.status)}`} aria-hidden="true" />
                      {statusLabel(u.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-text-muted">{u.lastLoginAt ?? '—'}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-0.5">
                      <IconBtn label="Sửa" icon="fa-pen" onClick={() => setDialog({ type: 'form', mode: 'edit', userId: u.id })} />
                      <IconBtn
                        label={u.status === 'inactive' ? 'Kích hoạt' : 'Vô hiệu hóa'}
                        icon={u.status === 'inactive' ? 'fa-user-check' : 'fa-user-lock'}
                        onClick={() => {
                          if (u.status === 'inactive') {
                            setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, status: 'active' } : x)))
                            showToast('Đã kích hoạt tài khoản', 'success')
                          } else {
                            setDialog({ type: 'deactivate', userId: u.id })
                          }
                        }}
                      />
                      <IconBtn
                        label="Đặt lại mật khẩu"
                        icon="fa-key"
                        disabled={u.status === 'inactive'}
                        onClick={() => setDialog({ type: 'reset', userId: u.id })}
                      />
                      <IconBtn label="Xóa" icon="fa-trash" danger onClick={() => setDialog({ type: 'delete', userId: u.id })} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
        <span>
          Hiển thị {from}-{to} trong tổng {filtered.length} người dùng
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-none text-sm font-semibold ${
                n === safePage ? 'bg-danger text-white' : 'bg-transparent text-text-muted hover:bg-slate-100'
              }`}
            >
              {n}
            </button>
          ))}
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
        editStatus={editStatus}
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
      className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-sm disabled:cursor-not-allowed disabled:opacity-35 ${
        danger ? 'text-[#94a3b8] hover:bg-danger/10 hover:text-danger' : 'text-[#94a3b8] hover:bg-slate-100 hover:text-text-main'
      }`}
    >
      <i className={`fa-solid ${icon}`} aria-hidden="true" />
    </button>
  )
}
