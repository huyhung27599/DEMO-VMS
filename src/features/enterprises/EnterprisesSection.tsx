import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../shared/ui/Button'
import { ContentSection } from '../../shared/ui/Section'
import { showToast } from '../../shared/ui/toastStore'
import { ConfirmDeleteUnitModal } from './components/EnterpriseConfirmModals'
import { EnterpriseFormView } from './components/EnterpriseFormView'
import {
  buildVisibleTree,
  canDeleteUnit,
  EMPTY_UNIT_FORM,
  paginate,
  statusDotClass,
  statusLabel,
  typeBadgeClass,
  typeLabel,
  type UnitFilters,
  type UnitFormValues,
} from './lib'
import { unitsQueryOptions, useDeleteUnitMutation, useSaveUnitMutation } from './queries'
import type { UnitStatus, UnitType } from './types'

type View =
  | { mode: 'list' }
  | { mode: 'form'; formMode: 'create' | 'edit'; unitId?: string }

type Dialog = { type: 'none' } | { type: 'delete'; unitId: string }

export function EnterprisesSection({ hidden }: { hidden: boolean }) {
  const unitsQuery = useQuery({ ...unitsQueryOptions(), enabled: !hidden })
  const units = useMemo(() => unitsQuery.data ?? [], [unitsQuery.data])
  const [view, setView] = useState<View>({ mode: 'list' })
  const [draftFilters, setDraftFilters] = useState<UnitFilters>({
    search: '',
    type: '',
    status: '',
  })
  const [filters, setFilters] = useState<UnitFilters>(draftFilters)
  // Mặc định mở hết cây; chỉ lưu các nút người dùng thu gọn
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const expanded = useMemo(() => new Set(units.map((u) => u.id).filter((id) => !collapsed.has(id))), [units, collapsed])
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<Dialog>({ type: 'none' })

  const treeRows = useMemo(
    () => buildVisibleTree(units, filters, expanded),
    [units, filters, expanded],
  )
  const { rows, totalPages, page: safePage, from, to } = useMemo(
    () => paginate(treeRows, page),
    [treeRows, page],
  )

  const findUnit = (id: string) => units.find((u) => u.id === id) ?? null
  const dialogUnit =
    dialog.type === 'delete' ? findUnit(dialog.unitId) : null

  const formInitial: UnitFormValues = useMemo(() => {
    if (view.mode !== 'form') return EMPTY_UNIT_FORM
    if (view.formMode === 'edit' && view.unitId) {
      const u = units.find((x) => x.id === view.unitId)
      if (!u) return EMPTY_UNIT_FORM
      return {
        name: u.name,
        code: u.code,
        type: u.type,
        parentId: u.parentId ?? '',
        address: u.address ?? '',
        representative: u.representative ?? '',
        phone: u.phone ?? '',
        email: u.email ?? '',
        account: '',
        password: '',
      }
    }
    return EMPTY_UNIT_FORM
  }, [view, units])

  const editStatus =
    view.mode === 'form' && view.formMode === 'edit' && view.unitId
      ? units.find((x) => x.id === view.unitId)?.status
      : undefined

  const applyFilters = () => {
    setFilters({ ...draftFilters })
    setPage(1)
  }

  const toggleExpand = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const backToList = () => setView({ mode: 'list' })
  const saveMutation = useSaveUnitMutation({ onSaved: backToList })
  const deleteMutation = useDeleteUnitMutation({ onDeleted: () => setDialog({ type: 'none' }) })

  const onSaveUnit = (values: UnitFormValues) => {
    if (view.mode !== 'form' || saveMutation.isPending) return
    saveMutation.mutate({ values, editId: view.formMode === 'edit' ? view.unitId : undefined })
  }

  return (
    <ContentSection id="enterprises" hidden={hidden} className="bg-[#f8fafc]">
      {view.mode === 'form' ? (
        <EnterpriseFormView
          mode={view.formMode}
          units={units}
          initial={formInitial}
          editStatus={editStatus}
          editId={view.unitId}
          onCancel={backToList}
          onSubmit={onSaveUnit}
        />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="m-0 text-2xl font-bold text-text-main">Quản lý doanh nghiệp</h2>
              <p className="mt-1 mb-0 text-sm text-text-muted">
                Quản lý doanh nghiệp và các chi nhánh, phòng ban
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (treeRows.length === 0) showToast('Không có dữ liệu để xuất', 'error')
                  else showToast('Đã chuẩn bị file xuất danh sách (demo UI)', 'success')
                }}
              >
                <i className="fa-solid fa-download mr-1.5" aria-hidden="true" />
                Xuất danh sách
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setView({ mode: 'form', formMode: 'create' })}
              >
                <i className="fa-solid fa-plus mr-1.5" aria-hidden="true" />
                Thêm đơn vị
              </Button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white p-3 shadow-sm">
            <div className="relative min-w-[220px] flex-1">
              <i
                className="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#94a3b8]"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Tìm theo tên hoặc mã đơn vị..."
                className="w-full rounded-lg border border-border bg-white py-2 pr-3 pl-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                value={draftFilters.search}
                onChange={(e) => setDraftFilters((f) => ({ ...f, search: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters()
                }}
              />
            </div>
            <select
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
              value={draftFilters.type}
              onChange={(e) => setDraftFilters((f) => ({ ...f, type: e.target.value as '' | UnitType }))}
            >
              <option value="">Tất cả loại đơn vị</option>
              <option value="enterprise">Doanh nghiệp</option>
              <option value="branch">Chi nhánh</option>
              <option value="department">Phòng ban</option>
            </select>
            <select
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
              value={draftFilters.status}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, status: e.target.value as '' | UnitStatus }))
              }
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Vô hiệu hóa</option>
            </select>
            <Button variant="outline" size="sm" onClick={applyFilters}>
              <i className="fa-solid fa-filter mr-1.5" aria-hidden="true" />
              Lọc
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[0.7rem] tracking-[0.06em] text-[#94a3b8] uppercase">
                  <th className="px-4 py-3 font-semibold">Đơn vị</th>
                  <th className="px-4 py-3 font-semibold">Mã</th>
                  <th className="px-4 py-3 font-semibold">Loại</th>
                  <th className="px-4 py-3 font-semibold">Người dùng</th>
                  <th className="px-4 py-3 font-semibold">Thiết bị</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {unitsQuery.isPending || unitsQuery.isError || rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                      {unitsQuery.isPending
                        ? 'Đang tải dữ liệu...'
                        : unitsQuery.isError
                          ? unitsQuery.error.message
                          : 'Không có đơn vị phù hợp bộ lọc'}
                    </td>
                  </tr>
                ) : (
                  rows.map(({ unit, depth, hasKids }) => (
                    <tr
                      key={unit.id}
                      className="border-b border-border/70 last:border-0 hover:bg-[#fafbfc]"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center" style={{ paddingLeft: depth * 20 }}>
                          {hasKids ? (
                            <button
                              type="button"
                              aria-label={expanded.has(unit.id) ? 'Thu gọn' : 'Mở rộng'}
                              className="mr-1.5 inline-flex size-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-[#94a3b8] hover:bg-slate-100 hover:text-text-main"
                              onClick={() => toggleExpand(unit.id)}
                            >
                              <i
                                className={`fa-solid fa-chevron-${expanded.has(unit.id) ? 'down' : 'right'} text-[0.65rem]`}
                                aria-hidden="true"
                              />
                            </button>
                          ) : (
                            <span
                              className="mr-1.5 inline-flex size-6 items-center justify-center text-[#cbd5e1]"
                              aria-hidden="true"
                            >
                              {depth > 0 ? '└' : null}
                            </span>
                          )}
                          <span className="font-semibold text-text-main">{unit.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-text-muted">{unit.code || '—'}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[0.7rem] font-semibold ring-1 ring-inset ${typeBadgeClass(unit.type)}`}
                        >
                          {typeLabel(unit.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-text-muted">{unit.userCount}</td>
                      <td className="px-4 py-3.5 text-text-muted">{unit.deviceCount}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-2 text-sm text-text-main">
                          <span
                            className={`size-2 rounded-full ${statusDotClass(unit.status)}`}
                            aria-hidden="true"
                          />
                          {statusLabel(unit.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-0.5">
                          <IconBtn
                            label="Sửa"
                            icon="fa-pen"
                            onClick={() =>
                              setView({ mode: 'form', formMode: 'edit', unitId: unit.id })
                            }
                          />
                          {/* 808gps không có API khóa/mở đơn vị */}
                          <IconBtn
                            label="Vô hiệu hóa (chưa hỗ trợ trên 808gps)"
                            icon="fa-lock"
                            disabled
                            onClick={() => {}}
                          />
                          <IconBtn
                            label="Xóa"
                            icon="fa-trash"
                            danger
                            onClick={() => {
                              if (!canDeleteUnit(units, unit)) {
                                showToast(
                                  'Chỉ xóa được khi không còn đơn vị con và không còn người dùng/phương tiện/thiết bị gắn vào',
                                  'error',
                                )
                                return
                              }
                              setDialog({ type: 'delete', unitId: unit.id })
                            }}
                          />
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
              Hiển thị {from}-{to} trong tổng {treeRows.length} đơn vị
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

      <ConfirmDeleteUnitModal
        open={dialog.type === 'delete'}
        unit={dialogUnit}
        onClose={() => setDialog({ type: 'none' })}
        onConfirm={() => {
          if (dialog.type !== 'delete') return
          const target = findUnit(dialog.unitId)
          if (!target || !canDeleteUnit(units, target)) {
            showToast(
              'Chỉ xóa được khi không còn đơn vị con và không còn người dùng/phương tiện/thiết bị gắn vào',
              'error',
            )
            setDialog({ type: 'none' })
            return
          }
          if (!deleteMutation.isPending) deleteMutation.mutate(dialog.unitId)
        }}
      />
    </ContentSection>
  )
}

function IconBtn({
  label,
  icon,
  onClick,
  danger,
  disabled,
}: {
  label: string
  icon: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex size-8 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 items-center justify-center rounded-md border-none bg-transparent text-sm ${
        danger
          ? 'text-[#94a3b8] hover:bg-danger/10 hover:text-danger'
          : 'text-[#94a3b8] hover:bg-slate-100 hover:text-text-main'
      }`}
    >
      <i className={`fa-solid ${icon}`} aria-hidden="true" />
    </button>
  )
}
