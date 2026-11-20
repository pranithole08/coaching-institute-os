// SPDX-License-Identifier: MIT
/**
 * Auto-generated Client Functions
 *
 * Fetch-based CRUD operations that call the Hono REST API.
 * No server-side imports — safe for browser bundles.
 */

import type {
  UserType,
  UserCreateInput,
  UserUpdateInput,
  SessionType,
  SessionCreateInput,
  SessionUpdateInput,
  StudentType,
  StudentCreateInput,
  StudentUpdateInput,
  AttendanceType,
  AttendanceCreateInput,
  AttendanceUpdateInput,
  FeeInvoiceType,
  FeeInvoiceCreateInput,
  FeeInvoiceUpdateInput,
  FeePaymentType,
  FeePaymentCreateInput,
  FeePaymentUpdateInput,
  FeeStructureType,
  FeeStructureCreateInput,
  FeeStructureUpdateInput,
  ExpenseType,
  ExpenseCreateInput,
  ExpenseUpdateInput,
  TestType,
  TestCreateInput,
  TestUpdateInput,
  TestResultType,
  TestResultCreateInput,
  TestResultUpdateInput,
  MessageLogType,
  MessageLogCreateInput,
  MessageLogUpdateInput,
  AutomationType,
  AutomationCreateInput,
  AutomationUpdateInput,
  SettingType,
  SettingCreateInput,
  SettingUpdateInput,
  ActivityType,
  ActivityCreateInput,
  ActivityUpdateInput,
  AttendanceSheetType,
  AttendanceSheetCreateInput,
  AttendanceSheetUpdateInput,
  AttendanceScanRowType,
  AttendanceScanRowCreateInput,
  AttendanceScanRowUpdateInput,
  TeacherType,
  TeacherCreateInput,
  TeacherUpdateInput,
  BatchAssignmentType,
  BatchAssignmentCreateInput,
  BatchAssignmentUpdateInput,
  TimetableSlotType,
  TimetableSlotCreateInput,
  TimetableSlotUpdateInput,
  StudyMaterialType,
  StudyMaterialCreateInput,
  StudyMaterialUpdateInput,
  AuditLogType,
  AuditLogCreateInput,
  AuditLogUpdateInput,
} from './types'

/** Get the API base URL */
function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return process.env.API_URL || 'http://localhost:3001'
}

// ============================================================================
// User Client Functions
// ============================================================================

/**
 * List all User records
 */
export async function getUserList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<UserType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/users${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list User')
  }
  const json = await response.json()
  return (json.items || []) as UserType[]
}

/**
 * Get a single User by ID
 */
export async function getUserById(args: { data: { id: string; userId?: string } }): Promise<UserType> {
  const url = `${getApiBase()}/api/users/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'User not found')
  }
  const json = await response.json()
  return json.data as UserType
}

/**
 * Create a new User
 */
export async function createUser(args: { data: { input: UserCreateInput; userId?: string } }): Promise<UserType> {
  const url = `${getApiBase()}/api/users`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create User')
  }
  const json = await response.json()
  return json.data as UserType
}

/**
 * Update an existing User
 */
export async function updateUser(args: { data: { id: string; input: UserUpdateInput; userId?: string } }): Promise<UserType> {
  const url = `${getApiBase()}/api/users/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update User')
  }
  const json = await response.json()
  return json.data as UserType
}

/**
 * Delete a User
 */
export async function deleteUser(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/users/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete User')
  }
  return { success: true }
}

// ============================================================================
// Session Client Functions
// ============================================================================

/**
 * List all Session records
 */
export async function getSessionList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<SessionType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/sessions${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list Session')
  }
  const json = await response.json()
  return (json.items || []) as SessionType[]
}

/**
 * Get a single Session by ID
 */
