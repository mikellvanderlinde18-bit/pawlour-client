"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PawIcon, GiftIcon } from "@/components/icons";

const PERSONALITY_TAGS = [
  "Cuddle bug",
  "Zoomies champion",
  "Shy at first",
  "Loves everyone",
  "Foodie",
  "Big talker",
  "Couch potato",
  "Escape artist",
  "Water lover",
  "Nervous nelly",
];

const STEPS = [
  "welcome",
  "auth",
  "details",
  "basics",
  "style",
  "personality",
  "health",
  "preferences",
  "done",
] as const;
type Step = (typeof STEPS)[number];

export default function WelcomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [parlourId, setParlourId] = useState<string | null>(null);
  const [parlourName, setParlourName] = useState("");
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("welcome");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [dogName, setDogName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [breed, setBreed] = useState("");
  const [size, setSize] = useState("");
  const [coatType, setCoatType] = useState("");
  const [coatColor, setCoatColor] = useState("");
  const [cutStyle, setCutStyle] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [about, setAbout] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [medications, setMedications] = useState("");
  const [vetName, setVetName] = useState("");
  const [vetPhone, setVetPhone] = useState("");
  const [vaccinated, setVaccinated] = useState<boolean | null>(null);
  const [favoriteTreat, setFavoriteTreat] = useState("");
  const [favoriteToy, setFavoriteToy] = useState("");
  const [dislikes, setDislikes] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  const init = useCallback(async () => {
    setLoading(true);
    const { data: parlourRow } = await supabase
      .from("parlour")
      .select("id, name")
      .eq("subdomain", slug)
      .maybeSingle();

    if (parlourRow) {
      setParlourId(parlourRow.id);
      setParlourName(parlourRow.name);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    setLoading(false);
  }, [supabase, slug]);

  useEffect(() => {
    init();
  }, [init]);

  function toggleTag(tag: string) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploadingPhoto(true);
    setError(null);

    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("dog-photos").upload(path, file, { upsert: true });

    if (uploadError) {
      setUploadingPhoto(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("dog-photos").getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    setUploadingPhoto(false);
  }

  function goNext() {
    const idx = STEPS.indexOf(step);
    setStep(STEPS[idx + 1]);
  }
  function goBack() {
    const idx = STEPS.indexOf(step);
    setStep(STEPS[idx - 1]);
  }
  function skipToFinish() {
    handleFinish();
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const action =
      authMode === "signup"
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password });

    const { data, error: authErr } = await action;
    setSaving(false);

    if (authErr) {
      setError(authErr.message);
      return;
    }

    if (!data.session) {
      setError("Check your email to confirm your account, then come back and sign in.");
      return;
    }

    if (data.user) {
      setUserId(data.user.id);
      goNext();
    }
  }

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!parlourId || !clientName.trim()) return;
    setSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setSaving(false);
      setError("Your session expired — please sign in again.");
      setStep("auth");
      return;
    }

    const { data, error: clientErr } = await supabase
      .from("client")
      .insert({
        parlour_id: parlourId,
        auth_user_id: session.user.id,
        name: clientName.trim(),
        phone: clientPhone.trim() || null,
      })
      .select("id")
      .single();

    setSaving(false);
    if (clientErr || !data) {
      setError(clientErr?.message ?? "Couldn't save your details.");
      return;
    }
    setClientId(data.id);
    goNext();
  }

  async function handleFinish() {
    setError(null);
    if (!clientId || !dogName.trim()) {
      setError("Your dog needs at least a name.");
      return;
    }
    setSaving(true);

    const { error: dogErr } = await supabase.from("dog").insert({
      client_id: clientId,
      name: dogName.trim(),
      photo_url: photoUrl || null,
      breed: breed.trim() || null,
      size: size || null,
      coat_type: coatType || null,
      coat_color: coatColor.trim() || null,
      cut_style: cutStyle.trim() || null,
      birthday: birthday || null,
      gender: gender || null,
      personality_tags: Array.from(tags),
      about: about.trim() || null,
      health_notes: healthNotes.trim() || null,
      medications: medications.trim() || null,
      vet_name: vetName.trim() || null,
      vet_phone: vetPhone.trim() || null,
      vaccinated,
      favorite_treat: favoriteTreat.trim() || null,
      favorite_toy: favoriteToy.trim() || null,
      dislikes: dislikes.trim() || null,
      special_requests: specialRequests.trim() || null,
    });

    setSaving(false);
    if (dogErr) {
      setError(dogErr.message);
      return;
    }
    setStep("done");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[#1A1A1A]/50">Loading…</p>
      </div>
    );
  }

  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-md mx-auto">
        {step !== "welcome" && step !== "done" && (
          <div className="flex items-center gap-1 mb-6">
            {STEPS.slice(1, -1).map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded-full ${i <= stepIdx - 1 ? "bg-[#1A1A1A]" : "bg-black/10"}`} />
            ))}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {step === "welcome" && (
          <div className="text-center step-enter pt-10">
            <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] mx-auto mb-4 flex items-center justify-center">
              <PawIcon className="w-8 h-8 text-[#E8A87C]" />
            </div>
            <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-2">Welcome to {parlourName}</h1>
            <p className="text-sm text-[#1A1A1A]/60 mb-8 leading-relaxed">
              Let&apos;s get your dog&apos;s profile set up — breed, style, personality, and anything else we should
              know to take great care of them. Add as much or as little as you like — you can always fill in more
              later.
            </p>
            <button
              onClick={() => setStep(userId ? "details" : "auth")}
              className="bg-[#1A1A1A] text-white rounded-full px-6 py-3 text-sm font-semibold"
            >
              Let&apos;s go
            </button>
          </div>
        )}

        {step === "auth" && (
          <form onSubmit={handleAuth} className="step-enter bg-white border border-black/10 rounded-2xl p-6 space-y-3">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">Create your account</p>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={`flex-1 text-xs rounded-lg py-2 border ${authMode === "signup" ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "border-black/15 text-[#1A1A1A]"}`}
              >
                New here
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`flex-1 text-xs rounded-lg py-2 border ${authMode === "login" ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "border-black/15 text-[#1A1A1A]"}`}
              >
                I&apos;ve been here before
              </button>
            </div>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <button type="submit" disabled={saving} className="w-full bg-[#1A1A1A] text-white rounded-full py-2.5 text-sm font-semibold disabled:opacity-50">
              {saving ? "…" : "Continue"}
            </button>
            {authMode === "login" && (
              <a href={`/forgot-password?slug=${encodeURIComponent(slug)}`} className="block text-center text-xs text-[#1A1A1A]/50 underline">
                Forgot your password?
              </a>
            )}
          </form>
        )}

        {step === "details" && (
          <form onSubmit={handleSaveDetails} className="step-enter bg-white border border-black/10 rounded-2xl p-6 space-y-3">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">A little about you</p>
            <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Your name" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Phone number" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <button type="submit" disabled={saving} className="w-full bg-[#1A1A1A] text-white rounded-full py-2.5 text-sm font-semibold disabled:opacity-50">
              {saving ? "…" : "Continue"}
            </button>
          </form>
        )}

        {step === "basics" && (
          <div className="step-enter bg-white border border-black/10 rounded-2xl p-6 space-y-3">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">Now, the important part — your dog</p>
            <div className="flex justify-center mb-2">
              <label className="relative cursor-pointer">
                <div className="w-20 h-20 rounded-full bg-[#FAFAF8] border-2 border-dashed border-black/15 flex items-center justify-center overflow-hidden">
                  {uploadingPhoto ? (
                    <span className="text-xs text-[#1A1A1A]/40">…</span>
                  ) : photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="Dog" className="w-full h-full object-cover" />
                  ) : (
                    <PawIcon className="w-7 h-7 text-[#1A1A1A]/25" />
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-[#1A1A1A]/40 text-center -mt-1 mb-2">Tap to add a photo</p>
            <input type="text" value={dogName} onChange={(e) => setDogName(e.target.value)} placeholder="Dog's name" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <input type="text" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Breed" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <div className="flex gap-2">
              <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]">
                <option value="">Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <button onClick={goNext} className="w-full bg-[#1A1A1A] text-white rounded-full py-2.5 text-sm font-semibold">
              Continue
            </button>
            <button onClick={handleFinish} disabled={saving || !dogName.trim()} className="w-full text-[#1A1A1A]/50 text-xs underline disabled:opacity-40">
              {saving ? "Saving…" : "Skip the rest — just book me in"}
            </button>
          </div>
        )}

        {step === "style" && (
          <div className="step-enter bg-white border border-black/10 rounded-2xl p-6 space-y-3">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">Look and style</p>
            <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]">
              <option value="">Size</option>
              <option value="Small">Small</option>
              <option value="Medium">Medium</option>
              <option value="Large">Large</option>
              <option value="XL">Extra large</option>
            </select>
            <input type="text" value={coatType} onChange={(e) => setCoatType(e.target.value)} placeholder="Coat type (e.g. Short, Long, Double)" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <input type="text" value={coatColor} onChange={(e) => setCoatColor(e.target.value)} placeholder="Coat color" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <input type="text" value={cutStyle} onChange={(e) => setCutStyle(e.target.value)} placeholder="Preferred cut style" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <div className="flex gap-2">
              <button onClick={goBack} className="flex-1 border border-black/15 text-[#1A1A1A] rounded-full py-2.5 text-sm font-semibold">Back</button>
              <button onClick={goNext} className="flex-1 bg-[#1A1A1A] text-white rounded-full py-2.5 text-sm font-semibold">Continue</button>
            </div>
            <button onClick={skipToFinish} disabled={saving} className="w-full text-[#1A1A1A]/50 text-xs underline disabled:opacity-40">
              Skip the rest — just book me in
            </button>
          </div>
        )}

        {step === "personality" && (
          <div className="step-enter bg-white border border-black/10 rounded-2xl p-6 space-y-3">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">What&apos;s {dogName || "your dog"} like?</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {PERSONALITY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs rounded-full px-3 py-1.5 border ${tags.has(tag) ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "border-black/15 text-[#1A1A1A]"}`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <textarea value={about} onChange={(e) => setAbout(e.target.value)} placeholder={`Tell us more about ${dogName || "them"}...`} rows={3} className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <div className="flex gap-2">
              <button onClick={goBack} className="flex-1 border border-black/15 text-[#1A1A1A] rounded-full py-2.5 text-sm font-semibold">Back</button>
              <button onClick={goNext} className="flex-1 bg-[#1A1A1A] text-white rounded-full py-2.5 text-sm font-semibold">Continue</button>
            </div>
            <button onClick={skipToFinish} disabled={saving} className="w-full text-[#1A1A1A]/50 text-xs underline disabled:opacity-40">
              Skip the rest — just book me in
            </button>
          </div>
        )}

        {step === "health" && (
          <div className="step-enter bg-white border border-black/10 rounded-2xl p-6 space-y-3">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">Health and care</p>
            <textarea value={healthNotes} onChange={(e) => setHealthNotes(e.target.value)} placeholder="Allergies or health conditions" rows={2} className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <input type="text" value={medications} onChange={(e) => setMedications(e.target.value)} placeholder="Medications (if any)" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <div className="flex gap-2">
              <input type="text" value={vetName} onChange={(e) => setVetName(e.target.value)} placeholder="Vet name" className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
              <input type="tel" value={vetPhone} onChange={(e) => setVetPhone(e.target.value)} placeholder="Vet phone" className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            </div>
            <div className="flex items-center gap-4 text-sm text-[#1A1A1A]">
              <span>Vaccinated?</span>
              <button type="button" onClick={() => setVaccinated(true)} className={`px-3 py-1.5 rounded-full text-xs border ${vaccinated === true ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "border-black/15"}`}>Yes</button>
              <button type="button" onClick={() => setVaccinated(false)} className={`px-3 py-1.5 rounded-full text-xs border ${vaccinated === false ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "border-black/15"}`}>No</button>
            </div>
            <div className="flex gap-2">
              <button onClick={goBack} className="flex-1 border border-black/15 text-[#1A1A1A] rounded-full py-2.5 text-sm font-semibold">Back</button>
              <button onClick={goNext} className="flex-1 bg-[#1A1A1A] text-white rounded-full py-2.5 text-sm font-semibold">Continue</button>
            </div>
            <button onClick={skipToFinish} disabled={saving} className="w-full text-[#1A1A1A]/50 text-xs underline disabled:opacity-40">
              Skip the rest — just book me in
            </button>
          </div>
        )}

        {step === "preferences" && (
          <div className="step-enter bg-white border border-black/10 rounded-2xl p-6 space-y-3">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">A few favorites</p>
            <input type="text" value={favoriteTreat} onChange={(e) => setFavoriteTreat(e.target.value)} placeholder="Favorite treat" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <input type="text" value={favoriteToy} onChange={(e) => setFavoriteToy(e.target.value)} placeholder="Favorite toy" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <textarea value={dislikes} onChange={(e) => setDislikes(e.target.value)} placeholder="Things that stress them out (e.g. the dryer, nail trims)" rows={2} className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="Anything else we should know?" rows={2} className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#1A1A1A]" />
            <div className="flex gap-2">
              <button onClick={goBack} className="flex-1 border border-black/15 text-[#1A1A1A] rounded-full py-2.5 text-sm font-semibold">Back</button>
              <button onClick={handleFinish} disabled={saving} className="flex-1 bg-[#1A1A1A] text-white rounded-full py-2.5 text-sm font-semibold disabled:opacity-50">
                {saving ? "Saving…" : "Finish"}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center step-enter pt-10">
            <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] mx-auto mb-4 flex items-center justify-center">
              <GiftIcon className="w-8 h-8 text-[#E8A87C]" />
            </div>
            <h1 className="text-xl font-semibold text-[#1A1A1A] mb-2">{dogName}&apos;s profile is all set</h1>
            <p className="text-sm text-[#1A1A1A]/60 mb-8">Ready to book their next groom at {parlourName}.</p>
            <button
              onClick={() => router.push(`/book/${slug}`)}
              className="bg-[#1A1A1A] text-white rounded-full px-6 py-3 text-sm font-semibold"
            >
              Start booking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
