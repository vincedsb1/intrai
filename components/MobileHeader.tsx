"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

export default function MobileHeader() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(pathname);

  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

  const tabs = [
    { id: "inbox", href: "/inbox", label: "Flux entrant" },
    { id: "processed", href: "/processed", label: "Historique" },
    { id: "filtered", href: "/filtered", label: "Spam" },
    { id: "settings", href: "/settings", label: "Réglages" },
  ];

  return (
    <div className="md:hidden glass z-40 sticky top-0 flex flex-col">
      {/* Row 1: Logo & Search Toggle */}
      <div className="h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-sm flex items-center justify-center text-white font-bold">
            i
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            intrai.
          </span>
        </div>
        <button className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 active:scale-95 transition-transform">
          <Search size={20} />
        </button>
      </div>

      {/* Row 2: Elegant Segmented Control */}
      <div className="px-4 pb-3">
        <div className="flex bg-slate-100/80 p-1 rounded-full relative overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeTab.startsWith(tab.href);
            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={() => setActiveTab(tab.href)}
                className={`
                    relative px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap z-10
                    ${isActive ? 'text-slate-900 bg-white shadow-sm border border-slate-100' : 'text-slate-500'}
                `}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}