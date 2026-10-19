import { useLoaderStore } from './loaderStore'

// #global-loader.loader-container > .spinner (index.html:631-633, styles2.css:730-750)
export function GlobalLoader() {
  const visible = useLoaderStore((s) => s.visible)
  return (
    <div
      id="global-loader"
      className="fixed inset-0 z-1000 items-center justify-center bg-[#ffffffcc]"
      style={{ display: visible ? 'flex' : 'none' }}
      role="status"
      aria-label="Đang tải"
      aria-hidden={visible ? 'false' : 'true'}
    >
      <div className="size-10 animate-spin rounded-full border-4 border-border border-t-primary"></div>
    </div>
  )
}
