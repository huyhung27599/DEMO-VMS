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
import { GlobalLoader } from '../shared/ui/GlobalLoader'
import { LogoutConfirmModal } from './LogoutConfirmModal'
import { STUB_ROUTES } from './navConfig'
import { PlaceholderSection } from './PlaceholderSection'
import { Sidebar } from './Sidebar'
import { useActiveSection } from './useActiveSection'

/**
 * #app-container — real sections stay mounted; stub routes use PlaceholderSection.
 */
export function AppShell({ hidden }: { hidden: boolean }) {
  const active = useActiveSection()
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <div id="app-container" hidden={hidden} className="flex h-screen animate-fade-in bg-bg max-[768px]:flex-col">
      <Sidebar active={active} onLogoutClick={() => setLogoutOpen(true)} />
      <main className="relative flex flex-1 flex-col overflow-hidden bg-bg">
        <GlobalLoader />
        <DashboardSection hidden={active !== 'dashboard'} />
        <LiveviewSection hidden={active !== 'liveview'} />
        <PlaybackSection hidden={active !== 'playback'} />
        <StatisticsSection hidden={active !== 'statistics'} />
        <SettingsSection hidden={active !== 'settings'} />
        <MapSection hidden={active !== 'map'} />
        <DriverSection hidden={active !== 'driver'} />
        <VehicleSection hidden={active !== 'vehicle'} />
        <EventServerSection hidden={active !== 'event-server'} />
        {STUB_ROUTES.map((routeId) => (
          <PlaceholderSection key={routeId} routeId={routeId} hidden={active !== routeId} />
        ))}
      </main>
      <LogoutConfirmModal open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </div>
  )
}
