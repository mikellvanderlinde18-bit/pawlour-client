"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { PawIcon, UserIcon, ScissorsIcon } from "./icons";

const TABS = [
  { key: "book", label: "Book", Icon: PawIcon, href: (slug: string) => `/book/${slug}` },
  { key: "offers", label: "Offers", Icon: ScissorsIcon, href: (slug: string) => `/book/${slug}/offers` },
  { key: "profile", label: "My profile", Icon: UserIcon, href: (slug: string) => `/book/${slug}/account` },
];

export default function BottomNav({
  slug,
  primaryColor = "#1A1A1A",
}: {
  slug: string;
  primaryColor?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed top-5 left-4 z-40 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md border border-black/[0.06] flex items-center justify-center shadow-sm"
        aria-label="Open menu"
      >
        <div className="flex flex-col gap-[3px]">
          <span className="w-4 h-[1.5px] rounded-full" style={{ backgroundColor: primaryColor }} />
          <span className="w-4 h-[1.5px] rounded-full" style={{ backgroundColor: primaryColor }} />
          <span className="w-4 h-[1.5px] rounded-full" style={{ backgroundColor: primaryColor }} />
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white z-50 transform transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 pt-6 pb-5 hairline-b">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center mb-2"
            style={{ backgroundColor: primaryColor }}
          >
            <PawIcon className="w-4 h-4" style={{ color: "#fff" }} />
          </div>
          <p className="eyebrow">Menu</p>
        </div>

        <nav className="px-3 py-4 space-y-0.5">
          {TABS.map((tab) => {
            const href = tab.href(slug);
            const active = pathname === href;
            const Icon = tab.Icon;
            return (
              <a
                key={tab.key}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? "text-white font-medium" : "text-[#1A1A1A]/70 hover:bg-black/[0.03]"
                }`}
                style={active ? { backgroundColor: primaryColor } : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </a>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
