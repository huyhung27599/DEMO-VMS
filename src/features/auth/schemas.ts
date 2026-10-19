import { z } from 'zod'

// Kiểm tra đầu vào của các form auth. Bản gốc chỉ hiện MỘT thông báo (lỗi đầu tiên theo
// thứ tự if/return), nên mỗi schema chỉ thêm một issue rồi dừng.

// auth.js:329
export const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{12,}$/

/** Thông báo của lỗi đầu tiên, hoặc null nếu hợp lệ. */
export function firstError<T>(schema: z.ZodType<T>, values: unknown): string | null {
  const r = schema.safeParse(values)
  return r.success ? null : (r.error.issues[0]?.message ?? null)
}

// auth.js:169-176 (username đã trim; password không trim)
export const loginSchema = z
  .object({ username: z.string(), password: z.string() })
  .superRefine((v, ctx) => {
    if (!v.username || !v.password) ctx.addIssue({ code: 'custom', message: 'Vui lòng nhập tài khoản và mật khẩu.' })
  })

// auth.js:243-247
export const resetRequestSchema = z.object({ account: z.string() }).superRefine((v, ctx) => {
  if (!v.account) ctx.addIssue({ code: 'custom', message: 'Vui lòng nhập tên tài khoản.' })
})

// auth.js:316-333
export const changePasswordSchema = z
  .object({ oldPassword: z.string(), newPassword: z.string(), confirmPassword: z.string() })
  .superRefine((v, ctx) => {
    if (!v.oldPassword || !v.newPassword || !v.confirmPassword) {
      ctx.addIssue({ code: 'custom', message: 'Vui lòng điền đầy đủ mật khẩu.' })
    } else if (v.newPassword !== v.confirmPassword) {
      ctx.addIssue({ code: 'custom', message: 'Xác nhận mật khẩu mới không khớp.' })
    } else if (!PASSWORD_COMPLEXITY_REGEX.test(v.newPassword)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Mật khẩu mới không đủ mạnh (Tối thiểu 12 ký tự, đủ chữ hoa, thường, số, ký tự đặc biệt).',
      })
    }
  })

// auth.js:391-406 (không kiểm tra độ mạnh — giữ nguyên bản gốc)
export const forgotPasswordSchema = z
  .object({ username: z.string(), oldPassword: z.string(), newPassword: z.string(), confirmPassword: z.string() })
  .superRefine((v, ctx) => {
    if (!v.username) {
      ctx.addIssue({ code: 'custom', message: 'Vui lòng nhập tài khoản (Username).' })
    } else if (!v.oldPassword || !v.newPassword || !v.confirmPassword) {
      ctx.addIssue({ code: 'custom', message: 'Vui lòng điền đầy đủ mật khẩu.' })
    } else if (v.newPassword !== v.confirmPassword) {
      ctx.addIssue({ code: 'custom', message: 'Xác nhận mật khẩu mới không khớp.' })
    }
  })
