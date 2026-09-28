"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
        scopes: "read:user public_repo",
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">Sign in with GitHub</h1>
        <p className="text-[#7b80a0] mb-8">
          We only need read access to your repos. Nothing else.
        </p>
        {error && (
          <p className="text-red-400 mb-4 text-sm">{error}</p>
        )}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-[#4f6ef6] px-6 py-3 text-base font-medium text-white hover:bg-[#3d5bd9] transition-colors disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Continue with GitHub"}
        </button>
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
