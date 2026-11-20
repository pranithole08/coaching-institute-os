import { useCallback, useEffect, useState } from 'react'
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  GraduationCap,
  MessageSquare,
  Phone,
  Printer,
  QrCode,
  Receipt,
  Search,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { formatDate, inr } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
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
import { EmptyState, PageHeader, Spinner, StatusBadge, useToast } from '@/components/common'
import type { AuthUser } from '@/pages/Login'

type StudentItem = {
  id: string
  name: string
  className: string
  batch: string
  rollNo: string | null
  status: string
  parentName: string
  parentPhone: string
}

type ProfileData = {
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
    }[]
  }
  fees: {
    feeAmount?: number
    dueDay?: number
    billed: number
    paid: number
    outstanding: number
    overdue: number
    invoices: {
      id: string
      period: string
      amount: number
      discount: number
      net?: number
      paidAmount: number
      balance?: number
      outstanding?: number
      dueDate: string
      status: string
      overdue: boolean
      payments?: { id: string; amount: number; method: string; paidAt: string; receiptNo: string | null }[]
    }[]
    payments: {
      id: string
      amount: number
      method: string
      paidAt: string
      receiptNo: string | null
      note: string | null
    }[]
  }
  materials: {
    id: string
    title: string
    description: string | null
    kind: string
    subject: string | null
    url: string | null
    fileName: string | null
    createdAt: string
  }[]
}

type TimetableSlot = {
  id: string
  dayOfWeek: number
  dayName: string
  startTime: string
  endTime: string
  subject: string
  room: string | null
  teacher: { id: string; name: string } | null
}

type ReceiptDetails = {
  receiptNo: string
  institute: string
  studentName: string
  className: string
  batch: string
  parentName: string
  period: string
  amount: number
  method: string
  paidAt: string
}

