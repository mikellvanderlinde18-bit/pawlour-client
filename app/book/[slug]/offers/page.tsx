"use client";

import { useEffect, useState, useCallback, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParlourBrand } from "@/lib/useParlourBrand";
import BottomNav from "@/components/BottomNav";
import { GiftIcon } from "@/components/icons";

type Parlour = { id: string; name: string };
type Offer = {
  id: string;
  title: string;
  description: string | null;
  discount_percent: number | null;
  ends_at: string | null;
};

export default function OffersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const supabase = createClient();
  const brand = useParlourBrand(slug);

  const [parlour, setParlour] = useState<Parlour | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOffers = useCallback(async () => {
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

    const today = new Date().toISOString().slice(0, 10);

    const { data: offerRows } = await supabase
      .from("offer")
      .select("id, title, description, discount_percent, ends_at")
      .eq("parlour_id", parlourRow.id)
      .or(`ends_at.is.null,ends_at.gte.${today}`)
      .order("created_at", { ascending: false });

    setOffers(offerRows ?? []);
    setLoading(false);
  }, [supabase, slug]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-10 pb-28">
        <div className="max-w-md mx-auto">
          <div className="h-6 w-32 rounded-lg skeleton mb-2" />
          <div className="h-4 w-48 rounded-lg skeleton mb-8" />
          <div className="space-y-3">
            <div className="h-24 rounded-2xl skeleton" />
            <div className="h-24 rounded-2xl skeleton" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 pb-28">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-semibold text-[#1A1A1A] mb-1">{parlour?.name ?? "Offers"}</h1>
        <p className="text-sm text-[#1A1A1A]/50 mb-8">Current deals and specials</p>

        {offers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-white border border-black/10 mx-auto mb-3 flex items-center justify-center">
              <GiftIcon className="w-6 h-6 text-[#1A1A1A]/30" />
            </div>
            <p className="text-sm text-[#1A1A1A]/50">No offers right now — check back soon.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => (
              <div key={offer.id} className="bg-white border border-black/10 rounded-2xl p-5 relative overflow-hidden">
                {offer.discount_percent && (
                  <div
                    className="absolute top-0 right-0 text-white text-xs font-semibold px-3 py-1.5 rounded-bl-xl"
                    style={{ backgroundColor: brand.accentColor }}
                  >
                    {Number(offer.discount_percent)}% off
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FAFAF8] flex items-center justify-center flex-shrink-0">
                    <GiftIcon className="w-4 h-4" style={{ color: brand.accentColor }} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A1A1A] mb-1">{offer.title}</p>
                    {offer.description && <p className="text-sm text-[#1A1A1A]/60">{offer.description}</p>}
                    {offer.ends_at && (
                      <p className="text-xs text-[#1A1A1A]/40 mt-2">
                        Ends{" "}
                        {new Date(offer.ends_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav slug={slug} primaryColor={brand.primaryColor} />
    </div>
  );
}
