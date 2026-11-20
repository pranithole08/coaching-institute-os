import { COL, MARGIN, PAGE_H, PAGE_W, TABLE_TOP, ROW_H, type SheetLayout } from '@/lib/sheetLayout'

/**
 * Renders the printable A4 attendance sheet as SVG. The geometry comes from
 * `sheetLayout.ts`, which the scanner also uses — so what is printed is exactly
 * what the detector looks for.
 */
export function AttendanceSheetPrint({
  layout,
  qrSvg,
}: {
  layout: SheetLayout
  qrSvg: string
}) {
  return (
    <div className="print-root space-y-4">
      {layout.pages.map((page) => (
        <div key={page.index} className="sheet-page mx-auto shadow-sm">
          <svg
            viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label={`Attendance sheet ${layout.code} page ${page.index + 1}`}
          >
            <rect x={0} y={0} width={PAGE_W} height={PAGE_H} fill="#ffffff" />

            {/* Registration marks — the scanner aligns to these */}
            {page.marks.map((m, i) => (
              <rect
                key={i}
                x={m.x}
                y={m.y}
                width={m.size}
                height={m.size}
                fill="#000000"
              />
            ))}

            {/* Header — left column of text, QR on the right, all above the table */}
            <text
              x={MARGIN}
              y={MARGIN + 8}
              fontSize={6.2}
              fontWeight={700}
              fontFamily="Helvetica, Arial, sans-serif"
            >
              {layout.institute}
            </text>
            <text
              x={MARGIN}
              y={MARGIN + 14}
              fontSize={3.6}
              fontFamily="Helvetica, Arial, sans-serif"
            >
              Attendance Sheet
            </text>
            <text
              x={MARGIN}
              y={MARGIN + 21}
              fontSize={3.4}
              fontFamily="Helvetica, Arial, sans-serif"
            >
              Class: {layout.className} · Batch: {layout.batch}
            </text>
            <text
              x={MARGIN}
              y={MARGIN + 27}
              fontSize={3.4}
              fontFamily="Helvetica, Arial, sans-serif"
            >
              Date: {layout.date}
              {layout.session ? ` · ${layout.session}` : ''}
            </text>

            {/* QR + code, top-right, clear of the corner registration marks */}
            <g transform={`translate(${PAGE_W - MARGIN - 15}, ${MARGIN + 6})`}>
              <g
                transform="scale(0.1172)"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </g>
            <text
              x={PAGE_W - MARGIN}
              y={MARGIN + 26}
              textAnchor="end"
              fontSize={3.2}
              fontFamily="Courier, monospace"
              letterSpacing={0.4}
            >
              {layout.code}
            </text>

            {/* Table header */}
            <g fontFamily="Helvetica, Arial, sans-serif" fontSize={3.1} fontWeight={700}>
              <rect
                x={COL.roll.x}
                y={TABLE_TOP - 7}
                width={COL.late.x + COL.late.w - COL.roll.x}
                height={7}
                fill="#f1f1f1"
                stroke="#000"
                strokeWidth={0.3}
              />
              <text x={COL.roll.x + 1.5} y={TABLE_TOP - 2.4}>
                Roll
              </text>
              <text x={COL.name.x + 1.5} y={TABLE_TOP - 2.4}>
                Student name
              </text>
              <text x={COL.present.x + COL.present.w / 2} y={TABLE_TOP - 2.4} textAnchor="middle">
                P
              </text>
              <text x={COL.absent.x + COL.absent.w / 2} y={TABLE_TOP - 2.4} textAnchor="middle">
                A
              </text>
              <text x={COL.late.x + COL.late.w / 2} y={TABLE_TOP - 2.4} textAnchor="middle">
                L
              </text>
            </g>

            {/* Rows */}
            {page.rows.map((row, i) => (
              <g key={`${row.rollNo}-${i}`}>
                <rect
                  x={COL.roll.x}
                  y={row.y}
                  width={COL.late.x + COL.late.w - COL.roll.x}
                  height={ROW_H}
                  fill="none"
                  stroke="#000"
                  strokeWidth={0.25}
                />
                <line
                  x1={COL.name.x}
                  y1={row.y}
                  x2={COL.name.x}
                  y2={row.y + ROW_H}
                  stroke="#000"
                  strokeWidth={0.25}
                />
                <line
                  x1={COL.present.x}
                  y1={row.y}
                  x2={COL.present.x}
                  y2={row.y + ROW_H}
                  stroke="#000"
                  strokeWidth={0.25}
                />
                <line
                  x1={COL.absent.x}
                  y1={row.y}
                  x2={COL.absent.x}
                  y2={row.y + ROW_H}
                  stroke="#000"
                  strokeWidth={0.25}
                />
                <line
                  x1={COL.late.x}
                  y1={row.y}
                  x2={COL.late.x}
                  y2={row.y + ROW_H}
                  stroke="#000"
                  strokeWidth={0.25}
                />

                <text
                  x={COL.roll.x + 1.5}
                  y={row.y + ROW_H / 2 + 1.2}
                  fontSize={3.2}
                  fontFamily="Courier, monospace"
                >
                  {row.rollNo}
                </text>
                <text
                  x={COL.name.x + 1.5}
                  y={row.y + ROW_H / 2 + 1.2}
                  fontSize={3.2}
                  fontFamily="Helvetica, Arial, sans-serif"
                >
                  {row.name.length > 34 ? `${row.name.slice(0, 33)}…` : row.name}
                </text>

                {/* Empty boxes for the teacher to tick */}
                {(['present', 'absent', 'late'] as const).map((key) => {
                  const box = row.boxes[key]
                  return (
                    <rect
                      key={key}
                      x={box.x + 3.5}
                      y={box.y + 2}
                      width={box.w - 7}
                      height={box.h - 4}
                      fill="none"
                      stroke="#000"
                      strokeWidth={0.3}
                    />
                  )
                })}
              </g>
            ))}

            {/* Footer */}
            <text
              x={MARGIN}
              y={PAGE_H - MARGIN - 2}
              fontSize={2.8}
              fontFamily="Helvetica, Arial, sans-serif"
              fill="#444"
            >
              Mark one box per student. Keep the four corner squares visible when photographing.
            </text>
            <text
              x={PAGE_W - MARGIN}
              y={PAGE_H - MARGIN - 2}
              textAnchor="end"
              fontSize={2.8}
              fontFamily="Helvetica, Arial, sans-serif"
              fill="#444"
            >
              Page {page.index + 1} of {layout.pages.length}
            </text>
          </svg>
        </div>
      ))}
    </div>
  )
}
