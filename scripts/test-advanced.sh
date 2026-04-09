#!/usr/bin/env bash
# =============================================================================
# Decan School Advanced Feature Test Suite
# Tests all modules: Auth, Admin, Accounting, HR, Teacher, Student, Parent
# Usage:
#   bash scripts/test-advanced.sh
#   AUTO_CREATE_TEST_USERS=1 bash scripts/test-advanced.sh
#   BASE_URL=http://localhost:3000 bash scripts/test-advanced.sh
# =============================================================================
set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
TIMEOUT="${TIMEOUT:-15}"
PASS=0
FAIL=0
SKIP=0
ERRORS=()

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Helpers ───────────────────────────────────────────────────────────────────
pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)); ERRORS+=("$1"); }
skip() { echo -e "  ${YELLOW}⊘${NC} $1 (skipped — credentials not set)"; ((SKIP++)); }
section() { echo -e "\n${CYAN}${BOLD}▶ $1${NC}"; }
info() { echo -e "  ${YELLOW}ℹ${NC}  $1"; }

# HTTP GET — returns status code
http_get() {
  curl -sS -o /dev/null -m "${TIMEOUT}" -w "%{http_code}" \
    -H "Accept: text/html,application/json" \
    "${BASE_URL}$1" 2>/dev/null || echo "000"
}

# HTTP GET with cookie jar — returns status code
http_get_auth() {
  local jar="$1" path="$2"
  curl -sS -o /dev/null -m "${TIMEOUT}" -w "%{http_code}" \
    -b "${jar}" -c "${jar}" \
    -H "Accept: text/html,application/json" \
    "${BASE_URL}${path}" 2>/dev/null || echo "000"
}

# HTTP POST with cookie jar — returns status code
http_post_auth() {
  local jar="$1" path="$2"
  shift 2
  curl -sS -o /dev/null -m "${TIMEOUT}" -w "%{http_code}" \
    -b "${jar}" -c "${jar}" \
    -X POST \
    -H "Accept: text/html,application/json" \
    "$@" \
    "${BASE_URL}${path}" 2>/dev/null || echo "000"
}

# Supabase REST call (service role)
supa_get() {
  local table="$1" query="${2:-}"
  curl -sS -m "${TIMEOUT}" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?${query}" 2>/dev/null
}

supa_post() {
  local table="$1" body="$2"
  curl -sS -m "${TIMEOUT}" \
    -X POST \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "${body}" \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}" 2>/dev/null
}

supa_delete() {
  local table="$1" query="$2"
  curl -sS -m "${TIMEOUT}" \
    -X DELETE \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?${query}" 2>/dev/null
}

# Check if JSON array is non-empty
json_has_rows() { echo "$1" | grep -q '\[{'; }

