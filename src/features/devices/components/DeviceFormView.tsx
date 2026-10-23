import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button } from '../../../shared/ui/Button'
import { modalInputClass } from '../../../shared/ui/Modal'
import { EMPTY_DEVICE_FORM, validateDeviceForm, type DeviceFormValues } from '../lib'
import type { Device } from '../types'

type DeviceFormViewProps = {
  mode: 'create' | 'edit'
  devices: Device[]
  companies: { id: string; name: string }[]
  vehicles: { plate: string; enterpriseId: string }[]
  initial: DeviceFormValues
  editId?: string
  onCancel: () => void
  onSubmit: (values: DeviceFormValues) => void
}

const labelClass = 'mb-1.5 block text-[0.8rem] font-semibold text-[#334155]'
const sectionTitle = 'mb-3 text-[0.7rem] font-bold tracking-[0.08em] text-[#94a3b8] uppercase'
const fieldHint = 'mt-1.5 mb-0 text-xs text-text-muted'

export function DeviceFormView({
  mode,
  devices,
  companies,
  vehicles: allVehicles,
  initial,
  editId,
  onCancel,
  onSubmit,
}: DeviceFormViewProps) {
  const [values, setValues] = useState<DeviceFormValues>(EMPTY_DEVICE_FORM)
  const [error, setError] = useState('')

  useEffect(() => {
    setValues({ ...initial })
    setError('')
  }, [initial])

  const vehicles = useMemo(() => {
    if (!values.enterpriseId) return allVehicles
    return allVehicles.filter((v) => v.enterpriseId === values.enterpriseId)
  }, [values.enterpriseId, allVehicles])

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    const err = validateDeviceForm(values, devices, { mode, editId })
    if (err) {
      setError(err)
      return
    }
    onSubmit({
      serial: values.serial.trim(),
      sim: values.sim.trim(),
      enterpriseId: values.enterpriseId,
      vehicleId: values.vehicleId,
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="m-0 text-2xl font-bold text-text-main">
          {mode === 'create' ? 'Thêm thiết bị' : 'Sửa thiết bị'}
        </h2>
        <p className="mt-1 mb-3 text-sm text-text-muted">
          {mode === 'create'
            ? 'Đăng ký thiết bị dashcam mới vào hệ thống'
            : 'Cập nhật thông tin và gán phương tiện cho thiết bị'}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer border-none bg-transparent p-0 text-sm text-text-muted hover:text-danger"
        >
          <i className="fa-solid fa-arrow-left mr-1.5" aria-hidden="true" />
          Quản lý thiết bị <span className="text-[#cbd5e1]">/</span>{' '}
          <span className="text-text-main">{mode === 'create' ? 'Thêm thiết bị' : 'Sửa thiết bị'}</span>
        </button>
      </div>

      <form
        onSubmit={onFormSubmit}
        noValidate
        className="rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8"
      >
        <section className="mb-8">
          <h3 className={sectionTitle}>Thông tin thiết bị</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="device-serial" className={labelClass}>
                ID thiết bị (Serial) {mode === 'create' ? <span className="text-danger">*</span> : null}
                {mode === 'edit' ? (
                  <i
                    className="fa-solid fa-lock ml-1 text-[0.7rem] text-[#94a3b8]"
                    aria-hidden="true"
                    title="Serial không thể thay đổi"
                  />
                ) : null}
              </label>
              <input
                id="device-serial"
                className={`${modalInputClass} ${mode === 'edit' ? 'bg-[#f8fafc] text-text-muted' : ''}`}
                placeholder="VD: 052040001180"
                disabled={mode === 'edit'}
                value={values.serial}
                onChange={(e) => setValues((v) => ({ ...v, serial: e.target.value }))}
              />
              {mode === 'create' ? <p className={fieldHint}>Số serial in trên Box AI.</p> : null}
            </div>
            <div>
              <label htmlFor="device-sim" className={labelClass}>
                SIM / Số thuê bao
              </label>
              {/* addDevice/editDevice không có tham số SIM */}
              <input
                id="device-sim"
                className={modalInputClass}
                placeholder="—"
                disabled
                value={values.sim}
                onChange={(e) => setValues((v) => ({ ...v, sim: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="device-enterprise" className={labelClass}>
                Doanh nghiệp <span className="text-danger">*</span>
              </label>
              <select
                id="device-enterprise"
                className={modalInputClass}
                disabled={mode === 'edit'}
                value={values.enterpriseId}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    enterpriseId: e.target.value,
                    vehicleId: '',
                  }))
                }
              >
                <option value="">Chọn doanh nghiệp</option>
                {companies.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="mb-8 border-t border-border" />

        <section className="mb-6">
          <h3 className={sectionTitle}>Gán phương tiện</h3>
          <div>
            <label htmlFor="device-vehicle" className={labelClass}>
              Phương tiện lắp đặt <span className="text-danger">*</span>
            </label>
            <select
              id="device-vehicle"
              className={modalInputClass}
              value={values.vehicleId}
              onChange={(e) => setValues((v) => ({ ...v, vehicleId: e.target.value }))}
            >
              <option value="">— Chọn phương tiện —</option>
              {vehicles.map((v) => (
                <option key={v.plate} value={v.plate}>
                  {v.plate}
                </option>
              ))}
            </select>
            <p className={fieldHint}>808gps chỉ liệt kê thiết bị đã lắp lên xe.</p>
          </div>
        </section>

        <div className="min-h-5 text-sm text-danger" role="alert">
          {error}
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-5">
          <Button variant="outline" size="modal" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" size="modalWide">
            {mode === 'create' ? (
              <>
                <i className="fa-solid fa-plus mr-1.5" aria-hidden="true" />
                Tạo thiết bị
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk mr-1.5" aria-hidden="true" />
                Lưu thay đổi
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
