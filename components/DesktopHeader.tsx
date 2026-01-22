"use client";

import React, { useState, useEffect } from "react";
import { Search, Inbox } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/lib/hooks/useDebounce";

export default function DesktopHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Local state for the input field
  const [inputValue, setInputValue] = useState(searchParams.get("q") || "");
  
  // Debounced value to trigger URL update
  const debouncedSearchQuery = useDebounce(inputValue, 300);

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Sync local input when URL changes (e.g. navigation, clear filters)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (q !== inputValue) {
      setInputValue(q);
    }
  }, [searchParams]);

  // Update URL when debounced value changes
  useEffect(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    const prevQ = current.get("q") || "";
    
    if (debouncedSearchQuery === prevQ) return;

    if (!debouncedSearchQuery) {
      current.delete("q");
    } else {
      current.set("q", debouncedSearchQuery);
    }
    
    const search = current.toString();
    const query = search ? `?${search}` : "";
    
    router.replace(query || "?", { scroll: false });
  }, [debouncedSearchQuery, router, searchParams]);

  return (
    <header className="hidden md:flex h-20 px-8 border-b border-slate-200 bg-white/80 backdrop-blur-xl items-center justify-between shrink-0 z-20 sticky top-0">
      <div className="text-sm font-medium text-slate-400 capitalize">
        {today}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group w-96">
          <Search className="absolute left-4 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Rechercher par poste, entreprise..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all placeholder-slate-400 shadow-sm outline-none"
          />
        </div>
        <button className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
          <div className="relative">
            <Inbox size={20} />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></div>
          </div>
        </button>
      </div>
    </header>
  );
}
