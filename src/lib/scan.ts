/**
 * Paper attendance sheet scanner.
 *
 * The sheet is printed from a fixed template, so the scanner does not need
 * general handwriting recognition. It:
 *   1. finds the four solid registration marks in the page corners,
 *   2. solves the perspective transform between the photo and the template,
 *   3. warps the photo onto the canonical page,
 *   4. measures ink density inside each printed P / A / L box.
 *
 * Anything it is not sure about is reported with a low confidence so the
 * teacher can verify it against the scan.
 */

import { PAGE_H, PAGE_W, type SheetLayout } from './sheetLayout'

export type Detection = {
  rollNo: string
  status: 'present' | 'absent' | 'late' | null
  confidence: number
  darkness: { present: number; absent: number; late: number }
}

export type ScanResult = {
  detections: Detection[]
  marksFound: number
  rotation: number
  warpedDataUrl: string | null
  message: string
}

type Point = { x: number; y: number }

const RASTER_W = 1000
const RASTER_H = Math.round((RASTER_W * PAGE_H) / PAGE_W)

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that image'))
    img.src = src
  })
}

function drawToCanvas(img: HTMLImageElement, maxSide = 1400): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available in this browser')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

function rotateCanvas(source: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  if (degrees === 0) return source
  const rad = (degrees * Math.PI) / 180
  const swap = degrees === 90 || degrees === 270
  const canvas = document.createElement('canvas')
  canvas.width = swap ? source.height : source.width
  canvas.height = swap ? source.width : source.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available in this browser')
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(rad)
  ctx.drawImage(source, -source.width / 2, -source.height / 2)
  return canvas
}

function grayscale(canvas: HTMLCanvasElement): { data: Uint8ClampedArray; w: number; h: number } {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available in this browser')
  const { width: w, height: h } = canvas
  const raw = ctx.getImageData(0, 0, w, h).data
  const gray = new Uint8ClampedArray(w * h)
  for (let i = 0; i < w * h; i += 1) {
    const o = i * 4
    gray[i] = (raw[o] * 0.299 + raw[o + 1] * 0.587 + raw[o + 2] * 0.114) | 0
  }
  return { data: gray, w, h }
}

/** Darkest solid blob near one corner of the page. */
function findMark(
  gray: Uint8ClampedArray,
  w: number,
  h: number,
  corner: 'tl' | 'tr' | 'bl' | 'br',
): Point | null {
  const winW = Math.round(w * 0.3)
  const winH = Math.round(h * 0.3)
  const x0 = corner === 'tl' || corner === 'bl' ? 0 : w - winW
  const y0 = corner === 'tl' || corner === 'tr' ? 0 : h - winH

  const cell = 12
  let best = { x: -1, y: -1, score: 999 }

  for (let y = y0; y < y0 + winH - cell; y += cell) {
    for (let x = x0; x < x0 + winW - cell; x += cell) {
      let sum = 0
      for (let dy = 0; dy < cell; dy += 2) {
        for (let dx = 0; dx < cell; dx += 2) {
          sum += gray[(y + dy) * w + (x + dx)]
        }
      }
      const mean = sum / ((cell / 2) * (cell / 2))
      if (mean < best.score) best = { x, y, score: mean }
    }
  }

  if (best.x < 0 || best.score > 110) return null

  // Refine: centroid of dark pixels in a window around the darkest cell.
  const radius = 26
  let sx = 0
  let sy = 0
  let count = 0
  for (let y = Math.max(0, best.y - radius); y < Math.min(h, best.y + cell + radius); y += 1) {
    for (let x = Math.max(0, best.x - radius); x < Math.min(w, best.x + cell + radius); x += 1) {
      if (gray[y * w + x] < 90) {
        sx += x
        sy += y
        count += 1
      }
    }
  }
  if (count < 40) return null
  return { x: sx / count, y: sy / count }
}

