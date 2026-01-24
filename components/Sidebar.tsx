"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, CheckCircle, ShieldAlert, Settings } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(pathname);
  const [inboxCount, setInboxCount] = useState<number | null>(null);

  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/jobs/count");
        if (res.ok) {
          const data = await res.json();
          setInboxCount(data.count);
        }
      } catch (err) {
        console.error("Failed to fetch inbox count", err);
      }
    };

    fetchCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchCount, 30000);

    // Listen for local updates from InboxView (instant feedback)
    const handleLocalUpdate = (event: CustomEvent) => {
      const change = event.detail?.change || 0;
      setInboxCount((prev) => (prev !== null ? Math.max(0, prev + change) : prev));
    };

    window.addEventListener("inbox-count-update", handleLocalUpdate as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener("inbox-count-update", handleLocalUpdate as EventListener);
    };
  }, []);

  const tabs = [
    { id: "inbox", href: "/inbox", icon: Inbox, label: "Flux entrant", count: inboxCount },
    { id: "processed", href: "/processed", icon: CheckCircle, label: "Traitées" },
    { id: "filtered", href: "/filtered", icon: ShieldAlert, label: "Filtrés Auto" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-[280px] h-screen p-5 shrink-0 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)] sticky top-0
    bg-white border-r border-slate-200 
    dark:bg-slate-950 dark:border-slate-800 dark:shadow-[4px_0_24px_rgba(0,0,0,0.1)]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-10 mt-2">
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center text-white font-bold text-xl">
          i
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          intrai.
        </h1>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 space-y-2">
        {tabs.map((tab) => {
            const isActive = activeTab.startsWith(tab.href);
            const Icon = tab.icon;
            
            return (
                <Link
                    key={tab.id}
                    href={tab.href}
                    onClick={() => setActiveTab(tab.href)}
                    className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden
                        ${isActive 
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}
                    `}
                >
                    <Icon size={20} className={`transition-colors relative z-10 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    <span className="relative z-10">{tab.label}</span>
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full shadow-glow"></div>}
                    {tab.id === 'inbox' && tab.count !== null && (
                        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full relative z-10 
                        ${isActive 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' 
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-500'}`}>
                           {tab.count}
                        </span>
                    )}
                </Link>
            )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
         <Link
            href="/settings"
            onClick={() => setActiveTab("/settings")}
            className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden
                ${activeTab.startsWith('/settings') 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}
            `}
         >
            <Settings size={20} className={`transition-colors relative z-10 ${activeTab.startsWith('/settings') ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="relative z-10">Réglages</span>
            {activeTab.startsWith('/settings') && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full shadow-glow"></div>}
         </Link>

         <div className="mt-6 px-4 py-4 rounded-2xl border 
         bg-slate-50/50 border-slate-100 
         dark:bg-slate-900/50 dark:border-slate-800">
             <div className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-400 dark:text-slate-500">Système</div>
             <div className="flex items-center gap-2 text-sm font-semibold p-2 rounded-lg border 
             text-emerald-600 bg-emerald-50/50 border-emerald-100/50
             dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/10">
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
