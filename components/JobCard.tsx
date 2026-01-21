"use client";

import React, { useState } from "react";
import {
  Trash2,
  Bookmark,
  Bot,
  RotateCcw,
  Filter,
  AlertTriangle,
  EyeOff,
  Zap,
  Flame,
  Banknote,
  Briefcase,
} from "lucide-react";
import { Job } from "@/lib/types";

interface JobCardProps {
  job: Job;
  isVisited?: boolean;
  onVisit?: (id: string) => void;
  onUnvisit?: (id: string) => void;
  onSave?: (id: string) => void;
  onTrash?: (id: string) => void;
  onRestore?: (id: string) => void;
  onAnalyze?: (id: string) => void;
  showActions?: boolean;
  isFilteredView?: boolean;
}

const StatusBadge = ({ category }: { category: Job["category"] }) => {
  return null;
};

export default function JobCard({
  job,
  isVisited = false,
  onVisit,
  onUnvisit,
  onSave,
  onTrash,
  onRestore,
  onAnalyze,
  showActions = true,
  isFilteredView = false,
}: JobCardProps) {
  const isMono = job.parserGrade === "C";
  const [imgError, setImgError] = useState(false);

  const handleCardClick = () => {
    if (onVisit) {
      onVisit(job.id);
    }
    // Ouverture dans un nouvel onglet
    if (job.url) {
      window.open(job.url, "_blank");
    }
  };

  return (
    <div
      className={`
        group relative bg-white border border-gray-200 rounded-xl p-4 mb-3 transition-all duration-300 shadow-sm hover:shadow-md
        ${isVisited ? "opacity-60 grayscale-[0.8] bg-gray-50" : "opacity-100"}
        ${isMono ? "font-mono text-sm border-l-4 border-l-gray-300" : ""}
      `}
    >
      {/* Contenu Cliquable */}
      <div className="cursor-pointer" onClick={handleCardClick}>
        <div className="flex items-start gap-4 mb-3">
          
          {/* LOGO ou FALLBACK */}
          <div className="relative shrink-0 mt-1">
            {job.logoUrl && !imgError ? (
              <img
                src={job.logoUrl}
                alt={`${job.company} logo`}
                className="w-12 h-12 object-contain rounded-lg border border-gray-100 bg-white"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  console.warn("Image load failed, showing fallback:", job.logoUrl);
                  setImgError(true);
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center font-bold text-gray-500 text-lg select-none">
                {job.company ? job.company.charAt(0).toUpperCase() : "?"}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1 gap-2">
              <div className="flex flex-wrap items-center gap-y-1">
                <StatusBadge category={job.category} />
                <h3
                  className={`font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight ${
                    isMono ? "text-xs font-mono" : "text-base"
                  }`}
                >
                  {job.title || job.rawString || "Sans titre"}
                </h3>
              </div>
              {isVisited && (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium shrink-0 uppercase tracking-wider">
                  Vu
                </span>
              )}
            </div>

            <div className="flex items-center text-sm text-gray-500 gap-2 flex-wrap">
              <span className="font-bold text-gray-700 whitespace-nowrap">
                {job.company || "Société inconnue"}
              </span>
              <span className="text-gray-300">•</span>
              <span className="truncate">
                {job.location || "Localisation inconnue"}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-400">
                {job.createdAt
                  ? new Date(job.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </span>
            </div>

            {/* Métadonnées additionnelles */}
            <div className="flex flex-wrap gap-2 mt-2">
              {job.workMode && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border ${
                  job.workMode === 'remote' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                  job.workMode === 'hybrid' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                  'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  <Briefcase size={10} />
                  {job.workMode === 'remote' ? 'À distance' : job.workMode === 'hybrid' ? 'Hybride' : 'Sur site'}
                </span>
              )}
              
              {job.salary && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-100 flex items-center gap-1">
                  <Banknote size={10} />
                  {job.salary}
                </span>
              )}

              {job.isActiveRecruiting && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-50 text-orange-700 border border-orange-100 flex items-center gap-1">
                  <Flame size={10} />
                  Actif
                </span>
              )}

              {job.isEasyApply && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                  <Zap size={10} />
                  Simplifiée
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tags (si dispo) */}
        {job.tags && job.tags.length > 0 && !isMono && (
          <div className="flex gap-2 mb-3">
            {job.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-1">
        {/* AI Detective Trigger (Only in Inbox & Standard View) */}
        {showActions && job.status === "INBOX" && onAnalyze && (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAnalyze(job.id);
              }}
              className="text-xs flex items-center text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded-md transition-colors font-medium"
            >
              <Bot size={14} className="mr-1.5" />
              {isMono ? "Scan ?" : "Analyser l'auteur ?"}
            </button>
            {isVisited && onUnvisit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnvisit(job.id);
                }}
                className="text-xs flex items-center text-gray-500 hover:bg-gray-100 px-2 py-1.5 rounded-md transition-colors font-medium"
                title="Marquer comme non-vu"
              >
                <EyeOff size={14} className="mr-1.5" />
                Non-vu
              </button>
            )}
          </div>
        )}

        {isFilteredView && (
          <div className="text-xs text-red-500 font-medium flex items-center bg-red-50 px-2 py-1 rounded">
            <Filter size={12} className="mr-1" /> Bloqué par règle
          </div>
        )}

        {/* Main Decision Actions */}
        {showActions && (
          <div className="flex space-x-2 ml-auto">
            {isFilteredView ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRestore) onRestore(job.id);
                }}
                className="flex items-center px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium shadow-sm"
              >
                <RotateCcw size={12} className="mr-1.5" /> Repêcher
              </button>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onTrash) onTrash(job.id);
                  }}
                  className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  title="Jeter (Trash)"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSave) onSave(job.id);
                  }}
                  className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                  title="Garder (Save)"
                >
                  <Bookmark size={16} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
