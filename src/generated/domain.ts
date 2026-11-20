// SPDX-License-Identifier: MIT
/**
 * Auto-generated Domain Store
 *
 * MobX-State-Tree store with collections for each model.
 */

import { makeAutoObservable, runInAction } from 'mobx'
import {
  getUserList,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getSessionList,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  getStudentList,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getAttendanceList,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getFeeInvoiceList,
  getFeeInvoiceById,
  createFeeInvoice,
  updateFeeInvoice,
  deleteFeeInvoice,
  getFeePaymentList,
  getFeePaymentById,
  createFeePayment,
  updateFeePayment,
  deleteFeePayment,
  getFeeStructureList,
  getFeeStructureById,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  getExpenseList,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getTestList,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
  getTestResultList,
  getTestResultById,
  createTestResult,
  updateTestResult,
  deleteTestResult,
  getMessageLogList,
  getMessageLogById,
  createMessageLog,
  updateMessageLog,
  deleteMessageLog,
  getAutomationList,
  getAutomationById,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  getSettingList,
  getSettingById,
  createSetting,
  updateSetting,
  deleteSetting,
  getActivityList,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  getAttendanceSheetList,
  getAttendanceSheetById,
  createAttendanceSheet,
  updateAttendanceSheet,
  deleteAttendanceSheet,
  getAttendanceScanRowList,
  getAttendanceScanRowById,
  createAttendanceScanRow,
  updateAttendanceScanRow,
  deleteAttendanceScanRow,
  getTeacherList,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getBatchAssignmentList,
  getBatchAssignmentById,
  createBatchAssignment,
  updateBatchAssignment,
  deleteBatchAssignment,
  getTimetableSlotList,
  getTimetableSlotById,
  createTimetableSlot,
  updateTimetableSlot,
  deleteTimetableSlot,
  getStudyMaterialList,
  getStudyMaterialById,
  createStudyMaterial,
  updateStudyMaterial,
  deleteStudyMaterial,
  getAuditLogList,
  getAuditLogById,
  createAuditLog,
  updateAuditLog,
  deleteAuditLog,
} from './server-functions'

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

// ============================================================================
// User Store
// ============================================================================

