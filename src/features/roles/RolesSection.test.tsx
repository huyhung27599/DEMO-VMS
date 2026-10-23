import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'

vi.mock('../../shared/api/endpoints', () => ({
  api: {
    findUserRole: vi.fn(),
    findUserAccount: vi.fn(),
    findCompany: vi.fn(),
    mergeUserRole: vi.fn(),
    deleteUserRole: vi.fn(),
  },
}))

import { api } from '../../shared/api/endpoints'
import { renderWithProviders } from '../../test/renderWithProviders'
import { RolesSection } from './RolesSection'
import { matrixToPrivileges, privilegesToMatrix, toRoles } from './lib'
import { emptyMatrix } from './types'

const ROLES = [
  { id: 7, name: 'Giám sát viên', privilege: '613,621,627', company: { id: 1, name: 'GEIC' } },
  { id: 8, name: 'Chỉ xem', privilege: '2,21', company: { id: 1, name: 'GEIC' } },
]

beforeEach(() => {
  vi.mocked(api.findUserRole).mockReset().mockResolvedValue({ result: 0, role: ROLES })
  vi.mocked(api.findUserAccount).mockReset().mockResolvedValue({ result: 0, infos: [{ id: 2, rid: '7' }] })
  vi.mocked(api.findCompany).mockReset().mockResolvedValue({ result: 0, infos: [{ id: 1, name: 'GEIC' }] })
  vi.mocked(api.mergeUserRole).mockReset().mockResolvedValue({ result: 0, id: 9 })
  vi.mocked(api.deleteUserRole).mockReset().mockResolvedValue({ result: 0 })
})

describe('privilege mapping', () => {
  it('matrix → privilege: lấy cả nhóm của chức năng có ô tick, bỏ trùng id 4', () => {
    const m = emptyMatrix()
    m.liveview.view = true
    m.users.create = true
    m.devices.delete = true
    expect(matrixToPrivileges(m)).toBe('4,33,35,613,621,627')
  })

  it('privilege → matrix: id riêng bật cả 5 quyền; id 4 đơn lẻ không bật gì', () => {
    const m = privilegesToMatrix('4,613')
    expect(Object.values(m.liveview).every(Boolean)).toBe(true)
    expect(Object.values(m.users).some(Boolean)).toBe(false)
  })

  it('toRoles: đếm người dùng theo rid, công ty từ company', () => {
    const [a, b] = toRoles(ROLES, [{ rid: '7' }, { rid: '7,8' }])
    expect(a).toMatchObject({ id: '7', userCount: 2, companyId: '1', companyName: 'GEIC', kind: 'custom' })
    expect(b.userCount).toBe(1)
  })
})

describe('RolesSection UI', () => {
  it('hiển thị vai trò thật và mở form thêm', async () => {
    renderWithProviders(<RolesSection hidden={false} />, { route: '/roles' })
    expect(await screen.findByText('Giám sát viên')).toBeInTheDocument()
    expect(screen.getByText('Chỉ xem')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Thêm vai trò/i }))
    expect(await screen.findByRole('heading', { name: 'Thêm vai trò' })).toBeInTheDocument()
    expect(screen.getByText(/Ma trận quyền/i)).toBeInTheDocument()
  })

  it('nhân bản → mergeUserRole cùng cid + privilege', async () => {
    renderWithProviders(<RolesSection hidden={false} />, { route: '/roles' })
    const row = (await screen.findByText('Giám sát viên')).closest('tr')!
    fireEvent.click(within(row).getByRole('button', { name: 'Nhân bản' }))
    await waitFor(() =>
      expect(api.mergeUserRole).toHaveBeenCalledWith({ name: 'Giám sát viên (bản sao)', cid: '1', privilege: '613,621,627' }),
    )
  })

  it('xóa vai trò chưa gán người dùng → deleteUserRole', async () => {
    renderWithProviders(<RolesSection hidden={false} />, { route: '/roles' })
    const row = (await screen.findByText('Chỉ xem')).closest('tr')!
    fireEvent.click(within(row).getByRole('button', { name: 'Xóa' }))
    fireEvent.click(within(await screen.findByRole('dialog')).getAllByRole('button').at(-1)!)
    await waitFor(() => expect(api.deleteUserRole).toHaveBeenCalledWith('8'))
  })
})
