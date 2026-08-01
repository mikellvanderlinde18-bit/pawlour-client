"use client";

import { useEffect, useState, useCallback, use } from "react";
import { createClient } from "@/lib/supabase/client";

type Parlour = { id: string; name: string };
type Dog = { id: string; name: string; breed: string | null; size: string | null };
type Booking = {
  id: string;
  starts_at: string;
  price: number;
  status: string;
  service: { name: string } | null;
  groomer: { name: string } | null;
  dog: { name: string } | null;
};
type RewardRule = {
  trigger_type: string;
  threshold: number;
  reward_type: string;
};
type RewardLedger = {
  visit_count: number;
  spend_total: number;
  reward_available: boolean;
};

export default function AccountPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const supabase = createClient();

  const [parlour, setParlour] = useState<Parlour | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const [dogs, setDogs] = useState<Dog[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rewardRule, setRewardRule] = useState<RewardRule | null>(null);
  const [rewardLedger, setRewardLedger] = useState<RewardLedger | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);

    const { data: parlourRow } = await supabase
      .from("parlour")
      .select("id, name")
      .eq("subdomain", slug)
      .maybeSingle();

    if (!parlourRow) {
      setLoading(false);
      return;
    }
    setParlour(parlourRow);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoggedIn(false);
      setLoading(false);
      return;
    }
    setLoggedIn(true);

    const { data: clientRow } = await supabase
      .from("client")
      .select("id")
      .eq("parlour_id", parlourRow.id)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!clientRow) {
      setLoading(false);
      return;
    }

    const [{ data: dogRows }, { data: bookingRows }, { data: ruleRow }, { data: ledgerRow }] =
      await Promise.all([
        supabase
          .from("dog")
          .select("id, name, breed, size")
          .eq("client_id", clientRow.id)
          .order("name"),
        supabase
          .from("booking")
          .select(
            "id, starts_at, price, status, service:service_id(name), groomer:groomer_id(name), dog:dog_id(name)"
          )
          .eq("client_id", clientRow.id)
          .eq("status", "confirmed")
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true }),
        supabase
          .from("reward_rule")
          .select("trigger_type, threshold, reward_type")
          .eq("parlour_id", parlourRow.id)
          .eq("active", true)
          .maybeSingle(),
        supabase
          .from("reward_ledger")
          .select("visit_count, spend_total, reward_available")
          .eq("client_id", clientRow.id)
          .maybeSingle(),
      ]);

    setDogs(dogRows ?? []);
    setBookings((bookingRows ?? []) as unknown as Booking[]);
    setRewardRule(ruleRow ?? null);
    setRewardLedger(ledgerRow ?? null);
    setLoading(false);
  }, [supabase, slug]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = `/book/${slug}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[#14261F]/50">Loading…</p>
      </div>
    );
  }

  if (!parlour) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <p className="text-sm text-[#14261F]/60">Parlour not found.</p>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-sm text-[#14261F]/60 mb-4">
            Sign in to see your bookings and dogs.
          </p>
          <a
            href={`/book/${slug}`}
            className="inline-block bg-[#14261F] text-[#FAF6EF] rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            Go book something →
          </a>
        </div>
      </div>
    );
  }

  const progress = rewardRule && rewardLedger
    ? rewardRule.trigger_type === "visit_count"
      ? rewardLedger.visit_count % rewardRule.threshold
      : rewardLedger.spend_total % rewardRule.threshold
    : 0;

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#14261F]">{parlour.name}</h1>
            <p className="text-xs text-[#14261F]/50">Your account</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs text-[#14261F]/50 hover:underline"
          >
            Sign out
          </button>
        </div>

        <a
          href={`/book/${slug}`}
          className="block text-center bg-[#14261F] text-[#FAF6EF] rounded-full py-2.5 text-sm font-semibold mb-8"
        >
          Book another groom
        </a>

        {/* Rewards */}
        {rewardRule && (
          <div className="bg-white border border-black/10 rounded-2xl p-5 mb-6">
            <p className="text-sm font-semibold text-[#14261F] mb-2">Rewards</p>
            {rewardLedger?.reward_available ? (
              <p className="text-sm text-[#D98F5F] font-medium">
                🎉 You&apos;ve earned a reward — it&apos;ll apply to your next visit.
              </p>
            ) : (
              <>
                <div className="h-2 bg-[#FAF6EF] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-[#D98F5F] rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (progress / rewardRule.threshold) * 100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-[#14261F]/60">
                  {rewardRule.trigger_type === "visit_count"
                    ? `${progress} of ${rewardRule.threshold} visits`
                    : `R${progress.toFixed(0)} of R${rewardRule.threshold} spent`}
                </p>
              </>
            )}
          </div>
        )}

        {/* Upcoming bookings */}
        <p className="text-sm font-semibold text-[#14261F] mb-3">Upcoming bookings</p>
        <div className="space-y-2 mb-6">
          {bookings.length === 0 && (
            <p className="text-sm text-[#14261F]/50 italic">No upcoming bookings.</p>
          )}
          {bookings.map((b) => (
            <div key={b.id} className="bg-white border border-black/10 rounded-2xl p-4">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-[#14261F] text-sm">
                  {b.service?.name ?? "Service"} — {b.dog?.name ?? "Dog"}
                </span>
                <span className="text-sm font-semibold text-[#D98F5F]">
                  R{Number(b.price).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-[#14261F]/50">
                {new Date(b.starts_at).toLocaleString("en-ZA", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
                {b.groomer?.name ? ` · ${b.groomer.name}` : ""}
              </p>
            </div>
          ))}
        </div>

        {/* Dogs */}
        <p className="text-sm font-semibold text-[#14261F] mb-3">Your dogs</p>
        <div className="space-y-2">
          {dogs.length === 0 && (
            <p className="text-sm text-[#14261F]/50 italic">No dogs added yet.</p>
          )}
          {dogs.map((dog) => (
            <div
              key={dog.id}
              className="bg-white border border-black/10 rounded-2xl p-4 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-[#14261F] flex items-center justify-center text-sm">
                🐾
              </div>
              <div>
                <p className="text-sm font-medium text-[#14261F]">{dog.name}</p>
                <p className="text-xs text-[#14261F]/50">
                  {[dog.breed, dog.size].filter(Boolean).join(" · ") || "No details yet"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