export async function getSessionById(args: { data: { id: string; userId?: string } }): Promise<SessionType> {
  const url = `${getApiBase()}/api/sessions/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Session not found')
  }
  const json = await response.json()
  return json.data as SessionType
}

/**
 * Create a new Session
 */
export async function createSession(args: { data: { input: SessionCreateInput; userId?: string } }): Promise<SessionType> {
  const url = `${getApiBase()}/api/sessions`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create Session')
  }
  const json = await response.json()
  return json.data as SessionType
}

/**
 * Update an existing Session
 */
export async function updateSession(args: { data: { id: string; input: SessionUpdateInput; userId?: string } }): Promise<SessionType> {
  const url = `${getApiBase()}/api/sessions/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update Session')
  }
  const json = await response.json()
  return json.data as SessionType
}

/**
 * Delete a Session
 */
export async function deleteSession(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/sessions/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete Session')
  }
  return { success: true }
}

// ============================================================================
// Student Client Functions
// ============================================================================

/**
 * List all Student records
 */
export async function getStudentList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<StudentType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/students${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list Student')
  }
  const json = await response.json()
  return (json.items || []) as StudentType[]
}

/**
 * Get a single Student by ID
 */
export async function getStudentById(args: { data: { id: string; userId?: string } }): Promise<StudentType> {
  const url = `${getApiBase()}/api/students/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Student not found')
  }
  const json = await response.json()
  return json.data as StudentType
}

/**
 * Create a new Student
 */
export async function createStudent(args: { data: { input: StudentCreateInput; userId?: string } }): Promise<StudentType> {
  const url = `${getApiBase()}/api/students`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create Student')
  }
  const json = await response.json()
  return json.data as StudentType
}

/**
 * Update an existing Student
 */
export async function updateStudent(args: { data: { id: string; input: StudentUpdateInput; userId?: string } }): Promise<StudentType> {
  const url = `${getApiBase()}/api/students/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update Student')
  }
  const json = await response.json()
  return json.data as StudentType
}

/**
 * Delete a Student
 */
export async function deleteStudent(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/students/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete Student')
  }
  return { success: true }
}

// ============================================================================
// Attendance Client Functions
// ============================================================================

/**
 * List all Attendance records
 */
export async function getAttendanceList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<AttendanceType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/attendances${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list Attendance')
  }
  const json = await response.json()
  return (json.items || []) as AttendanceType[]
}

/**
 * Get a single Attendance by ID
 */
export async function getAttendanceById(args: { data: { id: string; userId?: string } }): Promise<AttendanceType> {
  const url = `${getApiBase()}/api/attendances/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Attendance not found')
  }
  const json = await response.json()
  return json.data as AttendanceType
}

/**
 * Create a new Attendance
 */
export async function createAttendance(args: { data: { input: AttendanceCreateInput; userId?: string } }): Promise<AttendanceType> {
  const url = `${getApiBase()}/api/attendances`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create Attendance')
  }
  const json = await response.json()
  return json.data as AttendanceType
}

/**
 * Update an existing Attendance
 */
export async function updateAttendance(args: { data: { id: string; input: AttendanceUpdateInput; userId?: string } }): Promise<AttendanceType> {
  const url = `${getApiBase()}/api/attendances/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update Attendance')
  }
  const json = await response.json()
  return json.data as AttendanceType
}

/**
 * Delete a Attendance
 */
export async function deleteAttendance(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/attendances/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete Attendance')
  }
  return { success: true }
}

// ============================================================================
// FeeInvoice Client Functions
// ============================================================================

/**
 * List all FeeInvoice records
 */
export async function getFeeInvoiceList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<FeeInvoiceType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/fee-invoices${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list FeeInvoice')
  }
  const json = await response.json()
  return (json.items || []) as FeeInvoiceType[]
}

/**
 * Get a single FeeInvoice by ID
 */
