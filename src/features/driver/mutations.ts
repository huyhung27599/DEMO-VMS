import { useMutation } from '@tanstack/react-query'
import { api } from '../../shared/api/endpoints'
import { showToast } from '../../shared/ui/toastStore'
import { findAllDevicesForDriver } from './faceEvents'
import type { Loose } from './lib'
import { loadDrivers, writeDriversCache } from './queries'
import {
  closeDriverModal,
  renderDrivers,
  setDeleting,
  setDriversData,
  updateTimestamp,
  useDriverStore,
} from './store'

// ─── Lưu tài xế (driver.js:1957-2084) ─────────────────────────────────────

export type DriverPayload = {
  jobNum: string
  name: string
  contact: string
  cardNumber: string
  sex: number
  birth: string
  licenseNum: string
  licenseType: string
  rushDate: string
  startTime: string
  validity: string
  reminderDays: number
  companyName: string
  id?: number
  facePhotoUrl?: string
}

export type SaveDriverInput = {
  payload: DriverPayload
  driverId: string
  name: string
  jobNum: string
  currentBase64Photos: string[]
}

const fdString = (formData: FormData, key: string): string | undefined => {
  const v = formData.get(key)
  return v == null ? undefined : String(v)
}

/**
 * Phần đầu handler click #btn-save-driver: validate + dựng payload (trước khi disable nút).
 * Trả `null` khi validate thất bại (đã toast).
 */
export function buildSaveDriverInput(formData: FormData, currentBase64Photos: string[]): SaveDriverInput | null {
  const name = fdString(formData, 'name')?.trim()
  const jobNum = fdString(formData, 'jobNum')?.trim()
  if (!name || !jobNum) {
    showToast('Mã nhân viên và Họ tên không được bỏ trống!', 'error')
    return null
  }

  const driverId = fdString(formData, 'id') ?? ''
  const todayStr = new Date().toISOString().split('T')[0]
  const futureStr = new Date(new Date().setFullYear(new Date().getFullYear() + 10)).toISOString().split('T')[0]

  const licenseType = fdString(formData, 'licenseType')?.trim()
  // Upstream cần licenseType non-empty (trống sẽ ra result=7)
  if (!licenseType) {
    showToast('Hạng GPLX (licenseType) không được bỏ trống!', 'error')
    return null
  }

  // Payload đúng schema của mergeDriver theo backend upstream
  const payload: DriverPayload = {
    jobNum: jobNum,
    name: name,
    contact: fdString(formData, 'contact')?.trim() || '',
    cardNumber: fdString(formData, 'cardNumber')?.trim() || '',
    sex: parseInt(fdString(formData, 'sex') || '1', 10),
    birth: fdString(formData, 'birth') || '1990-01-01',
    licenseNum: fdString(formData, 'licenseNum')?.trim() || '',
    licenseType: licenseType,
    rushDate: todayStr,
    startTime: todayStr,
    validity: futureStr,
    reminderDays: 7,
    companyName: 'GEIC',
  }

  // Nếu đang sửa thì truyền id (thêm mới thì id rỗng sẽ không gửi)
  if (driverId) {
    payload.id = Number(driverId)
  }
  return { payload, driverId, name, jobNum, currentBase64Photos }
}

