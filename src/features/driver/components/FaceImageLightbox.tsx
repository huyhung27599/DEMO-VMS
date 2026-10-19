import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { closeFaceImageLightbox, useDriverStore } from '../store'

// driver.js:1151-1174 openFaceImageLightbox: overlay gắn vào <body>, click hoặc Esc để đóng.
export function FaceImageLightbox() {
  const imageUrl = useDriverStore((s) => s.lightboxUrl)

  useEffect(() => {
    if (!imageUrl) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFaceImageLightbox()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [imageUrl])

  return imageUrl
    ? createPortal(
        <div
          id="face-image-lightbox"
          className="fixed inset-0 z-9999 flex cursor-zoom-out items-center justify-center bg-black/85 p-4"
          onClick={closeFaceImageLightbox}
        >
          <img
            src={imageUrl}
            alt="Ảnh sự kiện"
            className="max-h-[92vh] max-w-[96vw] rounded-[10px] object-contain shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
          />
        </div>,
        document.body,
      )
    : null
}
