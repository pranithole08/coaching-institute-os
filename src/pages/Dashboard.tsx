import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  MessageSquare,
  Users,
  Wallet,
} from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { formatDate, formatPeriod, inr, relativeTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { PageHeader, StatCard, StatusBadge, EmptyState, Spinner } from '@/components/common'
import type { RouteKey } from '@/components/AppShell'

type DashboardData = {
  stats: {
    totalStudents: number
    inactiveStudents: number
    attendance: {
      date: string
      present: number
      absent: number
      late: number
      marked: number
      unmarked: number
    }
    pendingFees: { count: number; amount: number; overdueCount: number; overdueAmount: number }
    messages: {
      total: number
      sent: number
      failed: number
      notConfigured: number
      simulated: number
    }
  }
  upcomingTests: {
    id: string
    name: string
    subject: string
    className: string
    batch: string | null
    date: string
    maxMarks: number
  }[]
  recentActivities: { id: string; type: string; message: string; actor: string | null; createdAt: string }[]
  pendingFeeList: {
    id: string
    studentName: string
    className: string
    batch: string
    amount: number
    period: string
    dueDate: string
    overdue: boolean
  }[]
  whatsapp: { configured: boolean; simulation: boolean; source: string }
}

export function Dashboard({ onNavigate }: { onNavigate: (route: RouteKey) => void }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api
      .get<DashboardData>('/dashboard')
      .then((res) => {
        if (alive) setData(res)
      })
      .catch((err) => {
        if (alive) setError(errorMessage(err))
      })
    return () => {
      alive = false
    }
  }, [])

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-muted-foreground">
        <Spinner /> Loading dashboard…
      </div>
    )
  }

  const { stats } = data
  const attendanceRate =
    stats.attendance.marked > 0
      ? Math.round(
          ((stats.attendance.present + stats.attendance.late) / stats.attendance.marked) * 100,
        )
      : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={new Date().toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
        actions={
          <Button size="sm" onClick={() => onNavigate('attendance')}>
            <CalendarCheck className="size-4" />
            Mark attendance
          </Button>
        }
      />

      {!data.whatsapp.configured && !data.whatsapp.simulation ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">WhatsApp is not connected</p>
              <p className="mt-0.5 text-xs text-amber-800">
                Parent messages are being logged but not delivered. Add your Cloud API credentials
                to start sending.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => onNavigate('settings')}>
            Connect WhatsApp
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total students"
          value={stats.totalStudents}
          hint={`${stats.inactiveStudents} inactive`}
          icon={<Users className="size-4" />}
        />
        <StatCard
          label="Today's attendance"
          value={`${stats.attendance.present + stats.attendance.late}/${stats.attendance.marked}`}
          hint={
            stats.attendance.marked === 0
              ? 'Not marked yet'
              : `${attendanceRate}% present · ${stats.attendance.absent} absent`
          }
          icon={<CalendarCheck className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Pending fees"
          value={inr(stats.pendingFees.amount)}
          hint={`${stats.pendingFees.count} invoices · ${stats.pendingFees.overdueCount} overdue`}
          icon={<Wallet className="size-4" />}
          tone={stats.pendingFees.overdueCount > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Upcoming tests"
          value={data.upcomingTests.length}
          hint={
            data.upcomingTests[0]
              ? `Next: ${data.upcomingTests[0].name} on ${formatDate(data.upcomingTests[0].date)}`
              : 'Nothing scheduled'
          }
          icon={<ClipboardList className="size-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Today's attendance</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('attendance')}>
              Open <ArrowRight className="size-3.5" />
            </Button>
          </div>
          <div className="space-y-3 p-4">
            {[
              { label: 'Present', value: stats.attendance.present, tone: 'bg-primary' },
              { label: 'Late', value: stats.attendance.late, tone: 'bg-amber-400' },
              { label: 'Absent', value: stats.attendance.absent, tone: 'bg-destructive' },
              { label: 'Not marked', value: stats.attendance.unmarked, tone: 'bg-muted-foreground/30' },
            ].map((row) => {
              const total = Math.max(stats.attendance.marked + stats.attendance.unmarked, 1)
              return (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium tabular-nums">{row.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full ${row.tone}`}
                      style={{ width: `${Math.min(100, (row.value / total) * 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <div className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
              <MessageSquare className="size-3.5" />
              {stats.messages.total === 0
                ? 'No messages sent this month'
                : `${stats.messages.sent} delivered · ${stats.messages.failed} failed · ${stats.messages.notConfigured} not sent`}
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Pending fees</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('finance')}>
              Open <ArrowRight className="size-3.5" />
            </Button>
          </div>
          {data.pendingFeeList.length === 0 ? (
            <div className="p-4">
              <EmptyState title="All fees collected" description="No pending invoices right now." />
            </div>
          ) : (
            <ul className="divide-y">
              {data.pendingFeeList.map((fee) => (
                <li key={fee.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{fee.studentName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {fee.className} · {fee.batch} · {formatPeriod(fee.period)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">{inr(fee.amount)}</p>
                    <p
                      className={`text-[11px] ${fee.overdue ? 'text-destructive' : 'text-muted-foreground'}`}
                    >
                      {fee.overdue ? 'Overdue' : `Due ${formatDate(fee.dueDate)}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Upcoming tests</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('tests')}>
              Open <ArrowRight className="size-3.5" />
            </Button>
          </div>
          {data.upcomingTests.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No tests scheduled" description="Create a test to plan ahead." />
            </div>
          ) : (
            <ul className="divide-y">
              {data.upcomingTests.map((test) => (
                <li key={test.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{test.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {test.subject} · {test.className}
                      {test.batch ? ` · ${test.batch}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{formatDate(test.date)}</p>
                    <p className="text-[11px] text-muted-foreground">out of {test.maxMarks}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Recent activity</h2>
          </div>
          {data.recentActivities.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Nothing yet" description="Actions will appear here." />
            </div>
          ) : (
            <ul className="divide-y">
              {data.recentActivities.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{a.message}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {a.actor ? `${a.actor} · ` : ''}
                      {relativeTime(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4">
        <span className="text-xs font-medium text-muted-foreground">WhatsApp status</span>
        <StatusBadge
          status={
            data.whatsapp.simulation
              ? 'simulated'
              : data.whatsapp.configured
                ? 'sent'
                : 'not_configured'
          }
        />
        <span className="text-xs text-muted-foreground">
          {data.whatsapp.simulation
            ? 'Simulation mode — messages are logged, not delivered.'
            : data.whatsapp.configured
              ? 'Connected to the WhatsApp Cloud API.'
              : 'Not connected — messages are logged as “not sent”.'}
        </span>
      </div>
    </div>
  )
}
