import { useEffect, useState } from 'react'
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  MessageSquare,
  Phone,
  Wallet,
} from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { formatDate, formatDateTime, formatPeriod, inr } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, Spinner, StatusBadge } from '@/components/common'

type Profile = {
  student: {
    id: string
    name: string
    className: string
    batch: string
    rollNo: string | null
    status: string
    admissionDate: string
    parentName: string
    parentPhone: string
    parentEmail: string | null
    feeAmount: number
    feeDueDay: number
    notes: string | null
  }
  attendance: {
    total: number
    present: number
    late: number
    absent: number
    percentage: number
    recent: { id: string; date: string; status: string; session: string }[]
    byMonth: { month: string; present: number; absent: number; late: number }[]
  }
  tests: {
    count: number
    avgPercent: number | null
    best: number | null
    results: {
      id: string
      name: string
      subject: string
      date: string
      maxMarks: number
      marks: number | null
      status: string
      remarks: string | null
      percent: number | null
      published: boolean
    }[]
  }
  fees: {
    billed: number
    paid: number
    outstanding: number
    overdue: number
    invoices: {
      id: string
      period: string
      amount: number
      discount: number
      paidAmount: number
      outstanding: number
      dueDate: string
      status: string
      overdue: boolean
      payments: { id: string; amount: number; method: string; paidAt: string; receiptNo: string | null }[]
    }[]
    payments: { id: string; amount: number; method: string; paidAt: string; receiptNo: string | null }[]
  }
  materials: { id: string; title: string; kind: string; subject: string | null; url: string | null; createdAt: string }[]
  messages: { id: string; template: string; status: string; body: string; createdAt: string }[]
}

