import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          // Clear cookies on sign out
          const response = NextResponse.json({ success: true });
          cookiesToSet.forEach(({ name }) => {
            response.cookies.set(name, "", { maxAge: 0, path: "/" });
          });
          return response;
        },
      },
    }
  );
  
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
