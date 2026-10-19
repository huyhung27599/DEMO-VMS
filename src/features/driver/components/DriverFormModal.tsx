import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Button } from '../../../shared/ui/Button'
import { Modal, ModalFooter } from '../../../shared/ui/Modal'
import { showToast } from '../../../shared/ui/toastStore'
import {
  MAX_DRIVER_PHOTOS,
  formatDateMsToDateInput,
  parseFacePhotoUrlToSlots,
  portraitServerDisplayUrl,
  type Loose,
} from '../lib'
import { buildSaveDriverInput, useSaveDriverMutation } from '../mutations'
import { closeDriverModal, useDriverStore } from '../store'
import { PortraitGrid } from './PortraitGrid'

// index.html:1498-1588 (#driver-modal) + driver.js:1667-2084 (ảnh chân dung, openDriverModal, lưu).

const emptySlots = (): (string | null)[] => Array(MAX_DRIVER_PHOTOS).fill(null)

const readAsDataUrl = (file: File): Promise<string | null> =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => resolve((ev.target?.result as string) ?? null)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })

/** openDriverModal(driver): giá trị điền vào form khi sửa. */
function initialFormValues(driver: Loose | null) {
  if (!driver) {
    return { id: '', jobNum: '', name: '', contact: '', cardNumber: '', sex: '1', birth: '', licenseNum: '', licenseType: '' }
  }
  // API queryDriverList uses `bt` as date of birth (ms timestamp)
  let birth = formatDateMsToDateInput(driver.bt)
  if (!birth && driver.birthday) birth = String(driver.birthday).split(' ')[0]
  else if (!birth && driver.birthDate) birth = String(driver.birthDate).split(' ')[0]
  return {
    id: String(driver.id || ''),
    jobNum: String(driver.jn || ''),
    name: String(driver.dn || ''),
    // API queryDriverList uses `dt` as contact, `cn` as ID number
    contact: String(driver.dt || driver.tp || ''),
    cardNumber: String(driver.cn || driver.ic || ''),
    sex: String(driver.sx || '1'),
    birth,
    licenseNum: String(driver.ln || driver.drivelNum || driver.dl || ''),
    licenseType: String(driver.licenseType || driver.driverType || ''),
  }
}

function Field({ label, icon, htmlFor, children, wide = false }: { label: ReactNode; icon: string; htmlFor?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`driver-modal-group flex flex-col ${wide ? 'col-span-2' : ''}`}>
      <label htmlFor={htmlFor} className="driver-modal-label mb-[0.4rem] flex items-center gap-[0.4rem] text-[0.85rem] font-semibold text-[#475569]">
        <i className={`fa-solid ${icon}`} style={{ color: '#94a3b8' }} aria-hidden="true"></i> {label}
      </label>
      {children}
    </div>
  )
}

const hintClass = 'mt-[0.3rem] block text-[0.75rem] text-[#94a3b8]'

