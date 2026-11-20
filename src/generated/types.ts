// SPDX-License-Identifier: MIT
/**
 * Auto-generated Types
 *
 * TypeScript types for models and operations.
 */

// ============================================================================
// Model Types
// ============================================================================

export interface UserType {
  id: string
  email: string
  name?: string
  passwordHash: string
  role: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SessionType {
  id: string
  token: string
  userId: string
  expiresAt: Date
  createdAt: Date
}

export interface StudentType {
  id: string
  name: string
  className: string
  batch: string
  rollNo?: string
  parentName: string
  parentPhone: string
  parentEmail?: string
  admissionDate: Date
  status: string
  feeAmount: number
  feeDueDay: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface AttendanceType {
  id: string
  studentId: string
  date: string
  session: string
  status: string
  markedBy?: string
  source: string
  sheetId?: string
  note?: string
  createdAt: Date
  updatedAt: Date
}

export interface FeeInvoiceType {
  id: string
  studentId: string
  period: string
  amount: number
  discount: number
  paidAmount: number
  dueDate: Date
  status: string
  paidAt?: Date
  method?: string
  receiptNo?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface FeePaymentType {
  id: string
  invoiceId: string
  studentId: string
  amount: number
  method: string
  paidAt: Date
  receiptNo?: string
  note?: string
  recordedBy?: string
  createdAt: Date
}

export interface FeeStructureType {
  id: string
  className: string
  batch: string
  amount: number
  dueDay: number
  discount: number
  note?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ExpenseType {
  id: string
  category: string
  description: string
  amount: number
  date: string
  paidTo?: string
  method: string
  recordedBy?: string
  createdAt: Date
}

export interface TestType {
  id: string
  name: string
  subject: string
  className: string
  batch?: string
  date: Date
  maxMarks: number
  status: string
  publishedAt?: Date
  publishedBy?: string
  createdBy?: string
  createdAt: Date
}

export interface TestResultType {
  id: string
  testId: string
  studentId: string
  marks?: number
  status: string
  remarks?: string
  enteredBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface MessageLogType {
  id: string
  studentId?: string
  to: string
  template: string
  body: string
  status: string
  providerId?: string
  error?: string
  refId?: string
  sentBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface AutomationType {
  id: string
  key: string
  name: string
  description: string
  enabled: boolean
  updatedAt: Date
}

export interface SettingType {
  id: string
  key: string
  value: string
  updatedAt: Date
}

export interface ActivityType {
  id: string
  type: string
  message: string
  actor?: string
  createdAt: Date
}

export interface AttendanceSheetType {
  id: string
  code: string
  className: string
  batch: string
  date: string
  session: string
  status: string
  createdBy?: string
  uploadedBy?: string
  reviewedBy?: string
  confirmedBy?: string
  confirmedAt?: Date
  imageData?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface AttendanceScanRowType {
  id: string
  sheetId: string
  studentId?: string
  rollNo?: string
  studentName?: string
  detectedStatus?: string
  confidence: number
  finalStatus?: string
  verified: boolean
  needsReview: boolean
  note?: string
  createdAt: Date
  updatedAt: Date
}

export interface TeacherType {
  id: string
  userId?: string
  name: string
  email?: string
  phone?: string
  subjects: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface BatchAssignmentType {
  id: string
  teacherId: string
  className: string
  batch: string
  subject: string
  createdAt: Date
}

export interface TimetableSlotType {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  className: string
  batch: string
  subject: string
  teacherId?: string
  room?: string
  createdAt: Date
  updatedAt: Date
}

export interface StudyMaterialType {
  id: string
  title: string
  description?: string
  kind: string
  className: string
  batch: string
  subject?: string
  url?: string
  fileName?: string
  fileData?: string
  dueDate?: string
  uploadedBy?: string
  createdAt: Date
}

export interface AuditLogType {
  id: string
  entity: string
  entityId?: string
  action: string
  detail?: string
  actor?: string
  createdAt: Date
}

// ============================================================================
// Input Types
// ============================================================================

export interface UserCreateInput {
  email: string
  name?: string
  passwordHash: string
  role?: string
  active?: boolean
}

export interface UserUpdateInput {
  email?: string
  name?: string
  passwordHash?: string
  role?: string
  active?: boolean
}

export interface SessionCreateInput {
  token: string
  userId: string
  expiresAt: Date
}

export interface SessionUpdateInput {
  token?: string
  userId?: string
  expiresAt?: Date
}

export interface StudentCreateInput {
  name: string
  className: string
  batch: string
  rollNo?: string
  parentName: string
  parentPhone: string
  parentEmail?: string
  admissionDate?: Date
  status?: string
  feeAmount?: number
  feeDueDay?: number
  notes?: string
}

export interface StudentUpdateInput {
  name?: string
  className?: string
  batch?: string
  rollNo?: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
  admissionDate?: Date
  status?: string
  feeAmount?: number
  feeDueDay?: number
  notes?: string
}

export interface AttendanceCreateInput {
  studentId: string
  date: string
  session?: string
  status: string
  markedBy?: string
  source?: string
  sheetId?: string
  note?: string
}

export interface AttendanceUpdateInput {
  studentId?: string
  date?: string
  session?: string
  status?: string
  markedBy?: string
  source?: string
  sheetId?: string
  note?: string
}

export interface FeeInvoiceCreateInput {
  studentId: string
  period: string
  amount: number
  discount?: number
  paidAmount?: number
  dueDate: Date
  status?: string
  paidAt?: Date
  method?: string
  receiptNo?: string
  notes?: string
}

export interface FeeInvoiceUpdateInput {
  studentId?: string
  period?: string
  amount?: number
  discount?: number
  paidAmount?: number
  dueDate?: Date
  status?: string
  paidAt?: Date
  method?: string
  receiptNo?: string
  notes?: string
}

export interface FeePaymentCreateInput {
  invoiceId: string
  studentId: string
  amount: number
  method?: string
  paidAt?: Date
  receiptNo?: string
  note?: string
  recordedBy?: string
}

export interface FeePaymentUpdateInput {
  invoiceId?: string
  studentId?: string
  amount?: number
  method?: string
  paidAt?: Date
  receiptNo?: string
  note?: string
  recordedBy?: string
}

export interface FeeStructureCreateInput {
  className: string
  batch?: string
  amount: number
  dueDay?: number
  discount?: number
  note?: string
  active?: boolean
}

export interface FeeStructureUpdateInput {
  className?: string
  batch?: string
  amount?: number
  dueDay?: number
  discount?: number
  note?: string
  active?: boolean
}

export interface ExpenseCreateInput {
  category: string
  description: string
  amount: number
  date: string
  paidTo?: string
  method?: string
  recordedBy?: string
}

export interface ExpenseUpdateInput {
  category?: string
  description?: string
  amount?: number
  date?: string
  paidTo?: string
  method?: string
  recordedBy?: string
}

export interface TestCreateInput {
  name: string
  subject: string
  className: string
  batch?: string
  date: Date
  maxMarks?: number
  status?: string
  publishedAt?: Date
  publishedBy?: string
  createdBy?: string
}

export interface TestUpdateInput {
  name?: string
  subject?: string
  className?: string
  batch?: string
  date?: Date
  maxMarks?: number
  status?: string
  publishedAt?: Date
  publishedBy?: string
  createdBy?: string
}

export interface TestResultCreateInput {
  testId: string
  studentId: string
  marks?: number
  status?: string
  remarks?: string
  enteredBy?: string
}

export interface TestResultUpdateInput {
  testId?: string
  studentId?: string
  marks?: number
  status?: string
  remarks?: string
  enteredBy?: string
}

export interface MessageLogCreateInput {
  studentId?: string
  to: string
  template: string
  body: string
  status?: string
  providerId?: string
  error?: string
  refId?: string
  sentBy?: string
}

export interface MessageLogUpdateInput {
  studentId?: string
  to?: string
  template?: string
  body?: string
  status?: string
  providerId?: string
  error?: string
  refId?: string
  sentBy?: string
}

export interface AutomationCreateInput {
  key: string
  name: string
  description: string
  enabled?: boolean
}

export interface AutomationUpdateInput {
  key?: string
  name?: string
  description?: string
  enabled?: boolean
}

export interface SettingCreateInput {
  key: string
  value: string
}

export interface SettingUpdateInput {
  key?: string
  value?: string
}

export interface ActivityCreateInput {
  type: string
  message: string
  actor?: string
}

export interface ActivityUpdateInput {
  type?: string
  message?: string
  actor?: string
}

export interface AttendanceSheetCreateInput {
  code: string
  className: string
  batch: string
  date: string
  session?: string
  status?: string
  createdBy?: string
  uploadedBy?: string
  reviewedBy?: string
  confirmedBy?: string
  confirmedAt?: Date
  imageData?: string
  notes?: string
}

export interface AttendanceSheetUpdateInput {
  code?: string
  className?: string
  batch?: string
  date?: string
  session?: string
  status?: string
  createdBy?: string
  uploadedBy?: string
  reviewedBy?: string
  confirmedBy?: string
  confirmedAt?: Date
  imageData?: string
  notes?: string
}

export interface AttendanceScanRowCreateInput {
  sheetId: string
  studentId?: string
  rollNo?: string
  studentName?: string
  detectedStatus?: string
  confidence?: number
  finalStatus?: string
  verified?: boolean
  needsReview?: boolean
  note?: string
}

export interface AttendanceScanRowUpdateInput {
  sheetId?: string
  studentId?: string
  rollNo?: string
  studentName?: string
  detectedStatus?: string
  confidence?: number
  finalStatus?: string
  verified?: boolean
  needsReview?: boolean
  note?: string
}

export interface TeacherCreateInput {
  userId?: string
  name: string
  email?: string
  phone?: string
  subjects?: string
  active?: boolean
}

export interface TeacherUpdateInput {
  userId?: string
  name?: string
  email?: string
  phone?: string
  subjects?: string
  active?: boolean
}

export interface BatchAssignmentCreateInput {
  teacherId: string
  className: string
  batch: string
  subject: string
}

export interface BatchAssignmentUpdateInput {
  teacherId?: string
  className?: string
  batch?: string
  subject?: string
}

export interface TimetableSlotCreateInput {
  dayOfWeek: number
  startTime: string
  endTime: string
  className: string
  batch: string
  subject: string
  teacherId?: string
  room?: string
}

export interface TimetableSlotUpdateInput {
  dayOfWeek?: number
  startTime?: string
  endTime?: string
  className?: string
  batch?: string
  subject?: string
  teacherId?: string
  room?: string
}

export interface StudyMaterialCreateInput {
  title: string
  description?: string
  kind?: string
  className: string
  batch?: string
  subject?: string
  url?: string
  fileName?: string
  fileData?: string
  dueDate?: string
  uploadedBy?: string
}

export interface StudyMaterialUpdateInput {
  title?: string
  description?: string
  kind?: string
  className?: string
  batch?: string
  subject?: string
  url?: string
  fileName?: string
  fileData?: string
  dueDate?: string
  uploadedBy?: string
}

export interface AuditLogCreateInput {
  entity: string
  entityId?: string
  action: string
  detail?: string
  actor?: string
}

export interface AuditLogUpdateInput {
  entity?: string
  entityId?: string
  action?: string
  detail?: string
  actor?: string
}

// ============================================================================
// Hook Types
// ============================================================================

export interface HookContext {
  userId?: string
}

export interface ListHookResult {
  where?: Record<string, unknown>
}

export interface GetHookResult {
  deny?: boolean
}

export interface UpdateHookResult<T> {
  deny?: boolean
  input?: T
}

export interface DeleteHookResult {
  deny?: boolean
}

export interface ModelHooks<TCreate, TUpdate, TModel> {
  beforeList?: (ctx: HookContext) => Promise<ListHookResult | void>
  beforeGet?: (id: string, ctx: HookContext) => Promise<GetHookResult | void>
  beforeCreate?: (input: TCreate, ctx: HookContext) => Promise<TCreate>
  afterCreate?: (item: TModel, ctx: HookContext) => Promise<void>
  beforeUpdate?: (id: string, input: TUpdate, ctx: HookContext) => Promise<UpdateHookResult<TUpdate> | void>
  afterUpdate?: (item: TModel, ctx: HookContext) => Promise<void>
  beforeDelete?: (id: string, ctx: HookContext) => Promise<DeleteHookResult | void>
  afterDelete?: (id: string, ctx: HookContext) => Promise<void>
}

export interface ServerFunctionHooks {
  User?: ModelHooks<UserCreateInput, UserUpdateInput, UserType>
  Session?: ModelHooks<SessionCreateInput, SessionUpdateInput, SessionType>
  Student?: ModelHooks<StudentCreateInput, StudentUpdateInput, StudentType>
  Attendance?: ModelHooks<AttendanceCreateInput, AttendanceUpdateInput, AttendanceType>
  FeeInvoice?: ModelHooks<FeeInvoiceCreateInput, FeeInvoiceUpdateInput, FeeInvoiceType>
  FeePayment?: ModelHooks<FeePaymentCreateInput, FeePaymentUpdateInput, FeePaymentType>
  FeeStructure?: ModelHooks<FeeStructureCreateInput, FeeStructureUpdateInput, FeeStructureType>
  Expense?: ModelHooks<ExpenseCreateInput, ExpenseUpdateInput, ExpenseType>
  Test?: ModelHooks<TestCreateInput, TestUpdateInput, TestType>
  TestResult?: ModelHooks<TestResultCreateInput, TestResultUpdateInput, TestResultType>
  MessageLog?: ModelHooks<MessageLogCreateInput, MessageLogUpdateInput, MessageLogType>
  Automation?: ModelHooks<AutomationCreateInput, AutomationUpdateInput, AutomationType>
  Setting?: ModelHooks<SettingCreateInput, SettingUpdateInput, SettingType>
  Activity?: ModelHooks<ActivityCreateInput, ActivityUpdateInput, ActivityType>
  AttendanceSheet?: ModelHooks<AttendanceSheetCreateInput, AttendanceSheetUpdateInput, AttendanceSheetType>
  AttendanceScanRow?: ModelHooks<AttendanceScanRowCreateInput, AttendanceScanRowUpdateInput, AttendanceScanRowType>
  Teacher?: ModelHooks<TeacherCreateInput, TeacherUpdateInput, TeacherType>
  BatchAssignment?: ModelHooks<BatchAssignmentCreateInput, BatchAssignmentUpdateInput, BatchAssignmentType>
  TimetableSlot?: ModelHooks<TimetableSlotCreateInput, TimetableSlotUpdateInput, TimetableSlotType>
  StudyMaterial?: ModelHooks<StudyMaterialCreateInput, StudyMaterialUpdateInput, StudyMaterialType>
  AuditLog?: ModelHooks<AuditLogCreateInput, AuditLogUpdateInput, AuditLogType>
}
