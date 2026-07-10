import { createServerClient } from "@supabase/ssr";
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection.
 * - better-auth: official getSessionCookie (edge-safe); full session in RSC via AuthPort
 * - supabase: getUser() refresh
 * - none: allow /app in demo mode
 */
export async function middleware(request: NextRequest) {
  const adapter = process.env.AUTH_ADAPTER?.toLowerCase();
  const hasBetter =
    Boolean(process.env.DATABASE_URL) && Boolean(process.env.BETTER_AUTH_SECRET);
  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const mode =
    adapter === "supabase" || adapter === "better-auth"
      ? adapter
      : hasBetter
        ? "better-auth"
        : hasSupabase
          ? "supabase"
          : "none";

  if (mode === "none") {
    return NextResponse.next();
  }

  if (mode === "better-auth") {
    // better-auth/cookies — recommended edge-safe check (see Better Auth Next.js docs)
    const sessionCookie = getSessionCookie(request);
    const hasSession = Boolean(sessionCookie);

    if (request.nextUrl.pathname.startsWith("/app") && !hasSession) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(login);
    }
    if (request.nextUrl.pathname === "/login" && hasSession) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
    return NextResponse.next();
  }

  // supabase
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/app") && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  if (request.nextUrl.pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/login"],
};
