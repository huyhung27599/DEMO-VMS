import { PLACEHOLDER_PAGES } from './navConfig'
import type { AppRoute } from './useActiveSection'

export function PlaceholderSection({ routeId, hidden }: { routeId: AppRoute; hidden: boolean }) {
  const meta = PLACEHOLDER_PAGES[routeId]
  if (!meta) return null

  return (
    <section
      id={`${routeId}-section`}
      hidden={hidden}
      className="flex flex-1 flex-col overflow-auto p-8"
      aria-labelledby={`${routeId}-title`}
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-3 inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
          Đang phát triển
        </div>
        <h1 id={`${routeId}-title`} className="m-0 text-2xl font-bold tracking-tight text-text-main">
          {meta.title}
        </h1>
        <p className="mt-3 mb-0 max-w-2xl text-[0.95rem] leading-relaxed text-text-muted">{meta.description}</p>
      </div>
    </section>
  )
}
