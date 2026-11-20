import { useCallback, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight, BarChart3, RefreshCw } from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { formatPeriod, inr, todayIso } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState, Field, PageHeader, Spinner, StatCard } from '@/components/common'

type Analytics = {
  totals: {
    students: number
    activeStudents: number
    attendanceRecords: number
    tests: number
    results: number
  }
  enrollmentTrend: { month: string; joined: number; total: number }[]
  dailyAttendance: { date: string; present: number; absent: number; late: number; total: number; rate: number }[]
  monthlyAttendance: { month: string; present: number; absent: number; late: number; total: number; rate: number }[]
  batchWise: { className: string; batch: string; students: number; attendanceRate: number; avgScore: number }[]
  testTrend: { id: string; name: string; subject: string; date: string; maxMarks: number; avgPercent: number; results: number }[]
  movers: {
    improving: Mover[]
    declining: Mover[]
  }
  finance: {
    billed: number
    collected: number
    outstanding: number
    overdue: number
    trend: { month: string; collected: number; expenses: number; net: number }[]
    expenseByCategory: { category: string; amount: number }[]
  }
  facultyLoad: { id: string; name: string; batches: number; sessions: number; subjects: string }[]
}

type Mover = {
  studentId: string
  name: string
  className: string
  batch: string
  firstPercent: number
  lastPercent: number
  avgPercent: number
  delta: number
  tests: number
}

const COLORS = ['#2f7d5d', '#c98a2b', '#b3453a', '#4a6fa5', '#7a5aa8', '#3f8f8f']

export function Analytics() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<{ classes: string[]; batches: string[] }>({ classes: [], batches: [] })
  const [filters, setFilters] = useState({ from: '', to: todayIso(), className: 'all', batch: 'all' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      if (filters.className !== 'all') params.set('className', filters.className)
      if (filters.batch !== 'all') params.set('batch', filters.batch)
      const res = await api.get<Analytics>(`/analytics?${params.toString()}`)
      setData(res)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    api
      .get<{ classes: string[]; batches: string[] }>('/students/meta')
      .then(setMeta)
      .catch(() => {})
  }, [])

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Analytics" />
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        description="Every number here is computed from your attendance, test and fee records."
        actions={
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="From">
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
        </Field>
        <Field label="To">
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </Field>
        <Field label="Class">
          <Select
            value={filters.className}
            onValueChange={(v) => setFilters({ ...filters, className: v, batch: 'all' })}
          >
            <SelectTrigger>
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
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All batches</SelectItem>
              {meta.batches.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {loading && !data ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Spinner /> Crunching the numbers…
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Active students"
              value={data.totals.activeStudents}
              hint={`${data.totals.students} total`}
            />
            <StatCard
              label="Attendance records"
              value={data.totals.attendanceRecords}
              hint={
                data.monthlyAttendance.length > 0
                  ? `${data.monthlyAttendance[data.monthlyAttendance.length - 1].rate}% this month`
                  : 'No records yet'
              }
              tone="success"
            />
            <StatCard
              label="Collected"
              value={inr(data.finance.collected)}
              hint={`${inr(data.finance.outstanding)} outstanding`}
            />
            <StatCard
              label="Overdue"
              value={inr(data.finance.overdue)}
              hint={`${data.totals.tests} tests · ${data.totals.results} results`}
              tone={data.finance.overdue > 0 ? 'warning' : 'default'}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Enrollment trend" subtitle="Cumulative students by month">
              {data.enrollmentTrend.length === 0 ? (
                <EmptyState title="No enrollment data" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.enrollmentTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: string) => v.slice(2)}
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      labelFormatter={(v) => formatPeriod(String(v))}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Students"
                      stroke={COLORS[0]}
                      fill={COLORS[0]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Daily attendance" subtitle="Present + late as a share of marked">
              {data.dailyAttendance.length === 0 ? (
                <EmptyState title="No attendance data" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.dailyAttendance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      name="Attendance %"
                      stroke={COLORS[0]}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Batch performance" subtitle="Attendance % and average score %">
              {data.batchWise.length === 0 ? (
                <EmptyState title="No batch data" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={data.batchWise.map((b) => ({
                      name: `${b.className.replace('Class ', 'C')} ${b.batch}`,
                      attendance: b.attendanceRate,
                      score: b.avgScore,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} height={50} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="attendance" name="Attendance %" fill={COLORS[0]} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="score" name="Avg score %" fill={COLORS[1]} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Test performance" subtitle="Average score per test over time">
              {data.testTrend.length === 0 ? (
                <EmptyState title="No test results yet" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.testTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number, _n, item) => [
                        `${value}%`,
                        (item?.payload as { name?: string })?.name ?? 'Average',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgPercent"
                      name="Average %"
                      stroke={COLORS[3]}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Collection vs expenses" subtitle="Monthly cash flow">
              {data.finance.trend.length === 0 ? (
                <EmptyState title="No finance data" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.finance.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: string) => v.slice(2)}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number) => inr(value)}
                      labelFormatter={(v) => formatPeriod(String(v))}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="collected" name="Collected" fill={COLORS[0]} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill={COLORS[2]} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Expenses by category" subtitle="Where the money goes">
              {data.finance.expenseByCategory.length === 0 ? (
                <EmptyState title="No expenses recorded" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.finance.expenseByCategory}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {data.finance.expenseByCategory.map((entry, i) => (
                        <Cell key={entry.category} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number) => inr(value)}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-xl border bg-card">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Improving students</h2>
                <p className="text-[11px] text-muted-foreground">
                  Change between their first and latest test
                </p>
              </div>
              {data.movers.improving.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="Not enough results yet" description="Two tests are needed." />
                </div>
              ) : (
                <ul className="divide-y">
                  {data.movers.improving.map((m) => (
                    <li key={m.studentId} className="flex items-center justify-between gap-3 px-4 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {m.className} · {m.batch} · {m.tests} tests
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-medium text-primary">
                        <ArrowUpRight className="size-3.5" />+{m.delta}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border bg-card">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Needs attention</h2>
                <p className="text-[11px] text-muted-foreground">Students whose scores dropped</p>
              </div>
              {data.movers.declining.length === 0 ? (
                <div className="p-4">
                  <EmptyState title="No declines" description="Everyone is holding steady." />
                </div>
              ) : (
                <ul className="divide-y">
                  {data.movers.declining.map((m) => (
                    <li key={m.studentId} className="flex items-center justify-between gap-3 px-4 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {m.className} · {m.batch} · {m.tests} tests
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-medium text-destructive">
                        <ArrowDownRight className="size-3.5" />
                        {m.delta}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="size-4" /> Faculty load
              </h2>
            </div>
            {data.facultyLoad.length === 0 ? (
              <div className="p-4">
                <EmptyState title="No faculty profiles" />
              </div>
            ) : (
              <ul className="divide-y">
                {data.facultyLoad.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{f.name}</p>
                      <p className="text-[11px] text-muted-foreground">{f.subjects || '—'}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {f.batches} batches · {f.sessions} sessions/week
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle ? <p className="text-[11px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}