export function StudentPortal({ user }: { user: AuthUser }) {
  const { toast } = useToast()
  const isStudent = user.role === 'student'

  const [students, setStudents] = useState<StudentItem[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(false)

  // Online Fee Payment state
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payInvoiceId, setPayInvoiceId] = useState<string>('')
  const [payAmount, setPayAmount] = useState<number>(0)
  const [payMethod, setPayMethod] = useState<'upi' | 'card' | 'bank'>('upi')
  const [payBusy, setPayBusy] = useState(false)

  // Receipt Modal state
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptDetails | null>(null)

  // Fetch full profile and timetable for a student
  const loadProfile = useCallback(
    async (studentId: string) => {
      if (!studentId) return
      setLoadingProfile(true)
      try {
        const [profRes, ttRes] = await Promise.all([
          api.get<ProfileData>(`/students/${studentId}/profile`),
          api.get<{ slots: TimetableSlot[] }>('/timetable'),
        ])
        setProfile(profRes)

        const matchedSlots = ttRes.slots.filter(
          (s) =>
            s.subject &&
            (!profRes.student.className ||
              !('className' in s) ||
              (s as unknown as { className: string }).className === profRes.student.className),
        )
        setTimetableSlots(matchedSlots.length > 0 ? matchedSlots : ttRes.slots.slice(0, 8))
      } catch (err) {
        toast('Failed to load student details', { variant: 'error', description: errorMessage(err) })
      } finally {
        setLoadingProfile(false)
      }
    },
    [toast],
  )

  // 1. Initial load of students
  useEffect(() => {
    api
      .get<{ students: StudentItem[] }>('/students')
      .then((res) => {
        setStudents(res.students)
        if (res.students.length > 0) {
          if (isStudent) {
            // Find student matching user's name or default to Aarav Sharma / first student
            const matched =
              res.students.find((s) => s.name.toLowerCase() === (user.name ?? '').toLowerCase()) ??
              res.students.find((s) => s.name.toLowerCase().includes('aarav')) ??
              res.students[0]
            setSelectedStudentId(matched.id)
          } else {
            setSelectedStudentId(res.students[0].id)
          }
        }
      })
      .catch((err) => {
        toast('Failed to load students', { variant: 'error', description: errorMessage(err) })
      })
      .finally(() => setLoadingList(false))
  }, [toast, isStudent, user.name])

  // 2. Fetch selected student's profile & timetable
  useEffect(() => {
    if (selectedStudentId) {
      void loadProfile(selectedStudentId)
    }
  }, [selectedStudentId, loadProfile])

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.className.toLowerCase().includes(search.toLowerCase()) ||
      s.batch.toLowerCase().includes(search.toLowerCase()) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(search.toLowerCase())),
  )

  function openPayModal(invId?: string) {
    if (!profile) return
    const pendingInvoices = profile.fees.invoices.filter(
      (i) => (i.outstanding ?? i.balance ?? i.amount - i.discount - i.paidAmount) > 0,
    )
    const target = invId
      ? profile.fees.invoices.find((i) => i.id === invId)
      : pendingInvoices[0] ?? profile.fees.invoices[0]

    if (target) {
      setPayInvoiceId(target.id)
      const due = target.outstanding ?? target.balance ?? Math.max(0, target.amount - target.discount - target.paidAmount)
      setPayAmount(due > 0 ? due : target.amount)
    } else {
      setPayInvoiceId('')
      setPayAmount(profile.student.feeAmount || 3500)
    }
    setPayModalOpen(true)
  }

  async function handleExecutePayment() {
    if (!profile) return
    if (!payInvoiceId) {
      toast('Please select an invoice', { variant: 'error', description: 'Choose which month to pay for.' })
      return
    }
    if (payAmount <= 0) {
      toast('Invalid amount', { variant: 'error', description: 'Enter an amount greater than ₹0.' })
      return
    }

    setPayBusy(true)
    try {
      const res = await api.post<{
        payment: { id: string; amount: number; method: string; paidAt: string; receiptNo: string | null }
        invoice: { period: string }
      }>('/finance/payments', {
        invoiceId: payInvoiceId,
        amount: payAmount,
        method: payMethod,
        note: isStudent ? 'Online fee payment by student' : 'Online payment via Student Portal',
        paidAt: new Date().toISOString().slice(0, 10),
      })

      toast('Fee payment successful!', {
        variant: 'success',
        description: `₹${payAmount} paid successfully for ${res.invoice?.period ?? 'fee'}. Receipt generated.`,
      })

      // Show receipt modal
      const activeInv = profile.fees.invoices.find((i) => i.id === payInvoiceId)
      setReceipt({
        receiptNo: res.payment.receiptNo || `RCPT-${Date.now().toString().slice(-6)}`,
        institute: 'Bright Path Coaching Institute',
        studentName: profile.student.name,
        className: profile.student.className,
        batch: profile.student.batch,
        parentName: profile.student.parentName,
        period: activeInv?.period || 'Current Month',
        amount: payAmount,
        method: payMethod.toUpperCase(),
        paidAt: new Date().toLocaleString(),
      })

      setPayModalOpen(false)
      setReceiptModalOpen(true)

      // Refresh profile immediately to update ledger
      await loadProfile(profile.student.id)
    } catch (err) {
      toast('Payment processing failed', { variant: 'error', description: errorMessage(err) })
    } finally {
      setPayBusy(false)
    }
  }

  function handleViewReceipt(rNo: string | null, period: string, amount: number, method: string, dateStr: string) {
    if (!profile) return
    setReceipt({
      receiptNo: rNo || `RCPT-${period.replace('-', '')}-001`,
      institute: 'Bright Path Coaching Institute',
      studentName: profile.student.name,
      className: profile.student.className,
      batch: profile.student.batch,
      parentName: profile.student.parentName,
      period,
      amount,
      method: method.toUpperCase(),
      paidAt: formatDate(dateStr),
    })
    setReceiptModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isStudent ? 'My Student Portal' : 'Student Portal'}
        description={
          isStudent
            ? `Welcome to your academic & administrative portal. View your attendance, test scorecards, timetable and pay fees online.`
            : 'Comprehensive 360° academic & administrative profile for students, parents, and teachers.'
        }
      />

      {/* Role-Aware Selector / Student Welcome Bar */}
      {isStudent ? (
        <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg">
                {profile?.student.name.slice(0, 2) || 'ST'}
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <span>{profile?.student.name || user.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                    Student Account
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Class: <strong>{profile?.student.className}</strong> · Batch: <strong>{profile?.student.batch}</strong>
                  {profile?.student.rollNo && <span> · Roll #{profile.student.rollNo}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => openPayModal()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm text-xs font-semibold"
              >
                <CreditCard className="size-3.5" /> Pay Fees Online
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-md relative">
              <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student by name, roll no, or class…"
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Quick Select:</span>
              {filteredStudents.slice(0, 6).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStudentId(st.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap',
                    selectedStudentId === st.id
                      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                      : 'border-border/60 hover:bg-muted/60 text-muted-foreground',
                  )}
                >
                  {st.name} ({st.className})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loadingList || loadingProfile || !profile ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm gap-2">
          <Spinner /> Loading student details…
        </div>
      ) : (
        <div className="space-y-6">
          {/* Student Profile Header Card */}
          <div className="rounded-2xl border bg-gradient-to-br from-card to-secondary/20 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="size-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xl font-bold uppercase shadow-inner">
                  {profile.student.name.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">{profile.student.name}</h2>
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold">
                      {profile.student.className} · {profile.student.batch}
                    </span>
                    {profile.student.rollNo && (
                      <span className="text-xs text-muted-foreground font-mono">Roll: #{profile.student.rollNo}</span>
                    )}
                    <StatusBadge status={profile.student.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span>
                      Parent: <strong>{profile.student.parentName}</strong>
                    </span>
                    <span>•</span>
                    <a
                      href={`https://wa.me/${profile.student.parentPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 font-mono"
                    >
                      <Phone className="size-3" /> {profile.student.parentPhone}
                    </a>
                    <span>•</span>
                    <span>Enrolled: {formatDate(profile.student.admissionDate)}</span>
                  </p>
                </div>
              </div>

              {/* Direct Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => openPayModal()}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  <CreditCard className="size-3.5" /> Pay Fees Online
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(
                      `https://wa.me/${profile.student.parentPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hi ${profile.student.parentName}, update regarding ${profile.student.name}:`,
                      )}`,
                      '_blank',
                    )
                  }}
                  className="gap-1.5"
                >
                  <MessageSquare className="size-3.5 text-emerald-600" /> WhatsApp Parent
                </Button>
              </div>
            </div>

            {/* Quick KPI Cards Grid */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/40">
              <div className="p-3.5 rounded-xl bg-card/60 border border-border/50">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium">Attendance Rate</span>
                  <CalendarCheck className="size-3.5 text-primary" />
                </div>
                <div className="text-xl font-bold text-foreground">{profile.attendance.percentage}%</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {profile.attendance.present} present, {profile.attendance.absent} absent
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-card/60 border border-border/50">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium">Average Score</span>
                  <TrendingUp className="size-3.5 text-blue-500" />
                </div>
                <div className="text-xl font-bold text-foreground">
                  {profile.tests.avgPercent !== null ? `${profile.tests.avgPercent}%` : 'N/A'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Across {profile.tests.count} tests taken
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-card/60 border border-border/50">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium">Fee Balance</span>
                  <Wallet className="size-3.5 text-amber-500" />
                </div>
                <div
                  className={cn(
                    'text-xl font-bold',
                    (profile.fees.outstanding ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600',
                  )}
                >
                  {(profile.fees.outstanding ?? 0) > 0 ? inr(profile.fees.outstanding) : 'Fully Paid'}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                  <span>Monthly: {inr(profile.student.feeAmount || profile.fees.feeAmount || 0)}</span>
                  {(profile.fees.outstanding ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => openPayModal()}
                      className="text-primary font-semibold hover:underline"
                    >
                      Pay Now →
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-card/60 border border-border/50">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium">Study Materials</span>
                  <BookOpen className="size-3.5 text-purple-500" />
                </div>
                <div className="text-xl font-bold text-foreground">{profile.materials.length} Available</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Notes, handouts & PDFs</div>
              </div>
            </div>
          </div>

          {/* Tabbed Content Navigation */}
          <Tabs defaultValue="fees" className="space-y-4">
            <TabsList className="bg-muted/80 p-1 rounded-xl">
              <TabsTrigger value="fees" className="gap-1.5 text-xs">
                <Wallet className="size-3.5" /> Fee Ledger & Pay
              </TabsTrigger>
              <TabsTrigger value="attendance" className="gap-1.5 text-xs">
                <CalendarCheck className="size-3.5" /> Attendance
              </TabsTrigger>
              <TabsTrigger value="tests" className="gap-1.5 text-xs">
                <GraduationCap className="size-3.5" /> Test Reports
              </TabsTrigger>
              <TabsTrigger value="timetable" className="gap-1.5 text-xs">
                <CalendarDays className="size-3.5" /> Timetable
              </TabsTrigger>
              <TabsTrigger value="materials" className="gap-1.5 text-xs">
                <BookOpen className="size-3.5" /> Materials
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Fees & Online Payments */}
            <TabsContent value="fees" className="space-y-4">
              <div className="rounded-xl border bg-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold">Fee Invoices & Online Payments</h3>
                    <p className="text-xs text-muted-foreground">
                      Monthly tuition fees, online payment options with instant receipt generation.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openPayModal()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold"
                  >
                    <CreditCard className="size-3.5" /> Pay Fees Online
                  </Button>
                </div>

                {profile.fees.invoices.length === 0 ? (
                  <EmptyState title="No invoices found" description="No fee invoices billed to this student yet." />
                ) : (
                  <div className="divide-y border rounded-xl overflow-hidden">
                    {profile.fees.invoices.map((inv) => {
                      const net = inv.net ?? Math.max(0, inv.amount - inv.discount)
                      const due = inv.outstanding ?? inv.balance ?? Math.max(0, net - inv.paidAmount)
                      return (
                        <div
                          key={inv.id}
                          className="p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">Month: {inv.period}</span>
                              <StatusBadge status={inv.status} />
                              {inv.overdue && due > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 text-[10px] font-bold">
                                  OVERDUE
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground text-[11px] mt-0.5">
                              Due date: {formatDate(inv.dueDate)} · Billed: {inr(net)} · Paid: {inr(inv.paidAmount)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span
                                className={cn(
                                  'font-bold text-sm block',
                                  due > 0 ? 'text-amber-600' : 'text-emerald-600',
                                )}
                              >
                                {due > 0 ? `Due: ${inr(due)}` : 'Cleared'}
                              </span>
                            </div>
                            {due > 0 ? (
                              <Button
                                size="sm"
                                onClick={() => openPayModal(inv.id)}
                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                              >
                                Pay Now
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleViewReceipt(
                                    inv.payments?.[0]?.receiptNo ?? null,
                                    inv.period,
                                    inv.paidAmount,
                                    inv.payments?.[0]?.method ?? 'UPI',
                                    inv.payments?.[0]?.paidAt ?? inv.dueDate,
                                  )
                                }
                                className="h-8 gap-1 text-xs"
                              >
                                <Receipt className="size-3" /> View Receipt
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Past Payment History */}
                {profile.fees.payments && profile.fees.payments.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                      Recorded Payment Transactions & Receipts
                    </h4>
                    <div className="divide-y border rounded-xl overflow-hidden bg-muted/10">
                      {profile.fees.payments.map((p) => (
                        <div
                          key={p.id}
                          className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/30"
                        >
                          <div className="flex items-center gap-2">
                            <Receipt className="size-4 text-emerald-600 shrink-0" />
                            <div>
                              <span className="font-semibold text-foreground">{inr(p.amount)} paid</span>
                              <span className="text-muted-foreground ml-2 uppercase font-mono">[{p.method}]</span>
                              <p className="text-[11px] text-muted-foreground font-mono">
                                Receipt #{p.receiptNo || 'RCPT-ONLINE'} · {formatDate(p.paidAt)}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleViewReceipt(p.receiptNo, 'Tuition Fee', p.amount, p.method, p.paidAt)
                            }
                            className="h-7 text-xs gap-1 text-primary hover:text-primary"
                          >
                            <Download className="size-3" /> Receipt
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: Attendance */}
            <TabsContent value="attendance" className="space-y-4">
              <div className="rounded-xl border bg-card p-4 sm:p-5">
                <h3 className="text-sm font-semibold mb-3">Attendance History (Recent Days)</h3>
                {profile.attendance.recent.length === 0 ? (
                  <EmptyState title="No attendance recorded" description="No attendance marked for this student yet." />
                ) : (
                  <div className="divide-y border rounded-xl overflow-hidden">
                    {profile.attendance.recent.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between p-3 text-xs bg-card hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          {rec.status === 'present' ? (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          ) : rec.status === 'late' ? (
                            <Clock className="size-4 text-amber-500" />
                          ) : (
                            <XCircle className="size-4 text-rose-500" />
                          )}
                          <div>
                            <span className="font-semibold text-foreground">{formatDate(rec.date)}</span>
                            <span className="text-muted-foreground ml-2 capitalize">
                              ({rec.session || 'Daily Attendance'})
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={rec.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: Tests */}
            <TabsContent value="tests" className="space-y-4">
              <div className="rounded-xl border bg-card p-4 sm:p-5">
                <h3 className="text-sm font-semibold mb-3">Test Scorecard & Evaluations</h3>
                {profile.tests.results.length === 0 ? (
                  <EmptyState title="No tests evaluated" description="This student has not participated in published tests yet." />
                ) : (
                  <div className="divide-y border rounded-xl overflow-hidden">
                    {profile.tests.results.map((tr) => (
                      <div
                        key={tr.id}
                        className="p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/30"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{tr.name}</span>
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium text-[10px]">
                              {tr.subject}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-[11px] mt-0.5">
                            Conducted on {formatDate(tr.date)} · Remarks: {tr.remarks || 'Good effort'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-bold text-foreground">
                              {tr.marks !== null ? `${tr.marks} / ${tr.maxMarks}` : 'Absent'}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {tr.percent !== null ? `${tr.percent}%` : '0%'}
                            </div>
                          </div>
                          <StatusBadge status={tr.status || (tr.marks !== null ? 'evaluated' : 'absent')} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 4: Timetable */}
            <TabsContent value="timetable" className="space-y-4">
              <div className="rounded-xl border bg-card p-4 sm:p-5">
                <h3 className="text-sm font-semibold mb-3">Weekly Lecture Schedule</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {timetableSlots.map((slot) => (
                    <div key={slot.id} className="p-3 rounded-xl border bg-muted/20 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                          <span>{slot.subject}</span>
                          <span className="px-2 py-0.5 rounded bg-secondary text-[10px] text-muted-foreground">
                            {slot.dayName}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                          <Clock className="size-3" /> {slot.startTime} – {slot.endTime}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
                        <span>Faculty: {slot.teacher?.name || 'Assigned Faculty'}</span>
                        {slot.room && <span className="font-mono">Room: {slot.room}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* TAB 5: Materials */}
            <TabsContent value="materials" className="space-y-4">
              <div className="rounded-xl border bg-card p-4 sm:p-5">
                <h3 className="text-sm font-semibold mb-3">Handouts, Assignments & Study Materials</h3>
                {profile.materials.length === 0 ? (
                  <EmptyState title="No materials uploaded" description="No study materials assigned to this batch yet." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile.materials.map((mat) => (
                      <div key={mat.id} className="p-3.5 rounded-xl border bg-muted/20 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-primary" />
                            <span className="font-semibold text-sm text-foreground truncate">{mat.title}</span>
                          </div>
                          {mat.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{mat.description}</p>
                          )}
                        </div>
                        <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-muted-foreground capitalize">
                            {mat.kind} · {mat.subject || 'General'}
                          </span>
                          {mat.url && (
                            <a
                              href={mat.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 font-medium"
                            >
                              <Download className="size-3" /> View
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Online Fee Payment Modal */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-emerald-600" />
              Pay Coaching Fees Online
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Select Month / Invoice</label>
              <Select value={payInvoiceId} onValueChange={(val) => {
                setPayInvoiceId(val)
                const inv = profile?.fees.invoices.find((i) => i.id === val)
                if (inv) {
                  const net = inv.net ?? Math.max(0, inv.amount - inv.discount)
                  const due = inv.outstanding ?? inv.balance ?? Math.max(0, net - inv.paidAmount)
                  setPayAmount(due > 0 ? due : net)
                }
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose month" />
                </SelectTrigger>
                <SelectContent>
                  {profile?.fees.invoices.map((inv) => {
                    const due = inv.outstanding ?? inv.balance ?? Math.max(0, (inv.net ?? inv.amount) - inv.paidAmount)
                    return (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.period} — {due > 0 ? `Due: ₹${due}` : `Paid: ₹${inv.paidAmount}`}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Payment Amount (₹ INR)</label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                min={1}
                className="mt-1 font-semibold text-foreground text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPayMethod('upi')}
                  className={cn(
                    'p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all',
                    payMethod === 'upi'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'border-border/60 hover:bg-muted/40 text-muted-foreground',
                  )}
                >
                  <QrCode className="size-4" />
                  <span>UPI / QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('card')}
                  className={cn(
                    'p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all',
                    payMethod === 'card'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'border-border/60 hover:bg-muted/40 text-muted-foreground',
                  )}
                >
                  <CreditCard className="size-4" />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayMethod('bank')}
                  className={cn(
                    'p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all',
                    payMethod === 'bank'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'border-border/60 hover:bg-muted/40 text-muted-foreground',
                  )}
                >
                  <Wallet className="size-4" />
                  <span>NetBanking</span>
                </button>
              </div>
            </div>

            {/* Payment Mode UI Details */}
            {payMethod === 'upi' ? (
              <div className="rounded-xl border bg-muted/20 p-3 flex items-center gap-3">
                <div className="size-16 rounded-lg bg-card border flex items-center justify-center shadow-xs">
                  <QrCode className="size-10 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold">Scan & Pay using any UPI app</p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">UPI ID: brightpath@okhdfcbank</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    Google Pay · PhonePe · Paytm · BHIM supported
                  </p>
                </div>
              </div>
            ) : payMethod === 'card' ? (
              <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Card Number</label>
                  <Input placeholder="4111 •••• •••• 1111" className="h-8 text-xs font-mono mt-0.5" defaultValue="4532 8923 1102 9845" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Expiry</label>
                    <Input placeholder="MM/YY" className="h-8 text-xs font-mono mt-0.5" defaultValue="08/29" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">CVV</label>
                    <Input placeholder="CVV" type="password" maxLength={3} className="h-8 text-xs font-mono mt-0.5" defaultValue="982" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border bg-muted/20 p-3 space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Select Bank</label>
                <Select defaultValue="hdfc">
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hdfc">HDFC Bank</SelectItem>
                    <SelectItem value="sbi">State Bank of India</SelectItem>
                    <SelectItem value="icici">ICICI Bank</SelectItem>
                    <SelectItem value="axis">Axis Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setPayModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={handleExecutePayment}
                disabled={payBusy}
              >
                {payBusy ? <Spinner /> : null}
                {payBusy ? 'Processing Payment…' : `Pay ₹${payAmount} Now`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Official Fee Receipt Modal */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-emerald-600" />
              Official Fee Receipt
            </DialogTitle>
          </DialogHeader>

          {receipt && (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{receipt.institute}</h4>
                    <p className="text-[11px] text-muted-foreground">Fee Collection & Accounts Office</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 uppercase">
                    PAID / VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Receipt No:</span>
                    <strong className="font-mono">{receipt.receiptNo}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Date & Time:</span>
                    <span>{receipt.paidAt}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Student:</span>
                    <strong className="text-foreground">{receipt.studentName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Class & Batch:</span>
                    <span>{receipt.className} · {receipt.batch}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Parent Name:</span>
                    <span>{receipt.parentName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Payment Mode:</span>
                    <span className="uppercase font-mono">{receipt.method}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/40 p-3 flex items-center justify-between border">
                  <div>
                    <span className="text-xs font-semibold text-foreground">Tuition Fee ({receipt.period})</span>
                    <p className="text-[10px] text-muted-foreground">Complete online fee settlement</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-emerald-600">{inr(receipt.amount)}</span>
                  </div>
                </div>

                <p className="text-[10px] text-center text-muted-foreground italic">
                  This is an official computer generated receipt. No physical signature is required.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
                  <Printer className="size-3.5" /> Print Receipt
                </Button>
                <Button size="sm" onClick={() => setReceiptModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
