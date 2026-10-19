import { create } from 'zustand'

// Trạng thái mở của #change-password-modal. Modal nằm ngoài app-container ở bản gốc
// nên vẫn hiển thị kể cả khi đã đăng xuất (xem MIGRATION_NOTES).
export const useChangePasswordModalStore = create<{ open: boolean }>(() => ({ open: false }))

/** main.js:214-220 — chỉ hiện modal, KHÔNG xóa form (khác với clearChangePasswordForm). */
export function openChangePasswordModal(): void {
  useChangePasswordModalStore.setState({ open: true })
}

/** auth.js:288-293 setChangePasswordModalVisible(false) */
export function closeChangePasswordModal(): void {
  useChangePasswordModalStore.setState({ open: false })
}
