import { useMutation } from '@tanstack/react-query'
import { showToast } from '../../shared/ui/toastStore'
import { formatDt, getVehicleDeviceId } from './lib'
import { usePlaybackStore } from './store'
import { loadGpsTrack } from './track'
import { getTrackMap, setTrackStatus, showPlaybackIframe, switchRightTab } from './videoController'

const set = usePlaybackStore.setState
const get = usePlaybackStore.getState

/** playback.js:496-556 — đọc giá trị form từ store (thay cho document.getElementById(...).value). */
export async function onSearch(): Promise<void> {
  const { vehicleValue: vehicleIdx, beginTime, endTime, cameraFilter } = get()
  // '0' (Tất cả) → kênh 1: API CMSV6 / fleetscontrol thường không chấp nhận channel=0 cho getPlaybackVideoH5
  const channelVal = !cameraFilter || cameraFilter === '0' ? '1' : cameraFilter
  const streamType = '1' // sub stream (thường) - phù hợp trình duyệt hơn

  if (!vehicleIdx) {
    showToast('Vui lòng chọn phương tiện!', 'warning')
    return
  }
  if (!beginTime || !endTime) {
    showToast('Vui lòng chọn khoảng thời gian!', 'warning')
    return
  }
  if (beginTime >= endTime) {
    showToast('Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!', 'warning')
    return
  }

  const vehicle = get().vehiclesCache[+vehicleIdx]
  if (!vehicle) return

  const currentVehicleName = vehicle.nm || vehicle.vehiIdno || 'N/A'
  const currentDevice = getVehicleDeviceId(vehicle)
  const beginFmt = formatDt(beginTime),
    endFmt = formatDt(endTime)
  set({
    currentVehicleName,
    currentDevice,
    currentVehicleObj: vehicle,
    lastSearchRange: { beginFmt, endFmt },
    playerPlate: currentVehicleName,
    playerTime: `${beginTime.replace('T', ' ')} → ${endTime.replace('T', ' ')}`,
    searching: true,
  })
  setTrackStatus('Đang tải...', false)

  try {
    // Giữ iframe vendor (Unified Player) theo yêu cầu, nhưng UI phía ngoài được tối giản + vẫn tải GPS panel.
    // (Reset kích thước #pb-player-area: bản port không bao giờ đặt height/minHeight inline nên bỏ.)
    set({ fileListVisible: false, trackCardVisible: true })

    // Dùng iframe playback của fleetscontrol
    await showPlaybackIframe(vehicle, channelVal, beginFmt, endFmt, streamType)

    // Luôn tải GPS track cho khoảng thời gian đã chọn
    if (currentDevice) {
      switchRightTab('map')
      await loadGpsTrack(currentDevice, beginFmt, endFmt)
      setTimeout(() => {
        try {
          getTrackMap()?.invalidateSize()
        } catch {
          /* ignore */
        }
      }, 400)
    }
  } catch (e) {
    console.error('[Playback] search error:', e)
    showToast('Lỗi khi tải trình phát video', 'error')
  } finally {
    set({ searching: false })
  }
}

/** Click #pb-search-btn (người dùng bấm) -> mutation; mutationFn = onSearch gốc. */
export function useSearchPlaybackMutation() {
  return useMutation({ mutationKey: ['playback', 'search'], mutationFn: onSearch })
}
