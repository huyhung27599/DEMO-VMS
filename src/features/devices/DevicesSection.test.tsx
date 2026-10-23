import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'

vi.mock('../../shared/api/endpoints', () => ({
  api: {
    queryUserVehicle: vi.fn(),
    getDeviceStatus: vi.fn(),
    getLoadDeviceInfo: vi.fn(),
    addDevice: vi.fn(),
    installVehicle: vi.fn(),
    uninstallDevice: vi.fn(),
    deleteDevice: vi.fn(),
  },
}))

import { api } from '../../shared/api/endpoints'
import { renderWithProviders } from '../../test/renderWithProviders'
import { DevicesSection } from './DevicesSection'
import { toDevices } from './lib'

// Rút gọn từ phản hồi thật queryUserVehicle (dl[] là thiết bị gắn trên xe)
const VEHICLES = [
  { nm: '202603030001', pid: 1, pnm: 'GEIC', chnName: 'CH1,CH2', dl: [{ id: '202603030001', sim: null, ist: '2026-09-04 17:14:06' }] },
  { nm: '51A-00964', pid: 1, pnm: 'GEIC', chnName: 'CH1', dl: [{ id: '052040000964', sim: '0356', ist: null }] },
]

beforeEach(() => {
  vi.mocked(api.queryUserVehicle).mockReset().mockResolvedValue({
    result: 0,
    companys: [{ id: 1, nm: 'GEIC', pId: 0 }],
    vehicles: VEHICLES,
  })
  vi.mocked(api.getDeviceStatus).mockReset().mockResolvedValue({
    result: 0,
    status: [{ id: '202603030001', ol: 1, sn: 9, net: 3, gt: '2026-10-23 11:00:00' }],
  })
  vi.mocked(api.getLoadDeviceInfo).mockReset().mockResolvedValue({ result: 0, devstaus: [{ AllVolume: 100, LeftVolume: 40 }] })
  for (const fn of [api.addDevice, api.installVehicle, api.uninstallDevice, api.deleteDevice])
    vi.mocked(fn).mockReset().mockResolvedValue({ result: 0 })
})

describe('toDevices', () => {
  it('thiết bị từ dl[] của xe + trạng thái + bộ nhớ', () => {
    const [d1, d2] = toDevices(VEHICLES, [{ id: '202603030001', ol: 1, sn: 2, net: 4 }], { '202603030001': { AllVolume: 200, LeftVolume: 50 } })
    expect(d1).toMatchObject({ serial: '202603030001', vehiclePlate: '202603030001', enterpriseId: '1', gps: 'weak', network: '5G', serverConnected: true, storagePercent: 75, cameras: ['CH1', 'CH2'] })
    expect(d2).toMatchObject({ sim: '0356', gps: null, network: null, serverConnected: null, storagePercent: null })
  })
})

describe('DevicesSection UI', () => {
  it('hiển thị danh sách thiết bị thật và mở form thêm', async () => {
    renderWithProviders(<DevicesSection hidden={false} />, { route: '/devices' })
    expect(await screen.findByText('052040000964')).toBeInTheDocument()
    expect(screen.getAllByText('GEIC').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /Thêm thiết bị/i }))
    expect(await screen.findByRole('heading', { name: 'Thêm thiết bị' })).toBeInTheDocument()
  })

  it('tạo thiết bị → addDevice rồi installVehicle', async () => {
    renderWithProviders(<DevicesSection hidden={false} />, { route: '/devices' })
    await screen.findByText('052040000964')
    fireEvent.click(screen.getByRole('button', { name: /Thêm thiết bị/i }))
    fireEvent.change(await screen.findByLabelText(/ID thiết bị/), { target: { value: 'ABC12345' } })
    fireEvent.change(screen.getByLabelText(/Doanh nghiệp/), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/Phương tiện lắp đặt/), { target: { value: '51A-00964' } })
    fireEvent.click(screen.getByRole('button', { name: /Tạo thiết bị/ }))
    await waitFor(() => expect(api.installVehicle).toHaveBeenCalledWith({ vehiIdno: '51A-00964', devIdno: 'ABC12345' }))
    expect(api.addDevice).toHaveBeenCalledWith(expect.objectContaining({ devIdno: 'ABC12345', companyName: 'GEIC' }))
  })

  it('xóa thiết bị đang gắn xe → uninstallDevice rồi deleteDevice', async () => {
    renderWithProviders(<DevicesSection hidden={false} />, { route: '/devices' })
    const cell = await screen.findByText('052040000964')
    fireEvent.click(cell.closest('tr')!.querySelector('[aria-label="Xóa"]')!)
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa thiết bị' }))
    await waitFor(() => expect(api.deleteDevice).toHaveBeenCalledWith('052040000964'))
    expect(api.uninstallDevice).toHaveBeenCalledWith('052040000964', '51A-00964')
  })
})
