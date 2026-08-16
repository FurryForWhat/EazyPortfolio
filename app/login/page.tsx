import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Link from "next/link";

export default async function LoginPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  const { data } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
    },
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">Sign in with GitHub</h1>
        <p className="text-[#7b80a0] mb-8">
          We only need read access to your repos. Nothing else.
        </p>
        {data?.url && (
          <a
            href={data.url}
            className="inline-flex items-center gap-2 rounded-lg bg-[#4f6ef6] px-6 py-3 text-base font-medium text-white hover:bg-[#3d5bd9] transition-colors"
          >
            Continue with GitHub
          </a>
        )}
        <div className="mt-8">
          <Link
            href="/"
            className="text-sm text-[#7b80a0] hover:text-[#e8eaf0] transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