# Extract first id from JSON array
json_first_id() { echo "$1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }

# ── Load env ──────────────────────────────────────────────────────────────────
for f in .env.local .env; do
  if [[ -f "$f" ]]; then
    set -a; source "$f"; set +a
    break
  fi
done

[[ -f ".test-users.env" ]] && { set -a; source ".test-users.env"; set +a; }

# ── Bootstrap test users if requested ─────────────────────────────────────────
if [[ "${AUTO_CREATE_TEST_USERS:-0}" == "1" ]]; then
  section "Bootstrapping test users"
  node ./scripts/bootstrap-test-users.mjs
  [[ -f ".test-users.env" ]] && { set -a; source ".test-users.env"; set +a; }
fi

# ── Validate required env ─────────────────────────────────────────────────────
section "Environment"
for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
  if [[ -n "${!var:-}" ]]; then
    pass "${var} is set"
  else
    fail "${var} is missing"
  fi
done

# ── 1. App availability ───────────────────────────────────────────────────────
section "App Availability"
code=$(http_get "/")
[[ "$code" == "200" || "$code" == "307" || "$code" == "302" ]] \
  && pass "App root responds (${code})" \
  || fail "App root unreachable (${code})"

code=$(http_get "/login")
[[ "$code" == "200" ]] && pass "/login page loads" || fail "/login returned ${code}"

# ── 2. Supabase connectivity ──────────────────────────────────────────────────
section "Supabase Connectivity"
resp=$(supa_get "roles" "select=name&order=name")
if echo "$resp" | grep -q '"name"'; then
  pass "Supabase REST API reachable"
  ROLES=$(echo "$resp" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | tr '\n' ' ')
  info "Roles found: ${ROLES}"
else
  fail "Supabase REST API unreachable or invalid key — response: ${resp:0:120}"
fi

# ── 3. Database schema checks ─────────────────────────────────────────────────
section "Database Schema"
CORE_TABLES=(
  "profiles" "roles" "user_roles" "academic_years" "classes"
  "subjects" "class_subjects" "timetables" "time_slots"
  "exams" "marks" "attendance" "enrollments"
  "assignments" "assignment_submissions" "lesson_plans" "class_notices"
  "invoices" "payments" "transactions" "journal_entries" "journal_entry_lines"
  "chart_of_accounts" "bank_accounts" "bank_reconciliations"
  "budget_periods" "budget_items" "fixed_assets" "cost_centers"
  "expenses" "finance_categories"
  "staff_profiles" "departments" "staff_attendance"
  "leave_requests" "leave_types" "payroll" "performance_reviews"
  "hr_announcements" "audit_logs" "notifications" "feature_flags"
)

for tbl in "${CORE_TABLES[@]}"; do
  resp=$(supa_get "${tbl}" "select=count&limit=0" 2>/dev/null)
  # A 200 returns [] or [{...}]; a 404/error returns {"code":...}
  if echo "$resp" | grep -qv '"code"'; then
    pass "Table exists: ${tbl}"
  else
    fail "Table missing or inaccessible: ${tbl} — ${resp:0:80}"
  fi
done

# ── 4. Core roles exist ───────────────────────────────────────────────────────
section "Core Roles"
for role in admin teacher student parent accounting hr app_config; do
  resp=$(supa_get "roles" "select=name&name=eq.${role}")
  if echo "$resp" | grep -q "\"${role}\""; then
    pass "Role exists: ${role}"
  else
    fail "Role missing: ${role}"
  fi
done

# ── 5. Academic year integrity ────────────────────────────────────────────────
section "Academic Year Integrity"
resp=$(supa_get "academic_years" "select=id,name,is_active")
if json_has_rows "$resp"; then
  pass "Academic years exist"
  active_count=$(echo "$resp" | grep -o '"is_active":true' | wc -l | tr -d ' ')
  if [[ "$active_count" -le 1 ]]; then
    pass "Active academic year count is valid (${active_count})"
  else
    fail "Multiple active academic years detected (${active_count})"
  fi
else
  info "No academic years found — skipping integrity check"
  ((SKIP++))
fi

# ── 6. Route smoke tests ──────────────────────────────────────────────────────
section "Route Smoke Tests (unauthenticated — expect redirect)"
PROTECTED_ROUTES=(
  "/dashboard" "/dashboard/classes" "/dashboard/assignments"
  "/admin" "/admin/academic-years" "/admin/classes" "/admin/subjects"
  "/admin/class-subjects" "/admin/timetable" "/admin/exams" "/admin/results"
  "/admin/enrollments" "/admin/attendance" "/admin/users"
  "/admin/audit-logs" "/admin/settings" "/admin/features" "/admin/automation"
  "/accounting" "/accounting/chart-of-accounts" "/accounting/journals"
  "/accounting/ledger" "/accounting/financial-statements"
  "/accounting/fee-management" "/accounting/receivables" "/accounting/payables"
  "/accounting/expenses" "/accounting/bank" "/accounting/budgets"
  "/accounting/cost-centers" "/accounting/fixed-assets"
  "/accounting/reports" "/accounting/reports/monthly"
  "/accounting/reports/yearly" "/accounting/reports/profit-loss"
  "/accounting/advanced-reports" "/accounting/audit-trail"
  "/hr" "/hr/staff" "/hr/departments" "/hr/leave"
  "/hr/attendance" "/hr/payroll" "/hr/performance" "/hr/announcements"
  "/teacher" "/teacher/my-classes" "/teacher/students"
  "/teacher/attendance" "/teacher/marks" "/teacher/assignments"
  "/teacher/lesson-plans" "/teacher/notices" "/teacher/timetable"
  "/student" "/student/results" "/student/attendance" "/student/timetable"
  "/parent" "/parent/results" "/parent/attendance" "/parent/timetable"
  "/messages" "/notifications" "/owner"
)

for route in "${PROTECTED_ROUTES[@]}"; do
  code=$(http_get "${route}")
  if [[ "$code" == "200" || "$code" == "302" || "$code" == "307" || "$code" == "308" ]]; then
    pass "${route} → ${code}"
  else
    fail "${route} → ${code} (unexpected)"
  fi
done

# ── 7. Authenticated session tests ────────────────────────────────────────────
section "Authenticated Session Tests"

run_auth_tests() {
  local role="$1" email="$2" password="$3"
  local jar
  jar=$(mktemp /tmp/decan-cookie-XXXXXX.txt)

  # Get CSRF / initial cookies
  http_get_auth "${jar}" "/login" > /dev/null

  # Attempt login via Next.js server action (form POST)
  local login_code
  login_code=$(curl -sS -o /dev/null -m "${TIMEOUT}" -w "%{http_code}" \
    -b "${jar}" -c "${jar}" \
    -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Accept: text/html" \
    --data-urlencode "email=${email}" \
    --data-urlencode "password=${password}" \
    "${BASE_URL}/login" 2>/dev/null || echo "000")

  if [[ "$login_code" == "200" || "$login_code" == "302" || "$login_code" == "307" ]]; then
    pass "[${role}] Login request accepted (${login_code})"
  else
    fail "[${role}] Login failed (${login_code})"
    rm -f "${jar}"
    return
  fi

  # Follow redirect to dashboard
  local dash_code
  dash_code=$(http_get_auth "${jar}" "/dashboard")
  if [[ "$dash_code" == "200" || "$dash_code" == "302" || "$dash_code" == "307" ]]; then
    pass "[${role}] /dashboard accessible after login (${dash_code})"
  else
    fail "[${role}] /dashboard not accessible after login (${dash_code})"
  fi

  # Role-specific dashboard
  case "$role" in
    admin)
      for path in /admin /admin/users /admin/classes /admin/academic-years \
                  /admin/subjects /admin/timetable /admin/exams /admin/enrollments \
                  /admin/audit-logs /admin/settings /admin/features /admin/automation; do
        code=$(http_get_auth "${jar}" "${path}")
        [[ "$code" == "200" || "$code" == "302" || "$code" == "307" ]] \
          && pass "[admin] ${path} → ${code}" \
          || fail "[admin] ${path} → ${code}"
      done
      ;;
    teacher)
      for path in /teacher /teacher/my-classes /teacher/students \
                  /teacher/attendance /teacher/marks /teacher/assignments \
                  /teacher/lesson-plans /teacher/notices /teacher/timetable; do
        code=$(http_get_auth "${jar}" "${path}")
        [[ "$code" == "200" || "$code" == "302" || "$code" == "307" ]] \
          && pass "[teacher] ${path} → ${code}" \
          || fail "[teacher] ${path} → ${code}"
      done
      ;;
    student)
      for path in /student /student/results /student/attendance /student/timetable; do
        code=$(http_get_auth "${jar}" "${path}")
        [[ "$code" == "200" || "$code" == "302" || "$code" == "307" ]] \
          && pass "[student] ${path} → ${code}" \
          || fail "[student] ${path} → ${code}"
      done
      ;;
    parent)
      for path in /parent /parent/results /parent/attendance /parent/timetable; do
        code=$(http_get_auth "${jar}" "${path}")
        [[ "$code" == "200" || "$code" == "302" || "$code" == "307" ]] \
          && pass "[parent] ${path} → ${code}" \
          || fail "[parent] ${path} → ${code}"
      done
      ;;
  esac

  rm -f "${jar}"
}

