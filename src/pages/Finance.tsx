import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BellRing,
  Download,
  FileText,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { currentPeriod, formatDate, formatPeriod, inr, todayIso } from '@/lib/format'
import { cn } from '@/lib/cn'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ConfirmDialog,
  EmptyState,
  Field,
  PageHeader,
  Spinner,
  StatCard,
  StatusBadge,
  useToast,
} from '@/components/common'

type Invoice = {
  id: string
  period: string
  amount: number
  discount: number
  paidAmount: number
  outstanding: number
  dueDate: string
  status: string
  overdue: boolean
  student: { id: string; name: string; className: string; batch: string; parentPhone: string }
  payments: Payment[]
}

type Payment = {
  id: string
  amount: number
  method: string
  paidAt: string
  receiptNo: string | null
  note: string | null
  recordedBy: string | null
}

type Overview = {
  totals: {
    billed: number
    collected: number
    outstanding: number
    overdue: number
    expenses: number
    net: number
    periodCollected: number
    invoiceCount: number
    unpaidCount: number
  }
  byMethod: { method: string; amount: number }[]
  byCategory: { category: string; amount: number }[]
}

type Expense = {
  id: string
  category: string
  description: string
  amount: number
  date: string
  paidTo: string | null
  method: string
  recordedBy: string | null
}

type Structure = {
  id: string
  className: string
  batch: string
  amount: number
  dueDay: number
  discount: number
  note: string | null
  active: boolean
}

type Report = {
  from: string
  to: string
  months: { month: string; collected: number; expenses: number; net: number }[]
  totals: { collected: number; expenses: number; paymentCount: number }
}

type ReceiptData = {
  receiptNo: string | null
  institute: string
  studentName: string
  className: string
  batch: string
  parentName: string
  period: string
  amount: number
  method: string
  paidAt: string
  invoiceAmount: number
  discount: number
  paidToDate: number
  outstanding: number
  recordedBy: string | null
}

