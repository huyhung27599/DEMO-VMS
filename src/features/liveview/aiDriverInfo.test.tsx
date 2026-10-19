import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'

vi.mock('leaflet', () => import('../../test/leafletMock'))
vi.mock('../../shared/map/territorial', () => ({ addTerritorialOverlays: vi.fn() }))
vi.mock('hls.js', () => ({ default: class {} }))
vi.mock('../../shared/api/endpoints', () => ({
  api: {
    BASE_URL: 'http://localhost:4000/api/',
    getDeviceStatus: vi.fn(),
    queryUserVehicle: vi.fn(),
    getUpstreamSession: vi.fn(),
    getLiveVideoHtml: vi.fn(),
    realTimeVideo: vi.fn(),
    getLiveVideoAddress: vi.fn(),
    querySafetyAlarm: vi.fn(),
    queryIdentifyAlarm: vi.fn(),
    syncAiEventsLocal: vi.fn(),
    performanceReportPhotoListSafe: vi.fn(),
    faceCaptureAndRecognize: vi.fn(),
    saveFaceRecognitionLog: vi.fn(),
    queryDriverList: vi.fn(),
  },
}))

import { renderWithProviders } from '../../test/renderWithProviders'
import { expectPolling } from '../../test/expectPolling'
import { api } from '../../shared/api/endpoints'
import type { ApiResponse } from '../../shared/api/types'
import { useAuthStore } from '../../shared/auth/authStore'
import { queryClient } from '../../shared/query/queryClient'
import { mapController, resetMapController } from '../map/mapController'
import { resetLeafletMock } from '../../test/leafletMock'
import { resetLiveviewInit } from './actions'
import { resetAiState } from './aiQueries'
import { resetDriverInfo } from './driverInfo'
import { LiveviewSection } from './LiveviewSection'
import { resetLiveviewStore } from './store'
import { resetStreamController } from './streamController'

const PLAYER = 'https://fleetscontrol.com/808gps/open/player/RealPlayVideo.html?jsession=J'
const ONE_VEHICLE = { result: 0, vehicles: [{ nm: '51A-001', vehiIdno: '51A001', dl: [{ id: 'DEV1' }] }] }

