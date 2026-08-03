"use client";

import { usePathname } from "next/navigation";
import { PawIcon, UserIcon } from "./icons";

const TABS = [
  { key: "book", label: "Book", Icon: PawIcon, href: (slug: string) => `/book/${slug}` },
  { key: "account", label: "Account", Icon: UserIcon, href: (slug: string) => `/book/${slug}/account` },
];

export default function BottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-md mx-auto px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        <div className="bg-white/90 backdrop-blur-md border border-black/10 rounded-2xl shadow-lg shadow-black/5 flex">
          {TABS.map((tab) => {
            const href = tab.href(slug);
            const active = pathname === href;
            const Icon = tab.Icon;
            return (
              <a
                key={tab.key}
                href={href}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-2xl transition-transform active:scale-90"
              >
                <Icon
                  className={`w-5 h-5 transition-all ${
                    active ? "text-[#14261F] scale-110" : "text-[#14261F]/40"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    active ? "text-[#14261F]" : "text-[#14261F]/40"
                  }`}
                >
                  {tab.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
