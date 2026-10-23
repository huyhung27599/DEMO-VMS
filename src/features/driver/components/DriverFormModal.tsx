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
import { DRIVER_ENTERPRISES, LICENSE_CLASS_OPTIONS } from '../mockData'
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
    return {
      id: '',
      jobNum: '',
      name: '',
      contact: '',
      cardNumber: '',
      sex: '1',
      birth: '',
      licenseNum: '',
      licenseType: '',
      company: 'GEIC',
      licenseExpire: '',
    }
  }
  // API queryDriverList uses `bt` as date of birth (ms timestamp)
  let birth = formatDateMsToDateInput(driver.bt)
  if (!birth && driver.birthday) birth = String(driver.birthday).split(' ')[0]
  else if (!birth && driver.birthDate) birth = String(driver.birthDate).split(' ')[0]
  const licenseType = String(driver.licenseType || driver.driverType || 'B2')
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
    licenseType,
    company: String(driver.companyName || driver.coName || 'GEIC'),
    licenseExpire: String(driver.licenseExpire || driver.le || ''),
  }
}

function initialLetter(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  const parts = t.split(/\s+/)
  return (parts[parts.length - 1][0] || t[0]).toUpperCase()
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h4 className="col-span-2 mt-1 mb-0 border-t border-[#eef2f6] pt-5 text-[0.72rem] font-bold tracking-[0.08em] text-[#94a3b8] uppercase first:mt-0 first:border-t-0 first:pt-0">
      {children}
    </h4>
  )
}

function Field({
  label,
  htmlFor,
  children,
  wide = false,
  hint,
}: {
  label: ReactNode
  htmlFor?: string
  children: ReactNode
  wide?: boolean
  hint?: ReactNode
}) {
  return (
    <div className={`driver-modal-group flex flex-col ${wide ? 'col-span-2' : ''}`}>
      <label htmlFor={htmlFor} className="driver-modal-label mb-[0.4rem] text-[0.85rem] font-semibold text-[#475569]">
        {label}
      </label>
      {children}
      {hint ? <span className="mt-[0.3rem] block text-[0.75rem] text-[#94a3b8]">{hint}</span> : null}
    </div>
  )
}

