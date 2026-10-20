import { useState, type FormEvent } from 'react'
import { Button } from '../../shared/ui/Button'
import { Modal, ModalBody, ModalFooter, ModalHeader, modalInputClass, modalLabelClass } from '../../shared/ui/Modal'
import { errorMessage, useResetRequestMutation } from './mutations'
import { firstError, resetRequestSchema } from './schemas'

// #reset-request-modal — SRS §3.1 Form Quên mật khẩu
// LoginScreen remount modal (đổi `key`) mỗi lần mở = clearResetRequestForm.
export function ResetRequestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [account, setAccount] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const mutation = useResetRequestMutation()

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const value = account.trim()
    const err = firstError(resetRequestSchema, { account: value })
    if (err) {
      setError(err)
      return
    }
    setError('')
    mutation.mutate(value, {
      onSuccess: () => {
        setSuccess('Yêu cầu đã được gửi. Vui lòng liên hệ quản trị viên để hoàn tất.')
        setAccount('')
        // Giữ nguyên bản gốc: timer không bị hủy
        setTimeout(onClose, 3000)
      },
      onError: (err) => setError(errorMessage(err, 'Lỗi hệ thống khi gửi yêu cầu.')),
    })
  }

  return (
    <Modal id="reset-request-modal" open={open} onClose={onClose} labelledBy="reset-request-title" maxWidth={480}>
      <ModalHeader
        titleId="reset-request-title"
        title="Yêu cầu khôi phục mật khẩu"
        closeId="btn-close-reset-request"
        onClose={onClose}
      />
      <ModalBody>
        <form id="reset-request-form" onSubmit={onSubmit}>
          <p className="mb-6 text-[0.95rem] leading-relaxed text-text-muted">
            Nhập tên đăng nhập hoặc email đã đăng ký. Hệ thống sẽ gửi liên kết khôi phục mật khẩu nếu tài khoản hợp lệ.
          </p>
          <div className="mb-4">
            <label htmlFor="reset-username" className={modalLabelClass}>
              Tài khoản hoặc Email
            </label>
            <input
              type="text"
              id="reset-username"
              name="account"
              required
              placeholder="Nhập tài khoản hoặc email"
              autoComplete="username"
              className={modalInputClass}
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </div>
          <div id="reset-request-error" className="mt-3 mb-4 min-h-5 text-sm text-danger" role="alert" aria-live="assertive">
            {error}
          </div>
          <div
            id="reset-request-success"
            className="mt-3 font-semibold text-[#10b981]"
            style={{ display: success ? 'block' : 'none' }}
          >
            {success}
          </div>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button id="btn-cancel-reset-request" variant="outline" size="modal" onClick={onClose}>
          Hủy bỏ
        </Button>
        <Button
          id="btn-submit-reset-request"
          type="submit"
          form="reset-request-form"
          variant="primary"
          size="modalWide"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Đang gửi...' : 'Xác nhận'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
