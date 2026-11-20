// SPDX-License-Identifier: MIT
/**
 * Auto-generated Routes Index
 *
 */

import { Hono } from "hono"
import { PrismaClient } from "./prisma/client"

// Route imports
import { createUserRoutes, setPrisma as setPrismaUser, setUserHooks } from "./user.routes"
import { createSessionRoutes, setPrisma as setPrismaSession, setSessionHooks } from "./session.routes"
import { createStudentRoutes, setPrisma as setPrismaStudent, setStudentHooks } from "./student.routes"
import { createAttendanceRoutes, setPrisma as setPrismaAttendance, setAttendanceHooks } from "./attendance.routes"
import { createFeeInvoiceRoutes, setPrisma as setPrismaFeeInvoice, setFeeInvoiceHooks } from "./fee-invoice.routes"
import { createFeePaymentRoutes, setPrisma as setPrismaFeePayment, setFeePaymentHooks } from "./fee-payment.routes"
import { createFeeStructureRoutes, setPrisma as setPrismaFeeStructure, setFeeStructureHooks } from "./fee-structure.routes"
import { createExpenseRoutes, setPrisma as setPrismaExpense, setExpenseHooks } from "./expense.routes"
import { createTestRoutes, setPrisma as setPrismaTest, setTestHooks } from "./test.routes"
import { createTestResultRoutes, setPrisma as setPrismaTestResult, setTestResultHooks } from "./test-result.routes"
import { createMessageLogRoutes, setPrisma as setPrismaMessageLog, setMessageLogHooks } from "./message-log.routes"
import { createAutomationRoutes, setPrisma as setPrismaAutomation, setAutomationHooks } from "./automation.routes"
import { createSettingRoutes, setPrisma as setPrismaSetting, setSettingHooks } from "./setting.routes"
import { createActivityRoutes, setPrisma as setPrismaActivity, setActivityHooks } from "./activity.routes"
import { createAttendanceSheetRoutes, setPrisma as setPrismaAttendanceSheet, setAttendanceSheetHooks } from "./attendance-sheet.routes"
import { createAttendanceScanRowRoutes, setPrisma as setPrismaAttendanceScanRow, setAttendanceScanRowHooks } from "./attendance-scan-row.routes"
import { createTeacherRoutes, setPrisma as setPrismaTeacher, setTeacherHooks } from "./teacher.routes"
import { createBatchAssignmentRoutes, setPrisma as setPrismaBatchAssignment, setBatchAssignmentHooks } from "./batch-assignment.routes"
import { createTimetableSlotRoutes, setPrisma as setPrismaTimetableSlot, setTimetableSlotHooks } from "./timetable-slot.routes"
import { createStudyMaterialRoutes, setPrisma as setPrismaStudyMaterial, setStudyMaterialHooks } from "./study-material.routes"
import { createAuditLogRoutes, setPrisma as setPrismaAuditLog, setAuditLogHooks } from "./audit-log.routes"

// Hook imports
import { userHooks } from "./user.hooks"
import { sessionHooks } from "./session.hooks"
import { studentHooks } from "./student.hooks"
import { attendanceHooks } from "./attendance.hooks"
import { feeInvoiceHooks } from "./fee-invoice.hooks"
import { feePaymentHooks } from "./fee-payment.hooks"
import { feeStructureHooks } from "./fee-structure.hooks"
import { expenseHooks } from "./expense.hooks"
import { testHooks } from "./test.hooks"
import { testResultHooks } from "./test-result.hooks"
import { messageLogHooks } from "./message-log.hooks"
import { automationHooks } from "./automation.hooks"
import { settingHooks } from "./setting.hooks"
import { activityHooks } from "./activity.hooks"
import { attendanceSheetHooks } from "./attendance-sheet.hooks"
import { attendanceScanRowHooks } from "./attendance-scan-row.hooks"
import { teacherHooks } from "./teacher.hooks"
import { batchAssignmentHooks } from "./batch-assignment.hooks"
import { timetableSlotHooks } from "./timetable-slot.hooks"
import { studyMaterialHooks } from "./study-material.hooks"
import { auditLogHooks } from "./audit-log.hooks"

// Re-export route creators and setters
export {
  createUserRoutes,
  setPrismaUser,
  setUserHooks,
  createSessionRoutes,
  setPrismaSession,
  setSessionHooks,
  createStudentRoutes,
  setPrismaStudent,
  setStudentHooks,
  createAttendanceRoutes,
  setPrismaAttendance,
  setAttendanceHooks,
  createFeeInvoiceRoutes,
  setPrismaFeeInvoice,
  setFeeInvoiceHooks,
  createFeePaymentRoutes,
  setPrismaFeePayment,
  setFeePaymentHooks,
  createFeeStructureRoutes,
  setPrismaFeeStructure,
  setFeeStructureHooks,
  createExpenseRoutes,
  setPrismaExpense,
  setExpenseHooks,
  createTestRoutes,
  setPrismaTest,
  setTestHooks,
  createTestResultRoutes,
  setPrismaTestResult,
  setTestResultHooks,
  createMessageLogRoutes,
  setPrismaMessageLog,
  setMessageLogHooks,
  createAutomationRoutes,
  setPrismaAutomation,
  setAutomationHooks,
  createSettingRoutes,
  setPrismaSetting,
  setSettingHooks,
  createActivityRoutes,
  setPrismaActivity,
  setActivityHooks,
  createAttendanceSheetRoutes,
  setPrismaAttendanceSheet,
  setAttendanceSheetHooks,
  createAttendanceScanRowRoutes,
  setPrismaAttendanceScanRow,
  setAttendanceScanRowHooks,
  createTeacherRoutes,
  setPrismaTeacher,
  setTeacherHooks,
  createBatchAssignmentRoutes,
  setPrismaBatchAssignment,
  setBatchAssignmentHooks,
  createTimetableSlotRoutes,
  setPrismaTimetableSlot,
  setTimetableSlotHooks,
  createStudyMaterialRoutes,
  setPrismaStudyMaterial,
  setStudyMaterialHooks,
  createAuditLogRoutes,
  setPrismaAuditLog,
  setAuditLogHooks
}

