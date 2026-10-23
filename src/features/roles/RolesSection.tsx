import { useMemo, useState } from 'react'
import { Button } from '../../shared/ui/Button'
import { ContentSection } from '../../shared/ui/Section'
import { showToast } from '../../shared/ui/toastStore'
import { ConfirmDeleteRoleModal } from './components/RoleConfirmModals'
import { RoleFormView } from './components/RoleFormView'
import {
  canDeleteRole,
  canEditRole,
  cloneMatrix,
  EMPTY_ROLE_FORM,
  filterRoles,
  kindBadgeClass,
  kindLabel,
  paginate,
  scopeLabel,
  type RoleFormValues,
} from './lib'
import { MOCK_ROLES, type MockRole } from './mockData'

type View =
  | { mode: 'list' }
  | { mode: 'form'; formMode: 'create' | 'edit'; roleId?: string }

export function RolesSection({ hidden }: { hidden: boolean }) {
  const [roles, setRoles] = useState<MockRole[]>(() =>
    MOCK_ROLES.map((r) => ({ ...r, permissions: cloneMatrix(r.permissions) })),
  )
  const [view, setView] = useState<View>({ mode: 'list' })
  const [draftSearch, setDraftSearch] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => filterRoles(roles, search), [roles, search])
  const { rows, totalPages, page: safePage, from, to } = useMemo(
    () => paginate(filtered, page),
    [filtered, page],
  )

  const deleteRole = deleteId ? (roles.find((r) => r.id === deleteId) ?? null) : null

  const formInitial: RoleFormValues = useMemo(() => {
    if (view.mode !== 'form') return EMPTY_ROLE_FORM
    if (view.formMode === 'edit' && view.roleId) {
      const r = roles.find((x) => x.id === view.roleId)
      if (!r) return EMPTY_ROLE_FORM
      return {
        name: r.name,
        scope: r.scope,
        description: r.description,
        permissions: cloneMatrix(r.permissions),
      }
    }
    return {
      ...EMPTY_ROLE_FORM,
      permissions: cloneMatrix(EMPTY_ROLE_FORM.permissions),
    }
  }, [view, roles])

  const backToList = () => setView({ mode: 'list' })

  const applySearch = () => {
    setSearch(draftSearch)
    setPage(1)
  }

  const onSaveRole = (values: RoleFormValues) => {
    if (view.mode !== 'form') return
    if (view.formMode === 'create') {
      setRoles((list) => [
        {
          id: `role-${Date.now()}`,
          name: values.name,
          description: values.description,
          userCount: 0,
          scope: values.scope,
          kind: 'custom',
          permissions: cloneMatrix(values.permissions),
        },
        ...list,
      ])
      showToast('Đã tạo vai trò thành công', 'success')
    } else if (view.roleId) {
      setRoles((list) =>
        list.map((r) =>
          r.id === view.roleId
            ? {
                ...r,
                name: values.name,
                description: values.description,
                scope: values.scope,
                permissions: cloneMatrix(values.permissions),
              }
            : r,
        ),
      )
      showToast('Đã cập nhật vai trò thành công', 'success')
    }
    backToList()
  }

  const onClone = (role: MockRole) => {
    const baseName = `${role.name} (bản sao)`
    let name = baseName
    let i = 2
    while (roles.some((r) => r.name.toLowerCase() === name.toLowerCase() && r.scope === role.scope)) {
      name = `${baseName} ${i}`
      i += 1
    }
    setRoles((list) => [
      {
        id: `role-${Date.now()}`,
        name,
        description: role.description,
        userCount: 0,
        scope: role.scope === 'system' ? 'enterprise' : role.scope,
        kind: 'custom',
        permissions: cloneMatrix(role.permissions),
      },
      ...list,
    ])
    showToast('Đã nhân bản vai trò', 'success')
  }

  return (
    <ContentSection id="roles" hidden={hidden} className="bg-[#f8fafc]">
      {view.mode === 'form' ? (
        <RoleFormView
          mode={view.formMode}
          roles={roles}
          initial={formInitial}
          editId={view.roleId}
          onCancel={backToList}
          onSubmit={onSaveRole}
        />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="m-0 text-2xl font-bold text-text-main">Phân quyền</h2>
              <p className="mt-1 mb-0 text-sm text-text-muted">
                Quản lý vai trò và ma trận quyền truy cập VMS
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setView({ mode: 'form', formMode: 'create' })}
            >
              <i className="fa-solid fa-plus mr-1.5" aria-hidden="true" />
              Thêm vai trò
            </Button>
          </div>

          <div className="mb-4 rounded-xl border border-border bg-white p-3 shadow-sm">
            <div className="relative">
              <i
                className="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#94a3b8]"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Tìm theo tên vai trò..."
                className="w-full rounded-lg border border-border bg-white py-2.5 pr-3 pl-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applySearch()
                }}
                onBlur={applySearch}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[0.7rem] tracking-[0.06em] text-[#94a3b8] uppercase">
                  <th className="px-4 py-3 font-semibold">Vai trò</th>
                  <th className="px-4 py-3 font-semibold">Mô tả</th>
                  <th className="px-4 py-3 font-semibold">Số người dùng</th>
                  <th className="px-4 py-3 font-semibold">Phạm vi</th>
                  <th className="px-4 py-3 font-semibold">Loại</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                      Không có vai trò phù hợp
                    </td>
                  </tr>
                ) : (
                  rows.map((role) => {
                    const editable = canEditRole(role)
                    const deletable = canDeleteRole(role)
                    return (
                      <tr
                        key={role.id}
                        className="border-b border-border/70 last:border-0 hover:bg-[#fafbfc]"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`inline-flex size-7 items-center justify-center rounded-md ${
                                role.kind === 'system'
                                  ? 'bg-[#fde8eb] text-danger'
                                  : 'bg-[#f1f5f9] text-[#334155]'
                              }`}
                              aria-hidden="true"
                            >
                              <i className="fa-solid fa-shield-halved text-xs" />
                            </span>
                            <span className="font-semibold text-text-main">{role.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-text-muted">{role.description}</td>
                        <td className="px-4 py-3.5 text-text-muted">{role.userCount}</td>
                        <td className="px-4 py-3.5 text-text-muted">{scopeLabel(role.scope)}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[0.7rem] font-semibold ring-1 ring-inset ${kindBadgeClass(role.kind)}`}
                          >
                            {kindLabel(role.kind)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex justify-end gap-0.5">
                            <IconBtn
                              label="Sửa"
                              icon="fa-pen"
                              disabled={!editable}
                              onClick={() =>
                                setView({ mode: 'form', formMode: 'edit', roleId: role.id })
                              }
                            />
                            <IconBtn
                              label="Nhân bản"
                              icon="fa-copy"
                              onClick={() => onClone(role)}
                            />
                            <IconBtn
                              label="Xóa"
                              icon="fa-trash"
                              danger
                              disabled={role.kind === 'system'}
                              onClick={() => {
                                if (role.kind === 'system') return
                                if (role.userCount > 0) {
                                  showToast(
                                    'Không thể xóa vai trò đang được gán cho người dùng',
                                    'error',
                                  )
                                  return
                                }
                                if (!deletable) return
                                setDeleteId(role.id)
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
            <span>
              Hiển thị {from}–{to} trong tổng {filtered.length} vai trò
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Trước
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-none text-sm font-semibold ${
                    n === safePage
                      ? 'bg-danger text-white'
                      : 'bg-transparent text-text-muted hover:bg-slate-100'
                  }`}
                >
                  {n}
                </button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDeleteRoleModal
        open={deleteId != null}
        role={deleteRole}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteRole || !canDeleteRole(deleteRole)) {
            showToast('Không thể xóa vai trò đang được gán cho người dùng', 'error')
            setDeleteId(null)
            return
          }
          setRoles((list) => list.filter((r) => r.id !== deleteRole.id))
          showToast('Đã xóa vai trò', 'success')
          setDeleteId(null)
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
        danger
          ? 'text-[#94a3b8] hover:bg-danger/10 hover:text-danger disabled:hover:bg-transparent disabled:hover:text-[#94a3b8]'
          : 'text-[#94a3b8] hover:bg-slate-100 hover:text-text-main'
      }`}
    >
      <i className={`fa-solid ${icon}`} aria-hidden="true" />
    </button>
  )
}
