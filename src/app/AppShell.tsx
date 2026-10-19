import { useState } from 'react'
import { DashboardSection } from '../features/dashboard/DashboardSection'
import { DriverSection } from '../features/driver/DriverSection'
import { EventServerSection } from '../features/event-server/EventServerSection'
import { LiveviewSection } from '../features/liveview/LiveviewSection'
import { MapSection } from '../features/map/MapSection'
import { PlaybackSection } from '../features/playback/PlaybackSection'
import { SettingsSection } from '../features/settings/SettingsSection'
import { StatisticsSection } from '../features/statistics/StatisticsSection'
import { VehicleSection } from '../features/vehicle/VehicleSection'
import { LogoutConfirmModal } from './LogoutConfirmModal'
import { Sidebar } from './Sidebar'
import { useActiveSection } from './useActiveSection'

/**
 * #app-container (index.html:558-1590). Mọi section luôn được mount (giống DOM gốc);
 * section không active có `hidden` nên polling của nó vẫn chạy như bản gốc.
 */
export function AppShell({ hidden }: { hidden: boolean }) {
  // Hook duy nhất chạy side effect switchSection (onSectionShown)
  const active = useActiveSection()
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <div id="app-container" hidden={hidden} className="flex h-screen animate-fade-in bg-bg max-[768px]:flex-col">
      <Sidebar active={active} onLogoutClick={() => setLogoutOpen(true)} />
      <main className="relative flex flex-1 flex-col overflow-hidden bg-bg">
        {/* Thứ tự giống index.html */}
        <DashboardSection hidden={active !== 'dashboard'} />
        <LiveviewSection hidden={active !== 'liveview'} />
        <PlaybackSection hidden={active !== 'playback'} />
        <StatisticsSection hidden={active !== 'statistics'} />
        <SettingsSection hidden={active !== 'settings'} />
        <MapSection hidden={active !== 'map'} />
        <DriverSection hidden={active !== 'driver'} />
        <VehicleSection hidden={active !== 'vehicle'} />
        <EventServerSection hidden={active !== 'event-server'} />
      </main>
      <LogoutConfirmModal open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </div>
  )
}
