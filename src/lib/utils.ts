// Small shared helpers.

/** Reasonably unique id without pulling in a uuid dependency. */
export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  )
}

/** Format a Pokédex-style number: 1 -> "#001". */
export function formatNumber(n: number): string {
  return '#' + String(n).padStart(3, '0')
}

/** Map a 0–100 stat value to a colour on a red→green scale, echoing the
 *  green/red stat bars in the reference design. */
export function statColor(value: number): string {
  if (value < 30) return '#F0563E'
  if (value < 50) return '#F5943C'
  if (value < 70) return '#F0C93B'
  if (value < 85) return '#8BCB3F'
  return '#37B98C'
}

/** Read a File as a data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Downscale an image data URL to fit within `max` px on its longest side and
 * re-encode as JPEG. Keeps IndexedDB small and the UI snappy.
 */
export function resizeImage(dataUrl: string, max = 900): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > max || height > max) {
        const scale = max / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/** Turn a name into up to two uppercase initials for placeholder avatars. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Normalise an Instagram handle to display (@name) and link forms. */
export function instagramLink(handle: string): { display: string; url: string } {
  const clean = handle.trim().replace(/^@+/, '').replace(/\s+/g, '')
  return {
    display: '@' + clean,
    url: 'https://instagram.com/' + clean,
  }
}

/** Build a tel: link from a phone number, keeping a leading +. */
export function phoneLink(phone: string): string {
  const clean = phone.trim().replace(/(?!^\+)[^\d]/g, '')
  return 'tel:' + clean
}

/** Format an ISO date (yyyy-mm-dd) as dd/mm/yyyy; returns '' if empty. */
export function formatDate(iso?: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
