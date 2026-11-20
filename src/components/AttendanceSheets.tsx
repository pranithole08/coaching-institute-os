import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  FileText,
  Printer,
  QrCode,
  ScanLine,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { api, ApiError, errorMessage } from '@/lib/api'
import { formatDate, todayIso } from '@/lib/format'
import { cn } from '@/lib/cn'
import { buildLayout, COL, PAGE_H, ROW_H, type SheetLayout } from '@/lib/sheetLayout'
import {
  compressImage,
  cropRegion,
  decodeSheetCode,
  fileToDataUrl,
  renderPdfPages,
  scanSheetImage,
  type Detection,
} from '@/lib/scan'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AttendanceSheetPrint } from '@/components/AttendanceSheetPrint'
import {
  ConfirmDialog,
  EmptyState,
  Field,
  Spinner,
  StatusBadge,
  useToast,
} from '@/components/common'

type SheetRow = {
  id: string
  studentId: string | null
  studentName: string | null
  rollNo: string | null
  parentPhone: string | null
  detectedStatus: string | null
  confidence: number
  finalStatus: string | null
  verified: boolean
  needsReview: boolean
  note: string | null
}

type SheetDetail = {
  sheet: {
    id: string
    code: string
    className: string
    batch: string
    date: string
    session: string
    status: string
    createdBy: string | null
    uploadedBy: string | null
    reviewedBy: string | null
    confirmedBy: string | null
    confirmedAt: string | null
    hasImage: boolean
    notes: string | null
  }
  rows: SheetRow[]
  summary: {
    total: number
    present: number
    absent: number
    late: number
    needsReview: number
    unmatched: number
    unmarked: number
  }
  qrSvg?: string
}

type SheetListItem = {
  id: string
  code: string
  className: string
  batch: string
  date: string
  session: string
  status: string
  rowCount: number
  confirmedBy: string | null
  confirmedAt: string | null
}

const STATUS_TONE: Record<string, string> = {
  generated: 'bg-secondary text-muted-foreground',
  uploaded: 'bg-amber-50 text-amber-700',
  reviewed: 'bg-primary/10 text-primary',
  confirmed: 'bg-primary/15 text-primary',
}

