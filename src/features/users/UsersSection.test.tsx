import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { UsersSection } from './UsersSection'

describe('UsersSection UI', () => {
  it('hiển thị danh sách và mở form thêm theo mock', async () => {
    renderWithProviders(<UsersSection hidden={false} />, { route: '/users' })
    expect(await screen.findByRole('heading', { name: 'Quản lý người dùng' })).toBeInTheDocument()
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Thêm người dùng/i }))
    expect(await screen.findByRole('heading', { name: 'Thêm người dùng' })).toBeInTheDocument()
    expect(screen.getByText(/tự đặt mật khẩu lần đầu/i)).toBeInTheDocument()
  })

  it('nút Lọc áp dụng bộ lọc tìm kiếm', async () => {
    renderWithProviders(<UsersSection hidden={false} />, { route: '/users' })
    await screen.findByText('Nguyễn Văn An')
    fireEvent.change(screen.getByPlaceholderText(/Tìm theo tên/i), { target: { value: 'Bình' } })
    fireEvent.click(screen.getByRole('button', { name: /Lọc/i }))
    await waitFor(() => {
      expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument()
      expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument()
    })
  })
})
