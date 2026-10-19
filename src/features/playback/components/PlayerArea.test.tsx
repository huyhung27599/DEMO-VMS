import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'

const hlsMock = vi.hoisted(() => {
  const instances: { destroy: () => void }[] = []
  class FakeHls {
    static isSupported = () => true
    static Events = { MANIFEST_PARSED: 'm', ERROR: 'e' }
    loadSource = vi.fn()
    attachMedia = vi.fn()
    destroy = vi.fn()
    on = vi.fn()
    constructor() {
      instances.push(this)
    }
  }
  return { FakeHls, instances }
})
vi.mock('hls.js', () => ({ default: hlsMock.FakeHls }))

import { resetPlaybackStore, usePlaybackStore } from '../store'
import { injectVideo } from '../videoController'
import { PlayerArea } from './PlayerArea'

beforeEach(() => {
  resetPlaybackStore()
  hlsMock.instances.length = 0
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('PlayerArea', () => {
  it('placeholder ban đầu của index.html', () => {
    render(<PlayerArea />)
    expect(screen.getByText(/Chọn phương tiện và khoảng thời gian/)).toBeInTheDocument()
  })

  it('StrictMode: injectVideo m3u8 chỉ tạo một Hls; thay nội dung không destroy (như innerHTML gốc)', () => {
    render(
      <StrictMode>
        <PlayerArea />
      </StrictMode>,
    )
    act(() => injectVideo('https://m/a.m3u8'))
    expect(hlsMock.instances).toHaveLength(1)
    act(() => usePlaybackStore.setState({ player: { kind: 'loading', text: 'x' } }))
    expect(hlsMock.instances[0].destroy).not.toHaveBeenCalled()
  })

  it('banner H.265 đóng được; lỗi video không có onFailure -> thông báo theo mã lỗi + "Thử lại"', () => {
    render(<PlayerArea />)
    act(() => injectVideo('http://proxy/f', null, 'h265'))
    expect(screen.getByText(/H.265 \(HEVC\)/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(screen.queryByText(/H.265 \(HEVC\)/)).not.toBeInTheDocument()

    const video = document.querySelector('#pb-player-area video') as HTMLVideoElement
    expect(video.getAttribute('src')).toBe('http://proxy/f')
    Object.defineProperty(video, 'error', { value: { code: 4, message: 'bad' } })
    fireEvent.error(video)
    expect(screen.getByText('Định dạng video không được hỗ trợ trên trình duyệt này.')).toBeInTheDocument()
    expect(screen.getByText('Chi tiết: MEDIA_ERR code=4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })

  it('lỗi video có onFailure -> gọi onFailure(v.error), không đổi nội dung', () => {
    render(<PlayerArea />)
    const onFailure = vi.fn()
    act(() => injectVideo('http://proxy/f', onFailure))
    const video = document.querySelector('#pb-player-area video') as HTMLVideoElement
    fireEvent.error(video)
    expect(onFailure).toHaveBeenCalledExactlyOnceWith(video.error)
    expect(document.querySelector('#pb-player-area video')).toBe(video)
  })
})
