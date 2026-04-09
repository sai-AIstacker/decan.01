# SSVM School Management

Next.js frontend + Supabase auth/database with role-based dashboards:
`admin`, `teacher`, `student`, `parent`, `app_config`, `accounting`, `hr`.

## Setup

1. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. Run all SQL migrations in order from `supabase/migrations/001_school_core.sql` to `011_performance_indexes.sql`.

3. Create users manually in Supabase (Auth + role mapping in DB).

- Create auth accounts in Supabase Auth.
- Ensure each account has a `public.profiles` row (`profiles.id = auth.users.id`).
- Assign roles in `public.user_roles` by mapping to `public.roles`.
- For school admins, assign role `admin`.

4. (Optional) Seed demo users/classes for local demo data only:

```bash
npm run seed:demo
```

Default seeded password is `Password123!`.  
You can override with `DEMO_PASSWORD` in `.env.local`.

## Run App

```bash
nvm use
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Notes

- The app supports multiple admins.
- Production setup should use manual user creation and role assignment per school.
- `seed:demo` is only for temporary local demo/testing data.
