/**
 * Canonical geometry for the printable attendance sheet.
 *
 * The same numbers drive the printed SVG and the scanner, so the detector
 * always knows exactly where each P/A/L box sits on the page. Everything is in
 * millimetres on an A4 portrait page.
 */

export const PAGE_W = 210
export const PAGE_H = 297

export const MARGIN = 12
export const MARK_SIZE = 8
export const MARK_INSET = 8

export const TABLE_TOP = 56
export const ROW_H = 9
export const ROWS_PER_PAGE = 24

export const COL = {
  roll: { x: 14, w: 18 },
  name: { x: 32, w: 86 },
  present: { x: 120, w: 15 },
  absent: { x: 137, w: 15 },
  late: { x: 154, w: 15 },
}

export type Box = { x: number; y: number; w: number; h: number }

export type LayoutRow = {
  rollNo: string
  name: string
  y: number
  boxes: { present: Box; absent: Box; late: Box }
}

export type PageLayout = {
  index: number
  marks: { x: number; y: number; size: number }[]
  rows: LayoutRow[]
}

export type SheetLayout = {
  code: string
  className: string
  batch: string
  date: string
  session: string
  institute: string
  pages: PageLayout[]
}

export type SheetStudent = { rollNo: string | null; name: string }

function markPositions() {
  const s = MARK_SIZE
  const i = MARK_INSET
  return [
    { x: i, y: i, size: s },
    { x: PAGE_W - i - s, y: i, size: s },
    { x: i, y: PAGE_H - i - s, size: s },
    { x: PAGE_W - i - s, y: PAGE_H - i - s, size: s },
  ]
}

export function buildLayout(input: {
  code: string
  className: string
  batch: string
  date: string
  session: string
  institute: string
  students: SheetStudent[]
}): SheetLayout {
  const students = input.students.slice()
  const pages: PageLayout[] = []

  for (let p = 0; p * ROWS_PER_PAGE < students.length; p += 1) {
    const slice = students.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE)
    const rows: LayoutRow[] = slice.map((s, i) => {
      const y = TABLE_TOP + i * ROW_H
      return {
        rollNo: s.rollNo ?? '',
        name: s.name,
        y,
        boxes: {
          present: { x: COL.present.x, y, w: COL.present.w, h: ROW_H },
          absent: { x: COL.absent.x, y, w: COL.absent.w, h: ROW_H },
          late: { x: COL.late.x, y, w: COL.late.w, h: ROW_H },
        },
      }
    })
    pages.push({ index: p, marks: markPositions(), rows })
  }

  if (pages.length === 0) pages.push({ index: 0, marks: markPositions(), rows: [] })

  return {
    code: input.code,
    className: input.className,
    batch: input.batch,
    date: input.date,
    session: input.session,
    institute: input.institute,
    pages,
  }
}
