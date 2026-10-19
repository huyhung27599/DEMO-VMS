import { onNavItemClick } from '../../app/useActiveSection'
import { buildVehicleMap } from './faceEvents'
import { loadDrivers, showFaceServiceHealth } from './queries'
import { renderDrivers, useDriverStore } from './store'

// driver.js:1622-1665 "Auto-init when section is shown" — ba đường kích hoạt như bản gốc.

/** #driver-section đang hiển thị (getComputedStyle(section).display !== 'none'); DriverSection cập nhật. */
let sectionVisible = false

function loadAllIfEmpty(): void {
  const { driversData, isLoadingDrivers } = useDriverStore.getState()
  if (sectionVisible && driversData.length === 0 && !isLoadingDrivers) {
    void buildVehicleMap()
    void showFaceServiceHealth()
    void loadDrivers()
  }
}

/**
 * 1. MutationObserver (driver.js:1626-1634): section vừa hiển thị (đổi route sang driver, hoặc hiện lại app
 *    khi đang ở #driver) -> chỉ nạp khi danh sách rỗng và không đang nạp. Ngoài ra không làm gì.
 */
export function onDriverSectionVisibility(visible: boolean): void {
  sectionVisible = visible
  if (visible) loadAllIfEmpty()
}

/** 2. Click nav [data-target=driver] (driver.js:1638-1653): sau 50 ms, kể cả khi click lại route đang active. */
export function onDriverNavClick(): void {
  setTimeout(() => {
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
  }, 50)
}

let unsubscribe: (() => void) | null = null
let initialCheck: ReturnType<typeof setTimeout> | undefined

/** Đăng ký một lần lúc tải trang (StrictMode chạy effect hai lần). */
export function initDriver(): void {
  if (unsubscribe) return
  unsubscribe = onNavItemClick('driver', onDriverNavClick)
  // 3. Kiểm tra một lần sau 200 ms (driver.js:1657-1664)
  initialCheck = setTimeout(loadAllIfEmpty, 200)
}

/** Chỉ dùng trong test. */
export function resetDriverInit(): void {
  unsubscribe?.()
  unsubscribe = null
  clearTimeout(initialCheck)
  sectionVisible = false
}
