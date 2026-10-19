import type { ReactNode } from 'react'

// Chuyển từ .content-section / .section-header / .section-header-left (styles2.css:697-730, 2169-2185).
// Section luôn mount; khi không active thì có thuộc tính `hidden` (display:none).

type ContentSectionProps = {
  id: string
  hidden: boolean
  /** #liveview-section dùng overflow:hidden, các section khác cuộn dọc */
  overflow?: 'auto' | 'hidden'
  className?: string
  children: ReactNode
}

export function ContentSection({ id, hidden, overflow = 'auto', className = '', children }: ContentSectionProps) {
  return (
    <section
      id={`${id}-section`}
      hidden={hidden}
      className={`flex flex-1 animate-section-in flex-col p-8 max-[768px]:p-4 ${
        overflow === 'hidden' ? 'overflow-hidden' : 'overflow-y-auto'
      } ${className}`}
    >
      {children}
    </section>
  )
}

type SectionHeaderProps = {
  title: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
}

export function SectionHeader({ title, subtitle, children }: SectionHeaderProps) {
  return (
    <header className="mb-6 flex items-center justify-between border-b-2 border-primary pb-4 max-[768px]:flex-col max-[768px]:items-start">
      {subtitle === undefined ? (
        <h2 className="text-2xl text-primary">{title}</h2>
      ) : (
        <div className="flex flex-col gap-[0.2rem]">
          <h2 className="flex items-center gap-2 text-2xl text-primary">{title}</h2>
          <span className="text-[0.78rem] font-normal text-text-muted">{subtitle}</span>
        </div>
      )}
      {children}
    </header>
  )
}