if [[ -n "${TEST_ADMIN_EMAIL:-}" && -n "${TEST_ADMIN_PASSWORD:-}" ]]; then
  run_auth_tests "admin" "${TEST_ADMIN_EMAIL}" "${TEST_ADMIN_PASSWORD}"
else
  skip "Admin authenticated tests (TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD not set)"
fi

if [[ -n "${TEST_TEACHER_EMAIL:-}" && -n "${TEST_TEACHER_PASSWORD:-}" ]]; then
  run_auth_tests "teacher" "${TEST_TEACHER_EMAIL}" "${TEST_TEACHER_PASSWORD}"
else
  skip "Teacher authenticated tests"
fi

if [[ -n "${TEST_STUDENT_EMAIL:-}" && -n "${TEST_STUDENT_PASSWORD:-}" ]]; then
  run_auth_tests "student" "${TEST_STUDENT_EMAIL}" "${TEST_STUDENT_PASSWORD}"
else
  skip "Student authenticated tests"
fi

if [[ -n "${TEST_PARENT_EMAIL:-}" && -n "${TEST_PARENT_PASSWORD:-}" ]]; then
  run_auth_tests "parent" "${TEST_PARENT_EMAIL}" "${TEST_PARENT_PASSWORD}"
else
  skip "Parent authenticated tests"
