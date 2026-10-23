import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../../shared/ui/Button'
import { modalInputClass } from '../../../shared/ui/Modal'
import {
  EMPTY_UNIT_FORM,
  parentOptions,
  statusLabel,
  validateUnitForm,
  type UnitFormValues,
} from '../lib'
import type { MockUnit, UnitType } from '../mockData'

type EnterpriseFormViewProps = {
  mode: 'create' | 'edit'
  units: MockUnit[]
  initial: UnitFormValues
  editStatus?: MockUnit['status']
  editId?: string
  onCancel: () => void
  onSubmit: (values: UnitFormValues) => void
}

const labelClass = 'mb-1.5 block text-[0.8rem] font-semibold text-[#334155]'
const sectionTitle = 'mb-3 text-[0.7rem] font-bold tracking-[0.08em] text-[#94a3b8] uppercase'
const fieldHint = 'mt-1.5 mb-0 text-xs text-text-muted'

export function EnterpriseFormView({
  mode,
  units,
  initial,
  editStatus,
  editId,
  onCancel,
  onSubmit,
}: EnterpriseFormViewProps) {
  const [values, setValues] = useState<UnitFormValues>(EMPTY_UNIT_FORM)
  const [error, setError] = useState('')

  useEffect(() => {
    setValues({ ...initial })
    setError('')
  }, [initial])

  const parents = parentOptions(units, mode === 'edit' ? { excludeId: editId } : undefined)

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    const err = validateUnitForm(values, units, { mode, editId })
    if (err) {
      setError(err)
      return
    }
    onSubmit({
      ...values,
      name: values.name.trim(),
      code: values.code.trim(),
      address: values.address.trim(),
      representative: values.representative.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="m-0 text-2xl font-bold text-text-main">
          {mode === 'create' ? 'Thêm doanh nghiệp' : 'Sửa đơn vị'}
        </h2>
        <p className="mt-1 mb-3 text-sm text-text-muted">
          {mode === 'create'
            ? 'Tạo đơn vị mới trong cơ cấu tổ chức'
            : 'Cập nhật thông tin đơn vị trong cơ cấu tổ chức'}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer border-none bg-transparent p-0 text-sm text-text-muted hover:text-danger"
        >
          <i className="fa-solid fa-arrow-left mr-1.5" aria-hidden="true" />
          Quản lý doanh nghiệp <span className="text-[#cbd5e1]">/</span>{' '}
          <span className="text-text-main">{mode === 'create' ? 'Thêm đơn vị' : 'Sửa đơn vị'}</span>
        </button>
      </div>

      <form
        onSubmit={onFormSubmit}
        noValidate
        className="rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8"
      >
        <section className="mb-8">
          <h3 className={sectionTitle}>Thông tin đơn vị</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="unit-name" className={labelClass}>
                Tên đơn vị <span className="text-danger">*</span>
              </label>
              <input
                id="unit-name"
                className={modalInputClass}
                placeholder="VD: Công ty Vận tải Phương Đông"
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="unit-code" className={labelClass}>
                Mã đơn vị {mode === 'create' ? <span className="text-danger">*</span> : null}
                {mode === 'edit' ? (
                  <i className="fa-solid fa-lock ml-1 text-[0.7rem] text-[#94a3b8]" aria-hidden="true" title="Mã đơn vị không thể thay đổi" />
                ) : null}
              </label>
              <input
                id="unit-code"
                className={`${modalInputClass} ${mode === 'edit' ? 'bg-[#f8fafc] text-text-muted' : ''}`}
                placeholder="VD: PD"
                disabled={mode === 'edit'}
                value={values.code}
                onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))}
              />
              {mode === 'create' ? (
                <p className={fieldHint}>Duy nhất toàn hệ thống. Chữ, số và (_ -).</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="unit-type" className={labelClass}>
                Loại đơn vị
              </label>
              <select
                id="unit-type"
                className={modalInputClass}
                value={values.type}
                onChange={(e) => setValues((v) => ({ ...v, type: e.target.value as UnitType }))}
              >
                <option value="enterprise">Doanh nghiệp</option>
                <option value="branch">Chi nhánh</option>
                <option value="department">Phòng ban</option>
              </select>
            </div>
            <div>
              <label htmlFor="unit-parent" className={labelClass}>
                Đơn vị cha
              </label>
              <select
                id="unit-parent"
                className={modalInputClass}
                value={values.parentId}
                onChange={(e) => setValues((v) => ({ ...v, parentId: e.target.value }))}
              >
                <option value="">— Không (đơn vị gốc) —</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
              <p className={fieldHint}>Để trống nếu đây là doanh nghiệp gốc</p>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <h3 className={sectionTitle}>Thông tin liên hệ</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="unit-address" className={labelClass}>
                Địa chỉ
              </label>
              <input
                id="unit-address"
                className={modalInputClass}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                value={values.address}
                onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="unit-rep" className={labelClass}>
                Người đại diện
              </label>
              <input
                id="unit-rep"
                className={modalInputClass}
                placeholder="Họ và tên"
                value={values.representative}
                onChange={(e) => setValues((v) => ({ ...v, representative: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="unit-phone" className={labelClass}>
                Số điện thoại
              </label>
              <input
                id="unit-phone"
                className={modalInputClass}
                placeholder="0901 234 567"
                value={values.phone}
                onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="unit-email" className={labelClass}>
                Email
              </label>
              <input
                id="unit-email"
                type="email"
                className={modalInputClass}
                placeholder="lienhe@doanhnghiep.vn"
                value={values.email}
                onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {mode === 'edit' && editStatus ? (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-border bg-[#f8fafc] px-4 py-3">
            <span className="text-sm font-medium text-text-muted">Trạng thái đơn vị</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                editStatus === 'active'
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-slate-100 text-slate-600 ring-slate-200'
              }`}
            >
              {statusLabel(editStatus)}
            </span>
          </div>
        ) : null}

        <div className="min-h-5 text-sm text-danger" role="alert">
          {error}
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-5">
          <Button variant="outline" size="modal" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" size="modalWide">
            <i className="fa-solid fa-floppy-disk mr-1.5" aria-hidden="true" />
            {mode === 'create' ? 'Lưu đơn vị' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </div>
  )
}