// Re-export hooks (model-specific)
export {
  userHooks,
  sessionHooks,
  studentHooks,
  attendanceHooks,
  feeInvoiceHooks,
  feePaymentHooks,
  feeStructureHooks,
  expenseHooks,
  testHooks,
  testResultHooks,
  messageLogHooks,
  automationHooks,
  settingHooks,
  activityHooks,
  attendanceSheetHooks,
  attendanceScanRowHooks,
  teacherHooks,
  batchAssignmentHooks,
  timetableSlotHooks,
  studyMaterialHooks,
  auditLogHooks
}

// Re-export hook types
export type { UserHooks } from "./user.hooks"
export type { SessionHooks } from "./session.hooks"
export type { StudentHooks } from "./student.hooks"
export type { AttendanceHooks } from "./attendance.hooks"
export type { FeeInvoiceHooks } from "./fee-invoice.hooks"
export type { FeePaymentHooks } from "./fee-payment.hooks"
export type { FeeStructureHooks } from "./fee-structure.hooks"
export type { ExpenseHooks } from "./expense.hooks"
export type { TestHooks } from "./test.hooks"
export type { TestResultHooks } from "./test-result.hooks"
export type { MessageLogHooks } from "./message-log.hooks"
export type { AutomationHooks } from "./automation.hooks"
export type { SettingHooks } from "./setting.hooks"
export type { ActivityHooks } from "./activity.hooks"
export type { AttendanceSheetHooks } from "./attendance-sheet.hooks"
export type { AttendanceScanRowHooks } from "./attendance-scan-row.hooks"
export type { TeacherHooks } from "./teacher.hooks"
export type { BatchAssignmentHooks } from "./batch-assignment.hooks"
export type { TimetableSlotHooks } from "./timetable-slot.hooks"
export type { StudyMaterialHooks } from "./study-material.hooks"
export type { AuditLogHooks } from "./audit-log.hooks"

/**
 * Create all routes and mount them on a single Hono app
 */
export function createAllRoutes(prisma: PrismaClient): Hono {
  const app = new Hono()

  // Set Prisma client for all routes
  setPrismaUser(prisma)
  setPrismaSession(prisma)
  setPrismaStudent(prisma)
  setPrismaAttendance(prisma)
  setPrismaFeeInvoice(prisma)
  setPrismaFeePayment(prisma)
  setPrismaFeeStructure(prisma)
  setPrismaExpense(prisma)
  setPrismaTest(prisma)
  setPrismaTestResult(prisma)
  setPrismaMessageLog(prisma)
  setPrismaAutomation(prisma)
  setPrismaSetting(prisma)
  setPrismaActivity(prisma)
  setPrismaAttendanceSheet(prisma)
  setPrismaAttendanceScanRow(prisma)
  setPrismaTeacher(prisma)
  setPrismaBatchAssignment(prisma)
  setPrismaTimetableSlot(prisma)
  setPrismaStudyMaterial(prisma)
  setPrismaAuditLog(prisma)

  // Set hooks for all routes
  setUserHooks(userHooks)
  setSessionHooks(sessionHooks)
  setStudentHooks(studentHooks)
  setAttendanceHooks(attendanceHooks)
  setFeeInvoiceHooks(feeInvoiceHooks)
  setFeePaymentHooks(feePaymentHooks)
  setFeeStructureHooks(feeStructureHooks)
  setExpenseHooks(expenseHooks)
  setTestHooks(testHooks)
  setTestResultHooks(testResultHooks)
  setMessageLogHooks(messageLogHooks)
  setAutomationHooks(automationHooks)
  setSettingHooks(settingHooks)
  setActivityHooks(activityHooks)
  setAttendanceSheetHooks(attendanceSheetHooks)
  setAttendanceScanRowHooks(attendanceScanRowHooks)
  setTeacherHooks(teacherHooks)
  setBatchAssignmentHooks(batchAssignmentHooks)
  setTimetableSlotHooks(timetableSlotHooks)
  setStudyMaterialHooks(studyMaterialHooks)
  setAuditLogHooks(auditLogHooks)

  // Mount routes
  app.route("/users", createUserRoutes())
  app.route("/sessions", createSessionRoutes())
  app.route("/students", createStudentRoutes())
  app.route("/attendances", createAttendanceRoutes())
  app.route("/fee-invoices", createFeeInvoiceRoutes())
  app.route("/fee-payments", createFeePaymentRoutes())
  app.route("/fee-structures", createFeeStructureRoutes())
  app.route("/expenses", createExpenseRoutes())
  app.route("/tests", createTestRoutes())
  app.route("/test-results", createTestResultRoutes())
  app.route("/message-logs", createMessageLogRoutes())
  app.route("/automations", createAutomationRoutes())
  app.route("/settings", createSettingRoutes())
  app.route("/activities", createActivityRoutes())
  app.route("/attendance-sheets", createAttendanceSheetRoutes())
  app.route("/attendance-scan-rows", createAttendanceScanRowRoutes())
  app.route("/teachers", createTeacherRoutes())
  app.route("/batch-assignments", createBatchAssignmentRoutes())
  app.route("/timetable-slots", createTimetableSlotRoutes())
  app.route("/study-materials", createStudyMaterialRoutes())
  app.route("/audit-logs", createAuditLogRoutes())

  return app
}
