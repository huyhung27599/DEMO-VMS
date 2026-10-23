import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { RolesSection } from './RolesSection'

describe('RolesSection UI', () => {
  it('hiển thị danh sách và mở form thêm vai trò', async () => {
    renderWithProviders(<RolesSection hidden={false} />, { route: '/roles' })
    expect(await screen.findByRole('heading', { name: 'Phân quyền' })).toBeInTheDocument()
    expect(screen.getByText('Quản trị hệ thống')).toBeInTheDocument()
    expect(screen.getByText('Giám sát viên')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Thêm vai trò/i }))
    expect(await screen.findByRole('heading', { name: 'Thêm vai trò' })).toBeInTheDocument()
    expect(screen.getByText(/Ma trận quyền/i)).toBeInTheDocument()
    expect(screen.getByText('Chọn tất cả')).toBeInTheDocument()
  })

  it('tìm kiếm theo tên vai trò', async () => {
    renderWithProviders(<RolesSection hidden={false} />, { route: '/roles' })
    await screen.findByText('Quản trị hệ thống')
    const input = screen.getByPlaceholderText(/Tìm theo tên vai trò/i)
    fireEvent.change(input, { target: { value: 'Chỉ xem' } })
    fireEvent.blur(input)
    await waitFor(() => {
      expect(screen.getByText('Chỉ xem')).toBeInTheDocument()
      expect(screen.queryByText('Quản trị hệ thống')).not.toBeInTheDocument()
    })
  })
})
