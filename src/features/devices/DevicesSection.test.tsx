import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { DevicesSection } from './DevicesSection'

describe('DevicesSection UI', () => {
  it('hiển thị danh sách và mở form thêm thiết bị', async () => {
    renderWithProviders(<DevicesSection hidden={false} />, { route: '/devices' })
    expect(await screen.findByRole('heading', { name: 'Quản lý thiết bị' })).toBeInTheDocument()
    expect(screen.getByText('052040001165')).toBeInTheDocument()
    expect(screen.getByText('30M-81775')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Thêm thiết bị/i }))
    expect(await screen.findByRole('heading', { name: 'Thêm thiết bị' })).toBeInTheDocument()
    expect(screen.getByText(/Số serial in trên Box AI/i)).toBeInTheDocument()
  })

  it('mở chi tiết thiết bị từ icon mắt', async () => {
    renderWithProviders(<DevicesSection hidden={false} />, { route: '/devices' })
    await screen.findByText('052040001165')
    fireEvent.click(screen.getAllByRole('button', { name: 'Chi tiết' })[0]!)
    expect(await screen.findByRole('heading', { name: 'Chi tiết thiết bị' })).toBeInTheDocument()
    expect(screen.getByText(/Trạng thái phần cứng/i)).toBeInTheDocument()
    expect(screen.getByText('Lịch sử thiết bị')).toBeInTheDocument()
  })

  it('lọc theo ID thiết bị', async () => {
    renderWithProviders(<DevicesSection hidden={false} />, { route: '/devices' })
    await screen.findByText('052040001165')
    fireEvent.change(screen.getByPlaceholderText(/Tìm theo ID thiết bị/i), {
      target: { value: '052040001215' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Lọc/i }))
    await waitFor(() => {
      expect(screen.getByText('052040001215')).toBeInTheDocument()
      expect(screen.queryByText('052040001165')).not.toBeInTheDocument()
    })
  })
})
