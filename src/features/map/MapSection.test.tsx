import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'

vi.mock('leaflet', () => import('../../test/leafletMock'))
vi.mock('../../shared/map/territorial', () => ({ addTerritorialOverlays: vi.fn() }))
vi.mock('../../shared/api/endpoints', () => ({
  api: { getDeviceStatus: vi.fn(), queryUserVehicle: vi.fn() },
}))

import L from 'leaflet'
import { created, resetLeafletMock } from '../../test/leafletMock'
import { expectPolling } from '../../test/expectPolling'
import { renderWithProviders } from '../../test/renderWithProviders'
import { notifySectionShown } from '../../app/useActiveSection'
import { api } from '../../shared/api/endpoints'
import { useAuthStore } from '../../shared/auth/authStore'
import { LiveviewSection } from '../liveview/LiveviewSection'
import { resetMapController } from './mapController'
import { MapSection } from './MapSection'

const STATUS = { result: 0, status: [{ id: 'DEV1', ol: 1, jing: 106500000, wei: 16200000 }] }

async function settle(ms = 50) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function renderBoth(strict = false) {
  return renderWithProviders(
    <>
      <LiveviewSection hidden />
      <MapSection hidden={false} />
    </>,
    { strict },
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  sessionStorage.clear()
  localStorage.clear()
  sessionStorage.setItem('dashcam_auth_token', 'tok')
  resetLeafletMock()
  resetMapController()
  vi.mocked(L.map).mockClear()
  vi.mocked(api.getDeviceStatus).mockReset().mockResolvedValue(STATUS)
  vi.mocked(api.queryUserVehicle).mockReset().mockResolvedValue({ result: 0, vehicles: [] })
  useAuthStore.setState({ view: 'login', hasShownApp: false })
})
afterEach(() => vi.useRealTimers())

describe('MapSection', () => {
  it('hiển thị tiêu đề, nút và placeholder; chưa hiển thị app thì không tạo bản đồ, không poll', async () => {
    renderBoth()
    await settle()
    expect(screen.getByText('Bản đồ trực tuyến')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tập trung bản đồ' })).toBeInTheDocument()
    expect(screen.getByText('Đang phát triển...')).toBeInTheDocument()
    expect(screen.getByText('Initializing Map...')).toBeInTheDocument()
    await settle(5000)
    expect(L.map).not.toHaveBeenCalled()
    expect(api.getDeviceStatus).not.toHaveBeenCalled()
  })

  it('showApp lần đầu: init hai bản đồ (#liveview-map, #map-container), gọi ngay rồi poll mỗi 1500 ms kể cả tab ẩn', async () => {
    renderBoth()
    await settle()
    act(() => useAuthStore.setState({ view: 'app', hasShownApp: true }))
    await settle(0)
    expect(L.map).toHaveBeenCalledTimes(2)
    expect(created.maps.map((m) => (m.el as HTMLElement).id)).toEqual(['liveview-map', 'map-container'])
    expect(screen.queryByText('Đang phát triển...')).not.toBeInTheDocument()
    expect(screen.queryByText('Initializing Map...')).not.toBeInTheDocument()
    expect(api.getDeviceStatus).toHaveBeenCalledTimes(1)
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1)
    await expectPolling(vi.mocked(api.getDeviceStatus), 1500)
    // danh sách xe chỉ tải một lần (cache)
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1)
    // mỗi lần có dữ liệu -> updateMapMarkers vẽ marker trên cả hai bản đồ
    expect(created.markers).toHaveLength(2)
  })

  it('StrictMode không nhân đôi bản đồ hay polling', async () => {
    useAuthStore.setState({ view: 'app', hasShownApp: true })
    renderBoth(true)
    await settle(0)
    expect(L.map).toHaveBeenCalledTimes(2)
    expect(api.getDeviceStatus).toHaveBeenCalledTimes(1)
    await expectPolling(vi.mocked(api.getDeviceStatus), 1500)
  })

  it('đăng xuất -> lần poll kế tiếp dừng hẳn; đăng nhập lại không chạy lại (bản gốc)', async () => {
    useAuthStore.setState({ view: 'app', hasShownApp: true })
    renderBoth()
    await settle(0)
    expect(api.getDeviceStatus).toHaveBeenCalledTimes(1)
    sessionStorage.clear()
    act(() => useAuthStore.setState({ view: 'login' }))
    await settle(1500)
    await settle(6000)
    expect(api.getDeviceStatus).toHaveBeenCalledTimes(1)
    sessionStorage.setItem('dashcam_auth_token', 'tok')
    act(() => useAuthStore.setState({ view: 'app' }))
    await settle(6000)
    expect(api.getDeviceStatus).toHaveBeenCalledTimes(1)
  })

  it('onSectionShown("map") và ("liveview") gọi handleResize (invalidateSize cả hai bản đồ)', async () => {
    useAuthStore.setState({ view: 'app', hasShownApp: true })
    renderBoth()
    await settle(600)
    created.maps.forEach((m) => m.invalidateSize.mockClear())
    notifySectionShown('map')
    expect(created.maps.map((m) => m.invalidateSize.mock.calls.length)).toEqual([1, 1])
    notifySectionShown('liveview')
    expect(created.maps.map((m) => m.invalidateSize.mock.calls.length)).toEqual([2, 2])
  })

  it('"Tập trung bản đồ" fitBounds bản đồ chính theo các marker', async () => {
    useAuthStore.setState({ view: 'app', hasShownApp: true })
    renderBoth()
    await settle(0)
    const main = created.maps.find((m) => (m.el as HTMLElement).id === 'map-container')!
    fireEvent.click(screen.getByRole('button', { name: 'Tập trung bản đồ' }))
    expect(main.fitBounds).toHaveBeenCalledWith(expect.anything(), { padding: [50, 50] })
  })
})