export async function getFeeInvoiceById(args: { data: { id: string; userId?: string } }): Promise<FeeInvoiceType> {
  const url = `${getApiBase()}/api/fee-invoices/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'FeeInvoice not found')
  }
  const json = await response.json()
  return json.data as FeeInvoiceType
}

/**
 * Create a new FeeInvoice
 */
export async function createFeeInvoice(args: { data: { input: FeeInvoiceCreateInput; userId?: string } }): Promise<FeeInvoiceType> {
  const url = `${getApiBase()}/api/fee-invoices`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create FeeInvoice')
  }
  const json = await response.json()
  return json.data as FeeInvoiceType
}

/**
 * Update an existing FeeInvoice
 */
export async function updateFeeInvoice(args: { data: { id: string; input: FeeInvoiceUpdateInput; userId?: string } }): Promise<FeeInvoiceType> {
  const url = `${getApiBase()}/api/fee-invoices/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update FeeInvoice')
  }
  const json = await response.json()
  return json.data as FeeInvoiceType
}

/**
 * Delete a FeeInvoice
 */
export async function deleteFeeInvoice(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/fee-invoices/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete FeeInvoice')
  }
  return { success: true }
}

// ============================================================================
// FeePayment Client Functions
// ============================================================================

/**
 * List all FeePayment records
 */
export async function getFeePaymentList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<FeePaymentType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/fee-payments${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list FeePayment')
  }
  const json = await response.json()
  return (json.items || []) as FeePaymentType[]
}

/**
 * Get a single FeePayment by ID
 */
export async function getFeePaymentById(args: { data: { id: string; userId?: string } }): Promise<FeePaymentType> {
  const url = `${getApiBase()}/api/fee-payments/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'FeePayment not found')
  }
  const json = await response.json()
  return json.data as FeePaymentType
}

/**
 * Create a new FeePayment
 */
export async function createFeePayment(args: { data: { input: FeePaymentCreateInput; userId?: string } }): Promise<FeePaymentType> {
  const url = `${getApiBase()}/api/fee-payments`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create FeePayment')
  }
  const json = await response.json()
  return json.data as FeePaymentType
}

/**
 * Update an existing FeePayment
 */
export async function updateFeePayment(args: { data: { id: string; input: FeePaymentUpdateInput; userId?: string } }): Promise<FeePaymentType> {
  const url = `${getApiBase()}/api/fee-payments/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update FeePayment')
  }
  const json = await response.json()
  return json.data as FeePaymentType
}

/**
 * Delete a FeePayment
 */
export async function deleteFeePayment(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/fee-payments/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete FeePayment')
  }
  return { success: true }
}

// ============================================================================
// FeeStructure Client Functions
// ============================================================================

/**
 * List all FeeStructure records
 */
export async function getFeeStructureList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<FeeStructureType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/fee-structures${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list FeeStructure')
  }
  const json = await response.json()
  return (json.items || []) as FeeStructureType[]
}

/**
 * Get a single FeeStructure by ID
 */
export async function getFeeStructureById(args: { data: { id: string; userId?: string } }): Promise<FeeStructureType> {
  const url = `${getApiBase()}/api/fee-structures/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'FeeStructure not found')
  }
  const json = await response.json()
  return json.data as FeeStructureType
}

/**
 * Create a new FeeStructure
 */
export async function createFeeStructure(args: { data: { input: FeeStructureCreateInput; userId?: string } }): Promise<FeeStructureType> {
  const url = `${getApiBase()}/api/fee-structures`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create FeeStructure')
  }
  const json = await response.json()
  return json.data as FeeStructureType
}

/**
 * Update an existing FeeStructure
 */
export async function updateFeeStructure(args: { data: { id: string; input: FeeStructureUpdateInput; userId?: string } }): Promise<FeeStructureType> {
  const url = `${getApiBase()}/api/fee-structures/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update FeeStructure')
  }
  const json = await response.json()
  return json.data as FeeStructureType
}

/**
 * Delete a FeeStructure
 */
export async function deleteFeeStructure(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/fee-structures/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete FeeStructure')
  }
  return { success: true }
}

// ============================================================================
// Expense Client Functions
// ============================================================================

/**
 * List all Expense records
 */
export async function getExpenseList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<ExpenseType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/expenses${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list Expense')
  }
  const json = await response.json()
  return (json.items || []) as ExpenseType[]
}

/**
 * Get a single Expense by ID
 */
