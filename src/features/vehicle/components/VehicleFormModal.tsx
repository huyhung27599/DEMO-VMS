import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../../../shared/ui/Button'
import { Modal, ModalFooter } from '../../../shared/ui/Modal'
import { showToast } from '../../../shared/ui/toastStore'
import { EMPTY_VEHICLE_FORM, type Company, type VehicleFormValues } from '../lib'
import { useQuery } from '@tanstack/react-query'
import { driversQueryOptions } from '../../driver/queries'
import { vehicleFormSchema, VEHICLE_REQUIRED_MESSAGE } from '../schemas'

const INPUT =
  'driver-modal-input w-full rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-2.5 font-sans text-[0.9rem] text-[#0f172a] outline-none transition focus:border-[#e11d48]/50 focus:ring-[3px] focus:ring-[#e11d48]/12 read-only:cursor-not-allowed read-only:bg-[#f8fafc]'
const LABEL = 'mb-1.5 block text-[0.72rem] font-bold tracking-[0.06em] text-[#94a3b8] uppercase'

type VehicleFormModalProps = {
  open: boolean
  /** Tăng mỗi lần mở modal để đặt lại form (form.reset() của openModal) */
  openKey: number
  initialValues: VehicleFormValues
  editing: boolean
  plateReadOnly: boolean
  companies: Company[]
  saving: boolean
  onClose: () => void
  onSave: (values: VehicleFormValues) => void
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h4 className="col-span-2 mt-1 mb-0 border-t border-[#eef2f6] pt-5 text-[0.72rem] font-bold tracking-[0.08em] text-[#64748b] uppercase first:mt-0 first:border-t-0 first:pt-0">
      {children}
    </h4>
  )
}

export function VehicleFormModal({
  open,
  openKey,
  initialValues,
  editing,
  plateReadOnly,
  companies,
  saving,
  onClose,
  onSave,
}: VehicleFormModalProps) {
  const drivers = useQuery({ ...driversQueryOptions(), enabled: open }).data ?? []
  const { register, handleSubmit, reset } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: EMPTY_VEHICLE_FORM,
  })

  // openModal: form.reset() rồi điền giá trị (nếu sửa)
  useEffect(() => {
    if (openKey > 0) reset(initialValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ đặt lại khi mở modal
  }, [openKey])

  const submit = () => void handleSubmit(onSave, () => showToast(VEHICLE_REQUIRED_MESSAGE, 'warning'))()

  return (
    <Modal id="vehicle-modal" open={open} onClose={onClose} labelledBy="vehicle-modal-title" maxWidth={680} bordered>
      <div className="flex items-start justify-between gap-3 border-b border-[#eef2f6] bg-white px-7 py-5">
        <div>
          <h3 id="vehicle-modal-title" className="m-0 text-xl font-bold text-[#0f172a]">
            {editing ? 'Sửa phương tiện' : 'Thêm phương tiện'}
          </h3>
          <p className="mt-1 mb-0 text-[0.8rem] text-[#94a3b8]">
            {editing
              ? 'Cập nhật thông tin và thiết bị gắn cho phương tiện'
              : 'Đăng ký phương tiện mới và gắn thiết bị dashcam'}
          </p>
          <p className="mt-2 mb-0 text-[0.78rem] text-[#94a3b8]">
            Quản lý phương tiện /{' '}
            <span className="font-semibold text-[#0f172a]">
              {editing ? initialValues.vehiIdno || '—' : 'Thêm phương tiện'}
            </span>
          </p>
        </div>
        <button
          type="button"
          id="btn-close-vehicle-modal"
          aria-label="Đóng"
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-white text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] focus-visible:outline-2 focus-visible:outline-primary"
          onClick={onClose}
        >
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div className="max-h-[min(70vh,560px)] overflow-y-auto bg-white px-7 py-6">
        <form
          id="vehicle-form"
          noValidate
          className="grid grid-cols-2 gap-x-5 gap-y-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <SectionTitle>Thông tin phương tiện</SectionTitle>

          <div className="flex flex-col">
            <label htmlFor="vehicle-plate" className={LABEL}>
              Biển số <span className="text-[#e11d48]">*</span>
            </label>
            <input
              type="text"
              id="vehicle-plate"
              className={INPUT}
              placeholder="VD: 30M-81775"
              readOnly={plateReadOnly}
              aria-label="Biển số xe"
              {...register('vehiIdno')}
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="vehicle-type" className={LABEL}>
              Loại xe <span className="text-[#e11d48]">*</span>
            </label>
            <select id="vehicle-type" className={INPUT} aria-label="Loại phương tiện" {...register('vehiType')}>
              <option value="1">Xe con</option>
              <option value="2">Xe tải</option>
              <option value="3">Xe khách</option>
              <option value="4">Xe container</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="vehicle-company" className={LABEL}>
              Doanh nghiệp <span className="text-[#e11d48]">*</span>
            </label>
            <select id="vehicle-company" className={INPUT} aria-label="Nhóm quản lý" {...register('companyId')}>
              <option value="">— Chọn doanh nghiệp —</option>
              {companies.map((co) => (
                <option key={co.id} value={co.id}>
                  {co.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="vehicle-driver" className={LABEL}>
              Tài xế phụ trách
            </label>
            <select id="vehicle-driver" className={INPUT} defaultValue="" aria-label="Tài xế phụ trách">
              <option value="">— Chưa gán —</option>
              {drivers.map((d, i) => (
                <option key={String(d.id ?? d.jn ?? i)} value={String(d.id ?? d.jn ?? '')}>
                  {String(d.dn || d.name || d.jn || '')}
                </option>
              ))}
            </select>
          </div>

          {/* Giữ field màu cho payload API (không hiện trên mockup) */}
          <div className="sr-only">
            <label htmlFor="vehicle-color">Màu sắc xe</label>
            <input type="text" id="vehicle-color" {...register('vehiColor')} />
          </div>

          <SectionTitle>Gắn thiết bị dashcam</SectionTitle>

          <div className="col-span-2 flex flex-col">
            <label htmlFor="vehicle-dev-id" className={LABEL}>
              Thiết bị (Box AI) <span className="text-[#e11d48]">*</span>
            </label>
            <input
              type="text"
              id="vehicle-dev-id"
              className={INPUT}
              placeholder="— Chưa gán — / nhập ID thiết bị"
              aria-label="ID thiết bị"
              {...register('devIdno')}
            />
            <span className="mt-1.5 text-[0.75rem] text-[#94a3b8]">
              Có thể gắn sau tại màn hình Quản lý thiết bị
            </span>
          </div>
        </form>
      </div>

      <ModalFooter>
        <Button id="btn-cancel-vehicle" variant="outline" size="modal" className="rounded-xl! font-semibold" onClick={onClose}>
          Hủy
        </Button>
        <Button
          id="btn-save-vehicle"
          variant="primary"
          size="modalWide"
          className="rounded-xl! font-semibold"
          disabled={saving}
          onClick={submit}
        >
          {saving ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Đang lưu...
            </>
          ) : editing ? (
            <>
              <i className="fa-solid fa-check" aria-hidden="true"></i> Lưu thay đổi
            </>
          ) : (
            <>
              <i className="fa-solid fa-plus" aria-hidden="true"></i> Tạo phương tiện
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