/** Nội dung modal; được mount lại (key = openKey) mỗi lần mở, thay cho driverForm.reset(). */
function DriverForm({ driver }: { driver: Loose | null }) {
  const formRef = useRef<HTMLFormElement>(null)
  const slotFileRef = useRef<HTMLInputElement>(null)
  const pendingPortraitSlot = useRef(-1)
  const values = initialFormValues(driver)
  const isEdit = !!driver
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
  const photoCount = portraitLocalBase64.filter(Boolean).length + portraitServerUrls.filter(Boolean).length

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

  const letter = initialLetter(values.name)

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-[#eef2f6] bg-white px-7 py-5">
        <div>
          <h3 id="driver-modal-title" className="m-0 text-xl font-bold text-[#0f172a]">
            {isEdit ? 'Sửa tài xế' : 'Thêm tài xế'}
          </h3>
          <p className="mt-1 mb-0 text-[0.8rem] text-[#94a3b8]">
            {isEdit
              ? 'Cập nhật hồ sơ và ảnh nhận diện của tài xế'
              : 'Tạo hồ sơ tài xế mới và đăng ký AI nhận diện khuôn mặt'}
          </p>
          {isEdit ? (
            <p className="mt-2 mb-0 text-[0.78rem] text-[#94a3b8]">
              Quản lý tài xế / <span className="font-semibold text-[#0f172a]">{values.name || '—'}</span>
            </p>
          ) : (
            <p className="mt-2 mb-0 text-[0.78rem] text-[#94a3b8]">Quản lý tài xế / Thêm tài xế</p>
          )}
        </div>
        <button
          type="button"
          id="btn-close-driver-modal"
          aria-label="Đóng"
          className="btn-close-nice flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-white text-base text-[#64748b] shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-200 hover:bg-[#f1f5f9] hover:text-[#0f172a] focus-visible:outline-2 focus-visible:outline-primary"
          onClick={closeDriverModal}
        >
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div className="max-h-[min(70vh,640px)] overflow-y-auto bg-white px-7 py-6">
        {isEdit ? (
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-full bg-[#1e293b] text-lg font-bold text-white">
              {letter}
            </div>
            <div>
              <div className="font-bold text-[#0f172a]">{values.name}</div>
              <div className="text-sm text-[#94a3b8]">Mã: {values.jobNum}</div>
            </div>
          </div>
        ) : null}

        <form id="driver-form" ref={formRef} className="grid grid-cols-2 gap-x-5 gap-y-4" onSubmit={(e) => e.preventDefault()}>
          <input type="hidden" id="driver-id" name="id" defaultValue={values.id} />
          {/* Giữ field logic gốc (không có trên mockup) */}
          <input type="hidden" id="driver-cardNumber" name="cardNumber" defaultValue={values.cardNumber} />
          <input type="hidden" id="driver-sex" name="sex" defaultValue={values.sex} />
          <input type="hidden" id="driver-birth" name="birth" defaultValue={values.birth || '1990-01-01'} />

          <SectionTitle>Thông tin tài xế</SectionTitle>

          <Field label={<>Họ và tên <span className="text-[#e11d48]">*</span></>} htmlFor="driver-name">
            <input
              type="text"
              id="driver-name"
              name="name"
              className="driver-modal-input"
              placeholder="VD: Nguyễn Văn An"
              required
              defaultValue={values.name}
            />
          </Field>

          <Field
            label={
              <>
                Mã tài xế {isEdit ? null : <span className="text-[#e11d48]">*</span>}
              </>
            }
            htmlFor="driver-jobNum"
            hint={
              isEdit
                ? 'Mã định danh, không thể thay đổi'
                : 'Dùng để định danh khi đăng nhập Box AI.'
            }
          >
            <input
              type="text"
              id="driver-jobNum"
              name="jobNum"
              className="driver-modal-input"
              placeholder="VD: 11111"
              required
              readOnly={isEdit}
              defaultValue={values.jobNum}
            />
          </Field>

          <Field label="Số điện thoại" htmlFor="driver-contact">
            <input
              type="text"
              id="driver-contact"
              name="contact"
              className="driver-modal-input"
              placeholder="0901 234 567"
              defaultValue={values.contact}
            />
          </Field>

          <Field label={<>Doanh nghiệp <span className="text-[#e11d48]">*</span></>} htmlFor="driver-company">
            <select id="driver-company" className="driver-modal-input" defaultValue={values.company} aria-label="Doanh nghiệp">
              {DRIVER_ENTERPRISES.map((e) => (
                <option key={e.id} value={e.name}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>

          <SectionTitle>Giấy phép lái xe</SectionTitle>

          <Field label={<>Hạng GPLX <span className="text-[#e11d48]">*</span></>} htmlFor="driver-licenseType">
            <select
              id="driver-licenseType"
              name="licenseType"
              className="driver-modal-input"
              required
              defaultValue={values.licenseType}
            >
              <option value="">Chọn hạng</option>
              {!LICENSE_CLASS_OPTIONS.includes(values.licenseType as (typeof LICENSE_CLASS_OPTIONS)[number]) &&
              values.licenseType ? (
                <option value={values.licenseType}>{values.licenseType}</option>
              ) : null}
              {LICENSE_CLASS_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Số GPLX" htmlFor="driver-licenseNum">
            <input
              type="text"
              id="driver-licenseNum"
              name="licenseNum"
              className="driver-modal-input"
              placeholder="79-012345"
              defaultValue={values.licenseNum}
            />
          </Field>

          <Field label="Ngày hết hạn" htmlFor="driver-licenseExpire" wide>
            <input
              type="date"
              id="driver-licenseExpire"
              className="driver-modal-input"
              defaultValue={/^\d{4}-\d{2}-\d{2}/.test(values.licenseExpire) ? values.licenseExpire.slice(0, 10) : ''}
            />
          </Field>

          <SectionTitle>AI nhận diện khuôn mặt</SectionTitle>

          <div className="driver-modal-group col-span-2 flex flex-col">
            <span className="driver-modal-label mb-[0.4rem] text-[0.85rem] font-semibold text-[#475569]">Ảnh tham chiếu</span>

            {/* Preview ẩn/hiện — giữ #driver-photo-preview cho test upload */}
            <div className="sr-only" aria-hidden={!previewSrc}>
              <div id="driver-photo-preview-container">
                {previewSrc ? <img id="driver-photo-preview" src={previewSrc} alt="" /> : <i id="driver-photo-icon" />}
              </div>
            </div>

            {!isEdit && photoCount === 0 ? (
              <label
                htmlFor="driver-photo-upload"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-8 text-center transition hover:border-[#e11d48]/40 hover:bg-white"
              >
                <i className="fa-solid fa-face-viewfinder text-2xl text-[#94a3b8]" aria-hidden />
                <span className="text-[0.85rem] font-medium text-[#64748b]">
                  Tải lên 3-5 ảnh khuôn mặt rõ nét để đăng ký nhận diện
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-3 py-1.5 text-[0.8rem] font-semibold text-[#334155] shadow-sm">
                  <i className="fa-solid fa-plus" aria-hidden /> Chọn ảnh
                </span>
              </label>
            ) : null}

            <input
              type="file"
              id="driver-photo-upload"
              accept="image/*"
              multiple
              className={isEdit || photoCount > 0 ? 'driver-modal-input mt-2 cursor-pointer' : 'hidden'}
              data-max-images="5"
              onChange={onPhotoUpload}
            />

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

            <div className={isEdit || photoCount > 0 ? 'mt-3' : 'mt-3'}>
              <PortraitGrid
                portraitLocalBase64={portraitLocalBase64}
                portraitServerUrls={portraitServerUrls}
                onAdd={onAddSlot}
                onRemove={onRemoveSlot}
              />
            </div>

            <span className="mt-2 block text-[0.75rem] text-[#94a3b8]">
              {isEdit
                ? `${photoCount} ảnh tham chiếu đã đăng ký. Nhấn + để thêm ảnh mới`
                : 'Ảnh dùng cho AI Service nhận diện tài xế khi đăng nhập Box. Có thể bổ sung sau.'}
            </span>
          </div>
        </form>
      </div>

      <ModalFooter>
        <Button id="btn-cancel-driver" variant="outline" size="modal" className="rounded-xl! font-semibold" onClick={closeDriverModal}>
          Hủy
        </Button>
        <Button
          id="btn-save-driver"
          variant="primary"
          size="modalWide"
          className="rounded-xl! font-semibold"
          disabled={saveMutation.isPending}
          onClick={onSave}
        >
          {saveMutation.isPending ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Đang lưu...
            </>
          ) : isEdit ? (
            <>
              <i className="fa-solid fa-check" aria-hidden="true"></i> Lưu thay đổi
            </>
          ) : (
            <>
              <i className="fa-solid fa-plus" aria-hidden="true"></i> Tạo tài xế
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
    <Modal id="driver-modal" open={open} onClose={ignoreOverlayClick} labelledBy="driver-modal-title" maxWidth={720} bordered>
      <DriverForm key={openKey} driver={driver} />
    </Modal>
  )
}
