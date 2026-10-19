import { onSectionShown } from '../../app/useActiveSection'
import { buildVehicleMap } from './faceEvents'
import { loadDrivers, showFaceServiceHealth } from './queries'
import { renderDrivers, useDriverStore } from './store'

/**
 * driver.js:1622-1665 "Auto-init when section is shown". Bản gốc có ba đường kích hoạt:
 * MutationObserver trên #driver-section, click nav [data-target=driver] (+50 ms) và kiểm tra một lần sau 200 ms.
 * Cả ba gộp vào onSectionShown('driver') (150 ms sau khi section hiển thị, chỉ khi app đang hiển thị),
 * theo logic của listener click nav (nhánh đầy đủ nhất).
 * Không có setInterval; không nạp gì khi section chưa từng hiển thị.
 */
export function onDriverSectionShown(): void {
  const { driversData, isLoadingDrivers } = useDriverStore.getState()
  if (driversData.length === 0 && !isLoadingDrivers) {
    void buildVehicleMap()
    void showFaceServiceHealth()
    void loadDrivers()
  } else if (driversData.length > 0) {
    // Re-render if already loaded (data might be stale)
    renderDrivers(driversData)
    void showFaceServiceHealth()
  }
}

let unsubscribe: (() => void) | null = null

/** Đăng ký một lần (StrictMode chạy effect hai lần). */
export function initDriver(): void {
  if (unsubscribe) return
  unsubscribe = onSectionShown('driver', onDriverSectionShown)
}

/** Chỉ dùng trong test. */
export function resetDriverInit(): void {
  unsubscribe?.()
  unsubscribe = null
}