export function AttendanceSheets({
  meta,
  onConfirmed,
}: {
  meta: {
    classes: string[]
    batches: string[]
    pairs: { className: string; batch: string; students: number }[]
  }
  onConfirmed: () => void
}) {
  const { toast } = useToast()
  const [sheets, setSheets] = useState<SheetListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [genOpen, setGenOpen] = useState(false)
  const [gen, setGen] = useState({ className: '', batch: '', date: todayIso(), session: '' })
  const [genBusy, setGenBusy] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const [detail, setDetail] = useState<SheetDetail | null>(null)
  const [printOpen, setPrintOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanAnyOpen, setScanAnyOpen] = useState(false)
  const [deleting, setDeleting] = useState<SheetListItem | null>(null)
  const [filters, setFilters] = useState({ className: 'all', batch: 'all', status: 'all' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.className !== 'all') params.set('className', filters.className)
      if (filters.batch !== 'all') params.set('batch', filters.batch)
      if (filters.status !== 'all') params.set('status', filters.status)
      const qs = params.toString()
      const res = await api.get<{ sheets: SheetListItem[] }>(`/sheets${qs ? `?${qs}` : ''}`)
      setSheets(res.sheets)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  const batchesForClass = useMemo(() => {
    if (!gen.className) return meta.batches
    const fromPairs = meta.pairs.filter((p) => p.className === gen.className).map((p) => p.batch)
    return fromPairs.length > 0 ? fromPairs : meta.batches
  }, [gen.className, meta.batches, meta.pairs])

  const filterBatches = useMemo(() => {
    if (filters.className === 'all') return meta.batches
    const fromPairs = meta.pairs.filter((p) => p.className === filters.className).map((p) => p.batch)
    return fromPairs.length > 0 ? fromPairs : meta.batches
  }, [filters.className, meta.batches, meta.pairs])

  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        className: string
        batch: string
        sheets: SheetListItem[]
        open: number
        confirmed: number
        students: number
      }
    >()
    for (const s of sheets) {
      const key = `${s.className}|||${s.batch}`
      const group =
        map.get(key) ??
        {
          className: s.className,
          batch: s.batch,
          sheets: [],
          open: 0,
          confirmed: 0,
          students: meta.pairs.find((p) => p.className === s.className && p.batch === s.batch)?.students ?? 0,
        }
      group.sheets.push(s)
      if (s.status === 'confirmed') group.confirmed += 1
      else group.open += 1
      map.set(key, group)
    }
    return [...map.values()].sort(
      (a, b) => a.className.localeCompare(b.className) || a.batch.localeCompare(b.batch),
    )
  }, [sheets, meta.pairs])

  async function openSheet(id: string) {
    try {
      const res = await api.get<SheetDetail>(`/sheets/${id}`)
      setDetail(res)
    } catch (err) {
      toast('Could not open sheet', { variant: 'error', description: errorMessage(err) })
    }
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    setGenError(null)
    if (!gen.className || !gen.batch) {
      setGenError('Pick a class and batch')
      return
    }
    setGenBusy(true)
    try {
      const res = await api.post<SheetDetail>('/sheets', gen)
      setGenOpen(false)
      setDetail(res)
      setPrintOpen(true)
      toast('Sheet generated', {
        variant: 'success',
        description: `${res.rows.length} students · ${res.sheet.code}`,
      })
      await load()
    } catch (err) {
      setGenError(errorMessage(err))
    } finally {
      setGenBusy(false)
    }
  }

  async function remove() {
    if (!deleting) return
    try {
      await api.del(`/sheets/${deleting.id}`)
      toast('Sheet deleted', { variant: 'success' })
      setDeleting(null)
      await load()
    } catch (err) {
      toast('Could not delete sheet', { variant: 'error', description: errorMessage(err) })
    }
  }

  const layout: SheetLayout | null = useMemo(() => {
    if (!detail) return null
    return buildLayout({
      code: detail.sheet.code,
      className: detail.sheet.className,
      batch: detail.sheet.batch,
      date: detail.sheet.date,
      session: detail.sheet.session,
      institute: 'Attendance',
      students: detail.rows.map((r) => ({ rollNo: r.rollNo, name: r.studentName ?? '—' })),
    })
  }, [detail])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Print a sheet per batch, mark it on paper, then scan it back. Nothing is saved until you
          confirm.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setScanAnyOpen(true)}>
            <ScanLine className="size-4" />
            Scan a sheet
          </Button>
          <Button size="sm" onClick={() => setGenOpen(true)}>
            <Printer className="size-4" />
            Generate sheet
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Field label="Class">
          <Select
            value={filters.className}
            onValueChange={(v) => setFilters({ ...filters, className: v, batch: 'all' })}
          >
            <SelectTrigger aria-label="Filter sheets by class">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {meta.classes.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Batch">
          <Select value={filters.batch} onValueChange={(v) => setFilters({ ...filters, batch: v })}>
            <SelectTrigger aria-label="Filter sheets by batch">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All batches</SelectItem>
              {filterBatches.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger aria-label="Filter sheets by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sheets</SelectItem>
              <SelectItem value="open">Not confirmed</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Spinner /> Loading sheets…
        </div>
      ) : sheets.length === 0 ? (
        <EmptyState
          title={filters.className === 'all' && filters.batch === 'all' && filters.status === 'all'
            ? 'No attendance sheets yet'
            : 'No sheets match these filters'}
          description="Generate a printable sheet for a class and batch to start the paper workflow."
          action={
            <Button size="sm" onClick={() => setGenOpen(true)}>
              <Printer className="size-4" /> Generate sheet
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <section key={`${g.className}|||${g.batch}`} className="overflow-hidden rounded-xl border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-secondary/40 px-3 py-2 sm:px-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">
                    {g.className} · {g.batch}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {g.students > 0 ? `${g.students} active students · ` : ''}
                    {g.open} open · {g.confirmed} confirmed
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => {
                    setGen({ className: g.className, batch: g.batch, date: todayIso(), session: '' })
                    setGenError(null)
                    setGenOpen(true)
                  }}
                >
                  <Printer className="size-3.5" /> New sheet
                </Button>
              </div>
              <ul className="divide-y">
                {g.sheets.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{formatDate(s.date)}</p>
                        {s.session ? (
                          <span className="text-[11px] text-muted-foreground">{s.session}</span>
                        ) : null}
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
                            STATUS_TONE[s.status] ?? 'bg-secondary text-muted-foreground',
                          )}
                        >
                          {s.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {s.rowCount} students · <span className="font-mono">{s.code}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-8" onClick={() => openSheet(s.id)}>
                        Open
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleting(s)}
                        aria-label={`Delete ${s.code}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Generate */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate attendance sheet</DialogTitle>
            <DialogDescription>
              Uses the students actually registered in the selected batch.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={generate} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Class">
                <Select
                  value={gen.className}
                  onValueChange={(v) => setGen({ ...gen, className: v, batch: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {meta.classes.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Batch">
                <Select
                  value={gen.batch}
                  onValueChange={(v) => setGen({ ...gen, batch: v })}
                  disabled={!gen.className}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batchesForClass.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={gen.date}
                  onChange={(e) => setGen({ ...gen, date: e.target.value })}
                />
              </Field>
              <Field label="Subject / session" hint="Optional">
                <Input
                  value={gen.session}
                  onChange={(e) => setGen({ ...gen, session: e.target.value })}
                  placeholder="Mathematics"
                />
              </Field>
            </div>
            {genError ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {genError}
              </p>
            ) : null}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setGenOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={genBusy}>
                {genBusy ? 'Generating…' : 'Generate & print'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sheet detail */}
      <Dialog open={Boolean(detail) && !printOpen && !scanOpen} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detail?.sheet.className} · {detail?.sheet.batch}
            </DialogTitle>
            <DialogDescription>
              {detail ? `${formatDate(detail.sheet.date)} · ${detail.sheet.code}` : ''}
            </DialogDescription>
          </DialogHeader>

          {detail ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: 'Present', value: detail.summary.present },
                  { label: 'Absent', value: detail.summary.absent },
                  { label: 'Late', value: detail.summary.late },
                  { label: 'Needs review', value: detail.summary.needsReview },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border bg-card p-2.5 text-center">
                    <p className="text-lg font-semibold tabular-nums">{s.value}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setPrintOpen(true)}>
                  <Printer className="size-4" /> Print
                </Button>
                <Button size="sm" onClick={() => setScanOpen(true)}>
                  <ScanLine className="size-4" /> Scan sheet
                </Button>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <div className="grid grid-cols-[3.5rem_1fr_5rem_5rem] gap-2 border-b bg-secondary/50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Roll</span>
                  <span>Student</span>
                  <span>Detected</span>
                  <span>Final</span>
                </div>
                <div className="max-h-64 divide-y overflow-y-auto">
                  {detail.rows.map((r) => (
                    <div
                      key={r.id}
                      className="grid grid-cols-[3.5rem_1fr_5rem_5rem] items-center gap-2 px-3 py-1.5"
                    >
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {r.rollNo ?? '—'}
                      </span>
                      <span className="truncate text-sm">{r.studentName ?? 'Unmatched'}</span>
                      <span className="text-[11px] capitalize text-muted-foreground">
                        {r.detectedStatus ?? '—'}
                        {r.detectedStatus ? (
                          <span className="ml-1 text-[10px]">
                            {Math.round(r.confidence * 100)}%
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[11px] capitalize">
                        {r.finalStatus ?? <span className="text-amber-600">pending</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {detail.sheet.confirmedBy ? (
                <p className="text-[11px] text-muted-foreground">
                  Confirmed by {detail.sheet.confirmedBy}
                  {detail.sheet.confirmedAt ? ` on ${formatDate(detail.sheet.confirmedAt)}` : ''}.
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Print overlay */}
      {printOpen && detail && layout ? (
        <div className="print-overlay fixed inset-0 z-50 overflow-auto bg-secondary/60 p-4">
          <div className="mx-auto max-w-3xl space-y-3">
            <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
              <div>
                <p className="text-sm font-medium">Print preview</p>
                <p className="text-[11px] text-muted-foreground">
                  A4 portrait · {layout.pages.length} page(s) · keep the corner squares visible
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPrintOpen(false)}>
                  Close
                </Button>
                <Button size="sm" onClick={() => window.print()}>
                  <Printer className="size-4" /> Print
                </Button>
              </div>
            </div>
            <AttendanceSheetPrint layout={layout} qrSvg={detail.qrSvg ?? ''} />
          </div>
        </div>
      ) : null}

      {/* Scan + verify */}
      {scanOpen && detail ? (
        <ScanDialog
          detail={detail}
          onClose={() => setScanOpen(false)}
          onSaved={async () => {
            setScanOpen(false)
            await openSheet(detail.sheet.id)
            await load()
            onConfirmed()
          }}
        />
      ) : null}

      {/* Scan a paper sheet without opening it first — the QR identifies the batch */}
      {scanAnyOpen ? (
        <ScanDialog
          detail={null}
          onClose={() => setScanAnyOpen(false)}
          onSaved={async () => {
            setScanAnyOpen(false)
            await load()
            onConfirmed()
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete sheet ${deleting?.code ?? ''}?`}
        description="The sheet and its scanned rows are removed. Attendance already confirmed from it is kept."
        confirmLabel="Delete sheet"
        destructive
        onConfirm={remove}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scan dialog
// ---------------------------------------------------------------------------

function ScanDialog({
  detail: initialDetail,
  onClose,
  onSaved,
}: {
  detail: SheetDetail | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const pagesRef = useRef<string[] | null>(null)
  const [sheet, setSheet] = useState<SheetDetail | null>(initialDetail)
  const [phase, setPhase] = useState<'upload' | 'identifying' | 'pick' | 'scanning' | 'verify'>(
    'upload',
  )
  const [message, setMessage] = useState<string | null>(null)
  const [warped, setWarped] = useState<string | null>(null)
  const [rows, setRows] = useState<SheetRow[]>(initialDetail?.rows ?? [])
  const [busy, setBusy] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<'present' | 'absent' | 'late'>('present')
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [notify, setNotify] = useState(true)
  const [conflicts, setConflicts] = useState<
    { studentId: string; name: string; existing: string; incoming: string }[] | null
  >(null)
  const [openSheets, setOpenSheets] = useState<SheetListItem[]>([])
  const [aiBusy, setAiBusy] = useState(false)
  const [aiModel, setAiModel] = useState<string | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<
    Record<string, { status: string | null; raw: string }>
  >({})

  const layout = useMemo(() => {
    if (!sheet) return null
    return buildLayout({
      code: sheet.sheet.code,
      className: sheet.sheet.className,
      batch: sheet.sheet.batch,
      date: sheet.sheet.date,
      session: sheet.sheet.session,
      institute: 'Attendance',
      students: sheet.rows.map((r) => ({ rollNo: r.rollNo, name: r.studentName ?? '—' })),
    })
  }, [sheet])

  const pending = rows.filter((r) => !r.finalStatus)
  const reviewCount = rows.filter((r) => r.needsReview && !r.verified).length

  async function runDetection(target: SheetDetail, pages: string[]) {
    const targetLayout = buildLayout({
      code: target.sheet.code,
      className: target.sheet.className,
      batch: target.sheet.batch,
      date: target.sheet.date,
      session: target.sheet.session,
      institute: 'Attendance',
      students: target.rows.map((r) => ({ rollNo: r.rollNo, name: r.studentName ?? '—' })),
    })

    setPhase('scanning')
    const allDetections: Detection[] = []
    let lastWarped: string | null = null
    let lastMessage = ''

    for (let i = 0; i < pages.length; i += 1) {
      const result = await scanSheetImage(pages[i], targetLayout, 0)
      allDetections.push(...result.detections)
      if (result.warpedDataUrl) lastWarped = result.warpedDataUrl
      lastMessage = result.message
    }

    setWarped(lastWarped)

    const detections = allDetections.map((d) => ({
      rollNo: d.rollNo,
      status: d.status,
      confidence: d.confidence,
    }))

    const res = await api.post<SheetDetail & { matched: number; flagged: number; unmatched: number }>(
      `/sheets/${target.sheet.id}/upload`,
      {
        imageData: lastWarped ? await compressImage(lastWarped, 1200, 0.7) : undefined,
        detections,
      },
    )

    setSheet({ ...target, ...res })
    setRows(res.rows)
    setPhase('verify')
    setMessage(`${lastMessage} ${res.matched} row(s) matched, ${res.flagged} need your review.`)
  }

  async function handleFile(file: File) {
    setMessage(null)
    setPhase('identifying')
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      const pages = isPdf ? await renderPdfPages(file) : [await fileToDataUrl(file)]
      pagesRef.current = pages

      if (sheet) {
        await runDetection(sheet, pages)
        return
      }

      const code = await decodeSheetCode(pages[0])
      if (code) {
        try {
          const found = await api.get<SheetDetail>(`/sheets/by-code/${encodeURIComponent(code)}`)
          setSheet(found)
          setRows(found.rows)
          await runDetection(found, pages)
          return
        } catch (err) {
          setMessage(`${errorMessage(err)} Pick the batch below instead.`)
        }
      } else {
        setMessage('Could not read the QR code on this sheet. Pick the batch it belongs to below.')
      }

      const list = await api.get<{ sheets: SheetListItem[] }>('/sheets?status=open')
      setOpenSheets(list.sheets)
      setPhase('pick')
    } catch (err) {
      setPhase('upload')
      setMessage(errorMessage(err))
    }
  }

  async function pickSheet(item: SheetListItem) {
    setPhase('identifying')
    setMessage(null)
    try {
      const found = await api.get<SheetDetail>(`/sheets/${item.id}`)
      setSheet(found)
      setRows(found.rows)
      const pages = pagesRef.current
      if (!pages) {
        setPhase('upload')
        return
      }
      await runDetection(found, pages)
    } catch (err) {
      setPhase('pick')
      setMessage(errorMessage(err))
    }
  }

  async function askAi() {
    if (!sheet || !warped || !layout) return
    const flagged = rows.filter((r) => r.needsReview && !r.verified)
    if (flagged.length === 0) return

    setAiBusy(true)
    try {
      const payload: { rowId: string; image: string }[] = []
      for (const r of flagged.slice(0, 12)) {
        const rowLayout = layout.pages[0]?.rows.find((x) => x.rollNo === r.rollNo)
        if (!rowLayout) continue
        const image = await cropRegion(warped, {
          x: COL.roll.x,
          y: rowLayout.y,
          w: COL.late.x + COL.late.w - COL.roll.x,
          h: ROW_H,
        })
        if (image) payload.push({ rowId: r.id, image })
      }
      if (payload.length === 0) {
        toast('Nothing to re-read', {
          variant: 'error',
          description: 'The scanned rows could not be cropped from the aligned page.',
        })
        return
      }

      const res = await api.post<{
        suggestions: { rowId: string; status: string | null; raw: string }[]
        model: string
      }>(`/sheets/${sheet.sheet.id}/ai-assist`, { rows: payload })

      const map: Record<string, { status: string | null; raw: string }> = {}
      for (const s of res.suggestions) map[s.rowId] = { status: s.status, raw: s.raw }
      setAiSuggestions(map)
      setAiModel(res.model)
      toast('Local AI re-read the unclear rows', {
        variant: 'success',
        description: 'Accept a suggestion to apply it — nothing is saved automatically.',
      })
    } catch (err) {
      toast('Local AI could not help', { variant: 'error', description: errorMessage(err) })
    } finally {
      setAiBusy(false)
    }
  }

  async function setRowStatus(row: SheetRow, status: 'present' | 'absent' | 'late') {
    setBusy(true)
    try {
      if (!sheet) return
      await api.patch(`/sheets/${sheet.sheet.id}/rows/${row.id}`, { status })
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, finalStatus: status, verified: true, needsReview: false } : r,
        ),
      )
    } catch (err) {
      toast('Could not update row', { variant: 'error', description: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  async function applyBulk() {
    setBusy(true)
    try {
      const res = await api.post<SheetDetail & { updated: number }>(
        `/sheets/${sheet?.sheet.id}/rows/bulk`,
        { status: bulkStatus, confirm: true },
      )
      setRows(res.rows)
      setBulkConfirm(false)
      toast(`${res.updated} blank row(s) set to ${bulkStatus}`, { variant: 'success' })
    } catch (err) {
      toast('Could not update rows', { variant: 'error', description: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  async function confirm(overwrite = false) {
    setBusy(true)
    try {
      const res = await api.post<{
        created: number
        updated: number
        unchanged: number
        notified: number
      }>(`/sheets/${sheet?.sheet.id}/confirm`, { confirm: true, overwrite, notify })
      toast('Attendance saved', {
        variant: 'success',
        description: `${res.created} new, ${res.updated} corrected, ${res.notified} parent(s) notified.`,
      })
      setConfirmOpen(false)
      onSaved()
    } catch (err) {
      const payload = err instanceof ApiError ? (err.payload as { conflicts?: typeof conflicts }) : null
      if (payload?.conflicts && payload.conflicts.length > 0) {
        setConflicts(payload.conflicts)
        setConfirmOpen(false)
        toast('Some students already have attendance for this date', {
          variant: 'error',
          description: 'Review the conflicts, then confirm the overwrite.',
        })
      } else {
        toast('Could not save attendance', { variant: 'error', description: errorMessage(err) })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Scan attendance sheet</DialogTitle>
          <DialogDescription>
            {sheet
              ? `${sheet.sheet.className} · ${sheet.sheet.batch} · ${formatDate(sheet.sheet.date)} · `
              : 'Upload the marked sheet — the QR tells us which batch it is.'}
            {sheet ? <span className="font-mono">{sheet.sheet.code}</span> : null}
          </DialogDescription>
        </DialogHeader>

        {phase === 'upload' ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-dashed p-6 text-center">
              <ScanLine className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Upload the filled sheet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Photo or PDF. Keep all four corner squares in frame.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="size-4" /> Choose file
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (fileRef.current) {
                      fileRef.current.setAttribute('capture', 'environment')
                      fileRef.current.click()
                    }
                  }}
                >
                  <Camera className="size-4" /> Camera
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                  e.target.value = ''
                }}
              />
            </div>
            {message ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {message}
              </p>
            ) : null}
            <p className="text-[11px] text-muted-foreground">
              The scanner aligns the page using the corner marks, then reads the P / A / L boxes.
              Anything unclear is flagged for you to check.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {phase === 'identifying' ? (
          <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
            <Spinner className="size-6" />
            Reading the sheet code…
          </div>
        ) : null}

        {phase === 'pick' ? (
          <div className="space-y-3">
            {message ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{message}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Pick the batch this paper belongs to. Only sheets that are not confirmed yet are
              listed.
            </p>
            {openSheets.length === 0 ? (
              <EmptyState
                title="No open sheets"
                description="Generate a sheet for the batch first, then scan it."
              />
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {Object.entries(
                  openSheets.reduce<Record<string, SheetListItem[]>>((acc, s) => {
                    const key = `${s.className} · ${s.batch}`
                    acc[key] = acc[key] ?? []
                    acc[key].push(s)
                    return acc
                  }, {}),
                ).map(([label, items]) => (
                  <div key={label} className="overflow-hidden rounded-lg border">
                    <p className="border-b bg-secondary/40 px-3 py-1.5 text-[11px] font-semibold">
                      {label}
                    </p>
                    <ul className="divide-y">
                      {items.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => pickSheet(s)}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-secondary/50"
                          >
                            <span className="text-sm">{formatDate(s.date)}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {s.rowCount} students · <span className="font-mono">{s.code}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPhase('upload')}>
                Back
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {phase === 'scanning' ? (
          <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
            <Spinner className="size-6" />
            Aligning the sheet and reading the boxes…
          </div>
        ) : null}

        {phase === 'verify' ? (
          <div className="space-y-3">
            {message ? (
              <p className="rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
                {message}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                {rows.filter((r) => r.finalStatus === 'present').length} present
              </span>
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                {rows.filter((r) => r.finalStatus === 'absent').length} absent
              </span>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                {rows.filter((r) => r.finalStatus === 'late').length} late
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
                {pending.length} pending
              </span>
              {reviewCount > 0 ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                  {reviewCount} to verify
                </span>
              ) : null}
            </div>

            {reviewCount > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  {aiModel
                    ? `Local AI (${aiModel}) re-read the unclear rows. Accept a suggestion to apply it.`
                    : 'Unclear rows? A local Ollama vision model can take a second look.'}
                </p>
                <Button size="sm" variant="outline" className="h-8" disabled={aiBusy} onClick={askAi}>
                  {aiBusy ? <Spinner className="size-3.5" /> : <Sparkles className="size-3.5" />}
                  {aiBusy ? 'Asking…' : 'Ask local AI'}
                </Button>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[3.5rem_1fr_4.5rem_7.5rem] gap-2 border-b bg-secondary/50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <span>Roll</span>
                <span>Student</span>
                <span>Read</span>
                <span>Set</span>
              </div>
              <div className="max-h-72 divide-y overflow-y-auto">
                {rows.map((r) => {
                  const rowLayout = layout?.pages[0]?.rows.find((x) => x.rollNo === r.rollNo)
                  const flagged = r.needsReview && !r.verified
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        'grid grid-cols-[3.5rem_1fr_4.5rem_7.5rem] items-center gap-2 px-3 py-1.5',
                        flagged && 'bg-amber-50/60',
                      )}
                    >
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {r.rollNo ?? '—'}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{r.studentName ?? 'Unmatched'}</p>
                        {flagged ? (
                          <p className="text-[10px] text-amber-700">
                            {r.detectedStatus
                              ? `Unclear — read as ${r.detectedStatus} (${Math.round(r.confidence * 100)}%)`
                              : 'No mark detected'}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-[11px] capitalize text-muted-foreground">
                        {r.detectedStatus ?? '—'}
                      </span>
                      <div className="flex gap-1">
                        {(['present', 'absent', 'late'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            disabled={busy}
                            onClick={() => setRowStatus(r, st)}
                            className={cn(
                              'flex-1 rounded border px-1 py-1 text-[10px] font-medium uppercase transition-colors',
                              r.finalStatus === st
                                ? st === 'absent'
                                  ? 'border-destructive bg-destructive/10 text-destructive'
                                  : 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:bg-secondary',
                            )}
                          >
                            {st[0].toUpperCase()}
                          </button>
                        ))}
                      </div>
                      {flagged && warped && rowLayout ? (
                        <div className="col-span-4 -mt-1 mb-1 flex items-center gap-2">
                          <div
                            className="h-9 w-40 shrink-0 overflow-hidden rounded border bg-white"
                            style={{
                              backgroundImage: `url(${warped})`,
                              backgroundSize: '100% auto',
                              backgroundPositionY: `-${(rowLayout.y / PAGE_H) * 100 * (297 / 210)}%`,
                              backgroundRepeat: 'no-repeat',
                            }}
                            aria-label={`Scanned row for ${r.studentName}`}
                          />
                          <span className="text-[10px] text-muted-foreground">
                            Compare with the paper sheet
                          </span>
                        </div>
                      ) : null}
                      {flagged && aiSuggestions[r.id] ? (
                        <div className="col-span-4 -mt-1 mb-1 flex flex-wrap items-center gap-2 text-[10px]">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Sparkles className="size-3" />
                            AI read:
                          </span>
                          {aiSuggestions[r.id].status ? (
                            <>
                              <span className="font-medium capitalize">
                                {aiSuggestions[r.id].status}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px]"
                                disabled={busy}
                                onClick={() =>
                                  setRowStatus(
                                    r,
                                    aiSuggestions[r.id].status as 'present' | 'absent' | 'late',
                                  )
                                }
                              >
                                Accept
                              </Button>
                            </>
                          ) : (
                            <span className="text-muted-foreground">
                              no clear mark ({aiSuggestions[r.id].raw || 'no answer'})
                            </span>
                          )}
                          <button
                            type="button"
                            className="text-muted-foreground underline-offset-2 hover:underline"
                            onClick={() =>
                              setAiSuggestions((prev) => {
                                const next = { ...prev }
                                delete next[r.id]
                                return next
                              })
                            }
                          >
                            dismiss
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            {pending.length > 0 ? (
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium">
                  {pending.length} row(s) still have no status
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Select
                    value={bulkStatus}
                    onValueChange={(v) => setBulkStatus(v as 'present' | 'absent' | 'late')}
                  >
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-1.5 text-[11px]">
                    <input
                      type="checkbox"
                      checked={bulkConfirm}
                      onChange={(e) => setBulkConfirm(e.target.checked)}
                      className="size-3.5 accent-[var(--primary)]"
                    />
                    I want to set all remaining blank rows
                  </label>
                  <Button size="sm" variant="outline" disabled={!bulkConfirm || busy} onClick={applyBulk}>
                    Apply
                  </Button>
                </div>
              </div>
            ) : null}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={pending.length > 0 || busy}
              >
                <CheckCircle2 className="size-4" />
                Preview & save
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Save attendance</DialogTitle>
              <DialogDescription>
                {rows.filter((r) => r.finalStatus === 'present').length} present ·{' '}
                {rows.filter((r) => r.finalStatus === 'absent').length} absent ·{' '}
                {rows.filter((r) => r.finalStatus === 'late').length} late
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <label className="flex items-start gap-2 rounded-lg border bg-secondary/30 p-3">
                <input
                  type="checkbox"
                  checked={notify}
                  onChange={(e) => setNotify(e.target.checked)}
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                />
                <span className="text-xs">
                  <span className="font-medium">Notify parents of absent students</span>
                  <span className="mt-0.5 block text-muted-foreground">
                    One WhatsApp message per student per day. Re-uploads never send duplicates.
                  </span>
                </span>
              </label>
              {conflicts ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Some students already have attendance for this date. Confirming will overwrite
                    it and is recorded in the audit trail.
                  </span>
                </div>
              ) : null}
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Back
                </Button>
                <Button onClick={() => confirm(Boolean(conflicts))} disabled={busy}>
                  {busy ? 'Saving…' : conflicts ? 'Overwrite & save' : 'Confirm & save'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
