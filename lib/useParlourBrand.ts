"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ParlourBrand = {
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
};

const DEFAULT_BRAND: ParlourBrand = {
  primaryColor: "#14261F",
  accentColor: "#D98F5F",
  logoUrl: null,
};

export function useParlourBrand(slug: string): ParlourBrand {
  const [brand, setBrand] = useState<ParlourBrand>(DEFAULT_BRAND);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("parlour")
      .select("brand_primary_color, brand_accent_color, logo_url")
      .eq("subdomain", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBrand({
            primaryColor: data.brand_primary_color || DEFAULT_BRAND.primaryColor,
            accentColor: data.brand_accent_color || DEFAULT_BRAND.accentColor,
            logoUrl: data.logo_url,
          });
        }
      });
  }, [slug]);

  return brand;
}
