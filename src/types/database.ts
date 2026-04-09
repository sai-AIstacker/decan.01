export type AppRole =
  | "admin"
  | "teacher"
  | "student"
  | "parent"
  | "app_config"
  | "accounting"
  | "hr";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  roles: AppRole[];
  created_at: string;
  updated_at: string;
};

export type Role = {
  id: string;
  name: AppRole;
  created_at: string;
};

export type UserRole = {
  user_id: string;
  role_id: string;
  assigned_at: string;
};

export type AcademicYear = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Term = {
  id: string;
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
};

export type ClassRow = {
  id: string;
  name: string;
  section: string;
  academic_year_id: string;
  class_teacher_id: string | null;
  created_at: string;
};

export type Subject = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
};

export type ClassSubject = {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  created_at: string;
};

export type Enrollment = {
  id: string;
  student_id: string;
  class_id: string;
  academic_year_id: string;
  status: 'active' | 'transferred' | 'graduated';
  created_at: string;
};

export type AttendanceSettings = {
  id: string;
  school_start_time: string;
  late_after_minutes: number;
  half_day_after_minutes: number;
  created_at: string;
  updated_at: string;
};

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day';

export type Attendance = {
  id: string;
  student_id: string;
  class_id: string;
  subject_id: string | null;
  date: string;
  status: AttendanceStatus;
  marked_by: string;
  created_at: string;
};

export type TimeSlot = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  order_index: number;
};

export type TimetableBlock = {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  time_slot_id: string;
};

export type ExamType = {
  id: string;
  name: string;
};

export type Exam = {
  id: string;
  name: string;
  exam_type_id: string;
  class_id: string;
  academic_year_id: string;
  term_id: string | null;
  start_date: string;
  end_date: string;
};

export type ExamSubject = {
  id: string;
  exam_id: string;
  subject_id: string;
  max_marks: number;
  pass_marks: number;
  exam_date: string | null;
};

export type GradingSystem = {
  id: string;
  min_percentage: number;
  max_percentage: number;
  grade: string;
  remark: string | null;
};

export type Mark = {
  id: string;
  exam_id: string;
  student_id: string;
  subject_id: string;
  marks_obtained: number;
  grade: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
};

/* --- Communication Types --- */

export type ConversationRow = {
  id: string;
  type: 'direct' | 'group' | 'class';
  class_id: string | null;
  created_at: string;
};

export type ConversationParticipantRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
};

/* --- Finance Types --- */

export type InvoiceStatus = 'pending' | 'paid' | 'overdue';

export type InvoiceRow = {
  id: string;
  student_id: string;
  title: string;
  amount: number;
  due_date: string;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
};

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'online';

export type PaymentRow = {
  id: string;
  invoice_id: string;
  amount_paid: number;
  payment_method: PaymentMethod;
  payment_date: string;
  recorded_by: string | null;
};

export type FinanceCategoryType = 'income' | 'expense';

export type FinanceCategoryRow = {
  id: string;
  name: string;
  type: FinanceCategoryType;
  created_at: string;
};

export type TransactionType = 'income' | 'expense';

export type TransactionRow = {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  transaction_date: string;
  invoice_id: string | null;
  student_id: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LedgerEntryType = 'debit' | 'credit';

export type LedgerEntryRow = {
  id: string;
  transaction_id: string;
  entry_type: LedgerEntryType;
  account_name: string;
  amount: number;
  description: string;
  created_at: string;
};

export type ExpenseRow = {
  id: string;
  title: string;
  category_id: string | null;
  amount: number;
  method: PaymentMethod;
  expense_date: string;
  notes: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
};

/* --- HR Types --- */

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export type LeaveRequestRow = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  created_at: string;
  updated_at: string;
};

export type PayrollStatus = 'pending' | 'paid';

export type PayrollRow = {
  id: string;
  user_id: string;
  month: string;
  amount: number;
  status: PayrollStatus;
  created_at: string;
  updated_at: string;
};

/* --- System Settings & Automation Engine Types --- */

export type AppSettingsRow = {
  id: string;
  school_name: string;
  school_logo: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  default_language: string;
  timezone: string;
  is_singleton: boolean;
  created_at: string;
  updated_at: string;
};

export type FeatureFlagRow = {
  id: string;
  feature_name: string;
  is_enabled: boolean;
  created_at: string;
};

export type EmailTemplateRow = {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type AutomationRuleRow = {
  id: string;
  trigger_event: string;
  action_type: 'email' | 'notification';
  template_id: string;
  is_active: boolean;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  payload: any;
  created_at: string;
};


export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
  app_config: "Application configuration",
  accounting: "Accounting",
  hr: "Human resources",
};
