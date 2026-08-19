"use client";

import { useEffect } from "react";

export default function RootPage() {
  useEffect(() => {
    const lastSlug = window.localStorage.getItem("pawlour_last_parlour");
    if (lastSlug) {
      window.location.replace(`/book/${lastSlug}`);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <div>
        <p className="text-sm text-[#14261F]/60 mb-2">Open your parlour&apos;s booking link to get started.</p>
        <p className="text-xs text-[#14261F]/40">e.g. pawlour-client.netlify.app/book/your-parlour-name</p>
      </div>
    </div>
  );
}
