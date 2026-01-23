// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  BASE_API_PATH,
  CONNECT_PAGE_PATH,
  JWT_COOKIE,
  MAIN_PAGE_PATH,
  MESSAGES_PAGE_PATH,
  NOTIFICATION_PAGE_PATH,
  ONBOARD_PAGE_PATH,
  PROFILE_PAGE_PATH,
  SIGNIN_PAGE_PATH,
} from "@/lib/constants";
import { verifyJwtToken } from "./lib/authFunctions";
import { NEXT_PUBLIC_BASE_URL } from "./lib/env";

const protectedRoutes = [
  ONBOARD_PAGE_PATH,
  MAIN_PAGE_PATH,
  CONNECT_PAGE_PATH,
  MESSAGES_PAGE_PATH,
  PROFILE_PAGE_PATH,
  NOTIFICATION_PAGE_PATH,
];

// export default function middleware(req: NextRequest) {
//   const sessionToken = req.cookies.get(JWT_COOKIE)?.value;

//   const isProtectedRoute = protectedRoutes.some((path) =>
//     req.nextUrl.pathname.startsWith(path)
//   );
//   const isRegisterPage = req.nextUrl.pathname.startsWith(SIGNIN_PAGE_PATH);

//   if (isRegisterPage) {
//     return NextResponse.next();
//   }

//   if (!sessionToken) {
//     if (isProtectedRoute) {
//       const loginUrl = new URL(SIGNIN_PAGE_PATH, req.url);

//       // add redirect query param to return user after login
//       // loginUrl.searchParams.set('from', req.nextUrl.pathname);
//       return NextResponse.redirect(loginUrl);
//     }
//     return NextResponse.next();
//   }

//   // verify token
//   try {
//     const decoded = verifyJwtToken(sessionToken);
//     const header = new Headers(req.headers);
//     header.set("x-user-id", decoded.userId);
//     header.set("x-user-email", decoded.email);
//     return NextResponse.next({
//       request: {
//         headers: header,
//       },
//     });
//   } catch (error) {
//     // invalid token
//     console.log("Invalid token:", error);
//     const response = NextResponse.redirect(new URL(SIGNIN_PAGE_PATH, req.url));
//     response.cookies.delete(JWT_COOKIE);
//     return response;
//   }
// }

// // configure which routes middleware runs on

const PUBLIC_API_ROUTES = [BASE_API_PATH + "/auth"];

export default function middleware(req: NextRequest) {
  const sessionToken = req.cookies.get(JWT_COOKIE)?.value;
  const pathname = req.nextUrl.pathname;

  // 1. Public API routes
  if (PUBLIC_API_ROUTES.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 2. Login page
  if (pathname.startsWith(SIGNIN_PAGE_PATH)) {
    if (sessionToken) {
      return verifySession(req, sessionToken, pathname);
    }
    return NextResponse.next();
  }

  // 3. Protected routes
  const isProtectedRoute = protectedRoutes.some((path) =>
    pathname.startsWith(path)
  );

  if (!sessionToken) {
    if (isProtectedRoute || pathname.startsWith(BASE_API_PATH)) {
      // API calls → 401
      if (pathname.startsWith(BASE_API_PATH)) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      // Pages → redirect
      return NextResponse.redirect(
        new URL(SIGNIN_PAGE_PATH, req.url)
      );
    }

    return NextResponse.next();
  }

  // 4. Token exists → verify
  return verifySession(req, sessionToken, pathname);
}

function verifySession(
  req: NextRequest,
  sessionToken: string,
  pathname: string
) {
  try {
    const decoded = verifyJwtToken(sessionToken);

    const headers = new Headers(req.headers);
    headers.set("x-user-id", decoded.userId);
    headers.set("x-user-email", decoded.email);

    // If user visits login while authenticated → redirect home
    if (pathname.startsWith(SIGNIN_PAGE_PATH)) {
      return NextResponse.redirect(
        new URL(MAIN_PAGE_PATH, NEXT_PUBLIC_BASE_URL)
      );
    }

    return NextResponse.next({
      request: { headers },
    });
  } catch {
    const response = NextResponse.redirect(
      new URL(SIGNIN_PAGE_PATH, req.url)
    );
    response.cookies.delete(JWT_COOKIE);
    return response;
  }
}

// export const config = {
//   matcher: [
//     "/",
//     "/auth/onboarding",
//     "/profile",
//     "/connect",
//     "/messages",
//     "/notifications",
//     "/api/:path*",
//   ],
// };

// IMPORTANT: Middleware must always run on /api routes
// Security depends on injected auth headers
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)",
  ],
};

