"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const returnSlug = searchParams.get("slug") ?? "";

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-[#1A1A1A]">Set a new password</h1>
        </div>

        {done ? (
          <div className="bg-white border border-black/10 rounded-2xl p-6 text-center">
            <p className="text-sm text-[#1A1A1A] mb-4">Your password has been updated.</p>
            <a
              href={returnSlug ? `/book/${returnSlug}` : "/"}
              className="inline-block bg-[#1A1A1A] text-white rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Continue
            </a>
          </div>
        ) : !ready ? (
          <p className="text-sm text-[#1A1A1A]/50 text-center">Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-black/10 rounded-2xl p-6 space-y-3">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
            )}
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#1A1A1A] text-white rounded-full py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
