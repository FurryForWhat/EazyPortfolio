import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  const cookieStore = await cookies();
  let response = NextResponse.redirect(new URL(next, requestUrl.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let providerToken: string | null = null;

  if (code) {
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    providerToken = data.session?.provider_token ?? null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    const githubId = parseInt(session.user.user_metadata?.github_id || "0");
    const githubLogin = session.user.user_metadata?.github_login || session.user.email?.split("@")[0] || "";

    // Check if profile exists by github_id
    const { data: existingByGithub } = await supabase
      .from("profiles")
      .select("id")
      .eq("github_id", githubId)
      .single();

    if (!existingByGithub) {
      await supabase.from("profiles").insert({
        id: session.user.id,
        github_id: githubId,
        github_login: githubLogin,
        ...(providerToken ? { github_access_token: providerToken } : {}),
      });
    } else if (providerToken) {
      await supabase.from("profiles").update({
        github_access_token: providerToken,
      }).eq("id", existingByGithub.id);
    }
  }

  return response;
}
