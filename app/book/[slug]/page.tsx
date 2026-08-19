"use client";

import { useEffect, useState, useCallback, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParlourBrand } from "@/lib/useParlourBrand";
import BottomNav from "@/components/BottomNav";
import { PawIcon } from "@/components/icons";

type Parlour = { id: string; name: string; subdomain: string; logo_url: string | null };
type PriceRule = { id: string; attribute_type: string | null; attribute_value: string | null; price: number };
type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  requires_groomer_selection: boolean;
  concurrent_capacity: number;
  price_rule: PriceRule[];
};
type Groomer = { id: string; name: string };
type Slot = { slot_start: string; slot_end: string };
type ClientRow = { id: string; name: string };
type Dog = { id: string; name: string; size: string | null; coat_type: string | null };

export default function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const supabase = createClient();
  const brand = useParlourBrand(slug);

  const [parlour, setParlour] = useState<Parlour | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<"service" | "groomer" | "slot" | "confirm">("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [selectedGroomer, setSelectedGroomer] = useState<Groomer | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [availableDays, setAvailableDays] = useState<Set<string>>(new Set());
  const [loadingMonth, setLoadingMonth] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [clientRecord, setClientRecord] = useState<ClientRow | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [dogs, setDogs] = useState<Dog[]>([]);
  const [dogId, setDogId] = useState("");
  const [newDogName, setNewDogName] = useState("");
  const [newDogSize, setNewDogSize] = useState("");
  const [newDogCoat, setNewDogCoat] = useState("");

  const [manualPriceRuleId, setManualPriceRuleId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const loadParlour = useCallback(async () => {
    setLoading(true);

    const { data: parlourRow } = await supabase
      .from("parlour")
      .select("id, name, subdomain, logo_url")
      .eq("subdomain", slug)
      .maybeSingle();

    if (!parlourRow) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setParlour(parlourRow);

    const { data: serviceRows } = await supabase
      .from("service")
      .select(
        "id, name, description, duration_minutes, requires_groomer_selection, concurrent_capacity, price_rule(id, attribute_type, attribute_value, price)"
      )
      .eq("parlour_id", parlourRow.id)
      .eq("active", true)
      .order("name");

    setServices((serviceRows ?? []) as unknown as Service[]);
    setLoading(false);
  }, [supabase, slug]);

  useEffect(() => {
    loadParlour();
    window.localStorage.setItem("pawlour_last_parlour", slug);
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, [loadParlour, supabase]);

  useEffect(() => {
    if (!userId || !parlour) return;
    (async () => {
      const { data: existing } = await supabase
        .from("client")
        .select("id, name")
        .eq("parlour_id", parlour.id)
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (!existing) return;

      setClientRecord(existing);
      const { data: dogRows } = await supabase
        .from("dog")
        .select("id, name, size, coat_type")
        .eq("client_id", existing.id)
        .order("name");
      setDogs(dogRows ?? []);
    })();
  }, [userId, parlour, supabase]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    const action =
      authMode === "signup"
        ? supabase.auth.signUp({ email: authEmail, password: authPassword })
        : supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });

    const { data, error: authErr } = await action;
    setAuthLoading(false);

    if (authErr) {
      setAuthError(authErr.message);
      return;
    }

    if (!data.session) {
      setAuthError("Check your email to confirm your account, then come back and sign in.");
      return;
    }

    if (data.user) setUserId(data.user.id);
  }

  async function handleCreateClientRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!parlour || !clientName.trim()) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError("Your session expired — please sign in again.");
      return;
    }

    const { data, error: clientErr } = await supabase
      .from("client")
      .insert({
        parlour_id: parlour.id,
        auth_user_id: session.user.id,
        name: clientName.trim(),
        phone: clientPhone.trim() || null,
      })
      .select("id, name")
      .single();

    if (clientErr || !data) {
      setError(clientErr?.message ?? "Could not save your details.");
      return;
    }
    setClientRecord(data);
  }

  async function handleSelectService(service: Service) {
    setSelectedService(service);
    setError(null);

    if (!service.requires_groomer_selection) {
      setSelectedGroomer(null);
      setStep("slot");
      return;
    }

    const { data: groomerLinks } = await supabase
      .from("groomer_service")
      .select("groomer:groomer_id(id, name)")
      .eq("service_id", service.id);

    const linkedGroomers = ((groomerLinks ?? []) as unknown as { groomer: Groomer }[]).map(
      (g) => g.groomer
    );

    setGroomers(linkedGroomers);
    setStep("groomer");
  }

  function handleSelectGroomer(groomer: Groomer) {
    setSelectedGroomer(groomer);
    setStep("slot");
  }

  const loadMonthAvailability = useCallback(async () => {
    if (!selectedService || !parlour) return;
    if (selectedService.requires_groomer_selection && !selectedGroomer) return;

    setLoadingMonth(true);
    const { year, month } = calendarMonth;
    const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);

    const { data, error: rpcError } = await supabase.rpc("get_available_days", {
      p_parlour_id: parlour.id,
      p_service_id: selectedService.id,
      p_groomer_id: selectedGroomer?.id ?? null,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    setLoadingMonth(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setAvailableDays(new Set((data ?? []).map((row: { available_date: string }) => row.available_date)));
  }, [supabase, selectedService, selectedGroomer, parlour, calendarMonth]);

  const checkAvailability = useCallback(async () => {
    if (!selectedService || !parlour) return;
    if (selectedService.requires_groomer_selection && !selectedGroomer) return;

    setCheckingSlots(true);
    setSelectedSlot(null);

    const { data, error: rpcError } = selectedService.requires_groomer_selection
      ? await supabase.rpc("get_available_slots", {
          p_groomer_id: selectedGroomer!.id,
          p_date: date,
          p_duration_minutes: selectedService.duration_minutes,
        })
      : await supabase.rpc("get_capacity_slots", {
          p_parlour_id: parlour.id,
          p_service_id: selectedService.id,
          p_date: date,
          p_duration_minutes: selectedService.duration_minutes,
        });

    setCheckingSlots(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setSlots(data ?? []);
  }, [supabase, selectedGroomer, selectedService, date, parlour]);

  useEffect(() => {
    if (step === "slot") loadMonthAvailability();
  }, [step, loadMonthAvailability]);

  useEffect(() => {
    if (step === "slot" && date) checkAvailability();
  }, [step, date, checkAvailability]);

  const flatPrice = selectedService?.price_rule.find((r) => !r.attribute_type);
  const attributeRules = selectedService?.price_rule.filter((r) => r.attribute_type) ?? [];
  const selectedDog = dogs.find((d) => d.id === dogId);

  let autoMatchedRule: PriceRule | null = null;
  if (attributeRules.length > 0 && selectedDog) {
    for (const rule of attributeRules) {
      const dogValue =
        rule.attribute_type === "size"
          ? selectedDog.size
          : rule.attribute_type === "coat_type"
          ? selectedDog.coat_type
          : null;
      if (dogValue && dogValue.toLowerCase() === rule.attribute_value?.toLowerCase()) {
        autoMatchedRule = rule;
        break;
      }
    }
  }

  const resolvedRule =
    flatPrice ?? autoMatchedRule ?? attributeRules.find((r) => r.id === manualPriceRuleId) ?? null;

  async function handleAddDog(e: React.FormEvent) {
    e.preventDefault();
    if (!clientRecord || !newDogName.trim()) return;

    const { data, error: dogErr } = await supabase
      .from("dog")
      .insert({
        client_id: clientRecord.id,
        name: newDogName.trim(),
        size: newDogSize.trim() || null,
        coat_type: newDogCoat.trim() || null,
      })
      .select("id, name, size, coat_type")
      .single();

    if (dogErr || !data) {
      setError(dogErr?.message ?? "Could not add dog.");
      return;
    }
    setDogs((prev) => [...prev, data]);
    setDogId(data.id);
    setNewDogName("");
    setNewDogSize("");
    setNewDogCoat("");
  }

  async function handleSubmitBooking() {
    setError(null);
    if (
      !parlour ||
      !clientRecord ||
      !dogId ||
      !selectedService ||
      !selectedSlot ||
      (selectedService.requires_groomer_selection && !selectedGroomer)
    ) {
      setError("Please complete every step before confirming.");
      return;
    }
    if (!resolvedRule) {
      setError("We couldn't work out the price — please pick one below.");
      return;
    }

    setSubmitting(true);

    const { error: bookingErr } = await supabase.from("booking").insert({
      parlour_id: parlour.id,
      client_id: clientRecord.id,
      dog_id: dogId,
      groomer_id: selectedGroomer?.id ?? null,
      service_id: selectedService.id,
      starts_at: selectedSlot.slot_start,
      ends_at: selectedSlot.slot_end,
      price: resolvedRule.price,
      status: "confirmed",
    });

    setSubmitting(false);

    if (bookingErr) {
      setError(
        bookingErr.message.includes("tstzrange") || bookingErr.message.includes("conflict")
          ? "That slot was just taken — please pick another time."
          : bookingErr.message
      );
      return;
    }

    setBookingConfirmed(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-10 pb-28">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl skeleton mx-auto mb-3" />
            <div className="h-6 w-40 rounded-lg skeleton mx-auto mb-2" />
            <div className="h-4 w-52 rounded-lg skeleton mx-auto" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl skeleton" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !parlour) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-xl font-semibold text-[#1A1A1A] mb-2">Parlour not found</h1>
          <p className="text-sm text-[#1A1A1A]/60">Double-check the link your parlour gave you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 pb-28">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-10">
          <div
            className="w-11 h-11 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: brand.primaryColor }}
          >
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt={parlour.name} className="w-full h-full object-cover" />
            ) : (
              <PawIcon className="w-5 h-5" style={{ color: brand.accentColor }} />
            )}
          </div>
          <h1 className="text-[19px] font-medium text-[#1A1A1A] tracking-[-0.01em]">{parlour.name}</h1>
          <p className="eyebrow mt-2">Book your next groom</p>
          {!userId && (
            <a
              href={`/book/${slug}/welcome`}
              className="inline-block text-xs font-medium underline mt-3"
              style={{ color: brand.accentColor }}
            >
              New here? Set up your dog&apos;s profile
            </a>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <div className="flex items-center gap-1 mb-6">
          {["service", "groomer", "slot", "confirm"].map((s, i) => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full"
              style={{
                backgroundColor:
                  ["service", "groomer", "slot", "confirm"].indexOf(step) >= i
                    ? brand.primaryColor
                    : "rgba(0,0,0,0.1)",
              }}
            />
          ))}
        </div>

        {step === "service" && (
          <div className="step-enter" key="service">
            {services.length === 0 && (
              <p className="text-sm text-[#1A1A1A]/50 italic text-center">
                No services available yet — check back soon.
              </p>
            )}
            {services.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden">
                {services.map((service, i) => {
                  const flat = service.price_rule.find((r) => !r.attribute_type);
                  const range = service.price_rule.filter((r) => r.attribute_type);
                  return (
                    <button
                      key={service.id}
                      onClick={() => handleSelectService(service)}
                      className={`w-full px-5 py-4 text-left flex justify-between items-baseline hover:bg-black/[0.02] transition-colors ${
                        i > 0 ? "hairline-t" : ""
                      }`}
                    >
                      <div>
                        <div className="text-[15px] text-[#1A1A1A]">{service.name}</div>
                        <div className="text-xs text-[#1A1A1A]/40 mt-0.5">{service.duration_minutes} min</div>
                      </div>
                      <div className="text-sm" style={{ color: brand.accentColor }}>
                        {flat
                          ? `R${Number(flat.price).toFixed(0)}`
                          : range.length > 0
                          ? `from R${Math.min(...range.map((r) => Number(r.price))).toFixed(0)}`
                          : ""}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === "groomer" && selectedService && (
          <div className="step-enter" key="groomer">
            <button onClick={() => setStep("service")} className="text-xs text-[#1A1A1A]/50 mb-4 hover:underline">
              ← Back
            </button>
            <p className="text-sm text-[#1A1A1A]/70 mb-4">
              Who would you like for <strong>{selectedService.name}</strong>?
            </p>
            <div className="space-y-2">
              {groomers.length === 0 && (
                <p className="text-sm text-[#1A1A1A]/50 italic">No groomer available for this service yet.</p>
              )}
              {groomers.map((groomer) => (
                <button
                  key={groomer.id}
                  onClick={() => handleSelectGroomer(groomer)}
                  className="w-full bg-white border border-black/10 rounded-2xl p-4 text-left font-medium text-[#1A1A1A] hover:border-black/30 transition-colors"
                >
                  {groomer.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "slot" && selectedService && (
          <div className="step-enter" key="slot">
            <button
              onClick={() => setStep(selectedService.requires_groomer_selection ? "groomer" : "service")}
              className="text-xs text-[#1A1A1A]/50 mb-4 hover:underline"
            >
              ← Back
            </button>
            <MiniCalendar
              year={calendarMonth.year}
              month={calendarMonth.month}
              selectedDate={date}
              availableDays={availableDays}
              loading={loadingMonth}
              accentColor={brand.accentColor}
              primaryColor={brand.primaryColor}
              onSelectDate={(d) => setDate(d)}
              onChangeMonth={(year, month) => setCalendarMonth({ year, month })}
            />
            {checkingSlots ? (
              <p className="text-sm text-[#1A1A1A]/50">Checking availability…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-[#1A1A1A]/50 italic">No slots available this date — try another day.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {slots.map((slot) => (
                  <button
                    key={slot.slot_start}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setStep("confirm");
                    }}
                    className="bg-white border border-black/15 rounded-lg text-center py-2.5 text-sm text-[#1A1A1A] hover:border-black/40"
                  >
                    {new Date(slot.slot_start).toLocaleTimeString("en-ZA", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "confirm" && selectedSlot && selectedService && (
          <div className="step-enter" key="confirm">
            {!bookingConfirmed && (
              <button onClick={() => setStep("slot")} className="text-xs text-[#1A1A1A]/50 mb-4 hover:underline">
                ← Back
              </button>
            )}

            <div className="bg-white border border-black/10 rounded-2xl p-5 space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-[#1A1A1A]/50">Service</span>
                <span className="font-medium text-[#1A1A1A]">{selectedService.name}</span>
              </div>
              {selectedGroomer && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#1A1A1A]/50">Groomer</span>
                  <span className="font-medium text-[#1A1A1A]">{selectedGroomer.name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[#1A1A1A]/50">Date &amp; time</span>
                <span className="font-medium text-[#1A1A1A]">
                  {new Date(selectedSlot.slot_start).toLocaleString("en-ZA", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </span>
              </div>
              {resolvedRule && (
                <div className="flex justify-between text-sm pt-3 border-t border-black/10">
                  <span className="text-[#1A1A1A]/50">Price</span>
                  <span className="font-semibold text-[#1A1A1A]">R{Number(resolvedRule.price).toFixed(2)}</span>
                </div>
              )}
            </div>

            {bookingConfirmed ? (
              <div className="bg-white border border-black/10 rounded-2xl p-6 text-center">
                <div className="text-2xl mb-2">🎉</div>
                <p className="font-semibold text-[#1A1A1A] mb-1">Booking confirmed!</p>
                <p className="text-sm text-[#1A1A1A]/60">
                  See you then — {parlour.name} will be ready for {selectedDog?.name ?? "your dog"}.
                </p>
              </div>
            ) : !authChecked ? (
              <p className="text-sm text-[#1A1A1A]/50">Loading…</p>
            ) : !userId ? (
              <form onSubmit={handleAuth} className="bg-white border border-black/10 rounded-2xl p-5 space-y-3">
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode("signup")}
                    className="flex-1 text-xs rounded-lg py-2 border"
                    style={
                      authMode === "signup"
                        ? { backgroundColor: brand.primaryColor, color: "#fff", borderColor: brand.primaryColor }
                        : { borderColor: "rgba(0,0,0,0.15)", color: "#1A1A1A" }
                    }
                  >
                    New client
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className="flex-1 text-xs rounded-lg py-2 border"
                    style={
                      authMode === "login"
                        ? { backgroundColor: brand.primaryColor, color: "#fff", borderColor: brand.primaryColor }
                        : { borderColor: "rgba(0,0,0,0.15)", color: "#1A1A1A" }
                    }
                  >
                    I&apos;ve booked here before
                  </button>
                </div>
                {authError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {authError}
                  </div>
                )}
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]"
                />
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full rounded-full py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  {authLoading ? "…" : authMode === "signup" ? "Continue" : "Sign in"}
                </button>
                {authMode === "login" && (
                  <a
                    href={`/forgot-password?slug=${encodeURIComponent(slug)}`}
                    className="block text-center text-xs text-[#1A1A1A]/50 underline"
                  >
                    Forgot your password?
                  </a>
                )}
              </form>
            ) : !clientRecord ? (
              <form
                onSubmit={handleCreateClientRecord}
                className="bg-white border border-black/10 rounded-2xl p-5 space-y-3"
              >
                <p className="text-sm text-[#1A1A1A]/70 mb-1">Just a couple of details:</p>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]"
                />
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]"
                />
                <button
                  type="submit"
                  className="w-full rounded-full py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  Continue
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {error && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
                <div className="bg-white border border-black/10 rounded-2xl p-5 space-y-3">
                  <p className="text-sm text-[#1A1A1A]/70">Which dog?</p>
                  {dogs.length > 0 && (
                    <select
                      value={dogId}
                      onChange={(e) => setDogId(e.target.value)}
                      className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]"
                    >
                      <option value="">Select a dog…</option>
                      {dogs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <form onSubmit={handleAddDog} className="flex gap-2 flex-wrap">
                    <input
                      type="text"
                      value={newDogName}
                      onChange={(e) => setNewDogName(e.target.value)}
                      placeholder="New dog's name"
                      className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]"
                    />
                    <input
                      type="text"
                      value={newDogSize}
                      onChange={(e) => setNewDogSize(e.target.value)}
                      placeholder="Size"
                      className="w-24 rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]"
                    />
                    <input
                      type="text"
                      value={newDogCoat}
                      onChange={(e) => setNewDogCoat(e.target.value)}
                      placeholder="Coat"
                      className="w-24 rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]"
                    />
                    <button
                      type="submit"
                      className="text-xs rounded-lg px-4 text-white"
                      style={{ backgroundColor: brand.primaryColor }}
                    >
                      Add dog
                    </button>
                  </form>
                </div>

                {dogId && attributeRules.length > 0 && !autoMatchedRule && !flatPrice && (
                  <div className="bg-white border border-black/10 rounded-2xl p-5">
                    <p className="text-xs text-[#1A1A1A]/50 italic mb-2">
                      Couldn&apos;t match your dog&apos;s size automatically — pick a price:
                    </p>
                    <select
                      value={manualPriceRuleId}
                      onChange={(e) => setManualPriceRuleId(e.target.value)}
                      className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]"
                    >
                      <option value="">Select…</option>
                      {attributeRules.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.attribute_value}: R{Number(r.price).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {dogId && resolvedRule && (
                  <button
                    onClick={handleSubmitBooking}
                    disabled={submitting}
                    className="w-full rounded-full py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: brand.primaryColor }}
                  >
                    {submitting ? "Confirming…" : `Confirm booking — R${Number(resolvedRule.price).toFixed(2)}`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav slug={slug} primaryColor={brand.primaryColor} />
    </div>
  );
}

function MiniCalendar({
  year,
  month,
  selectedDate,
  availableDays,
  loading,
  accentColor,
  primaryColor,
  onSelectDate,
  onChangeMonth,
}: {
  year: number;
  month: number;
  selectedDate: string;
  availableDays: Set<string>;
  loading: boolean;
  accentColor: string;
  primaryColor: string;
  onSelectDate: (date: string) => void;
  onChangeMonth: (year: number, month: number) => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = firstOfMonth.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function goPrevMonth() {
    if (month === 0) onChangeMonth(year - 1, 11);
    else onChangeMonth(year, month - 1);
  }

  function goNextMonth() {
    if (month === 11) onChangeMonth(year + 1, 0);
    else onChangeMonth(year, month + 1);
  }

  return (
    <div className="bg-white border border-black/10 rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={goPrevMonth} className="text-[#1A1A1A]/50 hover:text-[#1A1A1A] px-2">
          ‹
        </button>
        <div className="text-sm font-semibold text-[#1A1A1A]">
          {monthLabel}
          {loading && <span className="text-[#1A1A1A]/40 font-normal"> · loading…</span>}
        </div>
        <button type="button" onClick={goNextMonth} className="text-[#1A1A1A]/50 hover:text-[#1A1A1A] px-2">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] text-[#1A1A1A]/40 font-medium">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;
          const ds = dateStr(day);
          const isPast = ds < todayStr;
          const isAvailable = availableDays.has(ds) && !isPast;
          const isSelected = ds === selectedDate;

          return (
            <button
              type="button"
              key={ds}
              disabled={!isAvailable}
              onClick={() => onSelectDate(ds)}
              className="aspect-square rounded-lg text-xs flex flex-col items-center justify-center gap-0.5 transition-colors"
              style={
                isSelected
                  ? { backgroundColor: primaryColor, color: "#fff" }
                  : isAvailable
                  ? { color: "#1A1A1A", border: "1px solid rgba(0,0,0,0.1)" }
                  : { color: "rgba(20,38,31,0.25)" }
              }
            >
              <span>{day}</span>
              {isAvailable && !isSelected && (
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: accentColor }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
