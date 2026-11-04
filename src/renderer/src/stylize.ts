/**
 * Trasforma una foto di console in un'immagine "a fumetto": sfondo tolto, colori più vivi e a pochi livelli,
 * contorno nero spesso. Lavora su un canvas, una volta per immagine.
 */

const MAX = 760

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('immagine non leggibile'))
    img.src = src
  })
}

/** Toglie lo sfondo chiaro collegato ai bordi (riempimento a partire dai bordi: l'interno della console non si tocca) */
export function removeBackground(d: ImageData, tolerance = 60): void {
  const { width: w, height: h, data } = d
  // se l'immagine ha già la trasparenza, non si tocca nulla
  let transparent = 0
  for (let i = 3; i < data.length; i += 4 * 97) if (data[i] < 200) transparent++
  if (transparent > 8) return
  // colore dello sfondo: media dei quattro angoli
  const corner = (x: number, y: number): number[] => {
    const i = (y * w + x) * 4
    return [data[i], data[i + 1], data[i + 2]]
  }
  const cs = [corner(0, 0), corner(w - 1, 0), corner(0, h - 1), corner(w - 1, h - 1)]
  const bg = [0, 1, 2].map((k) => cs.reduce((a, c) => a + c[k], 0) / 4)
  const isBg = (i: number): boolean => {
    const dr = data[i] - bg[0]
    const dg = data[i + 1] - bg[1]
    const db = data[i + 2] - bg[2]
    return Math.sqrt(dr * dr + dg * dg + db * db) <= tolerance
  }
  const seen = new Uint8Array(w * h)
  const stack: number[] = []
  const push = (x: number, y: number): void => {
    const p = y * w + x
    if (!seen[p] && isBg(p * 4)) {
      seen[p] = 1
      stack.push(p)
    }
  }
  for (let x = 0; x < w; x++) {
    push(x, 0)
    push(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    push(0, y)
    push(w - 1, y)
  }
  while (stack.length) {
    const p = stack.pop()!
    const x = p % w
    const y = (p / w) | 0
    if (x > 0) push(x - 1, y)
    if (x < w - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < h - 1) push(x, y + 1)
  }
  for (let p = 0; p < seen.length; p++) if (seen[p]) data[p * 4 + 3] = 0
  dropSpecks(d)
}

/** Toglie i frammenti isolati (ombre staccate, polvere): restano il pezzo più grande e quelli almeno un decimo di esso (per esempio il controller) */
export function dropSpecks(d: ImageData): void {
  const { width: w, height: h, data } = d
  const label = new Int32Array(w * h)
  const sizes: number[] = [0]
  let next = 0
  const stack: number[] = []
  for (let s = 0; s < w * h; s++) {
    if (label[s] || data[s * 4 + 3] === 0) continue
    next++
    label[s] = next
    let n = 0
    stack.push(s)
    while (stack.length) {
      const p = stack.pop()!
      n++
      const x = p % w
      const y = (p / w) | 0
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]
      for (const q of nb) {
        if (q >= 0 && !label[q] && data[q * 4 + 3] !== 0) {
          label[q] = next
          stack.push(q)
        }
      }
    }
    sizes.push(n)
  }
  const biggest = Math.max(0, ...sizes)
  for (let p = 0; p < label.length; p++) if (label[p] && sizes[label[p]] < biggest / 10) data[p * 4 + 3] = 0
}

/** Colori più vivi e a pochi livelli (effetto fumetto) */
export function posterize(d: ImageData, levels = 6): void {
  const { data } = d
  const step = 255 / (levels - 1)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]
    // più saturazione e contrasto
    const l = 0.3 * r + 0.59 * g + 0.11 * b
    r = l + (r - l) * 1.35
    g = l + (g - l) * 1.35
    b = l + (b - l) * 1.35
    r = (r - 128) * 1.15 + 128
    g = (g - 128) * 1.15 + 128
    b = (b - 128) * 1.15 + 128
    data[i] = Math.max(0, Math.min(255, Math.round(r / step) * step))
    data[i + 1] = Math.max(0, Math.min(255, Math.round(g / step) * step))
    data[i + 2] = Math.max(0, Math.min(255, Math.round(b / step) * step))
    data[i + 3] = 255
  }
}

/** Foto → immagine a fumetto (PNG in formato data URL) */
export async function stylizePhoto(src: string, outline = 5): Promise<string> {
  const img = await loadImage(src)
  const k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * k))
  const h = Math.max(1, Math.round(img.naturalHeight * k))
  const pad = outline + 2
  const base = document.createElement('canvas')
  base.width = w
  base.height = h
  const bctx = base.getContext('2d', { willReadFrequently: true })!
  bctx.drawImage(img, 0, 0, w, h)
  const data = bctx.getImageData(0, 0, w, h)
  removeBackground(data)
  posterize(data)
  bctx.putImageData(data, 0, 0)

  // contorno nero: la sagoma si disegna in cerchio attorno all'immagine, poi l'immagine sopra
  const out = document.createElement('canvas')
  out.width = w + pad * 2
  out.height = h + pad * 2
  const octx = out.getContext('2d')!
  const sil = document.createElement('canvas')
  sil.width = w
  sil.height = h
  const sctx = sil.getContext('2d')!
  sctx.drawImage(base, 0, 0)
  sctx.globalCompositeOperation = 'source-in'
  sctx.fillStyle = '#000'
  sctx.fillRect(0, 0, w, h)
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2
    octx.drawImage(sil, pad + Math.cos(t) * outline, pad + Math.sin(t) * outline)
  }
  octx.drawImage(base, pad, pad)
  return out.toDataURL('image/png')
}
