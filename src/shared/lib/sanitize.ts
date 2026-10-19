export function sanitizeHTML(str: string): string {
  const temp = document.createElement('div')
  temp.textContent = String(str)
  return temp.innerHTML
}
