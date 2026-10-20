import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../../shared/ui/Button'
import { Modal, ModalBody, ModalFooter, ModalHeader, modalInputClass, modalLabelClass } from '../../../shared/ui/Modal'
import {
  DEMO_ENTERPRISE_ID,
  ENTERPRISES,
  ROLES,
  type Persona,
} from '../mockData'
import { EMPTY_USER_FORM, validateUserForm, type UserFormValues } from '../lib'

type UserFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  persona: Persona
  initial: UserFormValues
  onClose: () => void
  onSubmit: (values: UserFormValues) => void
}

export function UserFormModal({ open, mode, persona, initial, onClose, onSubmit }: UserFormModalProps) {
  const [values, setValues] = useState<UserFormValues>(EMPTY_USER_FORM)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const next = { ...initial }
    if (persona === 'enterprise-admin') next.enterpriseId = DEMO_ENTERPRISE_ID
    setValues(next)
    setError('')
  }, [open, initial, persona])

  const availableRoles = ROLES.filter((r) => (persona === 'super-admin' ? true : !r.superOnly))
  const enterpriseLocked = persona === 'enterprise-admin' || mode === 'edit'

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
      <ModalHeader
        titleId="user-form-title"
        title={mode === 'create' ? 'Thêm người dùng' : 'Cập nhật người dùng'}
        closeId="btn-close-user-form"
        onClose={onClose}
      />
      <ModalBody>
        <form id="user-form" onSubmit={onFormSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="user-fullName" className={modalLabelClass}>
              Họ và tên <span className="text-danger">*</span>
            </label>
            <input
              id="user-fullName"
              className={modalInputClass}
              value={values.fullName}
              onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="user-username" className={modalLabelClass}>
              Tên đăng nhập <span className="text-danger">*</span>
            </label>
            <input
              id="user-username"
              className={modalInputClass}
              disabled={mode === 'edit'}
              value={values.username}
              onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="user-email" className={modalLabelClass}>
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
          <div className="mb-4">
            <label htmlFor="user-phone" className={modalLabelClass}>
              Số điện thoại
            </label>
            <input
              id="user-phone"
              className={modalInputClass}
              value={values.phone}
              onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="user-enterprise" className={modalLabelClass}>
              Doanh nghiệp <span className="text-danger">*</span>
            </label>
            <select
              id="user-enterprise"
              className={modalInputClass}
              disabled={enterpriseLocked && persona === 'enterprise-admin'}
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
          <fieldset className="mb-2">
            <legend className={modalLabelClass}>
              Vai trò <span className="text-danger">*</span>
            </legend>
            <div className="flex flex-col gap-2">
              {availableRoles.map((role) => (
                <label key={role.id} className="flex cursor-pointer items-center gap-2 text-sm text-text-main">
                  <input
                    type="checkbox"
                    checked={values.roleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  {role.name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-3 min-h-5 text-sm text-danger" role="alert">
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
