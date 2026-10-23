import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { EnterprisesSection } from './EnterprisesSection'

describe('EnterprisesSection UI', () => {
  it('hiển thị cây đơn vị và mở form thêm', async () => {
    renderWithProviders(<EnterprisesSection hidden={false} />, { route: '/enterprises' })
    expect(await screen.findByRole('heading', { name: 'Quản lý doanh nghiệp' })).toBeInTheDocument()
    expect(screen.getByText('VT Phương Đông')).toBeInTheDocument()
    expect(screen.getByText('CN Hà Nội')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Thêm đơn vị/i }))
    expect(await screen.findByRole('heading', { name: 'Thêm doanh nghiệp' })).toBeInTheDocument()
    expect(screen.getByText(/cơ cấu tổ chức/i)).toBeInTheDocument()
  })

  it('nút Lọc áp dụng tìm kiếm theo tên', async () => {
    renderWithProviders(<EnterprisesSection hidden={false} />, { route: '/enterprises' })
    await screen.findByText('VT Phương Đông')
    fireEvent.change(screen.getByPlaceholderText(/Tìm theo tên hoặc mã/i), {
      target: { value: 'Thành Công' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Lọc/i }))
    await waitFor(() => {
      expect(screen.getByText('HTX Thành Công')).toBeInTheDocument()
      expect(screen.queryByText('VT Phương Đông')).not.toBeInTheDocument()
    })
  })
})
