import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { SettingsSection } from './SettingsSection'

describe('SettingsSection UI', () => {
  it('hiển thị cấu hình chung mặc định và lưu', async () => {
    renderWithProviders(<SettingsSection hidden={false} />, { route: '/settings' })
    expect(await screen.findByRole('heading', { name: 'Cài đặt hệ thống' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cấu hình chung' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByLabelText(/Ngôn ngữ mặc định/i)).toHaveValue('vi')
    fireEvent.click(screen.getByRole('button', { name: /Lưu cấu hình/i }))
  })

  it('chuyển tab Cảnh báo AI và Nhật ký hệ thống', async () => {
    renderWithProviders(<SettingsSection hidden={false} />, { route: '/settings' })
    await screen.findByRole('heading', { name: 'Cài đặt hệ thống' })

    fireEvent.click(screen.getByRole('button', { name: 'Cảnh báo AI' }))
    expect(screen.getByText('Độ nhạy AI')).toBeInTheDocument()
    expect(screen.getByText('Phát hiện mệt mỏi / ngủ gật')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Nhật ký hệ thống' }))
    expect(screen.getByPlaceholderText(/Tìm theo người dùng/i)).toBeInTheDocument()
    expect(screen.getByText('Xuất nhật ký')).toBeInTheDocument()
    expect(screen.getByText(/1\.248 bản ghi|1,248 bản ghi/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Lưu cấu hình/i })).not.toBeInTheDocument()
  })
})
