import { z } from 'zod'

// Kiểm tra đầu vào của các form auth. Bản gốc chỉ hiện MỘT thông báo (lỗi đầu tiên theo
// thứ tự if/return), nên mỗi schema chỉ thêm một issue rồi dừng.

// auth.js:329 — đổi mật khẩu khi đã đăng nhập (giữ 12 ký tự)
export const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{12,}$/

// SRS §3.1 BR-15 — đặt lại mật khẩu (≥ 8)
export const RESET_PASSWORD_COMPLEXITY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/

/** Thông báo của lỗi đầu tiên, hoặc null nếu hợp lệ. */
export function firstError<T>(schema: z.ZodType<T>, values: unknown): string | null {
  const r = schema.safeParse(values)
  return r.success ? null : (r.error.issues[0]?.message ?? null)
}

// SRS §3.1 form đăng nhập (username đã trim; password không trim)
export const loginSchema = z
  .object({ username: z.string(), password: z.string() })
  .superRefine((v, ctx) => {
    if (!v.username) {
      ctx.addIssue({ code: 'custom', message: 'Vui lòng nhập Tài khoản' })
    } else if (!v.password) {
      ctx.addIssue({ code: 'custom', message: 'Vui lòng nhập Mật khẩu' })
    }
  })

// SRS §3.1 form quên mật khẩu — tài khoản hoặc email
export const resetRequestSchema = z.object({ account: z.string() }).superRefine((v, ctx) => {
  if (!v.account) {
    ctx.addIssue({ code: 'custom', message: 'Vui lòng nhập tài khoản hoặc email' })
    return
  }
  if (v.account.includes('@')) {
    const emailOk = z.string().email().safeParse(v.account).success
    if (!emailOk) ctx.addIssue({ code: 'custom', message: 'Email không đúng định dạng' })
  }
})

// SRS §3.1 form đặt lại mật khẩu (UI-only)
export const resetPasswordSchema = z
  .object({ newPassword: z.string(), confirmPassword: z.string() })
  .superRefine((v, ctx) => {
    if (!v.newPassword || !v.confirmPassword) {
      ctx.addIssue({ code: 'custom', message: 'Vui lòng điền đầy đủ mật khẩu.' })
    } else if (v.newPassword !== v.confirmPassword) {
      ctx.addIssue({ code: 'custom', message: 'Mật khẩu xác nhận không khớp' })
    } else if (!RESET_PASSWORD_COMPLEXITY_REGEX.test(v.newPassword)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Mật khẩu mới không đủ mạnh (Tối thiểu 8 ký tự, đủ chữ hoa, thường, số, ký tự đặc biệt).',
      })
    }
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
