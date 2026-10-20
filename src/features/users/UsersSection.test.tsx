import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { UsersSection } from './UsersSection'

describe('UsersSection UI', () => {
  it('hiển thị danh sách và mở form thêm', async () => {
    renderWithProviders(<UsersSection hidden={false} />, { route: '/users' })
    expect(await screen.findByRole('heading', { name: 'Quản lý người dùng' })).toBeInTheDocument()
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Thêm người dùng/i }))
    expect(await screen.findByRole('heading', { name: 'Thêm người dùng' })).toBeInTheDocument()
  })

  it('đổi persona ẩn cột doanh nghiệp', async () => {
    renderWithProviders(<UsersSection hidden={false} />, { route: '/users' })
    await screen.findByRole('heading', { name: 'Quản lý người dùng' })
    expect(screen.getByRole('columnheader', { name: 'Doanh nghiệp' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Quản trị DN' }))
    await waitFor(() => {
      expect(screen.queryByRole('columnheader', { name: 'Doanh nghiệp' })).not.toBeInTheDocument()
    })
  })
})
