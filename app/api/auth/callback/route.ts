import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  let providerToken: string | null = null;

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    // provider_token (the actual GitHub access token) is only ever present
    // on this initial exchange — capture it now or it's gone.
    providerToken = data.session?.provider_token ?? null;
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", session.user.id)
      .single();

    const profileFields = {
      github_id: parseInt(session.user.user_metadata?.github_id || "0"),
      github_login:
        session.user.user_metadata?.github_login ||
        session.user.email?.split("@")[0] ||
        "",
      ...(providerToken ? { github_access_token: providerToken } : {}),
    };

    if (!existing) {
      await supabase.from("profiles").insert({ id: session.user.id, ...profileFields });
    } else if (providerToken) {
      // Refresh the stored token on re-login so it doesn't go stale/expired.
      await supabase.from("profiles").update(profileFields).eq("id", session.user.id);
    }
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
