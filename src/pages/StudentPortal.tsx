import { useEffect, useState } from 'react'
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  GraduationCap,
  MessageSquare,
  Phone,
  Search,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { api, errorMessage } from '@/lib/api'
import { formatDate, inr } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    feeAmount: number
    dueDay: number
    billed: number
    paid: number
    outstanding: number
    overdue: number
    invoices: {
      id: string
      period: string
      amount: number
      discount: number
      net: number
      paidAmount: number
      balance: number
      dueDate: string
      status: string
      overdue: boolean
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

export function StudentPortal({ user }: { user: AuthUser }) {
  const { toast } = useToast()
  const [students, setStudents] = useState<StudentItem[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(false)

  // 1. Fetch students list
  useEffect(() => {
    api
      .get<{ students: StudentItem[] }>('/students')
      .then((res) => {
        setStudents(res.students)
        if (res.students.length > 0) {
          setSelectedStudentId(res.students[0].id)
        }
      })
      .catch((err) => {
        toast('Failed to load students', { variant: 'error', description: errorMessage(err) })
      })
      .finally(() => setLoadingList(false))
  }, [toast])

  // 2. Fetch selected student's profile & timetable
  useEffect(() => {
    if (!selectedStudentId) return
    setLoadingProfile(true)

    Promise.all([
      api.get<ProfileData>(`/students/${selectedStudentId}/profile`),
      api.get<{ slots: TimetableSlot[] }>('/timetable'),
    ])
      .then(([profRes, ttRes]) => {
        setProfile(profRes)
        // Filter timetable for this student's class and batch
        const matchedSlots = ttRes.slots.filter(
          (s) =>
            s.subject &&
            (!profRes.student.className ||
              // match if slot has no class or matches student
              !('className' in s) ||
              (s as unknown as { className: string }).className === profRes.student.className),
        )
        setTimetableSlots(matchedSlots.length > 0 ? matchedSlots : ttRes.slots.slice(0, 8))
      })
      .catch((err) => {
        toast('Failed to load student details', { variant: 'error', description: errorMessage(err) })
      })
      .finally(() => setLoadingProfile(false))
  }, [selectedStudentId, toast])

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.className.toLowerCase().includes(search.toLowerCase()) ||
      s.batch.toLowerCase().includes(search.toLowerCase()) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(search.toLowerCase())),
  )

  const selectedStudent = students.find((s) => s.id === selectedStudentId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Portal"
        description="Comprehensive 360° academic & administrative profile for students, parents, and teachers."
      />

      {/* Student Selector Bar */}
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

      {loadingList || loadingProfile || !profile ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          <Spinner /> Loading student portal…
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
                    <span>Parent: <strong>{profile.student.parentName}</strong></span>
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
                <div className="text-xl font-bold text-foreground">
                  {profile.attendance.percentage}%
                </div>
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
                <div className={cn("text-xl font-bold", profile.fees.outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600")}>
                  {profile.fees.outstanding > 0 ? inr(profile.fees.outstanding) : 'Fully Paid'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Monthly fee: {inr(profile.fees.feeAmount)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-card/60 border border-border/50">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium">Study Materials</span>
                  <BookOpen className="size-3.5 text-purple-500" />
                </div>
                <div className="text-xl font-bold text-foreground">
                  {profile.materials.length} Available
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Notes, handouts & PDFs
                </div>
              </div>
            </div>
          </div>

          {/* Tabbed Content Navigation */}
          <Tabs defaultValue="attendance" className="space-y-4">
            <TabsList className="bg-muted/80 p-1 rounded-xl">
              <TabsTrigger value="attendance" className="gap-1.5 text-xs">
                <CalendarCheck className="size-3.5" /> Attendance
              </TabsTrigger>
              <TabsTrigger value="tests" className="gap-1.5 text-xs">
                <GraduationCap className="size-3.5" /> Test Reports
              </TabsTrigger>
              <TabsTrigger value="timetable" className="gap-1.5 text-xs">
                <CalendarDays className="size-3.5" /> Timetable
              </TabsTrigger>
              <TabsTrigger value="fees" className="gap-1.5 text-xs">
                <Wallet className="size-3.5" /> Fee Ledger
              </TabsTrigger>
              <TabsTrigger value="materials" className="gap-1.5 text-xs">
                <BookOpen className="size-3.5" /> Materials
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Attendance */}
            <TabsContent value="attendance" className="space-y-4">
              <div className="rounded-xl border bg-card p-4 sm:p-5">
                <h3 className="text-sm font-semibold mb-3">Attendance History (Recent Days)</h3>
                {profile.attendance.recent.length === 0 ? (
                  <EmptyState title="No attendance recorded" description="No attendance marked for this student yet." />
                ) : (
                  <div className="divide-y border rounded-xl overflow-hidden">
                    {profile.attendance.recent.map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between p-3 text-xs bg-card hover:bg-muted/30">
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
                            <span className="text-muted-foreground ml-2 capitalize">({rec.session})</span>
                          </div>
                        </div>
                        <StatusBadge status={rec.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: Tests */}
            <TabsContent value="tests" className="space-y-4">
              <div className="rounded-xl border bg-card p-4 sm:p-5">
                <h3 className="text-sm font-semibold mb-3">Test Scorecard & Evaluations</h3>
                {profile.tests.results.length === 0 ? (
                  <EmptyState title="No tests evaluated" description="This student has not participated in published tests yet." />
                ) : (
                  <div className="divide-y border rounded-xl overflow-hidden">
                    {profile.tests.results.map((tr) => (
                      <div key={tr.id} className="p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/30">
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

            {/* TAB 3: Timetable */}
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
                        <span>Faculty: {slot.teacher?.name || 'TBA'}</span>
                        {slot.room && <span className="font-mono">Room: {slot.room}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: Fees */}
            <TabsContent value="fees" className="space-y-4">
              <div className="rounded-xl border bg-card p-4 sm:p-5">
                <h3 className="text-sm font-semibold mb-3">Fee Invoices & Payment Ledger</h3>
                {profile.fees.invoices.length === 0 ? (
                  <EmptyState title="No invoices found" description="No fee invoices billed to this student yet." />
                ) : (
                  <div className="divide-y border rounded-xl overflow-hidden">
                    {profile.fees.invoices.map((inv) => (
                      <div key={inv.id} className="p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/30">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">Month: {inv.period}</span>
                            <StatusBadge status={inv.status} />
                          </div>
                          <p className="text-muted-foreground text-[11px] mt-0.5">
                            Due date: {formatDate(inv.dueDate)} · Billed: {inr(inv.net)} (Paid: {inr(inv.paidAmount)})
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className={cn("font-bold text-sm", inv.balance > 0 ? "text-amber-600" : "text-emerald-600")}>
                              {inv.balance > 0 ? `Due: ${inr(inv.balance)}` : 'Cleared'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                          <span className="text-[11px] text-muted-foreground capitalize">{mat.kind} · {mat.subject || 'General'}</span>
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
    </div>
  )
}
