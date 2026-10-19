import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'

vi.mock('../../shared/api/endpoints', () => ({
  api: {
    queryUserVehicle: vi.fn(),
    addVehicle: vi.fn(),
    editVehicle: vi.fn(),
    deleteVehicle: vi.fn(),
  },
}))

import { api } from '../../shared/api/endpoints'
import { useAuthStore } from '../../shared/auth/authStore'
import { useToastStore } from '../../shared/ui/toastStore'
import { resetVehicleStore } from './store'
import { VehicleSection } from './VehicleSection'

const VEHICLES = [
  { nm: '29A-111', vehiType: '1', vehiColor: 'Trắng', pid: 'c1', pnm: 'Công ty A', dl: [{ id: 'DEV1' }] },
  { nm: '30B-222', vehiType: '2', vehiColor: 'Đen', pid: 'c1', pnm: 'Công ty A', devIdno: 'DEV2' },
  { nm: '51C-333', vehiType: '9' },
]

async function settle(ms = 50) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function toasts() {
  return useToastStore.getState().toasts.map((t) => [t.type, t.message])
}

beforeEach(() => {
  vi.useFakeTimers()
  sessionStorage.clear()
  resetVehicleStore()
  useToastStore.setState({ toasts: [] })
  useAuthStore.setState({ view: 'app', hasShownApp: true })
  vi.mocked(api.queryUserVehicle).mockReset().mockResolvedValue({ result: 0, vehicles: VEHICLES })
  vi.mocked(api.addVehicle).mockReset().mockResolvedValue({ result: 0 })
  vi.mocked(api.editVehicle).mockReset().mockResolvedValue({ result: 0 })
  vi.mocked(api.deleteVehicle).mockReset().mockResolvedValue({ result: 0 })
})
afterEach(() => {
  vi.useRealTimers()
  useAuthStore.setState({ view: 'login', hasShownApp: false })
})

async function renderVehicle(route = '/vehicle') {
  const r = renderWithProviders(<VehicleSection hidden={false} />, { route })
  await settle()
  return r
}

describe('thời điểm nạp dữ liệu (init + hashchange của vehicle.js)', () => {
  it('chưa hiển thị app lần đầu -> không gọi API', async () => {
    useAuthStore.setState({ view: 'login', hasShownApp: false })
    await renderVehicle('/vehicle')
    expect(api.queryUserVehicle).not.toHaveBeenCalled()
    expect(screen.getByText('Đang tải dữ liệu...')).toBeInTheDocument()
  })

  it('đang ở #vehicle khi init -> nạp đúng một lần', async () => {
    await renderVehicle('/vehicle')
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1)
    expect(screen.getByText('29A-111')).toBeInTheDocument()
  })

  it('StrictMode không nạp trùng', async () => {
    renderWithProviders(<VehicleSection hidden={false} />, { route: '/vehicle', strict: true })
    await settle()
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1)
  })

  it('ở route khác -> không nạp; chuyển sang #vehicle -> nạp (hashchange)', async () => {
    const { router } = await renderVehicle('/dashboard')
    expect(api.queryUserVehicle).not.toHaveBeenCalled()
    await act(async () => {
      await router.navigate({ to: '/vehicle' })
    })
    await settle()
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1)
    await act(async () => {
      await router.navigate({ to: '/map' })
    })
    await act(async () => {
      await router.navigate({ to: '/vehicle' })
    })
    await settle()
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(2)
  })

  it('không có polling', async () => {
    await renderVehicle()
    await settle(10 * 60_000)
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1)
  })

  it('lỗi tải -> toast lỗi và bảng trống', async () => {
    vi.mocked(api.queryUserVehicle).mockResolvedValue({ result: 1, msg: 'x' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await renderVehicle()
    expect(toasts()).toEqual([['error', 'Không thể tải danh sách xe']])
    expect(screen.getByText('Không tìm thấy phương tiện nào')).toBeInTheDocument()
  })
})

