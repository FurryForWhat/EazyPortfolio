import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  // After OAuth exchange, ensure profile exists in Supabase
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", session.user.id)
      .single();

    if (!existing) {
      await supabase.from("profiles").insert({
        id: session.user.id,
        github_id: parseInt(session.user.user_metadata?.github_id || "0"),
        github_login:
          session.user.user_metadata?.github_login ||
          session.user.email?.split("@")[0] ||
          "",
      });
    }
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