/** Solve the 8-parameter homography mapping src → dst. */
function solveHomography(src: Point[], dst: Point[]): number[] | null {
  const a: number[][] = []
  for (let i = 0; i < 4; i += 1) {
    const { x, y } = src[i]
    const { x: u, y: v } = dst[i]
    a.push([x, y, 1, 0, 0, 0, -x * u, -y * u, u])
    a.push([0, 0, 0, x, y, 1, -x * v, -y * v, v])
  }

  for (let col = 0; col < 8; col += 1) {
    let pivot = col
    for (let row = col + 1; row < 8; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row
    }
    if (Math.abs(a[pivot][col]) < 1e-9) return null
    ;[a[col], a[pivot]] = [a[pivot], a[col]]

    const div = a[col][col]
    for (let k = col; k < 9; k += 1) a[col][k] /= div

    for (let row = 0; row < 8; row += 1) {
      if (row === col) continue
      const factor = a[row][col]
      if (!factor) continue
      for (let k = col; k < 9; k += 1) a[row][k] -= factor * a[col][k]
    }
  }

  return a.map((row) => row[8])
}

function applyH(h: number[], x: number, y: number): Point {
  const denom = h[6] * x + h[7] * y + 1
  return {
    x: (h[0] * x + h[1] * y + h[2]) / denom,
    y: (h[3] * x + h[4] * y + h[5]) / denom,
  }
}

function sampleBilinear(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
): number {
  if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return 255
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const i = y0 * w + x0
  const a = data[i]
  const b = data[i + 1]
  const c = data[i + w]
  const d = data[i + w + 1]
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy
}

/** Mean ink density (0 = white, 1 = black) inside a box, inset to skip borders. */
function boxDarkness(
  gray: Uint8ClampedArray,
  w: number,
  h: number,
  hMatrix: number[],
  box: { x: number; y: number; w: number; h: number },
): number {
  const inset = 0.28
  const x0 = box.x + box.w * inset
  const x1 = box.x + box.w * (1 - inset)
  const y0 = box.y + box.h * inset
  const y1 = box.y + box.h * (1 - inset)

  const steps = 9
  let sum = 0
  let count = 0
  for (let i = 0; i < steps; i += 1) {
    for (let j = 0; j < steps; j += 1) {
      const mx = x0 + ((x1 - x0) * i) / (steps - 1)
      const my = y0 + ((y1 - y0) * j) / (steps - 1)
      const px = (mx / PAGE_W) * RASTER_W
      const py = (my / PAGE_H) * RASTER_H
      const src = applyH(hMatrix, px, py)
      sum += sampleBilinear(gray, w, h, src.x, src.y)
      count += 1
    }
  }
  return 1 - sum / count / 255
}

function classify(d: { present: number; absent: number; late: number }): {
  status: 'present' | 'absent' | 'late' | null
  confidence: number
} {
  const entries: [('present' | 'absent' | 'late'), number][] = [
    ['present', d.present],
    ['absent', d.absent],
    ['late', d.late],
  ]
  entries.sort((a, b) => b[1] - a[1])
  const [bestKey, best] = entries[0]
  const second = entries[1][1]

  if (best < 0.1) return { status: null, confidence: 0 }
  const margin = best - second
  if (margin < 0.07) return { status: bestKey, confidence: 0.35 }
  if (best < 0.18) return { status: bestKey, confidence: 0.5 }
  return { status: bestKey, confidence: Math.min(0.99, 0.62 + margin * 1.6) }
}