export function Finance() {
  const { toast } = useToast()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [periods, setPeriods] = useState<string[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [structures, setStructures] = useState<Structure[]>([])
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState('all')
  const [period, setPeriod] = useState('all')
  const [q, setQ] = useState('')

  const [paying, setPaying] = useState<Invoice | null>(null)
  const [pay, setPay] = useState({ amount: '', method: 'cash', note: '', paidAt: todayIso() })
  const [payBusy, setPayBusy] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [reminding, setReminding] = useState<string | null>(null)

  const [expenseOpen, setExpenseOpen] = useState(false)
  const [expense, setExpense] = useState({
    category: 'Rent',
    description: '',
    amount: '',
    date: todayIso(),
    paidTo: '',
    method: 'cash',
  })
  const [expenseBusy, setExpenseBusy] = useState(false)
  const [expenseError, setExpenseError] = useState<string | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)

  const [structureOpen, setStructureOpen] = useState(false)
  const [structure, setStructure] = useState({
    className: '',
    batch: '',
    amount: '',
    dueDay: '5',
    discount: '0',
    note: '',
  })
  const [structureBusy, setStructureBusy] = useState(false)
  const [structureError, setStructureError] = useState<string | null>(null)

  const [genOpen, setGenOpen] = useState(false)
  const [genPeriod, setGenPeriod] = useState(currentPeriod())
  const [genBusy, setGenBusy] = useState(false)

  const [range, setRange] = useState({ from: `${new Date().getFullYear()}-01-01`, to: todayIso() })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (status !== 'all') params.set('status', status)
      if (period !== 'all') params.set('period', period)
      if (q) params.set('q', q)

      const [ov, inv, exp, str] = await Promise.all([
        api.get<Overview>('/finance/overview'),
        api.get<{ invoices: Invoice[] }>(`/finance/invoices?${params.toString()}`),
        api.get<{ expenses: Expense[] }>('/finance/expenses'),
        api.get<{ structures: Structure[] }>('/finance/structures'),
      ])
      setOverview(ov)
      setInvoices(inv.invoices)
      setExpenses(exp.expenses)
      setStructures(str.structures)
      setPeriods([...new Set(inv.invoices.map((i) => i.period))].sort().reverse())
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [status, period, q])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  const loadReport = useCallback(async () => {
    try {
      const res = await api.get<Report>(
        `/finance/report?from=${range.from}&to=${range.to}`,
      )
      setReport(res)
    } catch (err) {
      toast('Could not load the report', { variant: 'error', description: errorMessage(err) })
    }
  }, [range, toast])

  function openPay(invoice: Invoice) {
    setPaying(invoice)
    setPay({
      amount: String(invoice.outstanding),
      method: 'cash',
      note: '',
      paidAt: todayIso(),
    })
    setPayError(null)
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!paying) return
    setPayError(null)
    setPayBusy(true)
    try {
      const res = await api.post<{ fullyPaid: boolean; payment: Payment }>('/finance/payments', {
        invoiceId: paying.id,
        amount: Number(pay.amount),
        method: pay.method,
        note: pay.note,
        paidAt: pay.paidAt,
      })
      toast(res.fullyPaid ? 'Invoice settled' : 'Partial payment recorded', {
        variant: 'success',
        description: `${inr(Number(pay.amount))} · receipt ${res.payment.receiptNo ?? '—'}`,
      })
      setPaying(null)
      await load()
    } catch (err) {
      setPayError(errorMessage(err))
    } finally {
      setPayBusy(false)
    }
  }

  async function remind(invoice: Invoice) {
    setReminding(invoice.id)
    try {
      await api.post(`/fees/${invoice.id}/remind`)
      toast('Reminder sent', { variant: 'success' })
    } catch (err) {
      toast('Could not send reminder', { variant: 'error', description: errorMessage(err) })
    } finally {
      setReminding(null)
    }
  }

  async function openReceipt(paymentId: string) {
    try {
      const res = await api.get<{ receipt: ReceiptData }>(`/finance/payments/${paymentId}/receipt`)
      setReceipt(res.receipt)
    } catch (err) {
      toast('Could not load receipt', { variant: 'error', description: errorMessage(err) })
    }
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    setExpenseError(null)
    setExpenseBusy(true)
    try {
      await api.post('/finance/expenses', { ...expense, amount: Number(expense.amount) })
      toast('Expense recorded', { variant: 'success' })
      setExpenseOpen(false)
      setExpense({
        category: 'Rent',
        description: '',
        amount: '',
        date: todayIso(),
        paidTo: '',
        method: 'cash',
      })
      await load()
    } catch (err) {
      setExpenseError(errorMessage(err))
    } finally {
      setExpenseBusy(false)
    }
  }

  async function removeExpense() {
    if (!deletingExpense) return
    try {
      await api.del(`/finance/expenses/${deletingExpense.id}`)
      toast('Expense removed', { variant: 'success' })
      setDeletingExpense(null)
      await load()
    } catch (err) {
      toast('Could not remove expense', { variant: 'error', description: errorMessage(err) })
    }
  }

  async function saveStructure(e: React.FormEvent) {
    e.preventDefault()
    setStructureError(null)
    setStructureBusy(true)
    try {
      await api.post('/finance/structures', {
        ...structure,
        amount: Number(structure.amount),
        dueDay: Number(structure.dueDay),
        discount: Number(structure.discount),
      })
      toast('Fee structure saved', { variant: 'success' })
      setStructureOpen(false)
      setStructure({ className: '', batch: '', amount: '', dueDay: '5', discount: '0', note: '' })
      await load()
    } catch (err) {
      setStructureError(errorMessage(err))
    } finally {
      setStructureBusy(false)
    }
  }

  async function generateInvoices() {
    setGenBusy(true)
    try {
      const res = await api.post<{ created: number; skipped: number }>('/finance/generate', {
        period: genPeriod,
      })
      toast(`${res.created} invoice(s) generated`, {
        variant: 'success',
        description: `${res.skipped} skipped (already existed or no fee set).`,
      })
      setGenOpen(false)
      await load()
    } catch (err) {
      toast('Could not generate invoices', { variant: 'error', description: errorMessage(err) })
    } finally {
      setGenBusy(false)
    }
  }

  const allPayments = useMemo(
    () =>
      invoices
        .flatMap((i) => i.payments.map((p) => ({ ...p, student: i.student, period: i.period })))
        .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()),
    [invoices],
  )

  if (loading && !overview) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-muted-foreground">
        <Spinner /> Loading finance…
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Finance" />
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Finance"
        description="Invoices, payments, expenses and collection reports — all from real records."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setGenOpen(true)}>
              <FileText className="size-4" />
              Generate invoices
            </Button>
            <Button size="sm" onClick={() => setExpenseOpen(true)}>
              <Plus className="size-4" />
              Add expense
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Collected"
          value={inr(overview?.totals.collected ?? 0)}
          hint={`${overview?.totals.invoiceCount ?? 0} invoices`}
          icon={<TrendingUp className="size-4" />}
          tone="success"
        />
        <StatCard
          label="Outstanding"
          value={inr(overview?.totals.outstanding ?? 0)}
          hint={`${overview?.totals.unpaidCount ?? 0} unpaid · ${inr(overview?.totals.overdue ?? 0)} overdue`}
          icon={<Wallet className="size-4" />}
          tone={(overview?.totals.overdue ?? 0) > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Expenses"
          value={inr(overview?.totals.expenses ?? 0)}
          hint="Recorded in this period"
          icon={<TrendingDown className="size-4" />}
        />
        <StatCard
          label="Net"
          value={inr(overview?.totals.net ?? 0)}
          hint="Collected − expenses"
          icon={<Receipt className="size-4" />}
          tone={(overview?.totals.net ?? 0) >= 0 ? 'success' : 'danger'}
        />
      </div>

      <Tabs defaultValue="invoices">
        <TabsList className="flex-wrap">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="structures">Fee structures</TabsTrigger>
          <TabsTrigger value="reports" onClick={loadReport}>
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search student"
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="waived">Waived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All periods</SelectItem>
                {periods.map((p) => (
                  <SelectItem key={p} value={p}>
                    {formatPeriod(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {invoices.length === 0 ? (
            <EmptyState
              title="No invoices match"
              description="Generate invoices for the current period to get started."
            />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>
                          <p className="font-medium">{i.student.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {i.student.className} · {i.student.batch}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm">{formatPeriod(i.period)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {inr(i.amount)}
                          {i.discount ? (
                            <p className="text-[11px] text-muted-foreground">
                              −{inr(i.discount)}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {inr(i.paidAmount)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {i.outstanding > 0 ? (
                            <span className={i.overdue ? 'text-destructive' : 'text-amber-600'}>
                              {inr(i.outstanding)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={i.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {i.outstanding > 0 ? (
                              <>
                                <Button size="sm" className="h-8" onClick={() => openPay(i)}>
                                  Pay
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="size-8"
                                  disabled={reminding === i.id}
                                  onClick={() => remind(i)}
                                  aria-label="Send reminder"
                                >
                                  <BellRing className="size-3.5" />
                                </Button>
                              </>
                            ) : i.payments[0] ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => openReceipt(i.payments[0].id)}
                              >
                                <Receipt className="size-3.5" /> Receipt
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2 md:hidden">
                {invoices.map((i) => (
                  <div key={i.id} className="rounded-xl border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{i.student.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatPeriod(i.period)} · {i.student.className}
                        </p>
                      </div>
                      <StatusBadge status={i.status} />
                    </div>
                    <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px] sm:grid-cols-3">
                      <div>
                        <dt className="text-muted-foreground">Amount</dt>
                        <dd className="tabular-nums">{inr(i.amount)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Paid</dt>
                        <dd className="tabular-nums">{inr(i.paidAmount)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Due</dt>
                        <dd className={cn('tabular-nums', i.overdue && 'text-destructive')}>
                          {inr(i.outstanding)}
                        </dd>
                      </div>
                    </dl>
                    {i.outstanding > 0 ? (
                      <Button size="sm" className="mt-2 w-full" onClick={() => openPay(i)}>
                        Record payment
                      </Button>
                    ) : i.payments[0] ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full"
                        onClick={() => openReceipt(i.payments[0].id)}
                      >
                        <Receipt className="size-3.5" /> Receipt
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-3">
          {allPayments.length === 0 ? (
            <EmptyState title="No payments recorded yet" />
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <ul className="divide-y">
                {allPayments.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.student.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(p.paidAt)} · {p.method} · {formatPeriod(p.period)}
                        {p.receiptNo ? ` · ${p.receiptNo}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">{inr(p.amount)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => openReceipt(p.id)}
                      >
                        <Receipt className="size-3" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-3">
          {expenses.length === 0 ? (
            <EmptyState
              title="No expenses recorded"
              description="Track rent, salaries, materials and other outgoings."
              action={
                <Button size="sm" onClick={() => setExpenseOpen(true)}>
                  <Plus className="size-4" /> Add expense
                </Button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <ul className="divide-y">
                {expenses.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 sm:px-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.description}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(e.date)} · {e.category} · {e.method}
                        {e.paidTo ? ` · ${e.paidTo}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">{inr(e.amount)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingExpense(e)}
                        aria-label="Delete expense"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="structures" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setStructureOpen(true)}>
              <Plus className="size-4" /> Add structure
            </Button>
          </div>
          {structures.length === 0 ? (
            <EmptyState
              title="No fee structures"
              description="Set the monthly fee per class and batch. Invoice generation uses these."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">Monthly fee</TableHead>
                    <TableHead className="text-right">Concession</TableHead>
                    <TableHead className="text-right">Due day</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {structures.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{s.className}</TableCell>
                      <TableCell className="text-sm">{s.batch || 'All batches'}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {inr(s.amount)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {s.discount ? inr(s.discount) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{s.dueDay}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field label="From">
              <Input
                type="date"
                value={range.from}
                onChange={(e) => setRange({ ...range, from: e.target.value })}
              />
            </Field>
            <Field label="To">
              <Input
                type="date"
                value={range.to}
                onChange={(e) => setRange({ ...range, to: e.target.value })}
              />
            </Field>
            <Button size="sm" onClick={loadReport}>
              <Download className="size-4" /> Run report
            </Button>
          </div>

          {!report ? (
            <EmptyState title="Run the report" description="Pick a date range and run it." />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="Collected" value={inr(report.totals.collected)} tone="success" />
                <StatCard label="Expenses" value={inr(report.totals.expenses)} />
                <StatCard
                  label="Net"
                  value={inr(report.totals.collected - report.totals.expenses)}
                  tone={report.totals.collected - report.totals.expenses >= 0 ? 'success' : 'danger'}
                />
              </div>
              <div className="overflow-hidden rounded-xl border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Collected</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.months.map((m) => (
                      <TableRow key={m.month}>
                        <TableCell className="text-sm">{formatPeriod(m.month)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {inr(m.collected)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {inr(m.expenses)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right text-sm tabular-nums',
                            m.net < 0 && 'text-destructive',
                          )}
                        >
                          {inr(m.net)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Record payment */}
      <Dialog open={Boolean(paying)} onOpenChange={(o) => !o && setPaying(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {paying
                ? `${paying.student.name} · ${formatPeriod(paying.period)} · ${inr(paying.outstanding)} outstanding`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={recordPayment} className="space-y-3">
            <Field label="Amount (₹)" hint="Partial payments are allowed">
              <Input
                type="number"
                min={1}
                max={paying?.outstanding ?? undefined}
                value={pay.amount}
                onChange={(e) => setPay({ ...pay, amount: e.target.value })}
                required
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Method">
                <Select value={pay.method} onValueChange={(v) => setPay({ ...pay, method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank">Bank transfer</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Paid on">
                <Input
                  type="date"
                  value={pay.paidAt}
                  onChange={(e) => setPay({ ...pay, paidAt: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Note">
              <Input
                value={pay.note}
                onChange={(e) => setPay({ ...pay, note: e.target.value })}
                placeholder="Optional"
              />
            </Field>
            {payError ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {payError}
              </p>
            ) : null}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setPaying(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={payBusy}>
                {payBusy ? 'Saving…' : 'Record payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receipt */}
      <Dialog open={Boolean(receipt)} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment receipt</DialogTitle>
            <DialogDescription>{receipt?.receiptNo ?? ''}</DialogDescription>
          </DialogHeader>
          {receipt ? (
            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <p className="text-center text-base font-semibold">{receipt.institute}</p>
              <p className="text-center text-[11px] uppercase tracking-wide text-muted-foreground">
                Fee receipt
              </p>
              <dl className="mt-3 space-y-1.5">
                {[
                  ['Student', receipt.studentName],
                  ['Class', `${receipt.className} · ${receipt.batch}`],
                  ['Parent', receipt.parentName],
                  ['Period', formatPeriod(receipt.period)],
                  ['Amount paid', inr(receipt.amount)],
                  ['Method', receipt.method],
                  ['Paid on', formatDate(receipt.paidAt)],
                  ['Invoice total', inr(receipt.invoiceAmount)],
                  ['Paid to date', inr(receipt.paidToDate)],
                  ['Outstanding', inr(receipt.outstanding)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 border-b border-dashed pb-1">
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="text-right">{value}</dd>
                  </div>
                ))}
              </dl>
              {receipt.recordedBy ? (
                <p className="pt-1 text-[11px] text-muted-foreground">
                  Recorded by {receipt.recordedBy}
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceipt(null)}>
              Close
            </Button>
            <Button onClick={() => window.print()}>
              <Download className="size-4" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add expense */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
            <DialogDescription>Rent, salaries, materials, utilities…</DialogDescription>
          </DialogHeader>
          <form onSubmit={addExpense} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Category">
                <Input
                  value={expense.category}
                  onChange={(e) => setExpense({ ...expense, category: e.target.value })}
                  list="expense-categories"
                  required
                />
                <datalist id="expense-categories">
                  {['Rent', 'Salaries', 'Materials', 'Utilities', 'Marketing', 'Maintenance'].map(
                    (c) => (
                      <option key={c} value={c} />
                    ),
                  )}
                </datalist>
              </Field>
              <Field label="Amount (₹)">
                <Input
                  type="number"
                  min={1}
                  value={expense.amount}
                  onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
                  required
                />
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={expense.date}
                  onChange={(e) => setExpense({ ...expense, date: e.target.value })}
                />
              </Field>
              <Field label="Paid to">
                <Input
                  value={expense.paidTo}
                  onChange={(e) => setExpense({ ...expense, paidTo: e.target.value })}
                  placeholder="Optional"
                />
              </Field>
            </div>
            <Field label="Description">
              <Input
                value={expense.description}
                onChange={(e) => setExpense({ ...expense, description: e.target.value })}
                required
              />
            </Field>
            {expenseError ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {expenseError}
              </p>
            ) : null}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setExpenseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={expenseBusy}>
                {expenseBusy ? 'Saving…' : 'Add expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fee structure */}
      <Dialog open={structureOpen} onOpenChange={setStructureOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fee structure</DialogTitle>
            <DialogDescription>Monthly fee for a class and batch.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveStructure} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Class">
                <Input
                  value={structure.className}
                  onChange={(e) => setStructure({ ...structure, className: e.target.value })}
                  required
                />
              </Field>
              <Field label="Batch" hint="Blank = all batches">
                <Input
                  value={structure.batch}
                  onChange={(e) => setStructure({ ...structure, batch: e.target.value })}
                />
              </Field>
              <Field label="Monthly fee (₹)">
                <Input
                  type="number"
                  min={1}
                  value={structure.amount}
                  onChange={(e) => setStructure({ ...structure, amount: e.target.value })}
                  required
                />
              </Field>
              <Field label="Concession (₹)">
                <Input
                  type="number"
                  min={0}
                  value={structure.discount}
                  onChange={(e) => setStructure({ ...structure, discount: e.target.value })}
                />
              </Field>
              <Field label="Due day">
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={structure.dueDay}
                  onChange={(e) => setStructure({ ...structure, dueDay: e.target.value })}
                />
              </Field>
            </div>
            {structureError ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {structureError}
              </p>
            ) : null}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setStructureOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={structureBusy}>
                {structureBusy ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Generate invoices */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate invoices</DialogTitle>
            <DialogDescription>
              Creates one invoice per active student for the period, using the fee structure.
            </DialogDescription>
          </DialogHeader>
          <Field label="Period">
            <Input
              type="month"
              value={genPeriod}
              onChange={(e) => setGenPeriod(e.target.value)}
            />
          </Field>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generateInvoices} disabled={genBusy}>
              {genBusy ? 'Generating…' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deletingExpense)}
        onOpenChange={(o) => !o && setDeletingExpense(null)}
        title="Delete this expense?"
        description={deletingExpense ? `${deletingExpense.description} · ${inr(deletingExpense.amount)}` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={removeExpense}
      />
    </div>
  )
}