describe('bảng phương tiện', () => {
  it('hiển thị cột biển số, ID thiết bị, loại, màu, nhóm', async () => {
    await renderVehicle()
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(4) // header + 3
    const r1 = within(rows[1])
    expect(r1.getByText('29A-111')).toBeInTheDocument()
    expect(r1.getByText('DEV1')).toBeInTheDocument()
    expect(r1.getByText('Xe con')).toBeInTheDocument()
    expect(r1.getByText('Trắng')).toBeInTheDocument()
    expect(r1.getByText('Công ty A')).toBeInTheDocument()
    const r3 = within(rows[3])
    expect(r3.getByText('Chưa phân loại')).toBeInTheDocument()
    expect(r3.getByText('--', { selector: 'code' })).toBeInTheDocument()
    expect(r3.getAllByText('--')).toHaveLength(3) // màu, nhóm, ID thiết bị
  })

  it('tìm kiếm debounce 300 ms', async () => {
    await renderVehicle()
    const input = screen.getByPlaceholderText('Tìm biển số, ID thiết bị...')
    fireEvent.change(input, { target: { value: '30b' } })
    await settle(299)
    expect(screen.getByText('29A-111')).toBeInTheDocument()
    await settle(1)
    expect(screen.queryByText('29A-111')).not.toBeInTheDocument()
    expect(screen.getByText('30B-222')).toBeInTheDocument()
  })

  it('không khớp -> thông báo trống', async () => {
    await renderVehicle()
    fireEvent.change(screen.getByPlaceholderText('Tìm biển số, ID thiết bị...'), { target: { value: 'zzz' } })
    await settle(300)
    expect(screen.getByText('Không tìm thấy phương tiện nào')).toBeInTheDocument()
  })
})

