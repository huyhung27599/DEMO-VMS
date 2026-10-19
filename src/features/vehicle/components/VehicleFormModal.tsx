import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../../../shared/ui/Button'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../../../shared/ui/Modal'
import { showToast } from '../../../shared/ui/toastStore'
import { EMPTY_VEHICLE_FORM, type Company, type VehicleFormValues } from '../lib'
import { vehicleFormSchema, VEHICLE_REQUIRED_MESSAGE } from '../schemas'

// .driver-modal-input / .driver-modal-label (index.html:1448-1477)
const INPUT =
  'w-full rounded-[8px] border border-border bg-[#f8fafc] px-4 py-3 font-sans text-[0.95rem] text-text-main outline-none transition-all duration-200 focus:border-primary focus:bg-white focus:ring-[3px] focus:ring-primary/15 read-only:cursor-not-allowed'
const LABEL = 'mb-[0.4rem] flex items-center gap-[0.4rem] text-[0.85rem] font-semibold text-[#475569]'

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
    <Modal id="vehicle-modal" open={open} onClose={onClose} labelledBy="vehicle-modal-title" maxWidth={600} bordered>
      <ModalHeader
        titleId="vehicle-modal-title"
        closeId="btn-close-vehicle-modal"
        onClose={onClose}
        title={
          editing ? (
            <>
              <i className="fa-solid fa-pen-to-square text-primary" aria-hidden="true"></i> Cập nhật phương tiện
            </>
          ) : (
            <>
              <i className="fa-solid fa-truck-front text-primary" aria-hidden="true"></i> Thêm phương tiện mới
            </>
          )
        }
      />
      <ModalBody>
        <form
          id="vehicle-form"
          noValidate
          className="grid grid-cols-2 gap-x-6 gap-y-5"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="flex flex-col">
            <label htmlFor="vehicle-plate" className={LABEL}>
              <i className="fa-solid fa-id-card-clip text-[#94a3b8]" aria-hidden="true"></i> Biển số xe *
            </label>
            <input
              type="text"
              id="vehicle-plate"
              className={INPUT}
              placeholder="VD: 29A-123.45"
              readOnly={plateReadOnly}
              {...register('vehiIdno')}
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="vehicle-dev-id" className={LABEL}>
              <i className="fa-solid fa-microchip text-[#94a3b8]" aria-hidden="true"></i> ID thiết bị *
            </label>
            <input
              type="text"
              id="vehicle-dev-id"
              className={INPUT}
              placeholder="Nhập ID thiết bị..."
              {...register('devIdno')}
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="vehicle-type" className={LABEL}>
              <i className="fa-solid fa-car text-[#94a3b8]" aria-hidden="true"></i> Loại phương tiện
            </label>
            <select id="vehicle-type" className={INPUT} {...register('vehiType')}>
              <option value="1">Xe con</option>
              <option value="2">Xe tải</option>
              <option value="3">Xe khách</option>
              <option value="4">Xe container</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="vehicle-color" className={LABEL}>
              <i className="fa-solid fa-palette text-[#94a3b8]" aria-hidden="true"></i> Màu sắc xe
            </label>
            <input
              type="text"
              id="vehicle-color"
              className={INPUT}
              placeholder="VD: Trắng, Đen..."
              {...register('vehiColor')}
            />
          </div>
          <div className="col-span-2 flex flex-col">
            <label htmlFor="vehicle-company" className={LABEL}>
              <i className="fa-solid fa-building text-[#94a3b8]" aria-hidden="true"></i> Nhóm quản lý (Đơn vị)
            </label>
            <select id="vehicle-company" className={INPUT} {...register('companyId')}>
              <option value="">-- Chọn đơn vị --</option>
              {companies.map((co) => (
                <option key={co.id} value={co.id}>
                  {co.name}
                </option>
              ))}
            </select>
          </div>
        </form>
      </ModalBody>
      <ModalFooter>
        <Button id="btn-cancel-vehicle" variant="outline" size="modal" className="font-semibold" onClick={onClose}>
          Hủy bỏ
        </Button>
        <Button
          id="btn-save-vehicle"
          variant="primary"
          size="modalWide"
          className="font-semibold"
          disabled={saving}
          onClick={submit}
        >
          {saving ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Đang lưu...
            </>
          ) : (
            <>
              <i className="fa-solid fa-floppy-disk" aria-hidden="true"></i> Lưu thông tin
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
