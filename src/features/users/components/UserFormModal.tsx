import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../../shared/ui/Button'
import { Modal, ModalBody, ModalFooter, modalInputClass } from '../../../shared/ui/Modal'
import { ENTERPRISES, ROLES, type MockUser } from '../mockData'
import { EMPTY_USER_FORM, statusLabel, validateUserForm, type UserFormValues } from '../lib'

type UserFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial: UserFormValues
  editStatus?: MockUser['status']
  onClose: () => void
  onSubmit: (values: UserFormValues) => void
}

const labelClass = 'mb-1.5 block text-[0.8rem] font-semibold text-[#334155]'
const sectionTitle = 'mb-3 text-[0.7rem] font-bold tracking-[0.08em] text-[#94a3b8] uppercase'

export function UserFormModal({
  open,
  mode,
  initial,
  editStatus,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const [values, setValues] = useState<UserFormValues>(EMPTY_USER_FORM)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setValues({ ...initial })
    setError('')
  }, [open, initial])

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    const err = validateUserForm(values, { usernameEditable: mode === 'create' })
    if (err) {
      setError(err)
      return
    }
    onSubmit({
      ...values,
      fullName: values.fullName.trim(),
      username: values.username.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
    })
  }

  const toggleRole = (id: string) => {
    setValues((v) => ({
      ...v,
      roleIds: v.roleIds.includes(id) ? v.roleIds.filter((x) => x !== id) : [...v.roleIds, id],
    }))
  }

  return (
    <Modal id="user-form-modal" open={open} onClose={onClose} labelledBy="user-form-title" maxWidth={560}>
      <div className="flex items-start justify-between border-b border-border px-7 pt-6 pb-4">
        <div>
          <h3 id="user-form-title" className="m-0 text-xl font-bold text-text-main">
            {mode === 'create' ? 'Thêm người dùng' : 'Sửa người dùng'}
          </h3>
          <p className="mt-1 mb-0 text-sm text-text-muted">
            {mode === 'create'
              ? 'Tạo tài khoản mới và gửi email kích hoạt cho người dùng.'
              : 'Cập nhật thông tin và phân quyền của tài khoản.'}
          </p>
        </div>
        <button
          type="button"
          id="btn-close-user-form"
          aria-label="Đóng"
          className="cursor-pointer border-none bg-transparent p-1 text-text-muted"
          onClick={onClose}
        >
          <i className="fa-solid fa-xmark text-lg" aria-hidden="true" />
        </button>
      </div>
      <ModalBody>
        <form id="user-form" onSubmit={onFormSubmit} noValidate className="flex flex-col gap-5">
          <section>
            <h4 className={sectionTitle}>Thông tin tài khoản</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="user-fullName" className={labelClass}>
                  Họ và tên <span className="text-danger">*</span>
                </label>
                <input
                  id="user-fullName"
                  className={modalInputClass}
                  value={values.fullName}
                  onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="user-username" className={labelClass}>
                  Tên đăng nhập {mode === 'create' ? <span className="text-danger">*</span> : null}
                  {mode === 'edit' ? <i className="fa-solid fa-lock ml-1 text-[0.7rem] text-[#94a3b8]" aria-hidden="true" /> : null}
                </label>
                <input
                  id="user-username"
                  className={`${modalInputClass} ${mode === 'edit' ? 'bg-[#f8fafc] text-text-muted' : ''}`}
                  disabled={mode === 'edit'}
                  value={values.username}
                  onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="user-phone" className={labelClass}>
                  Số điện thoại
                </label>
                <input
                  id="user-phone"
                  className={modalInputClass}
                  value={values.phone}
                  onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="user-email" className={labelClass}>
                  Email <span className="text-danger">*</span>
                </label>
                <input
                  id="user-email"
                  type="email"
                  className={modalInputClass}
                  value={values.email}
                  onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <section>
            <h4 className={sectionTitle}>Phân quyền</h4>
            <div className="mb-3">
              <label htmlFor="user-enterprise" className={labelClass}>
                Doanh nghiệp <span className="text-danger">*</span>
              </label>
              <select
                id="user-enterprise"
                className={modalInputClass}
                value={values.enterpriseId}
                onChange={(e) => setValues((v) => ({ ...v, enterpriseId: e.target.value }))}
              >
                <option value="">Chọn doanh nghiệp</option>
                {ENTERPRISES.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className={labelClass}>
                Vai trò <span className="text-danger">*</span>{' '}
                <span className="font-normal text-text-muted">(chọn nhiều)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((role) => {
                  const on = values.roleIds.includes(role.id)
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        on
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-white text-text-muted hover:border-primary/40'
                      }`}
                    >
                      {on ? <i className="fa-solid fa-check mr-1.5 text-xs" aria-hidden="true" /> : null}
                      {role.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {mode === 'edit' && editStatus ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-[#f8fafc] px-4 py-3">
              <span className="text-sm font-medium text-text-muted">Trạng thái tài khoản</span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 ring-inset">
                {statusLabel(editStatus)}
              </span>
            </div>
          ) : null}

          {mode === 'create' ? (
            <div className="flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
              <i className="fa-solid fa-envelope mt-0.5 text-sky-600" aria-hidden="true" />
              <span>Hệ thống sẽ gửi email kích hoạt để người dùng tự đặt mật khẩu lần đầu.</span>
            </div>
          ) : null}

          <div className="min-h-5 text-sm text-danger" role="alert">
            {error}
          </div>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" size="modal" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" form="user-form" variant="primary" size="modalWide">
          {mode === 'create' ? 'Tạo người dùng' : 'Lưu thay đổi'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
