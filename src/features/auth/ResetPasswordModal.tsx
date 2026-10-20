import { useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button'
import { Modal, ModalBody, ModalFooter, ModalHeader, modalInputClass, modalLabelClass } from '../../shared/ui/Modal'
import { firstError, resetPasswordSchema } from './schemas'

function EyeToggle({
  open,
  onToggle,
  labelShow,
  labelHide,
}: {
  open: boolean
  onToggle: () => void
  labelShow: string
  labelHide: string
}) {
  return (
    <button
      type="button"
      className="absolute top-1/2 right-3 flex -translate-y-1/2 cursor-pointer border-none bg-transparent p-0 text-[#94a3b8] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary"
      aria-label={open ? labelHide : labelShow}
      onClick={onToggle}
    >
      <svg
        className="size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {open ? (
          <>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </>
        ) : (
          <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </>
        )}
      </svg>
    </button>
  )
}

/**
 * SRS §3.1 Form Đặt lại mật khẩu — UI only.
 * Opened from LoginScreen when `?resetToken=` is present.
 */
export function ResetPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pending, setPending] = useState(false)

  const clearForm = () => {
    setNewPassword('')
    setConfirmPassword('')
    setShowNew(false)
    setShowConfirm(false)
    setError('')
    setSuccess('')
    setPending(false)
  }

  const handleClose = () => {
    clearForm()
    onClose()
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const err = firstError(resetPasswordSchema, { newPassword, confirmPassword })
    if (err) {
      setError(err)
      setSuccess('')
      return
    }
    setError('')
    setPending(true)
    // UI-only stub — no API in this pass
    setSuccess('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.')
    setPending(false)
    setTimeout(() => {
      clearForm()
      onClose()
    }, 1500)
  }

  return (
    <Modal id="reset-password-modal" open={open} onClose={handleClose} labelledBy="reset-password-title" maxWidth={520}>
      <ModalHeader
        titleId="reset-password-title"
        title="Đặt lại mật khẩu"
        closeId="btn-close-reset-password"
        onClose={handleClose}
      />
      <ModalBody>
        <form id="reset-password-form" autoComplete="off" onSubmit={onSubmit}>
          <p className="mb-5 text-[0.95rem] text-text-muted">
            Nhập mật khẩu mới cho tài khoản của bạn. Mật khẩu phải đủ mạnh theo quy tắc bảo mật.
          </p>
          <div className="mb-4">
            <label htmlFor="rp-new-password" className={modalLabelClass}>
              Mật khẩu mới
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                id="rp-new-password"
                name="newPassword"
                required
                className={`${modalInputClass} pr-11`}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <EyeToggle
                open={showNew}
                onToggle={() => setShowNew((v) => !v)}
                labelShow="Hiện mật khẩu mới"
                labelHide="Ẩn mật khẩu mới"
              />
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
            </p>
          </div>
          <div className="mb-3">
            <label htmlFor="rp-confirm-password" className={modalLabelClass}>
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                id="rp-confirm-password"
                name="confirmPassword"
                required
                className={`${modalInputClass} pr-11`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <EyeToggle
                open={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
                labelShow="Hiện xác nhận mật khẩu"
                labelHide="Ẩn xác nhận mật khẩu"
              />
            </div>
          </div>
          <div id="reset-password-error" className="mt-3 mb-2 min-h-5 text-sm text-danger" role="alert" aria-live="assertive">
            {error}
          </div>
          <div
            id="reset-password-success"
            className="mt-1 font-semibold text-[#10b981]"
            style={{ display: success ? 'block' : 'none' }}
          >
            {success}
          </div>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button id="btn-cancel-reset-password" variant="outline" size="modal" onClick={handleClose}>
          Hủy bỏ
        </Button>
        <Button
          id="btn-submit-reset-password"
          type="submit"
          form="reset-password-form"
          variant="primary"
          size="modalWide"
          disabled={pending}
        >
          {pending ? 'Đang xử lý…' : 'Xác nhận'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
