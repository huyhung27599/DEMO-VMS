import { z } from 'zod'

// vehicle.js:273-276 — chỉ kiểm tra Biển số và ID thiết bị (không trim), hiện bằng toast cảnh báo.
export const VEHICLE_REQUIRED_MESSAGE = 'Vui lòng nhập đầy đủ Biển số và ID thiết bị'

export const vehicleFormSchema = z.object({
  vehiIdno: z.string().min(1, VEHICLE_REQUIRED_MESSAGE),
  devIdno: z.string().min(1, VEHICLE_REQUIRED_MESSAGE),
  vehiType: z.string(),
  vehiColor: z.string(),
  companyId: z.string(),
})
