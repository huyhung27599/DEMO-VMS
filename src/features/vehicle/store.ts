import { create } from 'zustand'

// vehicle.js:376 updateTimestamp -> #vehicle-last-update
export const useVehicleStore = create<{ lastUpdate: string }>(() => ({ lastUpdate: '--' }))

export function updateTimestamp(): void {
  useVehicleStore.setState({ lastUpdate: new Date().toLocaleTimeString('vi-VN') })
}

/** Chỉ dùng trong test. */
export function resetVehicleStore(): void {
  useVehicleStore.setState({ lastUpdate: '--' })
}
