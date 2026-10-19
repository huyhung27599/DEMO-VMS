import { useAuthStore } from '../shared/auth/authStore'

export type ModuleName = 'dashboard' | 'driver' | 'playback' | 'liveview' | 'events' | 'map' | 'event-server' | 'vehicle'

/**
 * `enabled` cho query của từng module, theo đúng thời điểm init của bản gốc:
 *  - dashboard, driver, playback: khởi tạo từ DOMContentLoaded -> luôn true;
 *  - liveview, events, map, event-server, vehicle: init lần đầu trong showApp (main.js:51-68)
 *    và không bao giờ dừng -> true kể từ lần hiển thị app đầu tiên (hasShownApp).
 */
export function useModuleEnabled(m: ModuleName): boolean {
  const hasShownApp = useAuthStore((s) => s.hasShownApp)
  if (m === 'dashboard' || m === 'driver' || m === 'playback') return true
  return hasShownApp
}
