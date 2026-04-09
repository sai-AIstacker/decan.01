import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { AppRole } from "@/types/database";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = ["/", "/login"];
  if (publicRoutes.includes(pathname)) {
    if (user) {
      // Redirect authenticated users to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // Protected routes
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Get user roles
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select(`
      roles!inner(name)
    `)
    .eq("user_id", user.id);

  const roles: AppRole[] = userRoles?.map((ur: any) => ur.roles.name) || [];

  // Role-based redirects
  if (pathname.startsWith("/admin") && !roles.includes("admin")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/teacher") && !roles.includes("teacher")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/student") && !roles.includes("student")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/parent") && !roles.includes("parent")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/config") && !roles.includes("app_config") && !roles.includes("admin")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/accounting") && !roles.includes("accounting") && !roles.includes("admin")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/hr") && !roles.includes("hr") && !roles.includes("admin")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/owner")) {
    const ownerConfig = process.env.OWNER_EMAILS || process.env.COMPANY_OWNER_EMAIL || "";
    const ownerEmails = ownerConfig
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const currentEmail = user.email?.toLowerCase() || "";
    if (!ownerEmails.includes(currentEmail)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Default dashboard redirect based on primary role
  if (pathname === "/dashboard") {
    if (roles.includes("admin")) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (roles.includes("teacher")) {
      return NextResponse.redirect(new URL("/teacher", request.url));
    }
    if (roles.includes("student")) {
      return NextResponse.redirect(new URL("/student", request.url));
    }
    if (roles.includes("parent")) {
      return NextResponse.redirect(new URL("/parent", request.url));
    }
    if (roles.includes("app_config")) {
      return NextResponse.redirect(new URL("/config", request.url));
    }
    if (roles.includes("accounting")) {
      return NextResponse.redirect(new URL("/accounting", request.url));
    }
    if (roles.includes("hr")) {
      return NextResponse.redirect(new URL("/hr", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};