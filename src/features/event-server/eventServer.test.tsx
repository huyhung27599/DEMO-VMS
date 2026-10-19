import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { expectPolling } from '../../test/expectPolling'
import { renderWithProviders } from '../../test/renderWithProviders'

vi.mock('../../shared/api/endpoints', () => ({
  api: { querySafetyAlarm: vi.fn(async () => ({ result: 0, alarms: [] })) },
}))

import { api } from '../../shared/api/endpoints'
import { useAuthStore } from '../../shared/auth/authStore'
import { AiToastStack } from './components/AiToastStack'
import { ALARM_IDS } from './lib'
import { pollAlarms, resetEventServerState } from './queries'
import { removeAiToast, resetAiToastStore, showAiToast, useAiToastStore } from './store'

const audioPlay = vi.fn(() => Promise.resolve())
const audioCtor = vi.fn()

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  resetAiToastStore()
  resetEventServerState()
  audioPlay.mockClear()
  audioCtor.mockClear()
  vi.mocked(api.querySafetyAlarm).mockClear()
  vi.stubGlobal(
    'Audio',
    class {
      volume = 1
      play = audioPlay
      constructor(src: string) {
        audioCtor(src, this)
      }
    },
  )
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('showAiToast', () => {
  it.each(['0', 'false'])('không làm gì khi dashcam_setting_aiToasts = %s', (v) => {
    localStorage.setItem('dashcam_setting_aiToasts', v)
    showAiToast({ ty: 618, vehicleName: 'A' })
    expect(useAiToastStore.getState().toasts).toHaveLength(0)
    expect(audioCtor).not.toHaveBeenCalled()
  })

  it('phát âm mixkit volume 0.6', () => {
    showAiToast({ ty: 618, vehicleName: 'A' })
    expect(audioCtor).toHaveBeenCalledWith('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', expect.anything())
    expect(audioCtor.mock.calls[0][1].volume).toBe(0.6)
    expect(audioPlay).toHaveBeenCalled()
  })

  it.each(['0', 'false'])('không phát âm khi dashcam_setting_aiToastSound = %s (vẫn hiện toast)', (v) => {
    localStorage.setItem('dashcam_setting_aiToastSound', v)
    showAiToast({ ty: 618, vehicleName: 'A' })
    expect(audioCtor).not.toHaveBeenCalled()
    expect(useAiToastStore.getState().toasts).toHaveLength(1)
  })

  it('nhãn theo SAFETY_ALARM_TYPES và fallback', () => {
    showAiToast({ armType: 618, vehicleName: 'A' })
    showAiToast({ ty: 9999, vehicleName: 'A' })
    const [a, b] = useAiToastStore.getState().toasts
    expect(a.typeName).toBe('Lái xe mệt mỏi')
    expect(b.typeName).toBe('Cảnh báo AI: 9999')
  })

  it('biển số: thứ tự ưu tiên và fallback', () => {
    showAiToast({ ty: 618 })
    showAiToast({ ty: 618, devIdno: 'D', devId: 'E' })
    const [a, b] = useAiToastStore.getState().toasts
    expect(a.plate).toBe('Biển số chưa xác định')
    expect(b.plate).toBe('E')
  })

  it('tự gỡ: hiding sau 10 s, bị xóa sau thêm 500 ms; removeAiToast thủ công cũng vậy', () => {
    showAiToast({ ty: 618, vehicleName: 'A' })
    const id = useAiToastStore.getState().toasts[0].id
    vi.advanceTimersByTime(9999)
    expect(useAiToastStore.getState().toasts[0].hiding).toBe(false)
    vi.advanceTimersByTime(1)
    expect(useAiToastStore.getState().toasts[0].hiding).toBe(true)
    vi.advanceTimersByTime(499)
    expect(useAiToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(useAiToastStore.getState().toasts).toHaveLength(0)

    showAiToast({ ty: 618, vehicleName: 'B' })
    const id2 = useAiToastStore.getState().toasts[0].id
    expect(id2).not.toBe(id)
    removeAiToast(id2)
    expect(useAiToastStore.getState().toasts[0].hiding).toBe(true)
    vi.advanceTimersByTime(500)
    expect(useAiToastStore.getState().toasts).toHaveLength(0)
  })
})

describe('pollAlarms', () => {
  beforeEach(() => sessionStorage.setItem('dashcam_auth_token', 't'))

  it('chưa đăng nhập: không gọi API', async () => {
    sessionStorage.clear()
    await pollAlarms()
    expect(api.querySafetyAlarm).not.toHaveBeenCalled()
  })

  it('gọi querySafetyAlarm(.., ALARM_IDS, "", 1, 50)', async () => {
    await pollAlarms()
    const args = vi.mocked(api.querySafetyAlarm).mock.calls[0]
    expect(args[2]).toBe(ALARM_IDS)
    expect(args.slice(3)).toEqual(['', 1, 50])
    expect(args[0]).toMatch(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/)
  })

  it('toast cảnh báo nghiêm trọng, cũ trước, bỏ qua loại khác và bản đã thấy', async () => {
    vi.mocked(api.querySafetyAlarm).mockResolvedValue({
      result: 0,
      alarms: [
        { guid: 'b', st: 200, ty: 618, vehicleName: 'B' },
        { guid: 'a', st: 100, ty: 620, vehicleName: 'A' },
        { guid: 'c', st: 150, ty: 603, vehicleName: 'C' },
      ],
    })
    await pollAlarms()
    expect(useAiToastStore.getState().toasts.map((t) => t.plate)).toEqual(['A', 'B'])
    await pollAlarms()
    expect(useAiToastStore.getState().toasts).toHaveLength(2)
  })

  it('lỗi API được nuốt (console.warn)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(api.querySafetyAlarm).mockRejectedValueOnce(new Error('x'))
    await expect(pollAlarms()).resolves.toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('AiToastStack polling', () => {
  it('không poll ngay; chỉ poll sau lần showApp đầu, mỗi 15 s', async () => {
    sessionStorage.setItem('dashcam_auth_token', 't')
    vi.mocked(api.querySafetyAlarm).mockResolvedValue({ result: 0, alarms: [] })
    useAuthStore.setState({ view: 'login', hasShownApp: false })
    renderWithProviders(<AiToastStack />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(40000)
    })
    expect(api.querySafetyAlarm).not.toHaveBeenCalled()

    await act(async () => {
      useAuthStore.setState({ view: 'app', hasShownApp: true })
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(api.querySafetyAlarm).not.toHaveBeenCalled()
    await expectPolling(vi.mocked(api.querySafetyAlarm) as never, 15000)
  })

  it('render toast từ store', async () => {
    renderWithProviders(<AiToastStack />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
      showAiToast({ ty: 618, vehicleName: '51A-123' })
    })
    expect(screen.getByText('Lái xe mệt mỏi', { exact: false })).toBeTruthy()
    expect(screen.getByText('51A-123', { exact: false })).toBeTruthy()
  })
})
