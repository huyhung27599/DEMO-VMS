import type { ButtonHTMLAttributes } from 'react'

// Chuyển từ .btn / .btn-primary / .btn-danger / .btn-sm / .btn-block (styles2.css:236-278, 540-546).
// Lưu ý: bản gốc tô .btn-primary bằng màu danger (đỏ) — giữ nguyên.
const BASE =
  // (không đặt display: <button> mặc định là inline-block, để className tự thêm flex)
  'text-center font-sans font-semibold cursor-pointer border-none ' +
  'shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] ' +
  'enabled:hover:-translate-y-px enabled:hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-96 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const VARIANTS = {
  default: 'bg-[#efefef] text-text-main',
  primary: 'bg-danger text-white enabled:hover:bg-danger-hover',
  danger: 'bg-danger text-white enabled:hover:bg-danger-hover',
  // nút "Hủy" trong footer modal (style inline của index.html)
  outline: 'border! border-solid! border-[#cbd5e1]! bg-white text-[#475569]',
  muted: 'border! border-solid! border-border! bg-[#f1f5f9] text-[#94a3b8]',
} as const

const SIZES = {
  md: 'px-5 py-[0.55rem] text-sm rounded-md',
  sm: 'px-[0.65rem] py-[0.3rem] text-xs rounded-md',
  block: 'w-full p-4 text-base rounded-md',
  modal: 'px-5 py-[0.6rem] text-sm rounded-[8px]',
  modalWide: 'px-6 py-[0.6rem] text-sm rounded-[8px]',
} as const

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
}

export function Button({ variant = 'default', size = 'md', className = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...rest} />
}
