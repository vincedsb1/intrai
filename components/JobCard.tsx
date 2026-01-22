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
  onAnalyze?: (id: string) => void;
  showActions?: boolean;
  isFilteredView?: boolean;
  index?: number;
}

const Tag = ({ text, className, icon: Icon }: { text: string, className?: string, icon?: React.ElementType }) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide border ${className || 'bg-slate-50 border-slate-100 text-slate-500'}`}>
        {Icon && <Icon size={10} strokeWidth={1.5} className="mr-1" />}
        {text}
    </span>
);

export default function JobCard({
  job,
  isVisited = false,
  onVisit,
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
        group relative bg-white rounded-2xl p-5 transition-all duration-300 animate-enter hover:shadow-hover border 
        ${isVisited ? 'opacity-70 bg-slate-50 border-slate-100 grayscale-[0.3]' : 'opacity-100 shadow-soft border-slate-100 hover:border-blue-200'}
        cursor-pointer ${staggerClass}
      `}
    >
      <div className="flex gap-4 md:gap-5 pl-1">
        
        {/* LOGO */}
        <div className="shrink-0">
            {job.logoUrl && !imgError ? (
                <img 
                    src={job.logoUrl} 
                    alt="" 
                    className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-contain border border-slate-100 shadow-sm bg-white" 
                    onError={() => setImgError(true)}
                />
            ) : (
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg shadow-inner">
                    {job.company?.[0] || '?'}
                </div>
            )}
        </div>

        {/* CONTENT */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex justify-between items-start gap-3">
                <h3 className={`font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors pr-8 md:pr-14 ${isMono ? 'font-mono text-xs' : 'text-[15px] md:text-base'}`}>
                    {job.title || job.rawString}
                </h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{job.company}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="truncate max-w-[150px]">{job.location}</span>
                {job.country && job.country !== job.location && (
                    <>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="truncate">{job.country}</span>
                    </>
                )}
            </div>

            {/* TAGS */}
            <div className="flex flex-wrap gap-2 mt-2.5 items-center">
                {job.workMode && (
                    <Tag 
                        text={job.workMode === 'remote' ? 'Remote' : job.workMode === 'hybrid' ? 'Hybride' : 'Bureau'} 
                        className={job.workMode === 'remote' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-100 text-slate-600 border-slate-200'}
                        icon={Briefcase}
                    />
                )}
                {job.salary && <Tag text={job.salary} className="bg-emerald-50 text-emerald-700 border-emerald-100" icon={Banknote} />}
                {job.isEasyApply && <Tag text="Easy Apply" className="bg-blue-50 text-blue-700 border-blue-100" icon={Zap} />}
                
                {job.tags?.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] md:text-[11px] text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">#{tag}</span>
                ))}
            </div>
            
            {/* AI WARNING */}
            {job.aiAnalysis?.isPlatformOrAgency && (
                <div className="mt-3 flex items-center gap-2 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50 text-xs text-amber-800">
                    <ShieldAlert size={14} className="shrink-0 text-amber-600" />
                    <span className="font-medium">{job.aiAnalysis.reason}</span>
                </div>
            )}
        </div>

        {/* ACTIONS */}
        {showActions && (
            <div className="absolute top-5 right-4 flex flex-row md:flex-col gap-2 z-10">
                {/* Mobile: Always visible */}
                <div className="flex md:hidden gap-2">
                     {isFilteredView ? (
                        <button onClick={(e) => { e.stopPropagation(); onRestore && onRestore(job.id); }} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-600 active:bg-blue-50 active:text-blue-600 transition-colors">R</button>
                     ) : (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); onAnalyze && onAnalyze(job.id); }} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 active:bg-indigo-50 active:text-indigo-600 transition-colors" title="Analyser"><Bot size={18} /></button>
                            <button onClick={(e) => { e.stopPropagation(); onBlacklist && onBlacklist(job.company || ""); }} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 active:bg-red-50 active:text-red-600 transition-colors" title="Filtrer"><ShieldAlert size={18} /></button>
                            <button onClick={(e) => { e.stopPropagation(); onSave && onSave(job.id); }} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 active:bg-blue-50 active:text-blue-600 transition-colors" title="Sauvegarder"><Bookmark size={18} /></button>
                            <button onClick={(e) => { e.stopPropagation(); onTrash && onTrash(job.id); }} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 active:bg-red-50 active:text-red-600 transition-colors" title="Ignorer"><Trash2 size={18} /></button>
                        </>
                     )}
                </div>

                {/* Desktop: Hover visible */}
                <div className="hidden md:flex flex-col gap-2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200 ease-out">
                    {isFilteredView ? (
                         <button 
                            onClick={(e) => { e.stopPropagation(); onRestore && onRestore(job.id); }}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 shadow-sm transition-all"
                            title="Restaurer"
                        >
                            R
                        </button>
                    ) : (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onAnalyze && onAnalyze(job.id); }}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 shadow-sm transition-all"
                                title="Analyser l'auteur"
                            >
                                <Bot size={16} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onBlacklist && onBlacklist(job.company || ""); }}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 shadow-sm transition-all"
                                title="Filtrer l'entreprise"
                            >
                                <ShieldAlert size={16} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onSave && onSave(job.id); }}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 shadow-sm transition-all"
                                title="Sauvegarder"
                            >
                                <Bookmark size={16} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onTrash && onTrash(job.id); }}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 shadow-sm transition-all"
                                title="Ignorer"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}