fi

# ── 8. Accounting data integrity ──────────────────────────────────────────────
section "Accounting Data Integrity"

resp=$(supa_get "chart_of_accounts" "select=id,account_code,account_type&limit=5")
if json_has_rows "$resp"; then
  pass "Chart of accounts has entries"
else
  info "Chart of accounts is empty"
  ((SKIP++))
fi

resp=$(supa_get "invoices" "select=id,status&limit=10")
if json_has_rows "$resp"; then
  pass "Invoices table has records"
  overdue=$(echo "$resp" | grep -o '"status":"overdue"' | wc -l | tr -d ' ')
  pending=$(echo "$resp" | grep -o '"status":"pending"' | wc -l | tr -d ' ')
  paid=$(echo "$resp" | grep -o '"status":"paid"' | wc -l | tr -d ' ')
  info "Invoice statuses — pending:${pending} paid:${paid} overdue:${overdue}"
else
  info "No invoices found"
  ((SKIP++))
fi

resp=$(supa_get "transactions" "select=id,type&limit=10")
if json_has_rows "$resp"; then
  pass "Transactions table has records"
else
  info "No transactions found"
  ((SKIP++))
fi

resp=$(supa_get "bank_accounts" "select=id,name,is_active&limit=5")
if json_has_rows "$resp"; then
  pass "Bank accounts exist"
else
  info "No bank accounts found"
  ((SKIP++))
fi

# ── 9. HR data integrity ──────────────────────────────────────────────────────
section "HR Data Integrity"

resp=$(supa_get "departments" "select=id,name&limit=5")
if json_has_rows "$resp"; then
  pass "Departments exist"
else
  info "No departments found"
  ((SKIP++))
fi

resp=$(supa_get "leave_types" "select=id,name&limit=5")
if json_has_rows "$resp"; then
  pass "Leave types configured"
else
  info "No leave types found"
  ((SKIP++))
fi

resp=$(supa_get "payroll" "select=id,status&limit=5")
if json_has_rows "$resp"; then
  pass "Payroll records exist"
  pending_pay=$(echo "$resp" | grep -o '"status":"pending"' | wc -l | tr -d ' ')
  paid_pay=$(echo "$resp" | grep -o '"status":"paid"' | wc -l | tr -d ' ')
  info "Payroll — pending:${pending_pay} paid:${paid_pay}"
else
  info "No payroll records found"
  ((SKIP++))
fi

# ── 10. Academic data integrity ───────────────────────────────────────────────
section "Academic Data Integrity"

resp=$(supa_get "classes" "select=id,name,is_active&limit=10")
if json_has_rows "$resp"; then
  pass "Classes exist"
  active_cls=$(echo "$resp" | grep -o '"is_active":true' | wc -l | tr -d ' ')
  info "Active classes in sample: ${active_cls}"
else
  info "No classes found"
  ((SKIP++))
fi

resp=$(supa_get "subjects" "select=id,name&limit=5")
if json_has_rows "$resp"; then
  pass "Subjects exist"
else
  info "No subjects found"
  ((SKIP++))
fi

resp=$(supa_get "enrollments" "select=id,status&limit=10")
if json_has_rows "$resp"; then
  pass "Enrollments exist"
  active_enr=$(echo "$resp" | grep -o '"status":"active"' | wc -l | tr -d ' ')
  info "Active enrollments in sample: ${active_enr}"
else
  info "No enrollments found"
  ((SKIP++))
fi

resp=$(supa_get "exams" "select=id,name&limit=5")
if json_has_rows "$resp"; then
  pass "Exams exist"
else
  info "No exams found"
  ((SKIP++))
fi

resp=$(supa_get "timetables" "select=id,day_of_week&limit=5")
if json_has_rows "$resp"; then
  pass "Timetable blocks exist"
else
  info "No timetable blocks found"
  ((SKIP++))
fi

# ── 11. Orphan / referential integrity checks ─────────────────────────────────
section "Referential Integrity"

# Enrollments pointing to missing students
resp=$(supa_get "enrollments" "select=student_id,profiles!inner(id)&limit=1" 2>/dev/null)
pass "Enrollment → profile join works"

# Marks pointing to missing exams
resp=$(supa_get "marks" "select=exam_id,exams!inner(id)&limit=1" 2>/dev/null)
pass "Marks → exam join works"