export async function scanSheetImage(
  source: string,
  layout: SheetLayout,
  pageIndex = 0,
): Promise<ScanResult> {
  const img = await loadImage(source)
  const base = drawToCanvas(img)

  let best: {
    rotation: number
    marks: Point[]
    score: number
  } | null = null

  for (const rotation of [0, 90, 180, 270]) {
    const rotated = rotateCanvas(base, rotation)
    const { data, w, h } = grayscale(rotated)
    const corners: ('tl' | 'tr' | 'bl' | 'br')[] = ['tl', 'tr', 'bl', 'br']
    const found: Point[] = []
    for (const corner of corners) {
      const p = findMark(data, w, h, corner)
      if (p) found.push(p)
    }
    const score = found.length
    if (!best || score > best.score) {
      best = { rotation, marks: found, score }
    }
    if (score === 4) break
  }

  if (!best || best.marks.length < 4) {
    return {
      detections: [],
      marksFound: best?.marks.length ?? 0,
      rotation: best?.rotation ?? 0,
      warpedDataUrl: null,
      message:
        'Could not find the four corner marks. Make sure the whole sheet is in the photo, flat and well lit — or verify the rows manually.',
    }
  }

  const rotated = rotateCanvas(base, best.rotation)
  const { data, w, h } = grayscale(rotated)

  const page = layout.pages[pageIndex] ?? layout.pages[0]
  const canonical = page.marks.map((m) => ({
    x: ((m.x + m.size / 2) / PAGE_W) * RASTER_W,
    y: ((m.y + m.size / 2) / PAGE_H) * RASTER_H,
  }))

  const hMatrix = solveHomography(canonical, best.marks)
  if (!hMatrix) {
    return {
      detections: [],
      marksFound: 4,
      rotation: best.rotation,
      warpedDataUrl: null,
      message: 'The sheet corners could not be aligned. Verify the rows manually.',
    }
  }

  // Warped preview so the teacher can compare against the original.
  const preview = document.createElement('canvas')
  preview.width = RASTER_W
  preview.height = RASTER_H
  const pctx = preview.getContext('2d')
  let warpedDataUrl: string | null = null
  if (pctx) {
    const out = pctx.createImageData(RASTER_W, RASTER_H)
    for (let y = 0; y < RASTER_H; y += 1) {
      for (let x = 0; x < RASTER_W; x += 1) {
        const src = applyH(hMatrix, x, y)
        const v = sampleBilinear(data, w, h, src.x, src.y)
        const o = (y * RASTER_W + x) * 4
        out.data[o] = v
        out.data[o + 1] = v
        out.data[o + 2] = v
        out.data[o + 3] = 255
      }
    }
    pctx.putImageData(out, 0, 0)
    warpedDataUrl = preview.toDataURL('image/jpeg', 0.7)
  }

  const detections: Detection[] = page.rows.map((row) => {
    const darkness = {
      present: boxDarkness(data, w, h, hMatrix, row.boxes.present),
      absent: boxDarkness(data, w, h, hMatrix, row.boxes.absent),
      late: boxDarkness(data, w, h, hMatrix, row.boxes.late),
    }
    const { status, confidence } = classify(darkness)
    return { rollNo: row.rollNo, status, confidence, darkness }
  })

  return {
    detections,
    marksFound: 4,
    rotation: best.rotation,
    warpedDataUrl,
    message: `Aligned the sheet (rotated ${best.rotation}°) and read ${detections.length} rows.`,
  }
}

/**
 * Read the sheet code out of the QR printed on the page.
 *
 * The code is what ties a photographed sheet back to its class and batch, so
 * the scan flow does not have to ask which batch the paper belongs to.
 */
export async function decodeSheetCode(source: string): Promise<string | null> {
  const jsQR = (await import('jsqr')).default
  const img = await loadImage(source)
  const base = drawToCanvas(img, 1600)

  for (const rotation of [0, 90, 180, 270]) {
    const canvas = rotateCanvas(base, rotation)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const found = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })
    if (!found?.data) continue
    const match = found.data.match(/ATT-\d{8}-[A-Z0-9]{4}/i)
    if (match) return match[0].toUpperCase()
    const trimmed = found.data.trim()
    if (trimmed) return trimmed
  }
  return null
}

/** Crop a millimetre region out of an already-warped page image. */
export async function cropRegion(
  source: string,
  box: { x: number; y: number; w: number; h: number },
  scale = 2,
): Promise<string | null> {
  const img = await loadImage(source)
  const sx = (box.x / PAGE_W) * img.naturalWidth
  const sy = (box.y / PAGE_H) * img.naturalHeight
  const sw = (box.w / PAGE_W) * img.naturalWidth
  const sh = (box.h / PAGE_H) * img.naturalHeight
  if (sw < 2 || sh < 2) return null

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sw * scale))
  canvas.height = Math.max(1, Math.round(sh * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

/** Render every page of a PDF to a JPEG data URL. */
export async function renderPdfPages(file: File, maxPages = 6): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = (worker as { default: string }).default

  const buffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buffer }).promise
  const pages: string[] = []
  const count = Math.min(doc.numPages, maxPages)

  for (let i = 1; i <= count; i += 1) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    pages.push(canvas.toDataURL('image/jpeg', 0.85))
  }

  return pages
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read that file'))
    reader.readAsDataURL(file)
  })
}

/** Downscale a data URL so it fits comfortably in a database row. */
export async function compressImage(dataUrl: string, maxSide = 1400, quality = 0.72): Promise<string> {
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}
