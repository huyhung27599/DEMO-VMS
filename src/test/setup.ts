import '@testing-library/jest-dom/vitest'

// jsdom không cài đặt window.scrollTo (router gọi khi điều hướng) — stub để output test sạch
window.scrollTo = (() => {}) as typeof window.scrollTo
