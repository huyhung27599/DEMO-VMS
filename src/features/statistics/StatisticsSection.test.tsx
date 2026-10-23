import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'

vi.mock('../../shared/api/endpoints', () => ({
  api: {
    queryUserVehicle: vi.fn(),
    querySafetyAlarm: vi.fn(),
    performanceReportPhotoListSafe: vi.fn(),
    runMileage: vi.fn(),
    queryAlarmDetail: vi.fn(),
    queryAlarmEvidence: vi.fn(),
  },
}))

import { api } from '../../shared/api/endpoints'
import { BASE_URL } from '../../shared/api/client'
import { notifySectionShown } from '../../app/useActiveSection'
import { useAuthStore } from '../../shared/auth/authStore'
import { useToastStore } from '../../shared/ui/toastStore'
import { renderWithProviders } from '../../test/renderWithProviders'
import { statisticsCharts } from './chartsController'
import { formatDt } from './lib'
import { resetStatisticsInit } from './loaders'
import { resetStatisticsStore } from './store'
import { StatisticsSection } from './StatisticsSection'

const m = {
  vehicles: vi.mocked(api.queryUserVehicle),
  alarm: vi.mocked(api.querySafetyAlarm),
  safe: vi.mocked(api.performanceReportPhotoListSafe),
  mileage: vi.mocked(api.runMileage),
  detail: vi.mocked(api.queryAlarmDetail),
  alarmEv: vi.mocked(api.queryAlarmEvidence),
}

const BASE_STM = 1700000000
function makeAlarms(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    devIdno: i % 2 ? 'D2' : 'D1',
    atp: i % 2 ? 622 : 620,
    stm: BASE_STM + i * 60,
    level: 3,
  }))
}

function setup(alarms = makeAlarms(3), strict = false) {
  m.vehicles.mockResolvedValue({
    result: 0,
    vehicles: [
      { nm: '29A-111', vehiIdno: '29A-111', dl: [{ id: 'D1' }] },
      { nm: '30B-222', vehiIdno: '30B-222', dl: [{ id: 'D2' }] },
    ],
  })
  m.alarm.mockResolvedValue({ result: 0, alarms })
  m.mileage.mockResolvedValue({ result: 0, datas: [{ mileage: 50 }] })
  return renderWithProviders(<StatisticsSection hidden={false} />, { strict })
}

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset())
  m.safe.mockResolvedValue({ result: 0 })
  m.detail.mockResolvedValue({ result: 0 })
  m.alarmEv.mockResolvedValue({ result: 0 })
  resetStatisticsInit()
  resetStatisticsStore()
  sessionStorage.clear()
  localStorage.clear()
  useToastStore.setState({ toasts: [] })
  useAuthStore.setState({ view: 'app', hasShownApp: true })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  useAuthStore.setState({ view: 'login', hasShownApp: false })
})

async function loaded() {
  await waitFor(() => expect(document.querySelectorAll('#stat-events-tbody tr.stat-events-row').length).toBeGreaterThan(0))
}

