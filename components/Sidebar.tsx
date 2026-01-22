"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, CheckCircle, ShieldAlert, Settings } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  
  // Optimistic State for Active Tab
  const [activeTab, setActiveTab] = useState(pathname);

  // Sync state when pathname actually changes (e.g. browser back button)
  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

  const tabs = [
    { id: "inbox", href: "/inbox", icon: Inbox, label: "Flux entrant", count: 3 },
    { id: "processed", href: "/processed", icon: CheckCircle, label: "Traitées" },
    { id: "filtered", href: "/filtered", icon: ShieldAlert, label: "Filtrés Auto" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-[280px] bg-white border-r border-slate-200 h-screen p-5 shrink-0 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)] sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-10 mt-2">
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center text-white font-bold text-xl">
          i
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          intrai.
        </h1>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 space-y-2">
        {tabs.map((tab) => {
            // Use optimistic state for immediate feedback
            const isActive = activeTab.startsWith(tab.href);
            const Icon = tab.icon;
            
            return (
                <Link
                    key={tab.id}
                    href={tab.href}
                    onClick={() => setActiveTab(tab.href)}
                    className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden
                        ${isActive ? 'bg-blue-50/80 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                    `}
                >
                    <Icon size={20} className={`transition-colors relative z-10 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    <span className="relative z-10">{tab.label}</span>
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"></div>}
                    {tab.id === 'inbox' && (
                        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full relative z-10 ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                           3
                        </span>
                    )}
                </Link>
            )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto pt-6 border-t border-slate-100">
         <Link
            href="/settings"
            onClick={() => setActiveTab("/settings")}
            className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden
                ${activeTab.startsWith('/settings') ? 'bg-blue-50/80 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
            `}
         >
            <Settings size={20} className={`transition-colors relative z-10 ${activeTab.startsWith('/settings') ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="relative z-10">Réglages</span>
            {activeTab.startsWith('/settings') && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"></div>}
         </Link>

         <div className="mt-6 px-4 py-4 bg-slate-50/50 rounded-2xl border border-slate-100">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Système</div>
             <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Parser Actif
             </div>
         </div>
      </div>
    </aside>
  );
}