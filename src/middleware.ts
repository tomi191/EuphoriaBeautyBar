import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(req: NextRequest) {
  const session = getSessionCookie(req);

  if (!session) {
    // Edge backstop — ако нов /staff route забрави requireStaff(), пак не е публичен.
    // Реалната проверка на роля остава в страницата/action-а.
    const isStaff = req.nextUrl.pathname.startsWith("/staff");
    const loginUrl = new URL(isStaff ? "/staff/login" : "/admin/login", req.url);
    loginUrl.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/((?!login).*)", "/staff/((?!login).*)"],
};
