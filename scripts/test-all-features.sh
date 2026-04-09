#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-20}"
ENV_FILE="${ENV_FILE:-.env.local}"

# Load environment variables from .env.local or .env
if [[ -f "${ENV_FILE}" ]]; then
  echo "Loading env from ${ENV_FILE}"
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
elif [[ -f ".env" ]]; then
  echo "Loading env from .env"
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
else
  echo "No ${ENV_FILE} or .env file found."
  echo "Create one before running tests."
  exit 1
fi

required_env=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
)

# Optional role-account credentials for future authenticated checks
optional_env=(
  "TEST_ADMIN_EMAIL"
  "TEST_ADMIN_PASSWORD"
  "TEST_TEACHER_EMAIL"
  "TEST_TEACHER_PASSWORD"
  "TEST_STUDENT_EMAIL"
  "TEST_STUDENT_PASSWORD"
  "TEST_PARENT_EMAIL"
  "TEST_PARENT_PASSWORD"
)

echo "== Decan School Full Feature Smoke Test =="
echo "Base URL: ${BASE_URL}"
echo

if [[ "${AUTO_CREATE_TEST_USERS:-0}" == "1" ]]; then
  echo "0) Creating random role-based test users"
  node ./scripts/bootstrap-test-users.mjs
  if [[ -f ".test-users.env" ]]; then
    echo "Loading generated credentials from .test-users.env"
    set -a
    # shellcheck disable=SC1091
    source ".test-users.env"
    set +a
  fi
  echo
fi

echo "1) Environment checks"
missing_env=0
for var in "${required_env[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "   - Missing env var: ${var}"
    missing_env=1
  fi
done
if [[ "${missing_env}" -eq 1 ]]; then
  echo
  echo "Set the missing env vars in ${ENV_FILE} (or .env) first."
  exit 1
fi
echo "   - OK"
echo

echo "   Optional test credentials status:"
for var in "${optional_env[@]}"; do
  if [[ -n "${!var:-}" ]]; then
    echo "   - ${var}: set"
  else
    echo "   - ${var}: not set (role-auth smoke checks skipped)"
  fi
done
echo

echo "2) Static checks"
npm run lint
npm run build
echo "   - OK"
echo

echo "3) Unit tests"
npm run test
echo "   - OK"
echo

echo "4) App route smoke tests (public + role entry points)"
routes=(
  "/"
  "/login"
  "/dashboard"
  "/dashboard/classes"
  "/admin"
  "/admin/academic-years"
  "/admin/classes"
  "/admin/users"
  "/teacher"
  "/student"
  "/parent"
  "/hr"
  "/accounting"
)

for route in "${routes[@]}"; do
  code="$(curl -sS -o /dev/null -m "${TIMEOUT_SECONDS}" -w "%{http_code}" "${BASE_URL}${route}" || true)"
  if [[ "${code}" == "200" || "${code}" == "302" || "${code}" == "307" ]]; then
    echo "   - ${route} -> ${code}"
  else
    echo "   - ${route} -> ${code} (unexpected)"
  fi
done
echo

echo "5) Database policy sanity (manual SQL to run in Supabase SQL editor)"
cat <<'SQL'
-- A) Ensure only one active academic year
SELECT COUNT(*) AS active_years
FROM academic_years
WHERE is_active = true;

-- B) Detect classes pointing to missing teacher profile
SELECT c.id, c.name, c.class_teacher_id
FROM classes c
LEFT JOIN profiles p ON p.id = c.class_teacher_id
WHERE c.class_teacher_id IS NOT NULL
  AND p.id IS NULL;

-- C) Detect enrollments pointing to missing class or missing student profile
SELECT e.id, e.student_id, e.class_id
FROM enrollments e
LEFT JOIN profiles p ON p.id = e.student_id
LEFT JOIN classes c ON c.id = e.class_id
WHERE p.id IS NULL OR c.id IS NULL;

-- D) Confirm role rows exist for core roles
SELECT name
FROM roles
WHERE name IN ('admin','teacher','student','parent','app_config','hr','accounting')
ORDER BY name;
SQL
echo

echo "Smoke script completed."
echo
echo "Tip: run with AUTO_CREATE_TEST_USERS=1 to generate fresh TEST_* credentials."
