"use client";

import React from "react";
import { Zap, Globe, Check } from "lucide-react";

interface FilterBarProps {
  filterWorkMode: string;
  setFilterWorkMode: (mode: string) => void;
  filterEasyApply: boolean;
  setFilterEasyApply: (val: boolean) => void;
  filterCountry: string;
  setFilterCountry: (country: string) => void;
}

const FilterPill = ({ label, icon: Icon, active, onClick }: { label: string, icon?: React.ElementType, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${active ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-[1.02]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
    >
        {Icon && <Icon size={12} strokeWidth={1.5} className={active ? "text-white" : "text-slate-400"} />}
        {label}
    </button>
);

export default function FilterBar({
  filterWorkMode,
  setFilterWorkMode,
  filterEasyApply,
  setFilterEasyApply,
  filterCountry,
  setFilterCountry,
}: FilterBarProps) {
  return (
    <div className="mb-6 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
      <div className="flex items-center gap-3 min-w-max pb-2 md:pb-0">
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {['all', 'remote', 'hybrid', 'on-site'].map((m) => (
            <button
              key={m}
              onClick={() => setFilterWorkMode(m)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterWorkMode === m
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {m === 'all'
                ? 'Tous'
                : m === 'remote'
                ? 'Remote'
                : m === 'hybrid'
                ? 'Hybride'
                : 'Site'}
            </button>
          ))}
        </div>
        
        <div className="w-[1px] h-8 bg-slate-200 mx-1"></div>
        
        <FilterPill
          label="Candidature simplifiée"
          icon={Zap}
          active={filterEasyApply}
          onClick={() => setFilterEasyApply(!filterEasyApply)}
        />
        
        <FilterPill
          label="France Uniquement"
          icon={Globe}
          active={filterCountry === 'France'}
          onClick={() => setFilterCountry(filterCountry === 'France' ? 'all' : 'France')}
        />
      </div>
    </div>
  );
}