export async function getExpenseById(args: { data: { id: string; userId?: string } }): Promise<ExpenseType> {
  const url = `${getApiBase()}/api/expenses/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Expense not found')
  }
  const json = await response.json()
  return json.data as ExpenseType
}

/**
 * Create a new Expense
 */
export async function createExpense(args: { data: { input: ExpenseCreateInput; userId?: string } }): Promise<ExpenseType> {
  const url = `${getApiBase()}/api/expenses`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create Expense')
  }
  const json = await response.json()
  return json.data as ExpenseType
}

/**
 * Update an existing Expense
 */
export async function updateExpense(args: { data: { id: string; input: ExpenseUpdateInput; userId?: string } }): Promise<ExpenseType> {
  const url = `${getApiBase()}/api/expenses/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update Expense')
  }
  const json = await response.json()
  return json.data as ExpenseType
}

/**
 * Delete a Expense
 */
export async function deleteExpense(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/expenses/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete Expense')
  }
  return { success: true }
}

// ============================================================================
// Test Client Functions
// ============================================================================

/**
 * List all Test records
 */
export async function getTestList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<TestType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/tests${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list Test')
  }
  const json = await response.json()
  return (json.items || []) as TestType[]
}

/**
 * Get a single Test by ID
 */
export async function getTestById(args: { data: { id: string; userId?: string } }): Promise<TestType> {
  const url = `${getApiBase()}/api/tests/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Test not found')
  }
  const json = await response.json()
  return json.data as TestType
}

/**
 * Create a new Test
 */
export async function createTest(args: { data: { input: TestCreateInput; userId?: string } }): Promise<TestType> {
  const url = `${getApiBase()}/api/tests`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create Test')
  }
  const json = await response.json()
  return json.data as TestType
}

/**
 * Update an existing Test
 */
export async function updateTest(args: { data: { id: string; input: TestUpdateInput; userId?: string } }): Promise<TestType> {
  const url = `${getApiBase()}/api/tests/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update Test')
  }
  const json = await response.json()
  return json.data as TestType
}

/**
 * Delete a Test
 */
export async function deleteTest(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/tests/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete Test')
  }
  return { success: true }
}

// ============================================================================
// TestResult Client Functions
// ============================================================================

/**
 * List all TestResult records
 */
export async function getTestResultList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<TestResultType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/test-results${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list TestResult')
  }
  const json = await response.json()
  return (json.items || []) as TestResultType[]
}

/**
 * Get a single TestResult by ID
 */
export async function getTestResultById(args: { data: { id: string; userId?: string } }): Promise<TestResultType> {
  const url = `${getApiBase()}/api/test-results/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'TestResult not found')
  }
  const json = await response.json()
  return json.data as TestResultType
}

/**
 * Create a new TestResult
 */
export async function createTestResult(args: { data: { input: TestResultCreateInput; userId?: string } }): Promise<TestResultType> {
  const url = `${getApiBase()}/api/test-results`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create TestResult')
  }
  const json = await response.json()
  return json.data as TestResultType
}

/**
 * Update an existing TestResult
 */
export async function updateTestResult(args: { data: { id: string; input: TestResultUpdateInput; userId?: string } }): Promise<TestResultType> {
  const url = `${getApiBase()}/api/test-results/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update TestResult')
  }
  const json = await response.json()
  return json.data as TestResultType
}

/**
 * Delete a TestResult
 */
export async function deleteTestResult(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/test-results/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete TestResult')
  }
  return { success: true }
}

// ============================================================================
// MessageLog Client Functions
// ============================================================================

/**
 * List all MessageLog records
 */
export async function getMessageLogList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<MessageLogType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/message-logs${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list MessageLog')
  }
  const json = await response.json()
  return (json.items || []) as MessageLogType[]
}

/**
 * Get a single MessageLog by ID
 */
