import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'

vi.mock('../../shared/api/endpoints', () => ({
  api: {
    findUserAccount: vi.fn(),
    findUserRole: vi.fn(),
    findCompany: vi.fn(),
    mergeUserAccount: vi.fn(),
    deleteUserAccount: vi.fn(),
  },
}))

import { api } from '../../shared/api/endpoints'
import { renderWithProviders } from '../../test/renderWithProviders'
import { UsersSection } from './UsersSection'
import { toMergeUserParams, toUsers } from './lib'

// Rút gọn từ phản hồi thật findUserAccount
const USERS = [
  { id: 2, nm: 'admin_geic', act: 'admin_geic', pid: 1, pnm: 'GEIC', stu: 1, rid: null, email: null, phone: null },
  { id: 3, nm: 'Trần Thị Bình', act: 'ttbinh', pid: 1, pnm: 'GEIC', stu: 0, rid: '7', email: 'b@x.vn', phone: '090' },
]

beforeEach(() => {
  vi.mocked(api.findUserAccount).mockReset().mockResolvedValue({ result: 0, infos: USERS })
  vi.mocked(api.findUserRole).mockReset().mockResolvedValue({ result: 0, role: [{ id: 7, name: 'Giám sát' }] })
  vi.mocked(api.findCompany).mockReset().mockResolvedValue({ result: 0, infos: [{ id: 1, name: 'GEIC' }] })
  vi.mocked(api.mergeUserAccount).mockReset().mockResolvedValue({ result: 0, id: 9 })
  vi.mocked(api.deleteUserAccount).mockReset().mockResolvedValue({ result: 0 })
})

describe('users mappers', () => {
  it('toUsers: act/nm/stu/rid', () => {
    const [a, b] = toUsers(USERS)
    expect(a).toMatchObject({ id: '2', username: 'admin_geic', status: 'active', roleIds: [], email: '' })
    expect(b).toMatchObject({ fullName: 'Trần Thị Bình', status: 'inactive', roleIds: ['7'], phone: '090' })
  })

  it('toMergeUserParams: roleId ghép dấu phẩy, status 0/1', () => {
    const v = { fullName: 'A', username: 'a', email: '', phone: '', enterpriseId: '1', roleIds: ['7', '8'], password: '' }
    expect(toMergeUserParams(v, { id: '3', status: 'inactive' })).toEqual({
      id: '3', account: 'a', name: 'A', cid: '1', roleId: '7,8', email: undefined, phone: undefined, password: undefined, status: 0,
    })
  })
})

describe('UsersSection UI', () => {
  it('hiển thị danh sách thật, vai trò từ findUserRole', async () => {
    renderWithProviders(<UsersSection hidden={false} />, { route: '/users' })
    expect(await screen.findByText('Trần Thị Bình')).toBeInTheDocument()
    expect(screen.getAllByText('admin_geic').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Giám sát').length).toBeGreaterThan(0)
  })

  it('tạo người dùng → mergeUserAccount', async () => {
    renderWithProviders(<UsersSection hidden={false} />, { route: '/users' })
    await screen.findByText('Trần Thị Bình')
    fireEvent.click(screen.getByRole('button', { name: /Thêm người dùng/i }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Họ/), { target: { value: 'Nguyễn An' } })
    fireEvent.change(within(dialog).getByLabelText(/Tên đăng nhập/), { target: { value: 'nguyenan' } })
    fireEvent.change(within(dialog).getByLabelText(/Doanh nghiệp/), { target: { value: '1' } })
    fireEvent.click(within(dialog).getByRole('button', { name: /Giám sát/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Tạo người dùng' }))
    await waitFor(() =>
      expect(api.mergeUserAccount).toHaveBeenCalledWith(
        expect.objectContaining({ account: 'nguyenan', name: 'Nguyễn An', cid: '1', roleId: '7' }),
      ),
    )
  })

  it('kích hoạt tài khoản đang vô hiệu → mergeUserAccount(status 1)', async () => {
    renderWithProviders(<UsersSection hidden={false} />, { route: '/users' })
    const row = (await screen.findByText('Trần Thị Bình')).closest('tr')!
    fireEvent.click(within(row).getByRole('button', { name: 'Kích hoạt' }))
    await waitFor(() => expect(api.mergeUserAccount).toHaveBeenCalledWith(expect.objectContaining({ id: '3', status: 1 })))
  })

  it('xóa → deleteUserAccount(id)', async () => {
    renderWithProviders(<UsersSection hidden={false} />, { route: '/users' })
    const row = (await screen.findByText('Trần Thị Bình')).closest('tr')!
    fireEvent.click(within(row).getByRole('button', { name: 'Xóa' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Xóa' }))
    await waitFor(() => expect(api.deleteUserAccount).toHaveBeenCalledWith('3'))
  })
})
