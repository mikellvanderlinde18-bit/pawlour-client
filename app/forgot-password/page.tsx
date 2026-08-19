"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ForgotPasswordForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const returnSlug = searchParams.get("slug") ?? "";

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const redirectTo = `${window.location.origin}/reset-password${
      returnSlug ? `?slug=${encodeURIComponent(returnSlug)}` : ""
    }`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-[#14261F]">Reset your password</h1>
          <p className="text-sm text-[#14261F]/60 mt-1">We&apos;ll email you a link to set a new one.</p>
        </div>

        {sent ? (
          <div className="bg-white border border-black/10 rounded-2xl p-6 text-center">
            <p className="text-sm text-[#14261F]">Check your email for a link to reset your password.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-black/10 rounded-2xl p-6 space-y-3">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#14261F] text-[#FAF6EF] rounded-full py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        {returnSlug && (
          <a href={`/book/${returnSlug}`} className="block text-center text-xs text-[#14261F]/50 underline mt-6">
            ← Back to booking
          </a>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
