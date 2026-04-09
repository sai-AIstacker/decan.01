# School Management System — Complete Feature List

---

## 1. Admin Module

**Dashboard Overview**
- Live KPIs: student count, teacher count, class count, fees collected, pending dues, pass rate, today's attendance
- 6-month attendance trend chart
- Fee status breakdown (paid vs pending)
- Recent system activity feed
- Recent enrollments list

**Academic Management**
- Academic years — create and manage school year periods
- Classes — create classes, assign class teachers, manage sections
- Subjects — create and manage subjects
- Class-Subjects — map subjects to classes and assign teachers
- Timetable — build class timetables with time slots
- Enrollments — enroll students in classes, manage enrollment status

**Exams & Results**
- Exam management — create exams, set dates, manage exam types
- Results — enter and publish exam results, grade management

**Attendance**
- Admin-level attendance management and override

**User Management**
- Create users, assign roles, manage staff and student accounts

**System & Configuration**
- Audit logs — view all system changes (INSERT / UPDATE / DELETE)
- Automation — automated workflows and triggers
- Templates — email/SMS notification templates
- Feature flags — enable or disable system capabilities
- Settings — system-wide configuration and preferences

---

## 2. Accounting Module

**Dashboard Overview**
- Live KPIs: total revenue, total expenses, net profit, receivables, overdue amounts, open invoices, cash position
- Receivables aging analysis (Current, 1–30d, 31–60d, 61–90d, 90+d)
- Recent transactions feed

**Core Accounting**
- Chart of Accounts — create and manage general ledger accounts
- Journal Entries — create journal entries and post to GL
- General Ledger — view ledger by account
- Financial Statements — Profit & Loss, Balance Sheet, Cash Flow

**Receivables & Payables**
- Receivables — track student fee receivables with aging analysis
- Payables — manage vendor and staff payables

**Fee Management**
- Create invoices for students
- Mark invoices as paid
- Track payment status
- Collect payments

**Bank & Cash**
- Multiple bank account management
- Balance tracking
- Bank reconciliation

**Budgets**
- Create budget periods and budget items
- Track budget vs actual spending

**Fixed Assets**
- Asset register
- Depreciation scheduling and automatic calculation

**Cost Centers**
- Create cost centers
- Allocate expenses to cost centers

**Expenses**
- Record and categorize expenses

**Reports**
- Monthly reports
- Yearly reports
- Profit & Loss reports
- Advanced custom financial reports

**Audit Trail**
- Full log of all financial transactions and changes

---

## 3. HR Module

**Dashboard Overview**
- Live KPIs: total staff, pending leave requests, monthly payroll amount, pending salary, department count, average performance rating
- 6-month payroll trend chart
- Leave status breakdown (approved / pending / rejected)
- 7-day staff attendance summary
- HR announcements feed

**Staff Management**
- Staff directory — view and manage all staff members
- Departments — create and manage departments

**Leave Management**
- Submit and approve leave requests
- Track leave types and balances
- Leave history per staff member

**Payroll**
- Process monthly payroll
- Salary disbursement tracking
- Payment status management

**Attendance**
- Mark daily staff attendance
- View attendance records

**Performance**
- Performance reviews and ratings
- Appraisal management

**Announcements**
- Post HR announcements with priority levels

---

## 4. Teacher Module

**Dashboard Overview**
- Live KPIs: classes assigned, students taught, average marks %, periods today, today's attendance %
- Top performers list
- Students needing attention (low marks)

**Class Management**
- My Classes — view assigned classes, class roster, performance metrics
- My Students — view student profiles, performance, attendance

**Attendance**
- Mark daily student attendance
- View attendance records

**Gradebook**
- Enter marks
- View grade distribution
- Manage assessments

**Assignments**
- Create assignments with due dates
- Assignment types: homework, project, test, classwork
- Grade submissions
- Track completion status

**Lesson Plans**
- Create and publish lesson plans
- Track status: draft, published, completed

**Notices**
- Post class notices with priority levels (urgent / high / normal / low)

**Schedule**
- View personal timetable and class periods

**Reports**
- Class performance reports
- Student progress tracking

---

## 5. Student Module

**Dashboard Overview**
- Live KPIs: attendance %, overall performance %, exams attempted, pending assignments, periods today, pending fees
- Recent results by subject and exam
- Upcoming exams list
- 30-day attendance trend visualization

**Academic**
- Results — view exam results, marks by subject, grades, performance %
- Assignments — view pending assignments and due dates
- Exams — view upcoming exams and exam types
- Timetable — view personal class schedule

**Attendance**
- View personal attendance record with 30-day visual grid

**Finance**
- View pending fee invoices and due dates

**Communication**
- Class notices — view class announcements

---

## 6. Parent Module

**Dashboard Overview**
- Live KPIs: children count, average attendance %, average performance %, fees paid, fees pending
- Per-child cards showing attendance %, average marks, pending fees

**Children Monitoring**
- View all linked children with individual performance cards
- Attendance — view each child's attendance record
- Results — view each child's exam results and performance
- Timetable — view each child's class schedule
- Upcoming exams for all children

**Finance**
- View pending fee invoices and payment status per child

**Communication**
- School-wide notices and announcements

---

## 7. Messaging Module

- Real-time chat between users
- Class group chats and direct messages
- Conversation history
- Participant management

---

## 8. Notifications Module

- Notification center — view all system notifications
- Notification types: academic, HR, finance, system
- Notification preferences management

---

## 9. System-Wide Features

**Security & Access Control**
- Role-based access control: Admin, Teacher, Student, Parent, Accounting, HR, App Config, Owner
- Row-level security enforced at the database level
- Session management

**Data Visualization**
- Bar charts, pie charts, KPI cards
- Attendance heatmaps
- Aging analysis progress bars
- Trend charts

**Audit & Compliance**
- Full audit logging for all data changes across all modules
- Financial audit trail

**Workflow Automation**
- Leave request approval workflow
- Payroll processing workflow
- Exam result publication workflow
- Assignment submission and grading workflow

**Notifications**
- Email and SMS notification templates
- In-app notification center

**UI & Accessibility**
- Dark mode support
- Responsive design — works on mobile, tablet, and desktop
- Multi-user concurrent access
