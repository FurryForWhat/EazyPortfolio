import { type NextRequest, NextResponse } from "next/server";

// TODO: Enable when Supabase credentials are configured in .env.local
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/auth/callback).*)",
  ],
};
