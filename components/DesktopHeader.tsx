"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Inbox } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "@/lib/hooks/useDebounce";
import ThemeToggle from "./ThemeToggle";

export default function DesktopHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q") || "";

  const [draftValue, setDraftValue] = useState(queryFromUrl);
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const inputValue = isSearchInputFocused ? draftValue : queryFromUrl;
  const debouncedSearchQuery = useDebounce(draftValue, 300);
  const serializedSearchParams = useMemo(() => searchParams.toString(), [searchParams]);

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const commitSearchQuery = useCallback((nextQuery: string) => {
    const current = new URLSearchParams(serializedSearchParams);
    const prevQ = current.get("q") || "";

    if (nextQuery === prevQ) return;

    current.delete("page");
    if (!nextQuery) {
      current.delete("q");
    } else {
      current.set("q", nextQuery);
    }

    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.replace(`${window.location.pathname}${query}`, { scroll: false });
  }, [router, serializedSearchParams]);

  useEffect(() => {
    if (!isSearchInputFocused) return;
    if (debouncedSearchQuery !== draftValue) return;

    commitSearchQuery(debouncedSearchQuery);
  }, [commitSearchQuery, debouncedSearchQuery, draftValue, isSearchInputFocused]);

  return (
    <header
      className="hidden md:flex h-20 px-8 border-b items-center justify-between shrink-0 z-20 sticky top-0
    border-slate-200 bg-white/80
    dark:border-slate-800 dark:bg-slate-950/80 backdrop-blur-xl"
    >
      <div className="text-sm font-medium text-slate-400 dark:text-slate-500 capitalize">
        {today}
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />

        <div className="relative group w-96">
          <Search
            className="absolute left-4 top-3 transition-colors text-slate-400 group-focus-within:text-blue-500"
            size={18}
          />
          <input
            type="text"
            placeholder="Rechercher par poste, entreprise..."
            value={inputValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onFocus={() => {
              setDraftValue(queryFromUrl);
              setIsSearchInputFocused(true);
            }}
            onBlur={() => {
              commitSearchQuery(draftValue);
              setIsSearchInputFocused(false);
            }}
            className="w-full rounded-2xl py-2.5 pl-11 pr-4 text-sm transition-all shadow-sm outline-none
            bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white placeholder-slate-400
            dark:bg-slate-900 dark:border-slate-800 dark:focus:border-blue-500/50 dark:focus:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-500"
          />
        </div>
        <button
          className="w-10 h-10 border rounded-xl flex items-center justify-center transition-colors
        border-slate-200 text-slate-500 hover:bg-slate-50
        dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          <div className="relative">
            <Inbox size={20} />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-950"></div>
          </div>
        </button>
      </div>
    </header>
  );
}