/** Nội dung modal; được mount lại (key = openKey) mỗi lần mở, thay cho driverForm.reset(). */
function DriverForm({ driver }: { driver: Loose | null }) {
  const formRef = useRef<HTMLFormElement>(null)
  const slotFileRef = useRef<HTMLInputElement>(null)
  const pendingPortraitSlot = useRef(-1)
  const values = initialFormValues(driver)
  /** Ảnh mới chọn (base64) theo từng ô 0..4 — ưu tiên hiển thị hơn URL server */
  const [portraitLocalBase64, setPortraitLocalBase64] = useState<(string | null)[]>(emptySlots)
  /** Ảnh đã lưu trên server (URL) khi sửa tài xế */
  const [portraitServerUrls, setPortraitServerUrls] = useState<(string | null)[]>(() =>
    driver ? parseFacePhotoUrlToSlots(driver.facePhotoUrl || driver.faceUrl || driver.photoUrl || '') : emptySlots(),
  )
  // syncCurrentBase64FromPortraitSlots: suy ra khi render
  const currentBase64Photos = portraitLocalBase64.filter((x): x is string => !!x)
  const saveMutation = useSaveDriverMutation()

  // updateTopPortraitPreview
  const firstLocal = portraitLocalBase64.find((x) => !!x)
  const firstSrv = portraitServerUrls.find((x) => !!x)
  const previewSrc = firstLocal ? firstLocal : firstSrv ? portraitServerDisplayUrl(firstSrv) : ''

  // #driver-photo-upload (driver.js:1795-1842)
  const onPhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    // Chỉ lấy tối đa 5 ảnh
    if (files.length > MAX_DRIVER_PHOTOS) {
      showToast(`Chỉ cho phép tối đa ${MAX_DRIVER_PHOTOS} ảnh. Hệ thống sẽ lấy ${MAX_DRIVER_PHOTOS} ảnh đầu.`, 'warning')
    }
    const selected = files.slice(0, MAX_DRIVER_PHOTOS)
    if (selected.length === 0) {
      setPortraitLocalBase64(emptySlots())
      return
    }
    // (optional) hạn chế kích thước dưới 2MB/ảnh theo hint UI
    const readers = selected.map((file) => (file && file.size > 2 * 1024 * 1024 ? Promise.resolve(null) : readAsDataUrl(file)))
    void Promise.all(readers).then((results) => {
      // Loại ảnh quá size / lỗi đọc
      const base64s = results.filter((x): x is string => !!x)
      const local = emptySlots()
      base64s.slice(0, MAX_DRIVER_PHOTOS).forEach((b, i) => {
        local[i] = b
      })
      setPortraitLocalBase64(local)
      setPortraitServerUrls(emptySlots())
    })
  }

  // #driver-portrait-slot-file (driver.js:1845-1873)
  const onSlotFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    const slot = pendingPortraitSlot.current
    if (!file || slot < 0 || slot >= MAX_DRIVER_PHOTOS) {
      pendingPortraitSlot.current = -1
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Ảnh vượt quá 2MB. Vui lòng chọn file nhỏ hơn.', 'warning')
      pendingPortraitSlot.current = -1
      return
    }
    void readAsDataUrl(file).then((data) => {
      pendingPortraitSlot.current = -1
      if (data == null) {
        showToast('Không đọc được file ảnh.', 'error')
        return
      }
      setPortraitLocalBase64((prev) => prev.map((x, i) => (i === slot ? data : x)))
    })
  }

  // click trên #driver-portraitLibrary (driver.js:1875-1897)
  const onAddSlot = (slot: number) => {
    if (Number.isFinite(slot) && slotFileRef.current) {
      pendingPortraitSlot.current = slot
      slotFileRef.current.click()
    }
  }
  const onRemoveSlot = (slot: number) => {
    if (!Number.isFinite(slot) || slot < 0 || slot >= MAX_DRIVER_PHOTOS) return
    setPortraitLocalBase64((prev) => prev.map((x, i) => (i === slot ? null : x)))
    setPortraitServerUrls((prev) => prev.map((x, i) => (i === slot ? null : x)))
  }

  const onSave = () => {
    if (!formRef.current) return
    const input = buildSaveDriverInput(new FormData(formRef.current), currentBase64Photos)
    if (input) saveMutation.mutate(input)
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-linear-to-r from-[#f8fafc] to-[#f1f5f9] px-7 py-5">
        {/* driverModalTitle.textContent = ... xóa luôn icon của markup ban đầu */}
        <h3 id="driver-modal-title" className="m-0 flex items-center gap-3 text-xl font-bold text-[#1e293b]">
          {driver ? 'Chỉnh sửa tài xế' : 'Thêm Tài xế mới'}
        </h3>
        <button
          type="button"
          id="btn-close-driver-modal"
          aria-label="Đóng"
          className="btn-close-nice flex size-8 cursor-pointer items-center justify-center rounded-full border border-border bg-white text-base text-[#64748b] shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-200 hover:bg-[#f1f5f9] hover:text-[#0f172a] focus-visible:outline-2 focus-visible:outline-primary"
          onClick={closeDriverModal}
        >
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <div className="bg-white p-7">
        <form id="driver-form" ref={formRef} className="grid grid-cols-2 gap-x-6 gap-y-5" onSubmit={(e) => e.preventDefault()}>
          {/* Hidden ID used for modifying */}
          <input type="hidden" id="driver-id" name="id" defaultValue={values.id} />

          <Field label="Ảnh Chân Dung (Nhận diện AI)" icon="fa-camera-retro" htmlFor="driver-photo-upload" wide>
            <div className="flex items-center gap-4">
              <div
                id="driver-photo-preview-container"
                className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-dashed border-border bg-[#f1f5f9]"
              >
                {previewSrc ? (
                  <img id="driver-photo-preview" src={previewSrc} alt="" className="block size-full object-cover" />
                ) : (
                  <i className="fa-solid fa-image text-[1.5rem] text-[#cbd5e1]" id="driver-photo-icon" aria-hidden="true"></i>
                )}
              </div>
              <div className="grow">
                <input
                  type="file"
                  id="driver-photo-upload"
                  accept="image/*"
                  multiple
                  className="driver-modal-input cursor-pointer"
                  data-max-images="5"
                  onChange={onPhotoUpload}
                />
                <span className={hintClass}>
                  Hệ thống AI yêu cầu tối đa 5 ảnh. Khuyến nghị: File .jpg, .png. Kích thước dưới 2MB/ảnh.
                </span>
              </div>
            </div>
          </Field>

          <div className="driver-modal-group col-span-2 flex flex-col">
            <span className="driver-modal-label mb-[0.4rem] flex items-center gap-[0.4rem] text-[0.85rem] font-semibold text-[#475569]">
              <i className="fa-solid fa-database" style={{ color: '#94a3b8' }} aria-hidden="true"></i> Cơ sở dữ liệu khuôn mặt
              (Portrait Library)
            </span>
            <input
              type="file"
              id="driver-portrait-slot-file"
              ref={slotFileRef}
              accept="image/*"
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              onChange={onSlotFile}
            />
            <PortraitGrid
              portraitLocalBase64={portraitLocalBase64}
              portraitServerUrls={portraitServerUrls}
              onAdd={onAddSlot}
              onRemove={onRemoveSlot}
            />
            <span className={hintClass}>
              Tối đa 5 ảnh. Nhấn <strong>Thêm ảnh</strong> trên ô trống hoặc dùng ô chọn ảnh phía trên.
            </span>
          </div>

          <Field label="Mã Nhân Viên *" icon="fa-id-badge" htmlFor="driver-jobNum">
            <input type="text" id="driver-jobNum" name="jobNum" className="driver-modal-input" placeholder="Nhập mã nhân viên..." required defaultValue={values.jobNum} />
          </Field>
          <Field label="Họ và Tên *" icon="fa-signature" htmlFor="driver-name">
            <input type="text" id="driver-name" name="name" className="driver-modal-input" placeholder="Nhập họ và tên..." required defaultValue={values.name} />
          </Field>
          <Field label="Điện Thoại" icon="fa-phone" htmlFor="driver-contact">
            <input type="text" id="driver-contact" name="contact" className="driver-modal-input" placeholder="Số điện thoại liên hệ..." defaultValue={values.contact} />
          </Field>
          <Field label="Số thẻ quẹt" icon="fa-credit-card" htmlFor="driver-cardNumber">
            <input type="text" id="driver-cardNumber" name="cardNumber" className="driver-modal-input" placeholder="Mã thẻ RFID..." defaultValue={values.cardNumber} />
          </Field>
          <Field label="Giới Tính" icon="fa-venus-mars" htmlFor="driver-sex">
            <select id="driver-sex" name="sex" className="driver-modal-input" defaultValue={values.sex}>
              <option value="1">Nam</option>
              <option value="2">Nữ</option>
            </select>
          </Field>
          <Field label="Ngày Sinh" icon="fa-calendar" htmlFor="driver-birth">
            <input type="date" id="driver-birth" name="birth" className="driver-modal-input" defaultValue={values.birth} />
          </Field>
          <Field label="Số GPLX" icon="fa-id-card" htmlFor="driver-licenseNum">
            <input type="text" id="driver-licenseNum" name="licenseNum" className="driver-modal-input" placeholder="Số giấy phép lái xe..." defaultValue={values.licenseNum} />
          </Field>
          <Field label="Hạng GPLX" icon="fa-car" htmlFor="driver-licenseType">
            <input type="text" id="driver-licenseType" name="licenseType" className="driver-modal-input" placeholder="VD: B2, C, D, FC..." defaultValue={values.licenseType} />
          </Field>
        </form>
      </div>
      <ModalFooter>
        <Button id="btn-cancel-driver" variant="outline" size="modal" className="font-semibold" onClick={closeDriverModal}>
          Hủy bỏ
        </Button>
        <Button
          id="btn-save-driver"
          variant="primary"
          size="modalWide"
          className="font-semibold shadow-[0_4px_6px_-1px_rgba(42,157,216,0.2)]"
          disabled={saveMutation.isPending}
          onClick={onSave}
        >
          {saveMutation.isPending ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Đang lưu...
            </>
          ) : (
            <>
              <i className="fa-solid fa-floppy-disk" aria-hidden="true"></i> Lưu Thay Đổi
            </>
          )}
        </Button>
      </ModalFooter>
    </>
  )
}

// Bản gốc không đóng modal này khi click nền hay bấm Esc.
const ignoreOverlayClick = () => {}

export function DriverFormModal() {
  const { open, openKey, driver } = useDriverStore((s) => s.driverModal)
  return (
    <Modal id="driver-modal" open={open} onClose={ignoreOverlayClick} labelledBy="driver-modal-title" maxWidth={650} bordered>
      <DriverForm key={openKey} driver={driver} />
    </Modal>
  )
}