export async function getMessageLogById(args: { data: { id: string; userId?: string } }): Promise<MessageLogType> {
  const url = `${getApiBase()}/api/message-logs/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'MessageLog not found')
  }
  const json = await response.json()
  return json.data as MessageLogType
}

/**
 * Create a new MessageLog
 */
export async function createMessageLog(args: { data: { input: MessageLogCreateInput; userId?: string } }): Promise<MessageLogType> {
  const url = `${getApiBase()}/api/message-logs`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create MessageLog')
  }
  const json = await response.json()
  return json.data as MessageLogType
}

/**
 * Update an existing MessageLog
 */
export async function updateMessageLog(args: { data: { id: string; input: MessageLogUpdateInput; userId?: string } }): Promise<MessageLogType> {
  const url = `${getApiBase()}/api/message-logs/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update MessageLog')
  }
  const json = await response.json()
  return json.data as MessageLogType
}

/**
 * Delete a MessageLog
 */
export async function deleteMessageLog(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/message-logs/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete MessageLog')
  }
  return { success: true }
}

// ============================================================================
// Automation Client Functions
// ============================================================================

/**
 * List all Automation records
 */
export async function getAutomationList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<AutomationType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/automations${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list Automation')
  }
  const json = await response.json()
  return (json.items || []) as AutomationType[]
}

/**
 * Get a single Automation by ID
 */
export async function getAutomationById(args: { data: { id: string; userId?: string } }): Promise<AutomationType> {
  const url = `${getApiBase()}/api/automations/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Automation not found')
  }
  const json = await response.json()
  return json.data as AutomationType
}

/**
 * Create a new Automation
 */
export async function createAutomation(args: { data: { input: AutomationCreateInput; userId?: string } }): Promise<AutomationType> {
  const url = `${getApiBase()}/api/automations`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create Automation')
  }
  const json = await response.json()
  return json.data as AutomationType
}

/**
 * Update an existing Automation
 */
export async function updateAutomation(args: { data: { id: string; input: AutomationUpdateInput; userId?: string } }): Promise<AutomationType> {
  const url = `${getApiBase()}/api/automations/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update Automation')
  }
  const json = await response.json()
  return json.data as AutomationType
}

/**
 * Delete a Automation
 */
export async function deleteAutomation(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/automations/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete Automation')
  }
  return { success: true }
}

// ============================================================================
// Setting Client Functions
// ============================================================================

/**
 * List all Setting records
 */
export async function getSettingList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<SettingType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/settings${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list Setting')
  }
  const json = await response.json()
  return (json.items || []) as SettingType[]
}

/**
 * Get a single Setting by ID
 */
export async function getSettingById(args: { data: { id: string; userId?: string } }): Promise<SettingType> {
  const url = `${getApiBase()}/api/settings/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Setting not found')
  }
  const json = await response.json()
  return json.data as SettingType
}

/**
 * Create a new Setting
 */
export async function createSetting(args: { data: { input: SettingCreateInput; userId?: string } }): Promise<SettingType> {
  const url = `${getApiBase()}/api/settings`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create Setting')
  }
  const json = await response.json()
  return json.data as SettingType
}

/**
 * Update an existing Setting
 */
export async function updateSetting(args: { data: { id: string; input: SettingUpdateInput; userId?: string } }): Promise<SettingType> {
  const url = `${getApiBase()}/api/settings/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update Setting')
  }
  const json = await response.json()
  return json.data as SettingType
}

/**
 * Delete a Setting
 */
export async function deleteSetting(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/settings/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete Setting')
  }
  return { success: true }
}

// ============================================================================
// Activity Client Functions
// ============================================================================

/**
 * List all Activity records
 */
export async function getActivityList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<ActivityType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/activities${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list Activity')
  }
  const json = await response.json()
  return (json.items || []) as ActivityType[]
}

/**
 * Get a single Activity by ID
 */