/** Phần trong try/catch của handler: upload ảnh → mergeDriver → registerLocalDriver → cập nhật danh sách. */
export async function saveDriver({ payload, driverId, name, jobNum, currentBase64Photos }: SaveDriverInput): Promise<void> {
  try {
    // Remove undefined/null so form-encoding doesn't send invalid values
    const p = payload as Record<string, unknown>
    Object.keys(p).forEach((key) => {
      if (p[key] === null || p[key] === undefined) delete p[key]
    })

    // FleetControl yêu cầu facePhotoUrl lấy từ upload image interface.
    if (currentBase64Photos && currentBase64Photos.length > 0 && typeof api.uploadDriverImagesUpstream === 'function') {
      const libRes: Loose = await api.uploadDriverImagesUpstream({ base64Images: currentBase64Photos })
      if (libRes && (libRes.result === 0 || libRes.result === '0') && libRes.facePhotoUrl) {
        payload.facePhotoUrl = libRes.facePhotoUrl
      } else if (libRes && (libRes.result === 5 || libRes.result === '5')) {
        // session expired upstream
        showToast(libRes.msg || 'Phiên đăng nhập đã hết hạn.', 'error')
        return
      } else {
        showToast('Không upload được ảnh Portrait Library: ' + (libRes?.msg || 'Lỗi không xác định'), 'error')
        return
      }
    }

    const res: Loose = await api.mergeDriver(payload)
    if (res && (res.result === 0 || res.result === '0' || res.result === 5 || res.result === '5')) {
      // Local Sync: Register/Update in AI database (Always call even without photo)
      try {
        const localRes: Loose = await api.registerLocalDriver(
          jobNum,
          name,
          currentBase64Photos && currentBase64Photos.length ? currentBase64Photos : null,
        )
        if (localRes && localRes.result !== 0) {
          showToast('Cảnh báo: Đồng bộ AI cục bộ thất bại - ' + localRes.msg, 'warning')
        }
      } catch (localErr: Loose) {
        showToast('Lỗi đồng bộ AI cục bộ: ' + localErr.message, 'error')
      }

      const isNewDriver = !driverId
      closeDriverModal()

      if (isNewDriver) {
        // Thêm mới: dựng object tài xế từ form data và chèn ngay đầu danh sách
        const newDriverObj = {
          id:
            res.id ||
            res.driverId ||
            res.driverID ||
            (res.info && (res.info.id || res.info.driverId)) ||
            (res.data && (res.data.id || res.data.driverId)) ||
            '_tmp_' + Date.now(),
          jn: jobNum,
          dn: name,
          dt: payload.contact || '',
          cn: payload.cardNumber || '',
          sx: payload.sex || 1,
          bt: payload.birth ? new Date(payload.birth).getTime() : null,
          ln: payload.licenseNum || '',
          licenseType: payload.licenseType || '',
          facePhotoUrl: currentBase64Photos && currentBase64Photos[0] ? currentBase64Photos[0] : '',
        }
        const driversData = [newDriverObj, ...useDriverStore.getState().driversData]
        setDriversData(driversData)
        writeDriversCache(driversData)
        renderDrivers(driversData)
        updateTimestamp()
        showToast(`✅ Đã thêm tài xế "${name}" thành công!`, 'success', 4000)
      } else {
        // Chỉnh sửa: tải lại toàn bộ để đảm bảo dữ liệu mới nhất
        showToast(`✅ Đã cập nhật tài xế "${name}" thành công!`, 'success', 4000)
        void loadDrivers()
      }
    } else {
      // res null -> res.msg ném TypeError -> rơi vào catch bên dưới (như bản gốc)
      showToast('Lỗi lưu tài xế: ' + (res.msg || JSON.stringify(res)), 'error')
    }
  } catch (err: Loose) {
    showToast('Lỗi sự cố khi lưu: ' + err.message, 'error')
  }
}

/** isPending = nút "Lưu" bị disable + "Đang lưu..." (finally của bản gốc). */
export function useSaveDriverMutation() {
  return useMutation({ mutationFn: saveDriver })
}

// ─── Xóa tài xế (driver.js:1076-1147) ─────────────────────────────────────

export type DeleteDriverInput = { id: string; jobNum: string; name: string }

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Sau khi người dùng xác nhận: gỡ gán xe → deleteDriver → deleteLocalDriver → cập nhật danh sách + cache. */
export async function deleteDriver({ id, jobNum, name }: DeleteDriverInput): Promise<void> {
  setDeleting(id, true)
  try {
    // 1. Check if driver is used (bound to any vehicles in the fleet)
    const driverObj = { jn: jobNum, id: id, dn: name }
    const boundDevIds = await findAllDevicesForDriver(driverObj)

    if (boundDevIds.length > 0) {
      console.log(
        `[driver.js] Driver "${name}" is bound to ${boundDevIds.length} vehicle(s): ${boundDevIds.join(', ')}. Unbinding all...`,
      )
      for (const devId of boundDevIds) {
        try {
          const unbindRes: Loose = await api.bindDriver(devId, 0, '')
          if (unbindRes && unbindRes.result !== 0) {
            console.warn(`[driver.js] Unbind failed for ${devId}: ${unbindRes.msg}`)
          }
        } catch (unbindErr) {
          console.error(`[driver.js] Unbind request error for ${devId}:`, unbindErr)
        }
      }
      console.log(`[driver.js] Waiting 1.5s for synchronization...`)
      await sleep(1500)
    }

    // 2. Delete from server (backend thử nhiều upstream action để tránh HTTP 404)
    const res: Loose = await api.deleteDriver(id, jobNum)
    if (res && (res.result === 0 || res.result === '0')) {
      // 3. Delete locally (folders and mapping)
      try {
        const localRes: Loose = await api.deleteLocalDriver(jobNum, name)
        if (localRes && localRes.result !== 0) {
          console.warn(`[driver.js] Local deletion warning: ${localRes.msg}`)
        }
      } catch (localErr) {
        console.error('[driver.js] Local delete error:', localErr)
      }

      showToast(`✅ Đã xóa tài xế "${name}" thành công!`, 'success')

      // Remove from local state + cache (không refetch, như bản gốc)
      const driversData = useDriverStore.getState().driversData.filter((d) => String(d.id) !== String(id))
      setDriversData(driversData)
      writeDriversCache(driversData)
      renderDrivers(driversData)
      updateTimestamp()
      setDeleting(id, false)
    } else {
      showToast(`Xóa tài xế thất bại: ${res?.msg || JSON.stringify(res)}`, 'error')
      setDeleting(id, false)
    }
  } catch (err: Loose) {
    showToast(`Lỗi: ${err.message}`, 'error')
    setDeleting(id, false)
  }
}

export function useDeleteDriverMutation() {
  return useMutation({ mutationFn: deleteDriver })
}