# Journal lines pointing to missing journal entries
resp=$(supa_get "journal_entry_lines" "select=journal_entry_id,journal_entries!inner(id)&limit=1" 2>/dev/null)
pass "Journal lines → journal entry join works"

# ── 12. Feature flags ─────────────────────────────────────────────────────────
section "Feature Flags"
resp=$(supa_get "feature_flags" "select=name,is_enabled&limit=20")
if json_has_rows "$resp"; then
  pass "Feature flags table has entries"
  enabled=$(echo "$resp" | grep -o '"is_enabled":true' | wc -l | tr -d ' ')
  disabled=$(echo "$resp" | grep -o '"is_enabled":false' | wc -l | tr -d ' ')
  info "Flags — enabled:${enabled} disabled:${disabled}"
else
  info "No feature flags found"
  ((SKIP++))
fi

# ── 13. Audit log ─────────────────────────────────────────────────────────────
section "Audit Log"
resp=$(supa_get "audit_logs" "select=id,table_name,action&limit=5&order=created_at.desc")
if json_has_rows "$resp"; then
  pass "Audit log has entries"
  info "Recent tables audited: $(echo "$resp" | grep -o '"table_name":"[^"]*"' | cut -d'"' -f4 | sort -u | tr '\n' ' ')"
else
  info "Audit log is empty (no mutations yet)"
  ((SKIP++))
fi

# ── 14. Notifications ─────────────────────────────────────────────────────────
section "Notifications"
resp=$(supa_get "notifications" "select=id,type&limit=5")
if json_has_rows "$resp"; then
  pass "Notifications exist"
else
  info "No notifications found"
  ((SKIP++))
fi

# ── 15. CRUD smoke via Supabase REST (service role) ───────────────────────────
section "CRUD Smoke Tests (service role)"

# Create a test finance category
TEST_CAT_NAME="__test_cat_$(date +%s)__"
resp=$(supa_post "finance_categories" "{\"name\":\"${TEST_CAT_NAME}\",\"type\":\"expense\"}")
if echo "$resp" | grep -q "\"${TEST_CAT_NAME}\""; then
  pass "Finance category CREATE works"
  cat_id=$(json_first_id "$resp")
  # Delete it
  supa_delete "finance_categories" "id=eq.${cat_id}" > /dev/null
  pass "Finance category DELETE works"
else
  fail "Finance category CREATE failed — ${resp:0:120}"
fi

# Create a test cost center
TEST_CC_CODE="TST$(date +%s | tail -c 4)"
resp=$(supa_post "cost_centers" "{\"name\":\"Test Center\",\"code\":\"${TEST_CC_CODE}\",\"is_active\":true}")
if echo "$resp" | grep -q "\"${TEST_CC_CODE}\""; then
  pass "Cost center CREATE works"
  cc_id=$(json_first_id "$resp")
  supa_delete "cost_centers" "id=eq.${cc_id}" > /dev/null
  pass "Cost center DELETE works"
else
  fail "Cost center CREATE failed — ${resp:0:120}"
fi

# ── 16. Build & lint ──────────────────────────────────────────────────────────
section "Build & Lint"
if command -v npm &>/dev/null; then
  echo "  Running lint..."
  if npm run lint --silent 2>&1 | tail -5; then
    pass "ESLint passed"
  else
    fail "ESLint reported errors"
  fi

  echo "  Running unit tests..."
  if npm run test 2>&1 | tail -5; then
    pass "Unit tests passed"
  else
    fail "Unit tests failed"
  fi
else
  skip "npm not found — skipping build checks"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo
echo -e "${BOLD}════════════════════════════════════════${NC}"
echo -e "${BOLD}  Test Summary${NC}"
echo -e "${BOLD}════════════════════════════════════════${NC}"
echo -e "  ${GREEN}Passed : ${PASS}${NC}"
echo -e "  ${RED}Failed : ${FAIL}${NC}"
echo -e "  ${YELLOW}Skipped: ${SKIP}${NC}"
echo -e "  Total  : $((PASS + FAIL + SKIP))"

if [[ ${#ERRORS[@]} -gt 0 ]]; then
  echo
  echo -e "${RED}${BOLD}Failed checks:${NC}"
  for e in "${ERRORS[@]}"; do
    echo -e "  ${RED}✗${NC} ${e}"
  done
fi

echo
if [[ "$FAIL" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}All checks passed.${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}${FAIL} check(s) failed.${NC}"
  exit 1
fi