export function StudentProfile({
  studentId,
  onClose,
}: {
  studentId: string | null
  onClose: () => void
}) {
  const [data, setData] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) {
      setData(null)
      setError(null)
      return
    }
    let alive = true
    setData(null)
    setError(null)
    api
      .get<Profile>(`/students/${studentId}/profile`)
      .then((res) => {
        if (alive) setData(res)
      })
      .catch((err) => {
        if (alive) setError(errorMessage(err))
      })
    return () => {
      alive = false
    }
  }, [studentId])

  return (
    <Dialog open={Boolean(studentId)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{data?.student.name ?? 'Student profile'}</DialogTitle>
          <DialogDescription>
            {data
              ? `${data.student.className} · ${data.student.batch}${data.student.rollNo ? ` · Roll ${data.student.rollNo}` : ''}`
              : 'Loading the consolidated record…'}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!data && !error ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Spinner /> Loading profile…
          </div>
        ) : null}

        {data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Attendance', value: `${data.attendance.percentage}%` },
                {
                  label: 'Avg score',
                  value: data.tests.avgPercent === null ? '—' : `${data.tests.avgPercent}%`,
                },
                { label: 'Outstanding', value: inr(data.fees.outstanding) },
                { label: 'Tests', value: data.tests.count },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border bg-card p-2.5 text-center">
                  <p className="text-base font-semibold tabular-nums">{s.value}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            <Tabs defaultValue="overview">
              <TabsList className="flex-wrap">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="tests">Tests</TabsTrigger>
                <TabsTrigger value="fees">Fees</TabsTrigger>
                <TabsTrigger value="more">Materials & messages</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3">
                <section className="rounded-lg border bg-card p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Admission
                  </h3>
                  <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
                    <Row label="Admitted" value={formatDate(data.student.admissionDate)} />
                    <Row label="Status" value={<StatusBadge status={data.student.status} />} />
                    <Row label="Monthly fee" value={inr(data.student.feeAmount)} />
                    <Row label="Fee due day" value={`Day ${data.student.feeDueDay}`} />
                  </dl>
                </section>

                <section className="rounded-lg border bg-card p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Parent contact
                  </h3>
                  <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
                    <Row label="Name" value={data.student.parentName} />
                    <Row
                      label="WhatsApp"
                      value={
                        <a
                          href={`tel:${data.student.parentPhone}`}
                          className="inline-flex items-center gap-1 text-primary"
                        >
                          <Phone className="size-3" />
                          {data.student.parentPhone}
                        </a>
                      }
                    />
                    <Row label="Email" value={data.student.parentEmail ?? '—'} />
                  </dl>
                  {data.student.notes ? (
                    <p className="mt-2 rounded-md bg-secondary/60 p-2 text-xs text-muted-foreground">
                      {data.student.notes}
                    </p>
                  ) : null}
                </section>
              </TabsContent>

              <TabsContent value="attendance" className="space-y-3">
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                    {data.attendance.present} present
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                    {data.attendance.late} late
                  </span>
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                    {data.attendance.absent} absent
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">
                    {data.attendance.total} records
                  </span>
                </div>

                {data.attendance.byMonth.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border">
                    <div className="grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] gap-2 border-b bg-secondary/50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span>Month</span>
                      <span className="text-right">P</span>
                      <span className="text-right">L</span>
                      <span className="text-right">A</span>
                    </div>
                    {data.attendance.byMonth.map((m) => (
                      <div key={m.month} className="grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] gap-2 px-3 py-1.5 text-sm">
                        <span>{formatPeriod(m.month)}</span>
                        <span className="text-right tabular-nums">{m.present}</span>
                        <span className="text-right tabular-nums">{m.late}</span>
                        <span className="text-right tabular-nums">{m.absent}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No attendance recorded yet" />
                )}

                <div className="overflow-hidden rounded-lg border">
                  <div className="max-h-56 divide-y overflow-y-auto">
                    {data.attendance.recent.map((r) => (
                      <div key={r.id} className="flex items-center justify-between px-3 py-1.5">
                        <span className="text-sm">
                          {formatDate(r.date)}
                          {r.session ? (
                            <span className="text-[11px] text-muted-foreground"> · {r.session}</span>
                          ) : null}
                        </span>
                        <StatusBadge status={r.status} />
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tests" className="space-y-3">
                {data.tests.results.length === 0 ? (
                  <EmptyState title="No test results yet" />
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <div className="grid grid-cols-[1fr_4rem_4rem] gap-2 border-b bg-secondary/50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span>Test</span>
                      <span className="text-right">Marks</span>
                      <span className="text-right">%</span>
                    </div>
                    <div className="max-h-72 divide-y overflow-y-auto">
                      {data.tests.results.map((r) => (
                        <div
                          key={r.id}
                          className="grid grid-cols-[1fr_4rem_4rem] items-center gap-2 px-3 py-1.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm">{r.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {r.subject} · {formatDate(r.date)}
                              {r.published ? '' : ' · draft'}
                            </p>
                          </div>
                          <span className="text-right text-sm tabular-nums">
                            {r.marks === null ? (
                              <span className="text-[11px] capitalize text-muted-foreground">
                                {r.status}
                              </span>
                            ) : (
                              `${r.marks}/${r.maxMarks}`
                            )}
                          </span>
                          <span
                            className={cn(
                              'text-right text-sm tabular-nums',
                              r.percent !== null && r.percent < 40 && 'text-destructive',
                            )}
                          >
                            {r.percent === null ? '—' : `${r.percent}%`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="fees" className="space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    { label: 'Billed', value: inr(data.fees.billed) },
                    { label: 'Paid', value: inr(data.fees.paid) },
                    { label: 'Outstanding', value: inr(data.fees.outstanding) },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border bg-card p-2.5 text-center">
                      <p className="text-sm font-semibold tabular-nums">{s.value}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>

                {data.fees.invoices.length === 0 ? (
                  <EmptyState title="No invoices yet" />
                ) : (
                  <div className="space-y-2">
                    {data.fees.invoices.map((i) => (
                      <div key={i.id} className="rounded-lg border bg-card p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{formatPeriod(i.period)}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Due {formatDate(i.dueDate)}
                              {i.discount ? ` · ${inr(i.discount)} concession` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm tabular-nums">{inr(i.amount)}</p>
                            <p
                              className={cn(
                                'text-[11px]',
                                i.outstanding > 0 ? 'text-amber-600' : 'text-muted-foreground',
                              )}
                            >
                              {i.outstanding > 0 ? `${inr(i.outstanding)} due` : 'Settled'}
                            </p>
                          </div>
                        </div>
                        {i.payments.length > 0 ? (
                          <ul className="mt-1.5 space-y-0.5 border-t pt-1.5">
                            {i.payments.map((p) => (
                              <li
                                key={p.id}
                                className="flex items-center justify-between text-[11px] text-muted-foreground"
                              >
                                <span>
                                  {formatDate(p.paidAt)} · {p.method}
                                  {p.receiptNo ? ` · ${p.receiptNo}` : ''}
                                </span>
                                <span className="tabular-nums">{inr(p.amount)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="more" className="space-y-3">
                <section>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <BookOpen className="size-3.5" /> Study materials
                  </h3>
                  {data.materials.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                      Nothing shared with this batch yet.
                    </p>
                  ) : (
                    <ul className="divide-y overflow-hidden rounded-lg border">
                      {data.materials.map((m) => (
                        <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm">{m.title}</p>
                            <p className="text-[11px] capitalize text-muted-foreground">
                              {m.kind}
                              {m.subject ? ` · ${m.subject}` : ''} · {formatDate(m.createdAt)}
                            </p>
                          </div>
                          {m.url ? (
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-primary"
                            >
                              Open
                            </a>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <MessageSquare className="size-3.5" /> Communication
                  </h3>
                  {data.messages.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                      No messages sent to this parent yet.
                    </p>
                  ) : (
                    <ul className="divide-y overflow-hidden rounded-lg border">
                      {data.messages.map((m) => (
                        <li key={m.id} className="px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] capitalize text-muted-foreground">
                              {m.template.replace('_', ' ')} · {formatDateTime(m.createdAt)}
                            </span>
                            <StatusBadge status={m.status} />
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {m.body}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap items-center gap-3 border-t pt-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarCheck className="size-3.5" /> {data.attendance.total} attendance records
              </span>
              <span className="inline-flex items-center gap-1">
                <ClipboardList className="size-3.5" /> {data.tests.count} test results
              </span>
              <span className="inline-flex items-center gap-1">
                <Wallet className="size-3.5" /> {data.fees.payments.length} payments
              </span>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-dashed pb-1">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm">{value}</dd>
    </div>
  )
}
