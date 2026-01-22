"use client";

import React from "react";
import { Zap, Globe, FilterX } from "lucide-react";

interface FilterBarProps {
  filterWorkMode: string;
  setFilterWorkMode: (mode: string) => void;
  filterEasyApply: boolean;
  setFilterEasyApply: (val: boolean) => void;
  filterCountry: string;
  setFilterCountry: (country: string) => void;
  availableCountries?: string[];
  isAnyFilterActive?: boolean;
  onClearFilters?: () => void;
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
  availableCountries = [],
  isAnyFilterActive = false,
  onClearFilters,
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
        
        {/* Country Dropdown */}
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Globe size={12} strokeWidth={1.5} className="text-slate-400" />
            </div>
            <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="pl-8 pr-8 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none h-[30px]"
            >
                <option value="all">Tous les pays</option>
                {availableCountries.map((country) => (
                    <option key={country} value={country}>
                        {country}
                    </option>
                ))}
            </select>
        </div>

        {/* Reset Filters Button */}
        {isAnyFilterActive && onClearFilters && (
            <>
                <div className="w-[1px] h-8 bg-slate-200 mx-1"></div>
                <button
                    onClick={onClearFilters}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                    title="Réinitialiser tous les filtres"
                >
                    <FilterX size={14} />
                    Effacer
                </button>
            </>
        )}
      </div>
    </div>
  );
}
