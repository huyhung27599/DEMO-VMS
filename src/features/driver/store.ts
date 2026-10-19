import { create } from 'zustand'
import type { Loose } from './lib'

// Closure state UI của driver.js (driversData, isLoadingDrivers, nội dung #driver-grid,
// #face-service-status, #face-events-summary/#face-events-grid, modal, lightbox) gom vào một store.

export type DriverTab = 'driver-list' | 'ai-faces'

/** Nội dung #driver-grid (driver.js gán innerHTML). 'idle' = rỗng như index.html ban đầu. */
export type DriverGridView =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'list'; drivers: Loose[] }
  | { kind: 'error'; message: string }

/** #face-service-status + #face-db-count. 'initial' = markup index.html, 'checking' = spinner. */
export type FaceHealthView = {
  phase: 'initial' | 'checking' | 'done'
  ok: boolean
  statusText: string
  dbText: string
}

export type FaceSummaryView =
  | { kind: 'none' }
  | { kind: 'loading' }
  | { kind: 'done'; total: number }
  | { kind: 'error'; message: string }

export type FaceGridView =
  | { kind: 'initial' }
  | { kind: 'loading' }
  | { kind: 'list'; events: Loose[] }
  | { kind: 'error'; message: string }

export type DriverModalState = { open: boolean; openKey: number; driver: Loose | null }

type DriverState = {
  lastUpdate: string
  driversData: Loose[]
  isLoadingDrivers: boolean
  gridView: DriverGridView
  /** id (chuỗi) các thẻ đang xóa: nút thùng rác bị disable + spinner */
  deletingIds: string[]
  activeTab: DriverTab
  faceHealth: FaceHealthView
  faceSummary: FaceSummaryView
  faceGrid: FaceGridView
  lightboxUrl: string | null
  deleteConfirm: { open: boolean; name: string }
  driverModal: DriverModalState
}

const initialState = (): DriverState => ({
  lastUpdate: '--',
  driversData: [],
  isLoadingDrivers: false,
  gridView: { kind: 'idle' },
  deletingIds: [],
  activeTab: 'driver-list',
  faceHealth: { phase: 'initial', ok: false, statusText: '', dbText: '' },
  faceSummary: { kind: 'none' },
  faceGrid: { kind: 'initial' },
  lightboxUrl: null,
  deleteConfirm: { open: false, name: '' },
  driverModal: { open: false, openKey: 0, driver: null },
})

export const useDriverStore = create<DriverState>(() => initialState())

const set = useDriverStore.setState
const get = useDriverStore.getState

// driver.js:41-43
export function updateTimestamp(): void {
  set({ lastUpdate: new Date().toLocaleTimeString('vi-VN') })
}

/** driver.js:953 renderDrivers(drivers): chỉ thay nội dung #driver-grid (render bằng JSX). */
export function renderDrivers(drivers: Loose[]): void {
  set({ gridView: { kind: 'list', drivers } })
}

export function setDriversData(driversData: Loose[]): void {
  set({ driversData })
}

export function setDeleting(id: string, deleting: boolean): void {
  set((s) => ({
    deletingIds: deleting ? [...s.deletingIds, id] : s.deletingIds.filter((x) => x !== id),
  }))
}

export function setActiveTab(activeTab: DriverTab): void {
  set({ activeTab })
}

// ─── Lightbox (driver.js:1151-1174 openFaceImageLightbox) ───
export function openFaceImageLightbox(imageUrl: string): void {
  if (!imageUrl) return
  set({ lightboxUrl: imageUrl })
}

export function closeFaceImageLightbox(): void {
  set({ lightboxUrl: null })
}

// ─── Modal xác nhận xóa (driver.js:1047-1072 showDeleteDriverConfirm) ───
let resolveDeleteConfirm: ((ok: boolean) => void) | null = null

export function showDeleteDriverConfirm(driverName: string): Promise<boolean> {
  return new Promise((resolve) => {
    resolveDeleteConfirm = resolve
    set({ deleteConfirm: { open: true, name: driverName } })
  })
}

/** cleanup(result) của bản gốc: ẩn modal rồi resolve. */
export function answerDeleteDriverConfirm(result: boolean): void {
  set((s) => ({ deleteConfirm: { ...s.deleteConfirm, open: false } }))
  const resolve = resolveDeleteConfirm
  resolveDeleteConfirm = null
  resolve?.(result)
}

// ─── Modal thêm/sửa (driver.js:1899-1951) ───
export function openDriverModal(driver: Loose | null = null): void {
  set((s) => ({ driverModal: { open: true, openKey: s.driverModal.openKey + 1, driver } }))
}

export function closeDriverModal(): void {
  set((s) => ({ driverModal: { ...s.driverModal, open: false } }))
}

/** driver.js:2087-2090 window.appOpenDriverModal: tìm trong driversData (không phải danh sách đã lọc). */
export function appOpenDriverModal(driverId: string): void {
  const driver = get().driversData.find((d) => String(d.id) === String(driverId))
  if (driver) openDriverModal(driver)
}

/** Chỉ dùng trong test. */
export function resetDriverStore(): void {
  resolveDeleteConfirm = null
  set(initialState())
}
