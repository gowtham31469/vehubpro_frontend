/** @param {string} hex */
export function hexToRgba(hex, alpha) {
  const safe = (hex || '#1e378a').replace('#', '').trim()
  const normalized = safe.length === 3 ? safe.split('').map((c) => c + c).join('') : safe
  const int = Number.parseInt(normalized, 16)
  if (Number.isNaN(int)) return `rgba(30,55,138,${alpha})`
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