describe('thêm / sửa phương tiện (handleSave)', () => {
  it('thêm: gọi addVehicle với payload form, toast, đóng modal, nạp lại', async () => {
    await renderVehicle()
    fireEvent.click(screen.getByRole('button', { name: /Thêm xe mới/ }))
    expect(screen.getByText('Thêm phương tiện mới', { selector: 'h3' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Biển số xe/), { target: { value: '77Z-999' } })
    fireEvent.change(screen.getByLabelText(/^ID thiết bị/), { target: { value: 'DEV9' } })
    fireEvent.change(screen.getByLabelText(/Loại phương tiện/), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText(/Màu sắc xe/), { target: { value: 'Xanh' } })
    fireEvent.change(screen.getByLabelText(/Nhóm quản lý/), { target: { value: 'c1' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu thông tin/ }))
    await settle()
    expect(api.addVehicle).toHaveBeenCalledWith({
      vehiIdno: '77Z-999',
      devIdno: 'DEV9',
      vehiType: '3',
      vehiColor: 'Xanh',
      companyId: 'c1',
    })
    expect(api.editVehicle).not.toHaveBeenCalled()
    expect(toasts()).toEqual([['success', 'Thêm phương tiện mới thành công']])
    expect(document.getElementById('vehicle-modal')).toHaveStyle({ display: 'none' })
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(2)
  })

  it('mặc định form thêm: loại Xe con, đơn vị trống', async () => {
    await renderVehicle()
    fireEvent.click(screen.getByRole('button', { name: /Thêm xe mới/ }))
    fireEvent.change(screen.getByLabelText(/Biển số xe/), { target: { value: 'A' } })
    fireEvent.change(screen.getByLabelText(/^ID thiết bị/), { target: { value: 'B' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu thông tin/ }))
    await settle()
    expect(api.addVehicle).toHaveBeenCalledWith({
      vehiIdno: 'A',
      devIdno: 'B',
      vehiType: '1',
      vehiColor: '',
      companyId: '',
    })
  })

  it('thiếu biển số hoặc ID thiết bị -> toast cảnh báo, không gọi API, không đóng modal', async () => {
    await renderVehicle()
    fireEvent.click(screen.getByRole('button', { name: /Thêm xe mới/ }))
    fireEvent.change(screen.getByLabelText(/Biển số xe/), { target: { value: 'A' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu thông tin/ }))
    await settle()
    expect(toasts()).toEqual([['warning', 'Vui lòng nhập đầy đủ Biển số và ID thiết bị']])
    expect(api.addVehicle).not.toHaveBeenCalled()
    expect(document.getElementById('vehicle-modal')).toHaveStyle({ display: 'flex' })
  })

  it('sửa: điền sẵn dữ liệu, biển số chỉ đọc, gọi editVehicle', async () => {
    await renderVehicle()
    fireEvent.click(screen.getAllByTitle('Chỉnh sửa')[0])
    expect(screen.getByText('Cập nhật phương tiện', { selector: 'h3' })).toBeInTheDocument()
    const plate = screen.getByLabelText(/Biển số xe/) as HTMLInputElement
    expect(plate.value).toBe('29A-111')
    expect(plate.readOnly).toBe(true)
    expect((screen.getByLabelText(/^ID thiết bị/) as HTMLInputElement).value).toBe('DEV1')
    expect((screen.getByLabelText(/Loại phương tiện/) as HTMLSelectElement).value).toBe('1')
    expect((screen.getByLabelText(/Màu sắc xe/) as HTMLInputElement).value).toBe('Trắng')
    expect((screen.getByLabelText(/Nhóm quản lý/) as HTMLSelectElement).value).toBe('c1')
    fireEvent.change(screen.getByLabelText(/Màu sắc xe/), { target: { value: 'Vàng' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu thông tin/ }))
    await settle()
    expect(api.editVehicle).toHaveBeenCalledWith({
      vehiIdno: '29A-111',
      devIdno: 'DEV1',
      vehiType: '1',
      vehiColor: 'Vàng',
      companyId: 'c1',
    })
    expect(api.addVehicle).not.toHaveBeenCalled()
    expect(toasts()).toEqual([['success', 'Cập nhật thành công']])
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(2)
  })

  it('mở lại form thêm sau khi sửa: biển số hết chỉ đọc và form được đặt lại', async () => {
    await renderVehicle()
    fireEvent.click(screen.getAllByTitle('Chỉnh sửa')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Hủy bỏ' }))
    expect(document.getElementById('vehicle-modal')).toHaveStyle({ display: 'none' })
    fireEvent.click(screen.getByRole('button', { name: /Thêm xe mới/ }))
    const plate = screen.getByLabelText(/Biển số xe/) as HTMLInputElement
    expect(plate.readOnly).toBe(false)
    expect(plate.value).toBe('')
  })

  it('API trả lỗi -> toast msg, modal giữ nguyên', async () => {
    vi.mocked(api.addVehicle).mockResolvedValue({ result: 1, msg: 'Trùng biển số' })
    await renderVehicle()
    fireEvent.click(screen.getByRole('button', { name: /Thêm xe mới/ }))
    fireEvent.change(screen.getByLabelText(/Biển số xe/), { target: { value: 'A' } })
    fireEvent.change(screen.getByLabelText(/^ID thiết bị/), { target: { value: 'B' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu thông tin/ }))
    await settle()
    expect(toasts()).toEqual([['error', 'Trùng biển số']])
    expect(document.getElementById('vehicle-modal')).toHaveStyle({ display: 'flex' })
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1)
  })

  it('API trả lỗi không có msg -> thông báo mặc định', async () => {
    vi.mocked(api.addVehicle).mockResolvedValue({ result: 1 })
    await renderVehicle()
    fireEvent.click(screen.getByRole('button', { name: /Thêm xe mới/ }))
    fireEvent.change(screen.getByLabelText(/Biển số xe/), { target: { value: 'A' } })
    fireEvent.change(screen.getByLabelText(/^ID thiết bị/), { target: { value: 'B' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu thông tin/ }))
    await settle()
    expect(toasts()).toEqual([['error', 'Có lỗi xảy ra khi lưu dữ liệu']])
  })

  it('ném lỗi -> "Lỗi kết nối máy chủ"', async () => {
    vi.mocked(api.addVehicle).mockRejectedValue(new Error('net'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await renderVehicle()
    fireEvent.click(screen.getByRole('button', { name: /Thêm xe mới/ }))
    fireEvent.change(screen.getByLabelText(/Biển số xe/), { target: { value: 'A' } })
    fireEvent.change(screen.getByLabelText(/^ID thiết bị/), { target: { value: 'B' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu thông tin/ }))
    await settle()
    expect(toasts()).toEqual([['error', 'Lỗi kết nối máy chủ']])
  })

  it('nút lưu bị khóa và đổi chữ khi đang lưu', async () => {
    let resolve: (v: { result: number }) => void = () => {}
    vi.mocked(api.addVehicle).mockReturnValue(new Promise((r) => (resolve = r)))
    await renderVehicle()
    fireEvent.click(screen.getByRole('button', { name: /Thêm xe mới/ }))
    fireEvent.change(screen.getByLabelText(/Biển số xe/), { target: { value: 'A' } })
    fireEvent.change(screen.getByLabelText(/^ID thiết bị/), { target: { value: 'B' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu thông tin/ }))
    await settle()
    const btn = screen.getByRole('button', { name: /Đang lưu\.\.\./ })
    expect(btn).toBeDisabled()
    await act(async () => resolve({ result: 0 }))
    await settle()
    // modal đã đóng (aria-hidden) nên phải tìm cả phần tử ẩn
    expect(screen.getByRole('button', { name: /Lưu thông tin/, hidden: true })).toBeEnabled()
  })
})

describe('xóa phương tiện (confirmDelete)', () => {
  it('hỏi xác nhận rồi gọi deleteVehicle, toast, đóng, nạp lại', async () => {
    await renderVehicle()
    fireEvent.click(screen.getAllByTitle('Xóa')[1])
    const modal = document.getElementById('delete-vehicle-confirm-modal')!
    expect(modal).toHaveStyle({ display: 'flex' })
    expect(document.getElementById('delete-vehicle-confirm-name')).toHaveTextContent('"30B-222"')
    expect(api.deleteVehicle).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Xóa xe/ }))
    await settle()
    expect(api.deleteVehicle).toHaveBeenCalledWith('30B-222')
    expect(toasts()).toEqual([['success', 'Đã xóa phương tiện']])
    expect(modal).toHaveStyle({ display: 'none' })
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(2)
  })

  it('Hủy -> đóng, không gọi API', async () => {
    await renderVehicle()
    fireEvent.click(screen.getAllByTitle('Xóa')[0])
    fireEvent.click(document.getElementById('delete-vehicle-confirm-no')!)
    expect(document.getElementById('delete-vehicle-confirm-modal')).toHaveStyle({ display: 'none' })
    expect(api.deleteVehicle).not.toHaveBeenCalled()
  })

  it('API lỗi -> toast msg, modal giữ nguyên, không nạp lại', async () => {
    vi.mocked(api.deleteVehicle).mockResolvedValue({ result: 1, msg: 'Xe đang dùng' })
    await renderVehicle()
    fireEvent.click(screen.getAllByTitle('Xóa')[0])
    fireEvent.click(screen.getByRole('button', { name: /Xóa xe/ }))
    await settle()
    expect(toasts()).toEqual([['error', 'Xe đang dùng']])
    expect(document.getElementById('delete-vehicle-confirm-modal')).toHaveStyle({ display: 'flex' })
    expect(api.queryUserVehicle).toHaveBeenCalledTimes(1)
  })

  it('ném lỗi -> "Lỗi khi kết nối API"', async () => {
    vi.mocked(api.deleteVehicle).mockRejectedValue(new Error('net'))
    await renderVehicle()
    fireEvent.click(screen.getAllByTitle('Xóa')[0])
    fireEvent.click(screen.getByRole('button', { name: /Xóa xe/ }))
    await settle()
    expect(toasts()).toEqual([['error', 'Lỗi khi kết nối API']])
  })
})
