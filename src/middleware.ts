import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES = new Set(["/login", "/register"]);
const USER_PREFIXES = ["/user", "/consultant", "/admin"];

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      response,
      role: null,
      user: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    response,
    role: profile?.role ?? null,
    user,
  };
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = USER_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.has(pathname);

  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  const { response, role, user } = await getUserRole(request);

  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/user/dashboard", request.url));
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL(getRedirectPath(role), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/login", "/register", "/user/:path*", "/consultant/:path*", "/admin/:path*"],
};
