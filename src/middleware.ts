import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConnectivityError } from "@/lib/supabase/errors";

const AUTH_ROUTES = new Set(["/login", "/register"]);
const USER_PREFIXES = ["/user", "/consultant", "/admin", "/notifications"];

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}

async function getUserRole(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, options, value }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        isSuspended: false,
        response,
        role: null,
        user: null,
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_suspended")
      .eq("id", user.id)
      .maybeSingle();

    return {
      isSuspended: profile?.is_suspended ?? false,
      response,
      role: profile?.role ?? null,
      user,
    };
  } catch (error) {
    if (!isSupabaseConnectivityError(error)) {
      console.error(error);
    }

    return {
      isSuspended: false,
      response,
      role: null,
      user: null,
    };
  }
}

function getRedirectPath(role: string | null) {
  if (role === "admin") {
    return "/admin/dashboard";
  }

  if (role === "consultant") {
    return "/consultant/dashboard";
  }

  return "/user/dashboard";
}

function canAccessPath(pathname: string, role: string | null) {
  if (pathname.startsWith("/admin")) {
    return role === "admin";
  }

  if (pathname.startsWith("/consultant")) {
    return role === "consultant";
  }

  if (pathname.startsWith("/user")) {
    return role === "customer";
  }

  if (pathname.startsWith("/notifications")) {
    return role === "admin" || role === "consultant" || role === "customer";
  }

  return true;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = USER_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.has(pathname);

  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  if (isAuthRoute && !hasSupabaseAuthCookie(request)) {
    return NextResponse.next();
  }

  const { isSuspended, response, role, user } = await getUserRole(request);

  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedRoute && user && isSuspended) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("suspended", "1");
    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedRoute && user && !role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isProtectedRoute && user && !canAccessPath(pathname, role)) {
    return NextResponse.redirect(new URL(getRedirectPath(role), request.url));
  }

  if (isAuthRoute && user && !role) {
    return response;
  }

  if (isAuthRoute && user && !isSuspended) {
    return NextResponse.redirect(new URL(getRedirectPath(role), request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/user/:path*",
    "/consultant/:path*",
    "/admin/:path*",
    "/notifications/:path*",
  ],
};
