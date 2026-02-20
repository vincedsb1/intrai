"use client";

import React, { useState } from "react";
import {
  Trash2,
  Bookmark,
  Zap,
  Banknote,
  Briefcase,
  ShieldAlert,
  Bot,
} from "lucide-react";
import { Job } from "@/lib/types";

interface JobCardProps {
  job: Job;
  isVisited?: boolean;
  onVisit?: (id: string) => void;
  onUnvisit?: (id: string) => void;
  onBlacklist?: (company: string) => void;
  onSave?: (id: string) => void;
  onTrash?: (id: string) => void;
  onRestore?: (id: string) => void;
  showActions?: boolean;
  isFilteredView?: boolean;
  index?: number;
}

const Tag = ({ text, className, icon: Icon }: { text: string, className?: string, icon?: React.ElementType }) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide border ${className}`}>
        {Icon && <Icon size={10} strokeWidth={1.5} className="mr-1" />}
        {text}
    </span>
);

export default function JobCard({
  job,
  isVisited = false,
  onVisit,
  onUnvisit,
  onBlacklist,
  onSave,
  onTrash,
  onRestore,
  showActions = true,
  isFilteredView = false,
  index = 0,
}: JobCardProps) {
  const isMono = job.parserGrade === "C";
  const [imgError, setImgError] = useState(false);

  const handleCardClick = () => {
    if (onVisit) {
      onVisit(job.id);
    }
    if (job.url) {
      window.open(job.url, "_blank");
    }
  };

  // Stagger animation delay based on index
  const staggerClass = index % 3 === 0 ? "stagger-1" : index % 3 === 1 ? "stagger-2" : "stagger-3";

  return (
    <div
      onClick={handleCardClick}
      className={`
        group relative rounded-2xl p-5 transition-all duration-300 animate-enter border cursor-pointer ${staggerClass}
        bg-white dark:bg-slate-900 
        ${isVisited 
            ? 'opacity-70 grayscale-[0.3] bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800' 
            : 'shadow-soft dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-slate-700'}
      `}
    >
      <div className="flex gap-4 md:gap-5 pl-1">
        
        {/* LOGO */}
        <div className="shrink-0">
            {job.logoUrl && !imgError ? (
                <img
                    src={`/api/image-proxy?url=${encodeURIComponent(job.logoUrl)}`}
                    alt=""
                    className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-contain border border-slate-100 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800" 
                    onError={() => setImgError(true)}
                />
            ) : (
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br border flex items-center justify-center text-lg font-bold shadow-inner
                from-slate-50 to-slate-100 border-slate-100 text-slate-400
                dark:from-slate-800 dark:to-slate-700 dark:border-slate-700 dark:text-slate-500">
                    {job.company?.[0] || '?'}
                </div>
            )}
        </div>

        {/* CONTENT */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex justify-between items-start gap-3">
                <h3 className={`font-bold leading-snug transition-colors pr-10 md:pr-24 
                group-hover:text-blue-600 dark:group-hover:text-blue-400
                text-slate-900 dark:text-slate-100
                ${isMono ? 'font-mono text-xs' : 'text-[15px] md:text-base'}`}>
                    {job.title || job.rawString}
                </h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{job.company}</span>
                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                <span className="truncate max-w-[150px]">{job.location}</span>
                {job.country && job.country !== job.location && (
                    <>
                        <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                        <span className="truncate">{job.country}</span>
                    </>
                )}
            </div>

            {/* TAGS */}
            <div className="flex flex-wrap gap-2 mt-2.5 items-center">
                {job.workMode && (
                    <Tag 
                        text={job.workMode === 'remote' ? 'Remote' : job.workMode === 'hybrid' ? 'Hybride' : 'Bureau'} 
                        className={job.workMode === 'remote' 
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20' 
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}
                        icon={Briefcase}
                    />
                )}
                {job.salary && <Tag text={job.salary} className="bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20" icon={Banknote} />}
                {job.isEasyApply && <Tag text="Easy Apply" className="bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20" icon={Zap} />}
                
                {job.tags?.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-2 py-0.5 rounded-full">#{tag}</span>
                ))}
            </div>
            
            {/* SORTING INFO / WARNINGS */}
            <div className="mt-3 flex flex-wrap gap-2">
                {/* FILTER REASON */}
                {(isFilteredView || job.category === "FILTERED") && job.matchedKeyword && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium border
                    bg-red-50 border-red-100 text-red-800
                    dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400">
                        <ShieldAlert size={14} className="shrink-0 text-red-600 dark:text-red-500" />
                        <span className="font-medium">Filtre : {job.matchedKeyword}</span>
                    </div>
                )}

                {/* AI WARNING */}
                {job.aiAnalysis?.isPlatformOrAgency && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium border
                    bg-amber-50 border-amber-100 text-amber-800
                    dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-400">
                        <Bot size={14} className="shrink-0 text-amber-600 dark:text-amber-500" />
                        <span className="font-medium">IA : {job.aiAnalysis.reason}</span>
                    </div>
                )}
            </div>
        </div>

        {/* ACTIONS */}
        {showActions && (
            <>
                {/* Mobile: Always visible, top-right */}
                <div className="absolute top-5 right-4 flex md:hidden gap-2 z-10">
                     {isFilteredView ? (
                        <button onClick={(e) => { e.stopPropagation(); onRestore && onRestore(job.id); }} className="w-9 h-9 flex items-center justify-center rounded-full transition-colors
                        bg-slate-50 border border-slate-200 text-slate-600 active:bg-blue-50 active:text-blue-600
                        dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:active:bg-blue-900/30 dark:active:text-blue-400">R</button>
                     ) : (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); onBlacklist && onBlacklist(job.company || ""); }} className="w-9 h-9 flex items-center justify-center rounded-full transition-colors
                            bg-slate-50 border border-slate-200 text-slate-400 active:bg-red-50 active:text-red-600
                            dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:active:bg-red-900/30 dark:active:text-red-400" title="Filtrer"><ShieldAlert size={18} /></button>
                            <button onClick={(e) => { e.stopPropagation(); onSave && onSave(job.id); }} className="w-9 h-9 flex items-center justify-center rounded-full transition-colors
                            bg-slate-50 border border-slate-200 text-slate-400 active:bg-blue-50 active:text-blue-600
                            dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:active:bg-blue-900/30 dark:active:text-blue-400" title="Sauvegarder"><Bookmark size={18} /></button>
                            <button onClick={(e) => { e.stopPropagation(); onTrash && onTrash(job.id); }} className="w-9 h-9 flex items-center justify-center rounded-full transition-colors
                            bg-slate-50 border border-slate-200 text-slate-400 active:bg-red-50 active:text-red-600
                            dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:active:bg-red-900/30 dark:active:text-red-400" title="Ignorer"><Trash2 size={18} /></button>
                        </>
                     )}
                </div>

                {/* Desktop: Hover visible, centered vertically */}
                <div className="hidden md:grid md:grid-cols-2 gap-2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200 ease-out absolute top-1/2 right-4 -translate-y-1/2 z-10">
                    {isFilteredView ? (
                         <button 
                            onClick={(e) => { e.stopPropagation(); onRestore && onRestore(job.id); }}
                            className="w-9 h-9 flex items-center justify-center rounded-full shadow-sm transition-all
                            bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50
                            dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10"
                            title="Restaurer"
                        >
                            R
                        </button>
                    ) : (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onBlacklist && onBlacklist(job.company || ""); }}
                                className="w-9 h-9 flex items-center justify-center rounded-full shadow-sm transition-all
                                bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50
                                dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-red-400 dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
                                title="Filtrer l'entreprise"
                            >
                                <ShieldAlert size={16} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onSave && onSave(job.id); }}
                                className="w-9 h-9 flex items-center justify-center rounded-full shadow-sm transition-all
                                bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50
                                dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10"
                                title="Sauvegarder"
                            >
                                <Bookmark size={16} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onTrash && onTrash(job.id); }}
                                className="w-9 h-9 flex items-center justify-center rounded-full shadow-sm transition-all
                                bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50
                                dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-red-400 dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
                                title="Ignorer"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            </>
        )}

      </div>
    </div>
  );
}