export async function getActivityById(args: { data: { id: string; userId?: string } }): Promise<ActivityType> {
  const url = `${getApiBase()}/api/activities/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Activity not found')
  }
  const json = await response.json()
  return json.data as ActivityType
}

/**
 * Create a new Activity
 */
export async function createActivity(args: { data: { input: ActivityCreateInput; userId?: string } }): Promise<ActivityType> {
  const url = `${getApiBase()}/api/activities`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create Activity')
  }
  const json = await response.json()
  return json.data as ActivityType
}

/**
 * Update an existing Activity
 */
export async function updateActivity(args: { data: { id: string; input: ActivityUpdateInput; userId?: string } }): Promise<ActivityType> {
  const url = `${getApiBase()}/api/activities/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update Activity')
  }
  const json = await response.json()
  return json.data as ActivityType
}

/**
 * Delete a Activity
 */
export async function deleteActivity(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/activities/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete Activity')
  }
  return { success: true }
}

// ============================================================================
// AttendanceSheet Client Functions
// ============================================================================

/**
 * List all AttendanceSheet records
 */
export async function getAttendanceSheetList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<AttendanceSheetType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/attendance-sheets${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list AttendanceSheet')
  }
  const json = await response.json()
  return (json.items || []) as AttendanceSheetType[]
}

/**
 * Get a single AttendanceSheet by ID
 */
export async function getAttendanceSheetById(args: { data: { id: string; userId?: string } }): Promise<AttendanceSheetType> {
  const url = `${getApiBase()}/api/attendance-sheets/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'AttendanceSheet not found')
  }
  const json = await response.json()
  return json.data as AttendanceSheetType
}

/**
 * Create a new AttendanceSheet
 */
export async function createAttendanceSheet(args: { data: { input: AttendanceSheetCreateInput; userId?: string } }): Promise<AttendanceSheetType> {
  const url = `${getApiBase()}/api/attendance-sheets`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create AttendanceSheet')
  }
  const json = await response.json()
  return json.data as AttendanceSheetType
}

/**
 * Update an existing AttendanceSheet
 */
export async function updateAttendanceSheet(args: { data: { id: string; input: AttendanceSheetUpdateInput; userId?: string } }): Promise<AttendanceSheetType> {
  const url = `${getApiBase()}/api/attendance-sheets/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update AttendanceSheet')
  }
  const json = await response.json()
  return json.data as AttendanceSheetType
}

/**
 * Delete a AttendanceSheet
 */
export async function deleteAttendanceSheet(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/attendance-sheets/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete AttendanceSheet')
  }
  return { success: true }
}

// ============================================================================
// AttendanceScanRow Client Functions
// ============================================================================

/**
 * List all AttendanceScanRow records
 */
export async function getAttendanceScanRowList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<AttendanceScanRowType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/attendance-scan-rows${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list AttendanceScanRow')
  }
  const json = await response.json()
  return (json.items || []) as AttendanceScanRowType[]
}

/**
 * Get a single AttendanceScanRow by ID
 */
export async function getAttendanceScanRowById(args: { data: { id: string; userId?: string } }): Promise<AttendanceScanRowType> {
  const url = `${getApiBase()}/api/attendance-scan-rows/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'AttendanceScanRow not found')
  }
  const json = await response.json()
  return json.data as AttendanceScanRowType
}

/**
 * Create a new AttendanceScanRow
 */
export async function createAttendanceScanRow(args: { data: { input: AttendanceScanRowCreateInput; userId?: string } }): Promise<AttendanceScanRowType> {
  const url = `${getApiBase()}/api/attendance-scan-rows`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create AttendanceScanRow')
  }
  const json = await response.json()
  return json.data as AttendanceScanRowType
}

/**
 * Update an existing AttendanceScanRow
 */
export async function updateAttendanceScanRow(args: { data: { id: string; input: AttendanceScanRowUpdateInput; userId?: string } }): Promise<AttendanceScanRowType> {
  const url = `${getApiBase()}/api/attendance-scan-rows/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update AttendanceScanRow')
  }
  const json = await response.json()
  return json.data as AttendanceScanRowType
}

/**
 * Delete a AttendanceScanRow
 */
export async function deleteAttendanceScanRow(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/attendance-scan-rows/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete AttendanceScanRow')
  }
  return { success: true }
}