async function settle(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function render(strict = false) {
  return renderWithProviders(<LiveviewSection hidden={false} />, { strict })
}

async function showAppAndLoadVehicles() {
  act(() => useAuthStore.setState({ view: 'app', hasShownApp: true }))
  await settle()
  fireEvent.change(document.getElementById('company-select-inner') as HTMLElement, { target: { value: 'hung' } })
  await settle()
}

const aiTab = () => screen.getByRole('tab', { name: /Sự kiện AI/ })
const mapTab = () => screen.getByRole('tab', { name: /Bản đồ giám sát/ })
const aiList = () => document.getElementById('ai-events-list') as HTMLElement
const driverContent = () => document.querySelector('[data-driver-content]') as HTMLElement

function deferred<T>() {
  let resolve: (v: T) => void = () => {}
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-19T08:00:00Z'))
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  sessionStorage.clear()
  localStorage.clear()
  sessionStorage.setItem('dashcam_auth_token', 'tok')
  sessionStorage.setItem('dashcam_auth_user', 'hung')
  queryClient.clear()
  resetLeafletMock()
  resetMapController()
  resetLiveviewInit()
  resetLiveviewStore()
  resetStreamController()
  resetAiState()
  resetDriverInfo()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ '8899': 'Nguyễn A' }) }))
  vi.mocked(api.getDeviceStatus).mockReset().mockResolvedValue({ result: 0, status: [] })
  vi.mocked(api.queryUserVehicle).mockReset().mockResolvedValue(ONE_VEHICLE)
  vi.mocked(api.getUpstreamSession).mockReset().mockResolvedValue({ result: 0, upstreamJsession: 'J' })
  vi.mocked(api.getLiveVideoHtml).mockReset().mockResolvedValue({ result: 0, url: PLAYER })
  vi.mocked(api.realTimeVideo).mockReset().mockResolvedValue({ result: 0 })
  vi.mocked(api.querySafetyAlarm)
    .mockReset()
    .mockResolvedValue({ result: 0, alarms: [{ guid: 'g1', ty: 618, st: 1_790_000_000 }] })
  vi.mocked(api.queryIdentifyAlarm).mockReset().mockResolvedValue({ result: 0, alarms: [] })
  vi.mocked(api.syncAiEventsLocal).mockReset().mockResolvedValue({ result: 0, events: [] })
  vi.mocked(api.performanceReportPhotoListSafe).mockReset().mockResolvedValue({ result: 0, photos: [] })
  vi.mocked(api.faceCaptureAndRecognize).mockReset().mockResolvedValue({ result: 0, face_count: 0 })
  vi.mocked(api.saveFaceRecognitionLog).mockReset().mockResolvedValue({ result: 0 })
  vi.mocked(api.queryDriverList).mockReset().mockResolvedValue({ result: 0, infos: [{ dn: 'Nguyen A', jn: '8899' }] })
  vi.spyOn(mapController, 'focusOnVehicle')
  vi.spyOn(mapController, 'handleResize')
  useAuthStore.setState({ view: 'login', hasShownApp: false })
})
afterEach(() => {
  document.getElementById('ai-alert-list')?.remove()
  resetStreamController()
  resetAiState()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('cảnh báo AI (pollAiAlerts)', () => {
  it('index.html không có #ai-alert-list: pollAiAlerts luôn thoát sớm, không gọi API', async () => {
    render()
    await showAppAndLoadVehicles()
    await settle(60_000)
    expect(api.querySafetyAlarm).not.toHaveBeenCalled()
    expect(api.queryIdentifyAlarm).not.toHaveBeenCalled()
  })

  it('có #ai-alert-list: gọi ngay sau khi tải xe rồi mỗi 15 000 ms (StrictMode, tab ẩn)', async () => {
    const ul = document.createElement('ul')
    ul.id = 'ai-alert-list'
    document.body.appendChild(ul)
    render(true)
    act(() => useAuthStore.setState({ view: 'app', hasShownApp: true }))
    await settle()
    // init: lần gọi ngay — chưa có vehiclesCache -> thoát
    expect(api.querySafetyAlarm).not.toHaveBeenCalled()
    fireEvent.change(document.getElementById('company-select-inner') as HTMLElement, { target: { value: 'hung' } })
    await settle()
    // loadVehicleDropdown -> pollAiAlerts()
    expect(api.querySafetyAlarm).toHaveBeenCalledTimes(1)
    expect(api.querySafetyAlarm).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      '618,619,620,621,624,625,626,627',
      'DEV1',
      1,
      50,
    )
    expect(api.queryIdentifyAlarm).toHaveBeenCalledTimes(1)
    expect(ul).toHaveTextContent('Lái xe mệt mỏi')
    expect(ul).toHaveTextContent('51A-001')
    await expectPolling(vi.mocked(api.querySafetyAlarm), 15_000)
  })
})

describe('tab Sự kiện AI (loadApiAiEvents + polling 3 000 ms)', () => {
  const EVENTS = {
    result: 0,
    events: [
      { vehiIdno: '51A001', devIdno: 'DEV1', fileTime: '2026-10-19T07:00:00Z', alarmType: 618, images: [] },
      { vehiIdno: '51A001', devIdno: 'DEV1', fileTime: '2026-10-19T06:00:00Z', alarmType: 602, images: [] },
      { vehiIdno: '51A001', devIdno: 'DEV1', fileTime: '2026-10-19T05:00:00Z', alarmType: 190, images: [] },
    ],
  }

  it('chưa mở tab: không tải; mở tab: tải ngay (spinner) rồi polling 3 s chỉ khi tab active', async () => {
    vi.mocked(api.syncAiEventsLocal).mockResolvedValue(EVENTS)
    render(true)
    await showAppAndLoadVehicles()
    await settle(10_000)
    expect(api.syncAiEventsLocal).not.toHaveBeenCalled()
    expect(aiList()).toHaveTextContent('Chưa có sự kiện AI nào được ghi nhận.')

    fireEvent.click(aiTab())
    expect(aiList()).toHaveTextContent('Đang tải sự kiện AI...')
    expect(api.syncAiEventsLocal).toHaveBeenCalledTimes(1)
    expect(api.syncAiEventsLocal).toHaveBeenCalledWith('DEV1', '51A001')
    expect(api.queryIdentifyAlarm).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'DEV1', 1, 20)
    await settle()
    expect(within(aiList()).getAllByRole('listitem')).toHaveLength(3)
    expect(aiList()).toHaveTextContent('Lái xe mệt mỏi')
    expect(aiList()).toHaveTextContent('NGHIÊM TRỌNG')

    await expectPolling(vi.mocked(api.syncAiEventsLocal), 3000)

    // đổi tab: dừng
    fireEvent.click(mapTab())
    const n = vi.mocked(api.syncAiEventsLocal).mock.calls.length
    await settle(12_000)
    expect(api.syncAiEventsLocal).toHaveBeenCalledTimes(n)

    // mở lại: một lần tải ngay (không silent) rồi polling tiếp
    fireEvent.click(aiTab())
    expect(api.syncAiEventsLocal).toHaveBeenCalledTimes(n + 1)
    await settle()
    await expectPolling(vi.mocked(api.syncAiEventsLocal), 3000)
  })

  it('lỗi (không silent) -> "Lỗi tải dữ liệu"; không bắt đầu polling', async () => {
    // lỗi đồng bộ trong flatMap (fetchApi bị reject đã được .catch(() => []) nuốt)
    vi.mocked(api.syncAiEventsLocal).mockImplementation(() => {
      throw new Error('boom')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render()
    await showAppAndLoadVehicles()
    fireEvent.click(aiTab())
    await settle()
    expect(aiList()).toHaveTextContent('Lỗi tải dữ liệu. Hãy thử lại sau.')
    await settle(9000)
    expect(api.syncAiEventsLocal).toHaveBeenCalledTimes(1)
  })

  it('thumbnail sự kiện an toàn không có ảnh được nạp trễ idx * 250 ms', async () => {
    vi.mocked(api.syncAiEventsLocal).mockResolvedValue(EVENTS)
    render()
    await showAppAndLoadVehicles()
    fireEvent.click(aiTab())
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    const placeholder = (i: number) =>
      document.getElementById(`ai-thumb-main-${i}`)?.querySelector('.event-icon-placeholder') ?? null
    expect(placeholder(0)).not.toBeNull()
    expect(placeholder(1)).not.toBeNull()
    expect(placeholder(2)).not.toBeNull()
    await settle(0)
    // idx 0: 0 ms (ev.stm không có -> icon image-slash)
    expect(placeholder(0)).toBeNull()
    expect(document.getElementById('ai-thumb-main-0')?.querySelector('.fa-image-slash')).not.toBeNull()
    expect(placeholder(1)).not.toBeNull()
    await settle(249)
    expect(placeholder(1)).not.toBeNull()
    await settle(1)
    expect(placeholder(1)).toBeNull()
    expect(placeholder(2)).not.toBeNull()
    await settle(250)
    expect(placeholder(2)).toBeNull()
    // ev.stm không được gán ở loadApiAiEvents -> không bao giờ gọi API bằng chứng (như bản gốc)
    expect(api.performanceReportPhotoListSafe).not.toHaveBeenCalled()
  })

  it('sự kiện nhận dạng: 50 ms sau thay spinner bằng ảnh tài xế', async () => {
    vi.mocked(api.queryIdentifyAlarm).mockResolvedValue({
      result: 0,
      alarms: [{ guid: 'x', st: 1_790_000_000, driverName: 'Nguyen A (8899)' }],
    })
    render()
    await showAppAndLoadVehicles()
    fireEvent.click(aiTab())
    await settle()
    expect(aiList()).toHaveTextContent('NHẬN DẠNG')
    expect(aiList()).toHaveTextContent('Nguyen A')
    await settle(50)
    const img = document.getElementById('ai-thumb-main-0')?.querySelector('img')
    expect(img).toHaveAttribute('src', 'http://localhost:4000/api/driver/photo/8899/face_1.jpg')
  })

  it('ô tìm kiếm lọc cache đã tải; modal mở theo chỉ số và đóng bằng Esc sau 300 ms', async () => {
    vi.mocked(api.syncAiEventsLocal).mockResolvedValue(EVENTS)
    render()
    await showAppAndLoadVehicles()
    fireEvent.click(aiTab())
    await settle()
    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm sự kiện, xe...' }), { target: { value: 'zzz' } })
    expect(aiList()).toHaveTextContent('Không có sự kiện khớp tìm kiếm.')
    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm sự kiện, xe...' }), { target: { value: '' } })
    expect(within(aiList()).getAllByRole('listitem')).toHaveLength(3)

    fireEvent.click(within(aiList()).getAllByRole('listitem')[1])
    const dialog = screen.getByRole('dialog')
    expect(dialog.parentElement).toBe(document.body)
    expect(dialog).toHaveClass('active')
    expect(dialog).toHaveTextContent('Lệch làn đường')
    expect(dialog).toHaveTextContent('KHÔNG CÓ HÌNH ẢNH BIÊN BẢN')
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(dialog).not.toHaveClass('active')
    await settle(299)
    expect(screen.queryByRole('dialog')).toBeInTheDocument()
    await settle(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })
})

describe('thẻ thông tin tài xế (loadDriverInfoForWall)', () => {
  const KNOWN = { result: 0, match: true, name: '8899_Nguyen_A', face_count: 1, score: 0.9 }

  async function selectVehicle() {
    fireEvent.change(document.getElementById('liveview-vehicle-select') as HTMLElement, { target: { value: '0' } })
  }

  it('lần đầu chạy ngay, sau đó 10 000 ms một lần; dừng khi thẻ bị gỡ', async () => {
    const first = deferred<ApiResponse>()
    vi.mocked(api.faceCaptureAndRecognize).mockReturnValueOnce(first.promise).mockResolvedValue(KNOWN)
    render(true)
    await showAppAndLoadVehicles()
    await selectVehicle()
    expect(api.faceCaptureAndRecognize).toHaveBeenCalledTimes(1)
    expect(api.faceCaptureAndRecognize).toHaveBeenCalledWith('DEV1', 0)
    await settle()
    expect(driverContent()).toHaveTextContent('Đang nhận diện AI...')

    // iframe + keepalive đã xong -> lần nhận diện đầu trả về
    first.resolve(KNOWN)
    await settle()
    expect(api.queryDriverList).toHaveBeenCalledWith('8899_Nguyen_A')
    expect(driverContent()).toHaveTextContent('Nguyen A')
    expect(driverContent()).toHaveTextContent('Mã: 8899')
    expect(api.saveFaceRecognitionLog).toHaveBeenCalledWith(
      expect.objectContaining({ devIdno: 'DEV1', vehiIdno: '51A001', driverCode: '8899', faceCount: 1, source: 'liveview_poll' }),
    )
    const img = driverContent().querySelector('img') as HTMLImageElement
    expect(img.getAttribute('src')).toBe(
      `http://localhost:4000/api/driver/photo/${encodeURIComponent('8899_Nguyễn_A')}/face_1.jpg`,
    )

    await expectPolling(vi.mocked(api.faceCaptureAndRecognize), 10_000)

    // bỏ chọn nhóm: grid đổi -> wall bị gỡ -> dừng (keepalive vẫn chạy như bản gốc)
    fireEvent.change(document.getElementById('company-select-inner') as HTMLElement, { target: { value: '' } })
    await settle()
    const n = vi.mocked(api.faceCaptureAndRecognize).mock.calls.length
    await settle(40_000)
    expect(api.faceCaptureAndRecognize).toHaveBeenCalledTimes(n)
  })

  it('đồng hồ thời gian lái tăng mỗi giây', async () => {
    const first = deferred<ApiResponse>()
    vi.mocked(api.faceCaptureAndRecognize).mockReturnValueOnce(first.promise).mockResolvedValue(KNOWN)
    render()
    await showAppAndLoadVehicles()
    await selectVehicle()
    await settle()
    first.resolve(KNOWN)
    await settle()
    const span = () => driverContent().querySelector('[data-driving-duration]')
    expect(span()).toHaveTextContent('00:00:00')
    await settle(1000)
    expect(span()).toHaveTextContent('00:00:01')
    await settle(1000)
    expect(span()).toHaveTextContent('00:00:02')
    await settle(60_000)
    expect(span()).toHaveTextContent('00:01:02')
  })

  it('nhận diện xong TRƯỚC khi keepalive bắt đầu: startKeepalive -> stopKeepalive xóa interval 10 s (bug gốc)', async () => {
    const session = deferred<ApiResponse>()
    vi.mocked(api.getUpstreamSession).mockReturnValue(session.promise)
    vi.mocked(api.faceCaptureAndRecognize).mockResolvedValue(KNOWN)
    render()
    await showAppAndLoadVehicles()
    await selectVehicle()
    await settle()
    expect(driverContent()).toHaveTextContent('Nguyen A')
    session.resolve({ result: 0, upstreamJsession: 'J' })
    await settle()
    await settle(30_000)
    expect(api.faceCaptureAndRecognize).toHaveBeenCalledTimes(1)
    // ticker cũng bị xóa: thời gian đứng yên
    expect(driverContent().querySelector('[data-driving-duration]')).toHaveTextContent('00:00:00')
  })

  it('không có khuôn mặt -> "Không có tài xế"; người lạ -> "Tài xế không xác định"', async () => {
    const first = deferred<ApiResponse>()
    vi.mocked(api.faceCaptureAndRecognize)
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ result: 0, match: false, name: 'Unknown', face_count: 1, captureUrl: 'Face_Capture/a.jpg' })
    render()
    await showAppAndLoadVehicles()
    await selectVehicle()
    await settle()
    first.resolve({ result: 0, face_count: 0 })
    await settle()
    expect(driverContent()).toHaveTextContent('Không có tài xế')
    await settle(10_000)
    expect(driverContent()).toHaveTextContent('Tài xế không xác định')
    expect(driverContent()).toHaveTextContent('Mã: Unknown')
    expect(driverContent().querySelector('img')).toHaveAttribute('src', '/api/face/capture/a.jpg')
  })
})