export class UserStore {
  items: Map<string, UserType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): UserType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): UserType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getUserList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getUserById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: UserCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: UserType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UserType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createUser({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: UserUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[UserStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as UserType)
    })

    try {
      const item = await updateUser({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[UserStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteUser({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// Session Store
// ============================================================================

export class SessionStore {
  items: Map<string, SessionType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): SessionType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): SessionType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getSessionList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getSessionById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: SessionCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: SessionType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SessionType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createSession({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: SessionUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[SessionStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as SessionType)
    })

    try {
      const item = await updateSession({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[SessionStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteSession({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// Student Store
// ============================================================================

export class StudentStore {
  items: Map<string, StudentType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): StudentType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): StudentType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getStudentList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getStudentById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: StudentCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: StudentType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as StudentType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createStudent({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: StudentUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[StudentStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as StudentType)
    })

    try {
      const item = await updateStudent({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[StudentStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteStudent({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// Attendance Store
// ============================================================================

export class AttendanceStore {
  items: Map<string, AttendanceType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): AttendanceType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): AttendanceType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getAttendanceList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getAttendanceById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: AttendanceCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: AttendanceType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AttendanceType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createAttendance({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: AttendanceUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[AttendanceStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as AttendanceType)
    })

    try {
      const item = await updateAttendance({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[AttendanceStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteAttendance({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// FeeInvoice Store
// ============================================================================

export class FeeInvoiceStore {
  items: Map<string, FeeInvoiceType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): FeeInvoiceType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): FeeInvoiceType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getFeeInvoiceList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getFeeInvoiceById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: FeeInvoiceCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: FeeInvoiceType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as FeeInvoiceType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createFeeInvoice({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: FeeInvoiceUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[FeeInvoiceStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as FeeInvoiceType)
    })

    try {
      const item = await updateFeeInvoice({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[FeeInvoiceStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteFeeInvoice({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// FeePayment Store
// ============================================================================

export class FeePaymentStore {
  items: Map<string, FeePaymentType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): FeePaymentType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): FeePaymentType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getFeePaymentList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getFeePaymentById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: FeePaymentCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: FeePaymentType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as FeePaymentType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createFeePayment({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: FeePaymentUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[FeePaymentStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as FeePaymentType)
    })

    try {
      const item = await updateFeePayment({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[FeePaymentStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteFeePayment({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// FeeStructure Store
// ============================================================================

export class FeeStructureStore {
  items: Map<string, FeeStructureType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): FeeStructureType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): FeeStructureType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getFeeStructureList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getFeeStructureById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: FeeStructureCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: FeeStructureType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as FeeStructureType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createFeeStructure({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: FeeStructureUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[FeeStructureStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as FeeStructureType)
    })

    try {
      const item = await updateFeeStructure({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[FeeStructureStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteFeeStructure({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// Expense Store
// ============================================================================

export class ExpenseStore {
  items: Map<string, ExpenseType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): ExpenseType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): ExpenseType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getExpenseList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getExpenseById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: ExpenseCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: ExpenseType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ExpenseType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createExpense({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: ExpenseUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[ExpenseStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as ExpenseType)
    })

    try {
      const item = await updateExpense({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[ExpenseStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteExpense({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// Test Store
// ============================================================================

export class TestStore {
  items: Map<string, TestType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): TestType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): TestType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getTestList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getTestById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: TestCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: TestType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TestType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createTest({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: TestUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[TestStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as TestType)
    })

    try {
      const item = await updateTest({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[TestStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteTest({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// TestResult Store
// ============================================================================

export class TestResultStore {
  items: Map<string, TestResultType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): TestResultType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): TestResultType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getTestResultList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getTestResultById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: TestResultCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: TestResultType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TestResultType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createTestResult({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: TestResultUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[TestResultStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as TestResultType)
    })

    try {
      const item = await updateTestResult({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[TestResultStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteTestResult({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// MessageLog Store
// ============================================================================

export class MessageLogStore {
  items: Map<string, MessageLogType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): MessageLogType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): MessageLogType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getMessageLogList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getMessageLogById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: MessageLogCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: MessageLogType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as MessageLogType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createMessageLog({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: MessageLogUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[MessageLogStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as MessageLogType)
    })

    try {
      const item = await updateMessageLog({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[MessageLogStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteMessageLog({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// Automation Store
// ============================================================================

export class AutomationStore {
  items: Map<string, AutomationType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): AutomationType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): AutomationType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getAutomationList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getAutomationById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: AutomationCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: AutomationType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AutomationType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createAutomation({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: AutomationUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[AutomationStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as AutomationType)
    })

    try {
      const item = await updateAutomation({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[AutomationStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteAutomation({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// Setting Store
// ============================================================================

export class SettingStore {
  items: Map<string, SettingType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): SettingType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): SettingType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getSettingList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getSettingById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: SettingCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: SettingType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SettingType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createSetting({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: SettingUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[SettingStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as SettingType)
    })

    try {
      const item = await updateSetting({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[SettingStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteSetting({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// Activity Store
// ============================================================================

export class ActivityStore {
  items: Map<string, ActivityType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): ActivityType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): ActivityType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getActivityList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getActivityById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: ActivityCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: ActivityType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ActivityType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createActivity({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: ActivityUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[ActivityStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as ActivityType)
    })

    try {
      const item = await updateActivity({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[ActivityStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteActivity({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// AttendanceSheet Store
// ============================================================================

export class AttendanceSheetStore {
  items: Map<string, AttendanceSheetType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): AttendanceSheetType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): AttendanceSheetType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getAttendanceSheetList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getAttendanceSheetById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: AttendanceSheetCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: AttendanceSheetType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AttendanceSheetType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createAttendanceSheet({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: AttendanceSheetUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[AttendanceSheetStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as AttendanceSheetType)
    })

    try {
      const item = await updateAttendanceSheet({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[AttendanceSheetStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteAttendanceSheet({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// AttendanceScanRow Store
// ============================================================================

export class AttendanceScanRowStore {
  items: Map<string, AttendanceScanRowType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): AttendanceScanRowType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): AttendanceScanRowType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getAttendanceScanRowList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getAttendanceScanRowById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: AttendanceScanRowCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: AttendanceScanRowType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AttendanceScanRowType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createAttendanceScanRow({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: AttendanceScanRowUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[AttendanceScanRowStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as AttendanceScanRowType)
    })

    try {
      const item = await updateAttendanceScanRow({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[AttendanceScanRowStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteAttendanceScanRow({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// Teacher Store
// ============================================================================

export class TeacherStore {
  items: Map<string, TeacherType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): TeacherType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): TeacherType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getTeacherList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getTeacherById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: TeacherCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: TeacherType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TeacherType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createTeacher({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: TeacherUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[TeacherStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as TeacherType)
    })

    try {
      const item = await updateTeacher({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[TeacherStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteTeacher({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// BatchAssignment Store
// ============================================================================

export class BatchAssignmentStore {
  items: Map<string, BatchAssignmentType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): BatchAssignmentType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): BatchAssignmentType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getBatchAssignmentList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getBatchAssignmentById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: BatchAssignmentCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: BatchAssignmentType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as BatchAssignmentType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createBatchAssignment({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: BatchAssignmentUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[BatchAssignmentStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as BatchAssignmentType)
    })

    try {
      const item = await updateBatchAssignment({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[BatchAssignmentStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteBatchAssignment({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// TimetableSlot Store
// ============================================================================

export class TimetableSlotStore {
  items: Map<string, TimetableSlotType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): TimetableSlotType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): TimetableSlotType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getTimetableSlotList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getTimetableSlotById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: TimetableSlotCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: TimetableSlotType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TimetableSlotType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createTimetableSlot({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: TimetableSlotUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[TimetableSlotStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as TimetableSlotType)
    })

    try {
      const item = await updateTimetableSlot({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[TimetableSlotStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteTimetableSlot({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// StudyMaterial Store
// ============================================================================

export class StudyMaterialStore {
  items: Map<string, StudyMaterialType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): StudyMaterialType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): StudyMaterialType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getStudyMaterialList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getStudyMaterialById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: StudyMaterialCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: StudyMaterialType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as StudyMaterialType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createStudyMaterial({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: StudyMaterialUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[StudyMaterialStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as StudyMaterialType)
    })

    try {
      const item = await updateStudyMaterial({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[StudyMaterialStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteStudyMaterial({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// AuditLog Store
// ============================================================================

export class AuditLogStore {
  items: Map<string, AuditLogType> = new Map()
  isLoading = false
  error: string | null = null

  // Track pending operations for optimistic updates
  private pendingDeletes = new Set<string>()
  private pendingUpdates = new Set<string>()

  constructor() {
    makeAutoObservable<this, 'pendingDeletes' | 'pendingUpdates'>(this, {
      pendingDeletes: false,
      pendingUpdates: false,
    })
  }

  // === Getters ===

  /** Get all items as array */
  get all(): AuditLogType[] {
    return Array.from(this.items.values())
  }

  /** Get item by ID */
  get(id: string): AuditLogType | undefined {
    return this.items.get(id)
  }

  /** Check if item has pending operation */
  isPending(id: string): boolean {
    return this.pendingDeletes.has(id) || this.pendingUpdates.has(id)
  }

  // === Actions ===

  /** Load all items from server */
  async loadAll(userId?: string, where?: Record<string, unknown>) {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })

    try {
      const items = await getAuditLogList({ data: { userId, where } })

      runInAction(() => {
        this.items.clear()
        for (const item of items) {
          this.items.set(item.id, item)
        }
        this.isLoading = false
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
        this.isLoading = false
      })
      throw e
    }
  }

  /** Load single item by ID */
  async loadById(id: string, userId?: string) {
    try {
      const item = await getAuditLogById({ data: { id, userId } })

      runInAction(() => {
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to load'
      })
      throw e
    }
  }

  /** Create new item with optimistic update */
  async create(input: AuditLogCreateInput, userId?: string) {
    // Create optimistic item
    const tempId = `temp-${crypto.randomUUID()}`
    const optimisticItem: AuditLogType = {
      id: tempId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AuditLogType

    // Add optimistically
    runInAction(() => {
      this.items.set(tempId, optimisticItem)
    })

    try {
      const item = await createAuditLog({ data: { input, userId } })

      runInAction(() => {
        // Remove temp, add real
        this.items.delete(tempId)
        this.items.set(item.id, item)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.delete(tempId)
        this.error = e instanceof Error ? e.message : 'Failed to create'
      })
      throw e
    }
  }

  /** Update item with optimistic update */
  async update(id: string, input: AuditLogUpdateInput, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[AuditLogStore] update called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingUpdates.has(id)) return

    const previousState = { ...existing }
    this.pendingUpdates.add(id)

    // Optimistically update
    runInAction(() => {
      this.items.set(id, {
        ...existing,
        ...input,
        updatedAt: new Date(),
      } as AuditLogType)
    })

    try {
      const item = await updateAuditLog({ data: { id, input, userId } })

      runInAction(() => {
        this.items.set(id, item)
        this.pendingUpdates.delete(id)
      })

      return item
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, previousState)
        this.pendingUpdates.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to update'
      })
      throw e
    }
  }

  /** Delete item with optimistic update */
  async delete(id: string, userId?: string) {
    // Validate id to prevent undefined from reaching the API
    if (!id || typeof id !== 'string') {
      console.error('[AuditLogStore] delete called with invalid id:', id)
      return
    }
    const existing = this.items.get(id)
    if (!existing || this.pendingDeletes.has(id)) return

    this.pendingDeletes.add(id)

    // Optimistically remove
    runInAction(() => {
      this.items.delete(id)
    })

    try {
      await deleteAuditLog({ data: { id, userId } })

      runInAction(() => {
        this.pendingDeletes.delete(id)
      })
    } catch (e) {
      runInAction(() => {
        // Rollback
        this.items.set(id, existing)
        this.pendingDeletes.delete(id)
        this.error = e instanceof Error ? e.message : 'Failed to delete'
      })
      throw e
    }
  }

  /** Clear error state */
  clearError() {
    this.error = null
  }

  /** Clear all data */
  clear() {
    this.items.clear()
    this.error = null
    this.isLoading = false
  }
}

// ============================================================================
// Root Store
// ============================================================================

export class RootStore {
  user: UserStore
  session: SessionStore
  student: StudentStore
  attendance: AttendanceStore
  feeInvoice: FeeInvoiceStore
  feePayment: FeePaymentStore
  feeStructure: FeeStructureStore
  expense: ExpenseStore
  test: TestStore
  testResult: TestResultStore
  messageLog: MessageLogStore
  automation: AutomationStore
  setting: SettingStore
  activity: ActivityStore
  attendanceSheet: AttendanceSheetStore
  attendanceScanRow: AttendanceScanRowStore
  teacher: TeacherStore
  batchAssignment: BatchAssignmentStore
  timetableSlot: TimetableSlotStore
  studyMaterial: StudyMaterialStore
  auditLog: AuditLogStore

  constructor() {
    this.user = new UserStore()
    this.session = new SessionStore()
    this.student = new StudentStore()
    this.attendance = new AttendanceStore()
    this.feeInvoice = new FeeInvoiceStore()
    this.feePayment = new FeePaymentStore()
    this.feeStructure = new FeeStructureStore()
    this.expense = new ExpenseStore()
    this.test = new TestStore()
    this.testResult = new TestResultStore()
    this.messageLog = new MessageLogStore()
    this.automation = new AutomationStore()
    this.setting = new SettingStore()
    this.activity = new ActivityStore()
    this.attendanceSheet = new AttendanceSheetStore()
    this.attendanceScanRow = new AttendanceScanRowStore()
    this.teacher = new TeacherStore()
    this.batchAssignment = new BatchAssignmentStore()
    this.timetableSlot = new TimetableSlotStore()
    this.studyMaterial = new StudyMaterialStore()
    this.auditLog = new AuditLogStore()
    makeAutoObservable(this)
  }

  /** Clear all stores */
  clearAll() {
    this.user.clear()
    this.session.clear()
    this.student.clear()
    this.attendance.clear()
    this.feeInvoice.clear()
    this.feePayment.clear()
    this.feeStructure.clear()
    this.expense.clear()
    this.test.clear()
    this.testResult.clear()
    this.messageLog.clear()
    this.automation.clear()
    this.setting.clear()
    this.activity.clear()
    this.attendanceSheet.clear()
    this.attendanceScanRow.clear()
    this.teacher.clear()
    this.batchAssignment.clear()
    this.timetableSlot.clear()
    this.studyMaterial.clear()
    this.auditLog.clear()
  }
}

// ============================================================================
// Factory & Singleton
// ============================================================================

let rootStore: RootStore | null = null

/**
 * Get or create the root store singleton
 */
export function getStore(): RootStore {
  if (!rootStore) {
    rootStore = new RootStore()
  }
  return rootStore
}

/**
 * Create a new root store (for testing or SSR)
 */
export function createStore(): RootStore {
  return new RootStore()
}

/**
 * Reset the singleton store
 */
export function resetStore(): void {
  rootStore = null
}
