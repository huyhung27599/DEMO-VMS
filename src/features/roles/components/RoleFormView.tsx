import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../../shared/ui/Button'
import { modalInputClass } from '../../../shared/ui/Modal'
import {
  cloneMatrix,
  countChecked,
  EMPTY_ROLE_FORM,
  setAllPermissions,
  togglePermission,
  validateRoleForm,
  type RoleFormValues,
} from '../lib'
import {
  FEATURES,
  PERM_ACTIONS,
  type FeatureId,
  type MockRole,
  type PermAction,
  type RoleScope,
} from '../mockData'

type RoleFormViewProps = {
  mode: 'create' | 'edit'
  roles: MockRole[]
  initial: RoleFormValues
  editId?: string
  onCancel: () => void
  onSubmit: (values: RoleFormValues) => void
}

const labelClass = 'mb-1.5 block text-[0.8rem] font-semibold text-[#334155]'
const sectionTitle = 'mb-3 text-[0.7rem] font-bold tracking-[0.08em] text-[#94a3b8] uppercase'

export function RoleFormView({
  mode,
  roles,
  initial,
  editId,
  onCancel,
  onSubmit,
}: RoleFormViewProps) {
  const [values, setValues] = useState<RoleFormValues>(EMPTY_ROLE_FORM)
  const [error, setError] = useState('')

  useEffect(() => {
    setValues({
      ...initial,
      permissions: cloneMatrix(initial.permissions),
    })
    setError('')
  }, [initial])

  const allSelected = countChecked(values.permissions) === FEATURES.length * PERM_ACTIONS.length

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    const err = validateRoleForm(values, roles, { editId })
    if (err) {
      setError(err)
      return
    }
    onSubmit({
      ...values,
      name: values.name.trim(),
      description: values.description.trim(),
    })
  }

  const onToggle = (featureId: FeatureId, action: PermAction) => {
    setValues((v) => ({
      ...v,
      permissions: togglePermission(v.permissions, featureId, action),
    }))
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="m-0 text-2xl font-bold text-text-main">
          {mode === 'create' ? 'Thêm vai trò' : 'Sửa vai trò'}
        </h2>
        <p className="mt-1 mb-3 text-sm text-text-muted">
          {mode === 'create'
            ? 'Tạo vai trò mới và cấu hình quyền truy cập'
            : 'Cập nhật thông tin và ma trận quyền của vai trò'}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer border-none bg-transparent p-0 text-sm text-text-muted hover:text-danger"
        >
          <i className="fa-solid fa-arrow-left mr-1.5" aria-hidden="true" />
          Phân quyền <span className="text-[#cbd5e1]">/</span>{' '}
          <span className="text-text-main">{mode === 'create' ? 'Thêm vai trò' : 'Sửa vai trò'}</span>
        </button>
      </div>

      <form
        onSubmit={onFormSubmit}
        noValidate
        className="rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8"
      >
        <section className="mb-8">
          <h3 className={sectionTitle}>Thông tin vai trò</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="role-name" className={labelClass}>
                Tên vai trò <span className="text-danger">*</span>
              </label>
              <input
                id="role-name"
                className={modalInputClass}
                placeholder="VD: Điều phối viên"
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="role-scope" className={labelClass}>
                Phạm vi áp dụng
              </label>
              <select
                id="role-scope"
                className={modalInputClass}
                value={values.scope}
                onChange={(e) => setValues((v) => ({ ...v, scope: e.target.value as RoleScope }))}
              >
                <option value="enterprise">Theo doanh nghiệp</option>
                <option value="system">Toàn hệ thống</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="role-desc" className={labelClass}>
                Mô tả
              </label>
              <input
                id="role-desc"
                className={modalInputClass}
                placeholder="Mô tả ngắn mục đích của vai trò"
                value={values.description}
                onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              />
            </div>
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className={`${sectionTitle} mb-0`}>Ma trận quyền</h3>
            <button
              type="button"
              className="cursor-pointer border-none bg-transparent p-0 text-sm font-semibold text-danger hover:underline"
              onClick={() =>
                setValues((v) => ({
                  ...v,
                  permissions: setAllPermissions(v.permissions, !allSelected),
                }))
              }
            >
              {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-[#f8fafc] text-[0.7rem] tracking-[0.06em] text-[#94a3b8] uppercase">
                  <th className="px-4 py-3 font-semibold">Chức năng</th>
                  {PERM_ACTIONS.map((a) => (
                    <th key={a.id} className="px-2 py-3 text-center font-semibold">
                      {a.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f) => (
                  <tr key={f.id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3 font-medium text-text-main">{f.label}</td>
                    {PERM_ACTIONS.map((a) => (
                      <td key={a.id} className="px-2 py-3 text-center">
                        <input
                          type="checkbox"
                          className="size-4 cursor-pointer accent-danger"
                          checked={values.permissions[f.id][a.id]}
                          onChange={() => onToggle(f.id, a.id)}
                          aria-label={`${f.label} — ${a.label}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 mb-0 text-xs leading-relaxed text-text-muted">
            Ghi chú: Quyền hiệu lực của người dùng là hợp các quyền của mọi vai trò được gán, giới hạn trong phạm
            vi đơn vị tổ chức. Box AI và Camera không áp dụng phân quyền.
          </p>
        </section>

        <div className="min-h-5 text-sm text-danger" role="alert">
          {error}
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-5">
          <Button variant="outline" size="modal" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" size="modalWide">
            <i className="fa-solid fa-floppy-disk mr-1.5" aria-hidden="true" />
            {mode === 'create' ? 'Tạo vai trò' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </div>
  )
}