// ============================================================================
// Teacher Client Functions
// ============================================================================

/**
 * List all Teacher records
 */
export async function getTeacherList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<TeacherType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/teachers${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list Teacher')
  }
  const json = await response.json()
  return (json.items || []) as TeacherType[]
}

/**
 * Get a single Teacher by ID
 */
export async function getTeacherById(args: { data: { id: string; userId?: string } }): Promise<TeacherType> {
  const url = `${getApiBase()}/api/teachers/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Teacher not found')
  }
  const json = await response.json()
  return json.data as TeacherType
}

/**
 * Create a new Teacher
 */
export async function createTeacher(args: { data: { input: TeacherCreateInput; userId?: string } }): Promise<TeacherType> {
  const url = `${getApiBase()}/api/teachers`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create Teacher')
  }
  const json = await response.json()
  return json.data as TeacherType
}

/**
 * Update an existing Teacher
 */
export async function updateTeacher(args: { data: { id: string; input: TeacherUpdateInput; userId?: string } }): Promise<TeacherType> {
  const url = `${getApiBase()}/api/teachers/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update Teacher')
  }
  const json = await response.json()
  return json.data as TeacherType
}

/**
 * Delete a Teacher
 */
export async function deleteTeacher(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/teachers/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete Teacher')
  }
  return { success: true }
}

// ============================================================================
// BatchAssignment Client Functions
// ============================================================================

/**
 * List all BatchAssignment records
 */
export async function getBatchAssignmentList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<BatchAssignmentType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/batch-assignments${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list BatchAssignment')
  }
  const json = await response.json()
  return (json.items || []) as BatchAssignmentType[]
}

/**
 * Get a single BatchAssignment by ID
 */
export async function getBatchAssignmentById(args: { data: { id: string; userId?: string } }): Promise<BatchAssignmentType> {
  const url = `${getApiBase()}/api/batch-assignments/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'BatchAssignment not found')
  }
  const json = await response.json()
  return json.data as BatchAssignmentType
}

/**
 * Create a new BatchAssignment
 */
export async function createBatchAssignment(args: { data: { input: BatchAssignmentCreateInput; userId?: string } }): Promise<BatchAssignmentType> {
  const url = `${getApiBase()}/api/batch-assignments`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create BatchAssignment')
  }
  const json = await response.json()
  return json.data as BatchAssignmentType
}

/**
 * Update an existing BatchAssignment
 */
export async function updateBatchAssignment(args: { data: { id: string; input: BatchAssignmentUpdateInput; userId?: string } }): Promise<BatchAssignmentType> {
  const url = `${getApiBase()}/api/batch-assignments/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update BatchAssignment')
  }
  const json = await response.json()
  return json.data as BatchAssignmentType
}

/**
 * Delete a BatchAssignment
 */
export async function deleteBatchAssignment(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/batch-assignments/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete BatchAssignment')
  }
  return { success: true }
}

// ============================================================================
// TimetableSlot Client Functions
// ============================================================================

/**
 * List all TimetableSlot records
 */
export async function getTimetableSlotList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<TimetableSlotType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/timetable-slots${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list TimetableSlot')
  }
  const json = await response.json()
  return (json.items || []) as TimetableSlotType[]
}

/**
 * Get a single TimetableSlot by ID
 */
export async function getTimetableSlotById(args: { data: { id: string; userId?: string } }): Promise<TimetableSlotType> {
  const url = `${getApiBase()}/api/timetable-slots/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'TimetableSlot not found')
  }
  const json = await response.json()
  return json.data as TimetableSlotType
}

/**
 * Create a new TimetableSlot
 */
export async function createTimetableSlot(args: { data: { input: TimetableSlotCreateInput; userId?: string } }): Promise<TimetableSlotType> {
  const url = `${getApiBase()}/api/timetable-slots`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create TimetableSlot')
  }
  const json = await response.json()
  return json.data as TimetableSlotType
}

/**
 * Update an existing TimetableSlot
 */
export async function updateTimetableSlot(args: { data: { id: string; input: TimetableSlotUpdateInput; userId?: string } }): Promise<TimetableSlotType> {
  const url = `${getApiBase()}/api/timetable-slots/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update TimetableSlot')
  }
  const json = await response.json()
  return json.data as TimetableSlotType
}

