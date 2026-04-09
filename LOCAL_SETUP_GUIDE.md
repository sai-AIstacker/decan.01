# Complete Local Setup Guide - SSVM School Management System

This guide will walk you through setting up the project locally so you can test all features from every dashboard.

---

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js** `>=20.9.0` (check with `node -v`)
- **npm** `9.0.0+` or **yarn**
- **Git** for cloning the repository
- A **Supabase account** (free at https://supabase.com)
- A **modern browser** (Chrome, Firefox, Edge, Safari)

### Install Node.js

If you don't have Node.js 20.9.0+, install it:

**macOS (with Homebrew):**
```bash
brew install node@20
brew link node@20
node -v  # Verify: v20.x.x
```

**Windows:**
Download from https://nodejs.org/ (LTS 20.x recommended)

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 🚀 Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up (free tier is fine)

2. Click **"New Project"**

3. Fill in the form:
   - **Name:** `ssvm-school` (or your preference)
   - **Database Password:** Save this securely (you might need it later)
   - **Region:** Choose closest to you
   - Click **"Create new project"**

4. Wait for project to initialize (2-3 minutes)

5. Once ready, go to **Settings > API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon Key** (public) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role Key** (keep secret!) → `SUPABASE_SERVICE_ROLE_KEY`

   You'll need these in the next step.

---

## 💻 Step 2: Clone & Setup Project

```bash
# Clone the repository
git clone <your-repo-url>
cd ssvm

# Install dependencies
npm install

# Or with yarn
yarn install
```

---

## 🔑 Step 3: Configure Environment Variables

Create `.env.local` file in the project root:

```bash
cat > .env.local << 'EOF'
# Supabase Configuration (from Step 1)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Custom demo password (default: Password123!)
DEMO_PASSWORD=Password123!
EOF
```

Replace the placeholder values with your actual Supabase keys from Step 1.

---

## 🗄️ Step 4: Run Database Migrations

This step creates all necessary tables and configurations in your Supabase database.

### Option A: Via Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Click **"SQL Editor"**
3. Click **"New Query"**
4. Copy content from each migration file in order:
   - `supabase/migrations/001_school_core.sql`
   - `supabase/migrations/002_multiple_roles.sql`
   - `supabase/migrations/003_academic_structure.sql`
   - `supabase/migrations/004_attendance.sql`
   - `supabase/migrations/005_timetable.sql`
   - `supabase/migrations/006_exams_and_marks.sql`
   - `supabase/migrations/007_exam_ranks.sql`
   - `supabase/migrations/008_communication.sql`
   - `supabase/migrations/009_analytics_finance_hr.sql`
   - `supabase/migrations/010_settings_and_automation.sql`
   - `supabase/migrations/011_performance_indexes.sql`
   - `supabase/migrations/012_classes_active_flag.sql`
   - `supabase/migrations/013_erp_finance_system.sql`
   - `supabase/migrations/014_advanced_accounting.sql`
   - `supabase/migrations/015_accounting_fixes.sql` ← **Required for accounting to work**

5. Paste each migration into the SQL editor
6. Click **"Run"** (⌘+Enter or Ctrl+Enter)

Wait for each to complete before running the next.

### Option B: Via Local Supabase CLI (Advanced)

```bash
# Install Supabase CLI if you don't have it
npm install -g supabase

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

---

## 🌱 Step 5: Create Users Manually (Recommended)

For real setup (including multi-school and multiple admins), create users manually:

1. Create users in **Supabase Auth**.
2. Ensure each user exists in `public.profiles` (`profiles.id = auth.users.id`).
3. Assign roles in `public.user_roles` using role IDs from `public.roles`.
4. Assign `admin` role to every school admin you want to grant admin access.

Optional local demo only:

```bash
npm run seed:demo
```

Use `seed:demo` only for temporary testing data, not production-style setup.

---

## ▶️ Step 6: Run Local Development Server

```bash
npm run dev
```

The app will start at: **http://localhost:3000**

You should see:
```
> next dev

  ▲ Next.js 16.2.2
  - Local:        http://localhost:3000
  - Environments: .env.local
```

Open your browser to **http://localhost:3000** → You'll be redirected to **http://localhost:3000/login**

---

## 🔐 Step 7: Login & Explore

### Login as Admin

1. Go to http://localhost:3000/login
2. Email: use any manually created admin user email
3. Password: use that user password
4. Click **"Sign in"**

You're now in the **Admin Dashboard** with access to:
- ✓ Academic Years management
- ✓ Classes management
- ✓ Subjects management
- ✓ Users management
- ✓ Enrollments
- ✓ Exams
- ✓ Timetables
- ✓ Attendance
- ✓ Results
- ✓ Settings
- ✓ Analytics
- ✓ Finance
- ✓ HR

---

## 📊 Testing Guide for All Dashboards

### 1️⃣ Admin Dashboard
**Login:** `admin@school.test` / `Password123!`

**Test Academic Setup (Required First):**
1. Go to **Admin > Academic Years**
2. Click **"Create Academic Year"**
   - Name: `2025-2026`
   - Start Date: `2025-04-01`
   - End Date: `2026-03-31`
   - Click **"Create"**
3. Click **"Set Active"** to make it the active year

**Test Classes Management:**
1. Go to **Admin > Classes**
2. Try to create a class (should show empty state)
3. Click **"Create Class"**
   - Name: `Grade 10-A`
   - Section: `A`
   - Choose a teacher
   - Click **"Create"**
4. Test the edge cases:
   - Try creating with no name (should show validation error)
   - Try double-click submitting (should be prevented)
   - Try deleting (should ask for confirmation)

**Test Subjects:**
1. Go to **Admin > Subjects**
2. Click **"Add Subject"**
   - Name: `Mathematics`
   - Code: `MATH-101`
   - Description: `Basic mathematics`
   - Click **"Create"**
3. Test edge cases:
   - Try creating with duplicate code (should show error)
   - Try invalid code format (should validate)

**Test Users:**
1. Go to **Admin > Users**
2. See all created users
3. Try creating new user (test form validation)

**Test Enrollments:**
1. Go to **Admin > Enrollments**
2. Enroll students in classes
3. Test status changes

**Test Exams:**
1. Go to **Admin > Exams**
2. Create exam configurations
3. Map subjects to exams

### 2️⃣ Teacher Dashboard
**Login:** `teacher1@school.test` / `Password123!`

**Access:**
1. Go to **Dashboard > Assignments**
   - See assigned classes
   - Manage student assignments

2. Go to **Dashboard > Classes**
   - View assigned classes
   - Take attendance
   - Record marks

3. Go to **Teacher > Notifications**
   - View class updates

4. Go to **Teacher > Messages**
   - Communicate with students/parents

### 3️⃣ Student Dashboard
**Login:** `student1@school.test` / `Password123!`

**Access:**
1. Go to **Dashboard** 
   - View class assignments
   - View timetable
   - Check attendance

2. Go to **Student > Results**
   - View exam results
   - Check rankings

3. Go to **Student > Attendance**
   - View attendance records

4. Go to **Student > Timetable**
   - View class schedule

### 4️⃣ Parent Dashboard
**Login:** `parent1@school.test` / `Password123!`

**Access:**
1. Go to **Dashboard**
   - View linked students
   - Quick stats

2. Go to **Parent > Messages**
   - Communicate with school

3. Go to **Parent > Results**
   - View child's results

### 5️⃣ App Config Dashboard
**Login:** `config@school.test` / `Password123!`

**Access:**
1. Go to **Config > Settings**
   - Attendance settings
   - System settings

### 6️⃣ Accounting Dashboard
**Login:** `accounting@school.test` / `Password123!`

**Access:**
1. Go to **Accounting > Finance**
   - View finance reports

### 7️⃣ HR Dashboard
**Login:** `hr@school.test` / `Password123!`

**Access:**
1. Go to **HR > Staff**
   - Manage staff information
   - View payroll

---

## ✨ Testing Edge Case Handling

Now that you have the system up, test the robust edge case handling:

### 1. Form Validation
- **Try empty submissions:** Leave required fields blank → See validation error
- **Try invalid formats:** 
  - Invalid email
  - Date with end before start
  - Invalid code format (not alphanumeric)
- **Check error persistence:** Error messages should disappear when field is corrected

### 2. Duplicate Submissions
- **Double-click submit button:** Should not submit twice
- **Button should disable** during submission
- **See loading indicator** (spinner)

### 3. Empty States
- **When no data exists:** Should show helpful empty state, not blank screen
- **Should show action button** to create first item

### 4. Error Messages
- **All errors in plain English:** No error codes like "23505"
- **Helpful suggestions:** "This email is already registered"
- **Network errors:** Check your internet to see network error handling

### 5. Network Resilience
- **Turn off internet** while loading data
- **See network error message** with helpful suggestion
- **Restart internet** and **try again button** works

---

## 🐛 Troubleshooting

### Issue: "Missing NEXT_PUBLIC_SUPABASE_URL"
**Solution:** Make sure `.env.local` has the correct Supabase keys.

```bash
cat .env.local  # Should show your keys
```

### Issue: "Database connection failed"
**Solution:** Check that:
1. Migrations have been run successfully
2. Supabase project is active (not paused)
3. Environment variables are correct

```bash
npm run seed:demo  # This will verify connectivity
```

### Issue: Demo seed fails
**Solution:** Run migrations first, then seed:

```bash
# Make sure you've run ALL migrations in Supabase dashboard
# Then try seeding again
npm run seed:demo

# If it still fails, check your SUPABASE_SERVICE_ROLE_KEY in .env.local
```

### Issue: Button stays loading after click
**Solution:** This might be a network issue:
1. Check browser console (F12 > Console tab)
2. Check that Supabase project is active
3. Restart the dev server: `npm run dev`

### Issue: Can't login after seeding
**Solution:** 
1. Verify demo email is exactly: `admin@school.test`
2. Verify password is exactly: `Password123!` (or your custom `DEMO_PASSWORD`)
3. Check that email is confirmed in Supabase (Dashboard > Auth > Users)

### Issue: Page shows blank or errors
**Solution:**
1. Open browser console: `F12` → `Console` tab
2. Check for error messages
3. Refresh page: `Ctrl+R` or `Cmd+R`
4. Restart dev server: Stop with `Ctrl+C`, run `npm run dev` again

---

## 📚 Project Structure

```
ssvm/
├── src/
│   ├── app/              # Next.js App Router (pages/layouts)
│   │   ├── (dashboard)/  # All dashboard pages
│   │   ├── login/        # Login page
│   │   └── ...
│   ├── components/       # React components
│   │   ├── ui/           # UI components (with error handling)
│   │   ├── layout/       # Layout components
│   │   └── ...
│   ├── lib/              # Utilities and helpers
│   │   ├── validation/   # Form validators
│   │   ├── error-handling.ts  # Error utilities
│   │   ├── supabase/     # Supabase clients
│   │   └── auth/         # Auth helpers
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript types
│   └── ...
├── supabase/
│   └── migrations/       # Database migrations (001-011)
├── scripts/
│   └── seed-demo.mjs     # Demo data seeding script
├── .env.local            # Environment variables (create this)
├── next.config.ts        # Next.js configuration
├── middleware.ts         # Auth middleware
└── package.json          # Dependencies
```

---

## 🎯 Next Steps After Setup

1. **Explore the codebase:**
   - Check `src/app/(dashboard)/admin/` for admin features
   - Check `src/app/(dashboard)/teacher/` for teacher features
   - Check error handling in `src/lib/` and `src/components/ui/`

2. **Create test data:**
   - Create more classes, subjects, exams
   - Enroll students
   - Create timetables
   - Record attendance and marks

3. **Test with multiple users:**
   - Open different browser windows/tabs
   - Login as different roles
   - See how data appears differently per role

4. **Customize:**
   - Modify settings in Config dashboard
   - Test automation features
   - Set up notifications

---

## 📖 Additional Resources

- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Project Guides:**
  - `IMPLEMENTATION_GUIDE.md` - Using the edge case handling system
  - `QUICK_REFERENCE.md` - Common patterns cheatsheet
  - `EDGE_CASE_HANDLING_SUMMARY.md` - What was implemented

---

## ✋ Need Help?

If you get stuck:

1. **Check the browser console** (F12 > Console) for error messages
2. **Check the terminal** for error logs
3. **Verify environment variables** in `.env.local`
4. **Ensure all migrations ran** successfully
5. **Try running seed again** if demo data wasn't created
6. **Restart dev server** if anything seems stuck

---

## 🚢 Deployment (Future)

When ready to deploy to production, see your hosting provider's docs (Vercel, Netlify, etc.) and reference this setup for environment variables needed.

---

Happy testing! 🎉
