// middleware.ts
import { auth } from "./auth";
import { NextResponse } from "next/server";

const publicRoutes = ["/login", "/register", "/forgot-password"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isPublic = publicRoutes.includes(req.nextUrl.pathname);

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