describe('StatisticsSection', () => {
  it('chưa hiển thị app -> không tải; tải đúng 1 lần ở lần showApp đầu (kể cả StrictMode)', async () => {
    useAuthStore.setState({ view: 'login', hasShownApp: false })
    setup(makeAlarms(3), true)
    expect(await screen.findByText('Báo cáo')).toBeInTheDocument()
    expect(screen.getByText('Đang tải dữ liệu...', { exact: false })).toBeInTheDocument()
    expect(m.vehicles).not.toHaveBeenCalled()
    act(() => useAuthStore.setState({ view: 'app', hasShownApp: true }))
    await loaded()
    expect(m.vehicles).toHaveBeenCalledTimes(1)
    expect(m.alarm).toHaveBeenCalledTimes(1)
    // loadStatistics gọi runMileage với datetime; báo cáo "Hành trình" (reports.ts) gọi với ngày (YYYY-MM-DD)
    expect(m.mileage.mock.calls.filter((c) => String(c[1]).length > 10)).toHaveLength(2)
  })

  it('KPI, bảng, xếp hạng (mặc định "Ít lỗi nhất") sau khi tải', async () => {
    setup()
    await loaded()
    expect(document.getElementById('kpi-total-violations')).toHaveTextContent('3')
    expect(document.getElementById('kpi-safety-rate')).toHaveTextContent('0.0%')
    expect(document.getElementById('kpi-avg-score')).toHaveTextContent('97.0')
    expect(document.getElementById('kpi-violation-per-100km')).toHaveTextContent('3.00')
    expect(document.getElementById('kpi-top-violation')).toHaveTextContent('Nghe điện thoại L1')
    expect(document.getElementById('kpi-top-violation-pct')).toHaveTextContent('66.7')
    expect(document.getElementById('kpi-safe-drivers')).toHaveTextContent('0')
    expect(document.getElementById('stat-last-update')).not.toHaveTextContent('--')
    const lb = document.getElementById('stat-leaderboard-list')!
    expect(within(lb).getAllByRole('listitem').map((li) => li.querySelector('.lb-name')?.textContent)).toEqual([
      '30B-222',
      '29A-111',
    ])
    fireEvent.change(screen.getByLabelText('Loại xếp hạng'), { target: { value: 'worst' } })
    expect(within(lb).getAllByRole('listitem').map((li) => li.querySelector('.lb-name')?.textContent)).toEqual([
      '29A-111',
      '30B-222',
    ])
    const rows = document.querySelectorAll('#stat-events-tbody tr.stat-events-row')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('29A-111')
    expect(rows[0]).toHaveTextContent('Nghe điện thoại')
    expect(rows[0]).toHaveTextContent('Trầm trọng')
    expect(screen.getByText('Trang 1 / 1')).toBeInTheDocument()
  })

  it('nút ngày / làm mới gọi lại loadStatistics; nút ngày đổi khoảng thời gian', async () => {
    setup()
    await loaded()
    vi.useFakeTimers({ now: new Date(2024, 2, 20, 12, 0, 0), toFake: ['Date'] })
    try {
      fireEvent.click(screen.getByRole('button', { name: '7 ngày' }))
      await waitFor(() => expect(m.alarm).toHaveBeenCalledTimes(2))
      expect(m.alarm.mock.calls[1].slice(0, 2)).toEqual([
        formatDt(new Date(2024, 2, 13, 12, 0, 0)),
        formatDt(new Date(2024, 2, 20, 12, 0, 0)),
      ])
    } finally {
      vi.useRealTimers()
    }
    expect(screen.getByRole('button', { name: '7 ngày' })).toHaveClass('active')
    expect(screen.getByRole('button', { name: 'Hôm nay' })).not.toHaveClass('active')
    fireEvent.click(screen.getByTitle('Làm mới dữ liệu'))
    await waitFor(() => expect(m.vehicles).toHaveBeenCalledTimes(3))
  })

  it('tùy chọn ngày: hiện picker, điền mặc định 24h, kiểm tra hợp lệ rồi tải', async () => {
    setup()
    await loaded()
    const picker = document.getElementById('stat-custom-date-picker')!
    expect(picker).toHaveStyle({ display: 'none' })
    fireEvent.click(screen.getByRole('button', { name: /Tùy chọn/ }))
    expect(picker).toHaveStyle({ display: 'flex' })
    const startInput = document.getElementById('stat-custom-start') as HTMLInputElement
    const endInput = document.getElementById('stat-custom-end') as HTMLInputElement
    expect(startInput.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(endInput.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(m.vehicles).toHaveBeenCalledTimes(1)

    fireEvent.change(startInput, { target: { value: '2024-03-16T00:00' } })
    fireEvent.change(endInput, { target: { value: '2024-03-15T00:00' } })
    fireEvent.click(screen.getByLabelText('Áp dụng'))
    expect(useToastStore.getState().toasts.map((t) => [t.message, t.type])).toEqual([
      ['Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc', 'warning'],
    ])
    expect(m.vehicles).toHaveBeenCalledTimes(1)

    fireEvent.change(endInput, { target: { value: '' } })
    fireEvent.click(screen.getByLabelText('Áp dụng'))
    expect(useToastStore.getState().toasts[1].message).toBe('Vui lòng chọn đầy đủ thời gian')

    fireEvent.change(startInput, { target: { value: '2024-03-15T00:00' } })
    fireEvent.change(endInput, { target: { value: '2024-03-16T00:00' } })
    fireEvent.click(screen.getByLabelText('Áp dụng'))
    await waitFor(() => expect(m.alarm).toHaveBeenCalledTimes(2))
    expect(m.alarm.mock.calls[1].slice(0, 2)).toEqual([
      formatDt(new Date(2024, 2, 15, 0, 0)),
      formatDt(new Date(2024, 2, 16, 0, 0)),
    ])
  })

  it('lọc loại, tìm kiếm, phân trang 15 dòng', async () => {
    setup(makeAlarms(20))
    await loaded()
    const rows = () => document.querySelectorAll('#stat-events-tbody tr.stat-events-row')
    expect(rows()).toHaveLength(15)
    expect(screen.getByText('Trang 1 / 2')).toBeInTheDocument()
    const prev = screen.getByRole('button', { name: 'Trước' })
    const next = screen.getByRole('button', { name: 'Sau' })
    expect(prev).toBeDisabled()
    fireEvent.click(next)
    expect(rows()).toHaveLength(5)
    expect(screen.getByText('Trang 2 / 2')).toBeInTheDocument()
    expect(next).toBeDisabled()
    fireEvent.click(prev)
    expect(rows()).toHaveLength(15)

    fireEvent.click(next)
    fireEvent.change(document.getElementById('stat-table-filter-type')!, { target: { value: '622' } })
    expect(rows()).toHaveLength(10)
    expect(screen.getByText('Trang 1 / 1')).toBeInTheDocument()
    fireEvent.input(document.getElementById('stat-table-search')!, { target: { value: '  29A ' } })
    expect(screen.getByText('Không có dữ liệu phù hợp bộ lọc')).toBeInTheDocument()
  })

  it('click dòng -> modal, tải bằng chứng 1 lần, hiển thị media qua proxy; đóng', async () => {
    localStorage.setItem('dashcam_auth_token', 'TOKEN')
    setup(makeAlarms(1))
    await loaded()
    let resolveDetail: (v: unknown) => void = () => {}
    m.detail.mockReturnValueOnce(new Promise((r) => (resolveDetail = r)) as never)
    fireEvent.click(document.querySelector('#stat-events-tbody tr.stat-events-row')!)
    const modal = document.getElementById('stat-event-modal')!
    expect(modal).toHaveStyle({ display: 'flex' })
    expect(within(modal).getByText('Đang tải bằng chứng từ Fleetcontrol...')).toBeInTheDocument()
    expect(within(modal).getByText(/Xe: 29A-111/)).toBeInTheDocument()
    await act(async () => {
      resolveDetail({ result: 0, alarms: [{ fileUrl: 'http://fleetscontrol.com/a.jpg', stm: BASE_STM }] })
    })
    const img = await within(modal).findByAltText('Bằng chứng vi phạm')
    expect(img).toHaveAttribute(
      'src',
      `${BASE_URL}fleet-media-proxy?u=${encodeURIComponent('http://fleetscontrol.com/a.jpg')}&jsession=TOKEN`,
    )
    expect(within(modal).getByText(/Tổng cộng 1 bằng chứng \(Fleetcontrol\)/)).toBeInTheDocument()
    expect(m.detail).toHaveBeenCalledTimes(1)
    fireEvent.error(img)
    expect(within(modal).getByText('Không tải được ảnh')).toBeInTheDocument()

    fireEvent.click(document.getElementById('stat-modal-close')!)
    expect(modal).toHaveStyle({ display: 'none' })

    // mở lại -> hiện lại trạng thái đang tải và gọi lại (lần này không có media: đủ 3 cửa sổ)
    fireEvent.click(document.querySelector('#stat-events-tbody tr.stat-events-row')!)
    expect(within(modal).getByText('Đang tải bằng chứng từ Fleetcontrol...')).toBeInTheDocument()
    expect(await within(modal).findByText('Không tìm thấy ảnh/video bằng chứng cho sự kiện này.')).toBeInTheDocument()
    expect(m.detail).toHaveBeenCalledTimes(4)
  })

  it('modal không có media -> thông báo không tìm thấy', async () => {
    setup(makeAlarms(1))
    await loaded()
    fireEvent.click(document.querySelector('#stat-events-tbody tr.stat-events-row')!)
    expect(await screen.findByText('Không tìm thấy ảnh/video bằng chứng cho sự kiện này.')).toBeInTheDocument()
  })

  it('xuất CSV: tải file BOM + tên BaoCao_AI_PhuongTien_<ngày>.csv; rỗng -> toast', async () => {
    const createObjectURL = vi.fn(() => 'blob:csv')
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    setup(makeAlarms(2))
    await loaded()
    fireEvent.click(screen.getByRole('button', { name: /CSV/ }))
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0]
    expect(blob.type).toBe('text/csv;charset=utf-8;')
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsText(blob)
    })
    expect(text.split('\n')[0]).toBe('Thời gian,Xe,Mã lỗi,Loại vi phạm,Mức độ,Tọa độ Lat,Tọa độ Lng,Tốc độ (km/h)')
    expect(click).toHaveBeenCalledTimes(1)
    const a = click.mock.instances[0] as unknown as HTMLAnchorElement
    expect(a.getAttribute('href')).toBe('blob:csv')
    expect(a.getAttribute('download')).toBe(`BaoCao_AI_PhuongTien_${new Date().toISOString().slice(0, 10)}.csv`)
    expect(a.isConnected).toBe(false)

    fireEvent.input(document.getElementById('stat-table-search')!, { target: { value: 'zzz' } })
    fireEvent.click(screen.getByRole('button', { name: /CSV/ }))
    expect(useToastStore.getState().toasts.map((t) => [t.message, t.type])).toEqual([
      ['Không có dữ liệu để xuất', 'info'],
    ])
    click.mockRestore()
  })

  it('onSectionShown("statistics") -> resizeCharts', async () => {
    const resize = vi.spyOn(statisticsCharts, 'resizeCharts')
    setup()
    await loaded()
    act(() => notifySectionShown('statistics'))
    expect(resize).toHaveBeenCalledTimes(1)
    resize.mockRestore()
  })
})
