import { create } from 'zustand'

// Chuyển từ window.AppHelpers.showLoader/hideLoader (main.js:266-271): bật/tắt display của #global-loader.
// Không đếm số lần gọi — lần hideLoader đầu tiên ẩn loader, như bản gốc.

export const useLoaderStore = create<{ visible: boolean }>(() => ({ visible: false }))

export function showLoader(): void {
  useLoaderStore.setState({ visible: true })
}

export function hideLoader(): void {
  useLoaderStore.setState({ visible: false })
}
