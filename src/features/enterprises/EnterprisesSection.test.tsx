import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'

vi.mock('../../shared/api/endpoints', () => ({
  api: {
    findCompany: vi.fn(),
    findUserAccount: vi.fn(),
    queryUserVehicle: vi.fn(),
    mergeCompany: vi.fn(),
    deleteCompany: vi.fn(),
  },
}))

import { api } from '../../shared/api/endpoints'
import { renderWithProviders } from '../../test/renderWithProviders'
import { EnterprisesSection } from './EnterprisesSection'
import { toUnits } from './lib'

// Rút gọn từ phản hồi thật của 808gps (findCompany / findUserAccount / queryUserVehicle)
const COMPANIES = [
  { id: 1, name: 'GEIC', level: 1, code: '', parentId: 0, linkMan: '', linkPhone: '', linkEmail: '', address: '' },
  { id: 5, name: 'CN Hà Nội', level: 1, code: 'HN', parentId: 1, linkMan: 'An', linkPhone: '090', linkEmail: '', address: 'HN' },
]
const USERS = [{ id: 2, act: 'admin_geic', pid: 1 }]
const VEHICLES = [{ nm: '202603030001', pid: 1, dl: [{ id: '202603030001' }] }]

beforeEach(() => {
  vi.mocked(api.findCompany).mockReset().mockResolvedValue({ result: 0, infos: COMPANIES })
  vi.mocked(api.findUserAccount).mockReset().mockResolvedValue({ result: 0, infos: USERS })
  vi.mocked(api.queryUserVehicle).mockReset().mockResolvedValue({ result: 0, vehicles: VEHICLES })
  vi.mocked(api.mergeCompany).mockReset().mockResolvedValue({ result: 0, id: 9 })
  vi.mocked(api.deleteCompany).mockReset().mockResolvedValue({ result: 0 })
})

describe('toUnits', () => {
  it('map findCompany + đếm người dùng/xe/thiết bị theo pid', () => {
    const [geic, hn] = toUnits(COMPANIES, USERS, VEHICLES)
    expect(geic).toMatchObject({ id: '1', type: 'enterprise', parentId: null, userCount: 1, deviceCount: 1, vehicleCount: 1 })
    expect(hn).toMatchObject({ id: '5', type: 'branch', parentId: '1', code: 'HN', representative: 'An', phone: '090', userCount: 0 })
    expect(toUnits([{ id: 7, name: 'PB', level: 12, parentId: 1 }], [], [])[0].type).toBe('department')
  })
})

describe('EnterprisesSection UI', () => {
  it('hiển thị cây đơn vị từ API và mở form thêm có tài khoản quản trị', async () => {
    renderWithProviders(<EnterprisesSection hidden={false} />, { route: '/enterprises' })
    expect(await screen.findByText('GEIC')).toBeInTheDocument()
    expect(screen.getByText('CN Hà Nội')).toBeInTheDocument()
    expect(api.findCompany).toHaveBeenCalledWith({ currentPage: 1, pageRecords: 1000 })
    fireEvent.click(screen.getByRole('button', { name: /Thêm đơn vị/i }))
    expect(await screen.findByRole('heading', { name: 'Thêm doanh nghiệp' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Tài khoản/)).toBeInTheDocument()
  })

  it('tạo đơn vị con → mergeCompany(name, parentId, account)', async () => {
    renderWithProviders(<EnterprisesSection hidden={false} />, { route: '/enterprises' })
    await screen.findByText('GEIC')
    fireEvent.click(screen.getByRole('button', { name: /Thêm đơn vị/i }))
    fireEvent.change(await screen.findByLabelText(/Tên đơn vị/), { target: { value: 'CN Đà Nẵng' } })
    fireEvent.change(screen.getByLabelText(/Đơn vị cha/), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/Tài khoản/), { target: { value: 'cn_dn' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu đơn vị/ }))
    await waitFor(() =>
      expect(api.mergeCompany).toHaveBeenCalledWith({ name: 'CN Đà Nẵng', parentId: '1', account: 'cn_dn', password: undefined }),
    )
  })

  it('xóa đơn vị lá không còn gắn dữ liệu → deleteCompany(id)', async () => {
    renderWithProviders(<EnterprisesSection hidden={false} />, { route: '/enterprises' })
    await screen.findByText('CN Hà Nội')
    const row = screen.getByText('CN Hà Nội').closest('tr')!
    fireEvent.click(row.querySelector('[aria-label="Xóa"]')!)
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa đơn vị' }))
    await waitFor(() => expect(api.deleteCompany).toHaveBeenCalledWith('5'))
  })

  it('nút Lọc áp dụng tìm kiếm theo tên', async () => {
    renderWithProviders(<EnterprisesSection hidden={false} />, { route: '/enterprises' })
    await screen.findByText('GEIC')
    fireEvent.change(screen.getByPlaceholderText(/Tìm theo tên hoặc mã/i), { target: { value: 'Hà Nội' } })
    fireEvent.click(screen.getByRole('button', { name: /Lọc/i }))
    // giữ cha để còn ngữ cảnh cây, đơn vị không khớp khác bị ẩn
    await waitFor(() => expect(screen.getByText('CN Hà Nội')).toBeInTheDocument())
  })
})