/**
 * Delete a TimetableSlot
 */
export async function deleteTimetableSlot(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/timetable-slots/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete TimetableSlot')
  }
  return { success: true }
}

// ============================================================================
// StudyMaterial Client Functions
// ============================================================================

/**
 * List all StudyMaterial records
 */
export async function getStudyMaterialList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<StudyMaterialType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/study-materials${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list StudyMaterial')
  }
  const json = await response.json()
  return (json.items || []) as StudyMaterialType[]
}

/**
 * Get a single StudyMaterial by ID
 */
export async function getStudyMaterialById(args: { data: { id: string; userId?: string } }): Promise<StudyMaterialType> {
  const url = `${getApiBase()}/api/study-materials/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'StudyMaterial not found')
  }
  const json = await response.json()
  return json.data as StudyMaterialType
}

/**
 * Create a new StudyMaterial
 */
export async function createStudyMaterial(args: { data: { input: StudyMaterialCreateInput; userId?: string } }): Promise<StudyMaterialType> {
  const url = `${getApiBase()}/api/study-materials`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create StudyMaterial')
  }
  const json = await response.json()
  return json.data as StudyMaterialType
}

/**
 * Update an existing StudyMaterial
 */
export async function updateStudyMaterial(args: { data: { id: string; input: StudyMaterialUpdateInput; userId?: string } }): Promise<StudyMaterialType> {
  const url = `${getApiBase()}/api/study-materials/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update StudyMaterial')
  }
  const json = await response.json()
  return json.data as StudyMaterialType
}

/**
 * Delete a StudyMaterial
 */
export async function deleteStudyMaterial(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/study-materials/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete StudyMaterial')
  }
  return { success: true }
}

// ============================================================================
// AuditLog Client Functions
// ============================================================================

/**
 * List all AuditLog records
 */
export async function getAuditLogList(args: { data: { userId?: string; where?: Record<string, unknown> } }): Promise<AuditLogType[]> {
  const params = new URLSearchParams()
  if (args.data.userId) params.set('userId', args.data.userId)
  if (args.data.where) {
    for (const [key, value] of Object.entries(args.data.where)) {
      if (value !== undefined && value !== null) params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `${getApiBase()}/api/audit-logs${qs ? `?${qs}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to list AuditLog')
  }
  const json = await response.json()
  return (json.items || []) as AuditLogType[]
}

/**
 * Get a single AuditLog by ID
 */
export async function getAuditLogById(args: { data: { id: string; userId?: string } }): Promise<AuditLogType> {
  const url = `${getApiBase()}/api/audit-logs/${args.data.id}`
  const response = await fetch(url)
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'AuditLog not found')
  }
  const json = await response.json()
  return json.data as AuditLogType
}

/**
 * Create a new AuditLog
 */
export async function createAuditLog(args: { data: { input: AuditLogCreateInput; userId?: string } }): Promise<AuditLogType> {
  const url = `${getApiBase()}/api/audit-logs`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to create AuditLog')
  }
  const json = await response.json()
  return json.data as AuditLogType
}

/**
 * Update an existing AuditLog
 */
export async function updateAuditLog(args: { data: { id: string; input: AuditLogUpdateInput; userId?: string } }): Promise<AuditLogType> {
  const url = `${getApiBase()}/api/audit-logs/${args.data.id}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.data.input),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to update AuditLog')
  }
  const json = await response.json()
  return json.data as AuditLogType
}

/**
 * Delete a AuditLog
 */
export async function deleteAuditLog(args: { data: { id: string; userId?: string } }): Promise<{ success: boolean }> {
  const url = `${getApiBase()}/api/audit-logs/${args.data.id}`
  const response = await fetch(url, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || 'Failed to delete AuditLog')
  }
  return { success: true }
}
