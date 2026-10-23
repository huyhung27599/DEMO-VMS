import { useState, type ReactNode } from 'react'
import { Button } from '../../../shared/ui/Button'
import { Modal, ModalBody, ModalFooter, modalInputClass } from '../../../shared/ui/Modal'
import { initials } from '../lib'
import type { User } from '../types'

function avatarLetters(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
  }
  return initials(name)
}

type BaseProps = {
  open: boolean
  user: User | null
  onClose: () => void
  onConfirm: () => void
}

function ConfirmShell({
  id,
  open,
  onClose,
  titleId,
  title,
  children,
  cancelLabel = 'Hủy',
  confirmLabel,
  confirmVariant,
  onConfirm,
}: {
  id: string
  open: boolean
  onClose: () => void
  titleId: string
  title: string
  children: ReactNode
  cancelLabel?: string
  confirmLabel: string
  confirmVariant: 'primary' | 'danger' | 'default'
  onConfirm: () => void
}) {
  return (
    <Modal id={id} open={open} onClose={onClose} labelledBy={titleId} maxWidth={440}>
      <div className="flex items-start justify-between px-7 pt-6 pb-2">
        <h3 id={titleId} className="m-0 text-lg font-bold text-text-main">
          {title}
        </h3>
        <button
          type="button"
          aria-label="Đóng"
          className="cursor-pointer border-none bg-transparent p-1 text-text-muted"
          onClick={onClose}
        >
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </div>
      <ModalBody>{children}</ModalBody>
      <ModalFooter>
        <Button variant="outline" size="modal" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant === 'default' ? 'default' : confirmVariant}
          size="modalWide"
          className={confirmVariant === 'default' ? 'bg-[#5c6b3a]! text-white!' : ''}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export function ConfirmDeactivateModal({ open, user, onClose, onConfirm }: BaseProps) {
  return (
    <ConfirmShell
      id="user-deactivate-modal"
      open={open}
      onClose={onClose}
      titleId="user-deactivate-title"
      title="Vô hiệu hóa tài khoản?"
      confirmLabel="Vô hiệu hóa"
      confirmVariant="default"
      onConfirm={onConfirm}
    >
      <p className="m-0 text-[0.95rem] leading-relaxed text-text-main">
        Người dùng <strong>{user?.fullName}</strong> sẽ không thể đăng nhập cho đến khi được kích hoạt lại. Dữ liệu
        vẫn được giữ nguyên.
      </p>
    </ConfirmShell>
  )
}

export function ConfirmDeleteModal({ open, user, onClose, onConfirm }: BaseProps) {
  return (
    <ConfirmShell
      id="user-delete-modal"
      open={open}
      onClose={onClose}
      titleId="user-delete-title"
      title="Xóa người dùng?"
      confirmLabel="Xóa"
      confirmVariant="danger"
      onConfirm={onConfirm}
    >
      <p className="m-0 text-[0.95rem] leading-relaxed text-text-main">
        Tài khoản <strong>{user?.fullName}</strong> sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác.
      </p>
    </ConfirmShell>
  )
}

/** Đặt mật khẩu mới qua mergeUserAccount (808gps không có luồng gửi email đặt lại). */
export function ResetPasswordModal({
  open,
  user,
  onClose,
  onConfirm,
}: Omit<BaseProps, 'onConfirm'> & { onConfirm: (password: string) => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const close = () => {
    setPassword('')
    setError('')
    onClose()
  }
  const submit = () => {
    if (password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự')
      return
    }
    onConfirm(password)
    setPassword('')
    setError('')
  }
  return (
    <Modal id="user-reset-password-modal" open={open} onClose={close} labelledBy="user-reset-title" maxWidth={460}>
      <div className="flex items-start justify-between px-7 pt-6 pb-2">
        <h3 id="user-reset-title" className="m-0 text-lg font-bold text-text-main">
          Đặt lại mật khẩu?
        </h3>
        <button
          type="button"
          aria-label="Đóng"
          className="cursor-pointer border-none bg-transparent p-1 text-text-muted"
          onClick={close}
        >
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </div>
      <ModalBody>
        <p className="m-0 mb-4 text-sm leading-relaxed text-text-muted">
          Đặt mật khẩu mới cho tài khoản. Hãy báo mật khẩu mới cho người dùng qua kênh an toàn.
        </p>
        {user ? (
          <div className="flex items-center gap-3 rounded-xl bg-[#f7f4ef] px-4 py-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
              {avatarLetters(user.fullName)}
            </div>
            <div>
              <div className="font-semibold text-text-main">{user.fullName}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-text-muted">
                <i className="fa-solid fa-envelope text-xs" aria-hidden="true" />
                {user.email || user.username}
              </div>
            </div>
          </div>
        ) : null}
        <label htmlFor="user-new-password" className="mt-4 mb-1.5 block text-[0.8rem] font-semibold text-[#334155]">
          Mật khẩu mới
        </label>
        <input
          id="user-new-password"
          type="password"
          autoComplete="new-password"
          className={modalInputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="mt-1.5 min-h-5 text-sm text-danger" role="alert">
          {error}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" size="modal" onClick={close}>
          Hủy
        </Button>
        <Button variant="primary" size="modalWide" onClick={submit}>
          Đặt mật khẩu
        </Button>
      </ModalFooter>
    </Modal>
  )
}
