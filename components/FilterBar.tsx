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
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap 
        ${active 
            ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-[1.02] dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200' 
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'}`}
    >
        {Icon && <Icon size={12} strokeWidth={1.5} className={active ? "text-current" : "text-slate-400 dark:text-slate-500"} />}
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
        <div className="flex p-1 rounded-xl shadow-sm border
        bg-white border-slate-200
        dark:bg-slate-900 dark:border-slate-800">
          {['all', 'remote', 'hybrid', 'on-site'].map((m) => (
            <button
              key={m}
              onClick={() => setFilterWorkMode(m)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterWorkMode === m
                  ? 'bg-slate-800 text-white shadow-md dark:bg-slate-700 dark:text-slate-100'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
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
        
        <div className="w-[1px] h-8 mx-1 bg-slate-200 dark:bg-slate-800"></div>
        
        <FilterPill
          label="Candidature simplifiée"
          icon={Zap}
          active={filterEasyApply}
          onClick={() => setFilterEasyApply(!filterEasyApply)}
        />
        
        {/* Country Dropdown */}
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Globe size={12} strokeWidth={1.5} className="text-slate-400 dark:text-slate-500" />
            </div>
            <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="pl-8 pr-8 py-1.5 rounded-lg text-xs font-medium border focus:outline-none focus:ring-2 cursor-pointer appearance-none h-[30px]
                border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus:ring-blue-500/20
                dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:focus:ring-blue-500/50"
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
                <div className="w-[1px] h-8 mx-1 bg-slate-200 dark:bg-slate-800"></div>
                <button
                    onClick={onClearFilters}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-transparent 
                    text-red-600 hover:bg-red-50 hover:border-red-100
                    dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:border-red-900/30"
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