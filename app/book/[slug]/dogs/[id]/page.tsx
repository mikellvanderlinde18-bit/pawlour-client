"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";
import { PawIcon } from "@/components/icons";

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

export default function DogProfilePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params);
  const isNew = id === "new";
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
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

  const load = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/book/${slug}`);
      return;
    }

    const { data: parlourRow } = await supabase.from("parlour").select("id").eq("subdomain", slug).maybeSingle();
    if (!parlourRow) {
      setLoading(false);
      return;
    }

    const { data: clientRow } = await supabase
      .from("client")
      .select("id")
      .eq("parlour_id", parlourRow.id)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!clientRow) {
      router.push(`/book/${slug}/welcome`);
      return;
    }
    setClientId(clientRow.id);

    if (!isNew) {
      const { data: dog } = await supabase.from("dog").select("*").eq("id", id).single();
      if (dog) {
        setName(dog.name ?? "");
        setPhotoUrl(dog.photo_url ?? "");
        setBreed(dog.breed ?? "");
        setSize(dog.size ?? "");
        setCoatType(dog.coat_type ?? "");
        setCoatColor(dog.coat_color ?? "");
        setCutStyle(dog.cut_style ?? "");
        setBirthday(dog.birthday ?? "");
        setGender(dog.gender ?? "");
        setTags(new Set(dog.personality_tags ?? []));
        setAbout(dog.about ?? "");
        setHealthNotes(dog.health_notes ?? "");
        setMedications(dog.medications ?? "");
        setVetName(dog.vet_name ?? "");
        setVetPhone(dog.vet_phone ?? "");
        setVaccinated(dog.vaccinated);
        setFavoriteTreat(dog.favorite_treat ?? "");
        setFavoriteToy(dog.favorite_toy ?? "");
        setDislikes(dog.dislikes ?? "");
        setSpecialRequests(dog.special_requests ?? "");
      }
    }

    setLoading(false);
  }, [supabase, slug, id, isNew, router]);

  useEffect(() => {
    load();
  }, [load]);

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!file || !user) return;

    setUploadingPhoto(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

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

  async function handleSave() {
    setError(null);
    if (!clientId || !name.trim()) {
      setError("Your dog needs at least a name.");
      return;
    }
    setSaving(true);

    const payload = {
      name: name.trim(),
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
    };

    const { error: saveErr } = isNew
      ? await supabase.from("dog").insert({ ...payload, client_id: clientId })
      : await supabase.from("dog").update(payload).eq("id", id);

    setSaving(false);
    if (saveErr) {
      setError(saveErr.message);
      return;
    }
    router.push(`/book/${slug}/account`);
  }

  async function handleDelete() {
    if (!confirm(`Remove ${name || "this dog"}'s profile? This can't be undone.`)) return;
    setDeleting(true);
    const { error: delErr } = await supabase.from("dog").delete().eq("id", id);
    setDeleting(false);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    router.push(`/book/${slug}/account`);
  }

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-10 pb-28">
        <div className="max-w-md mx-auto space-y-3">
          <div className="h-6 w-40 rounded-lg skeleton" />
          <div className="h-40 rounded-2xl skeleton" />
          <div className="h-40 rounded-2xl skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 pb-28">
      <div className="max-w-md mx-auto">
        <a href={`/book/${slug}/account`} className="text-xs text-[#14261F]/50 hover:underline">
          ← Back to account
        </a>
        <h1 className="text-xl font-semibold text-[#14261F] mt-2 mb-6">
          {isNew ? "Add a dog" : `Edit ${name || "dog"}'s profile`}
        </h1>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        <div className="space-y-4">
          <div className="bg-white border border-black/10 rounded-2xl p-5 space-y-3">
            <p className="text-xs font-semibold text-[#14261F]/50 uppercase tracking-wide">Basics</p>
            <div className="flex justify-center">
              <label className="relative cursor-pointer">
                <div className="w-20 h-20 rounded-full bg-[#FAF6EF] border-2 border-dashed border-black/15 flex items-center justify-center overflow-hidden">
                  {uploadingPhoto ? (
                    <span className="text-xs text-[#14261F]/40">…</span>
                  ) : photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <PawIcon className="w-7 h-7 text-[#14261F]/25" />
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dog's name" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]" />
            <input type="text" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Breed" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]" />
            <div className="flex gap-2">
              <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]" />
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]">
                <option value="">Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-black/10 rounded-2xl p-5 space-y-3">
            <p className="text-xs font-semibold text-[#14261F]/50 uppercase tracking-wide">Look &amp; style</p>
            <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]">
              <option value="">Size</option>
              <option value="Small">Small</option>
              <option value="Medium">Medium</option>
              <option value="Large">Large</option>
              <option value="XL">Extra large</option>
            </select>
            <input type="text" value={coatType} onChange={(e) => setCoatType(e.target.value)} placeholder="Coat type" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]" />
            <input type="text" value={coatColor} onChange={(e) => setCoatColor(e.target.value)} placeholder="Coat color" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]" />
            <input type="text" value={cutStyle} onChange={(e) => setCutStyle(e.target.value)} placeholder="Preferred cut style" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]" />
          </div>

          <div className="bg-white border border-black/10 rounded-2xl p-5 space-y-3">
            <p className="text-xs font-semibold text-[#14261F]/50 uppercase tracking-wide">Personality</p>
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs rounded-full px-3 py-1.5 border ${tags.has(tag) ? "bg-[#D98F5F] text-white border-[#D98F5F]" : "border-black/15 text-[#14261F]"}`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <textarea value={about} onChange={(e) => setAbout(e.target.value)} placeholder={`Tell us more about ${name || "them"}...`} rows={3} className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]" />
          </div>

          <div className="bg-white border border-black/10 rounded-2xl p-5 space-y-3">
            <p className="text-xs font-semibold text-[#14261F]/50 uppercase tracking-wide">Health &amp; care</p>
            <textarea value={healthNotes} onChange={(e) => setHealthNotes(e.target.value)} placeholder="Allergies or health conditions" rows={2} className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]" />
            <input type="text" value={medications} onChange={(e) => setMedications(e.target.value)} placeholder="Medications" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]" />
            <div className="flex gap-2">
              <input type="text" value={vetName} onChange={(e) => setVetName(e.target.value)} placeholder="Vet name" className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]" />
              <input type="tel" value={vetPhone} onChange={(e) => setVetPhone(e.target.value)} placeholder="Vet phone" className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]" />
            </div>
            <div className="flex items-center gap-3 text-sm text-[#14261F]">
              <span>Vaccinated?</span>
              <button type="button" onClick={() => setVaccinated(true)} className={`px-3 py-1.5 rounded-full text-xs border ${vaccinated === true ? "bg-[#14261F] text-[#FAF6EF] border-[#14261F]" : "border-black/15"}`}>Yes</button>
              <button type="button" onClick={() => setVaccinated(false)} className={`px-3 py-1.5 rounded-full text-xs border ${vaccinated === false ? "bg-[#14261F] text-[#FAF6EF] border-[#14261F]" : "border-black/15"}`}>No</button>
            </div>
          </div>

          <div className="bg-white border border-black/10 rounded-2xl p-5 space-y-3">
            <p className="text-xs font-semibold text-[#14261F]/50 uppercase tracking-wide">Favorites &amp; quirks</p>
            <input type="text" value={favoriteTreat} onChange={(e) => setFavoriteTreat(e.target.value)} placeholder="Favorite treat" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]" />
            <input type="text" value={favoriteToy} onChange={(e) => setFavoriteToy(e.target.value)} placeholder="Favorite toy" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]" />
            <textarea value={dislikes} onChange={(e) => setDislikes(e.target.value)} placeholder="Things that stress them out" rows={2} className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]" />
            <textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="Anything else we should know?" rows={2} className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-[#14261F]" />
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full bg-[#14261F] text-[#FAF6EF] rounded-full py-2.5 text-sm font-semibold disabled:opacity-50">
            {saving ? "Saving…" : isNew ? "Add dog" : "Save changes"}
          </button>

          {!isNew && (
            <button onClick={handleDelete} disabled={deleting} className="w-full text-red-500 text-xs underline disabled:opacity-40">
              {deleting ? "Removing…" : "Remove this dog"}
            </button>
          )}
        </div>
      </div>
      <BottomNav slug={slug} />
    </div>
  );
}
