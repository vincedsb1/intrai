"use client";

import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageRange(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const showLeftEllipsis = currentPage > 4;
  const showRightEllipsis = currentPage < totalPages - 3;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (showLeftEllipsis && !showRightEllipsis) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

const btnBase =
  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all " +
  "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 " +
  "dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700";

const btnActive =
  "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shadow-md " +
  "bg-slate-900 text-white border-slate-900 " +
  "dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200";

const btnNav =
  "p-2 rounded-lg border transition-all " +
  "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 " +
  "dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 " +
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white " +
  "dark:disabled:hover:bg-slate-800";

const ellipsisClass =
  "px-2 py-1.5 text-xs text-slate-400 dark:text-slate-500 select-none";

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const range = getPageRange(currentPage, totalPages);

  return (
    <nav aria-label="Pagination" className="flex items-center gap-1.5">
      {/* Première page — masqué mobile */}
      <button
        className={`${btnNav} hidden sm:flex`}
        disabled={currentPage === 1}
        onClick={() => onPageChange(1)}
        aria-label="Première page"
      >
        <ChevronsLeft size={14} />
      </button>

      {/* Page précédente */}
      <button
        className={btnNav}
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Page précédente"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Numéros de page — masqués mobile */}
      <div className="hidden sm:flex items-center gap-1">
        {range.map((item, i) =>
          item === "..." ? (
            <span key={`ellipsis-${i}`} className={ellipsisClass} aria-hidden="true">
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              className={item === currentPage ? btnActive : btnBase}
              aria-label={`Aller à la page ${item}`}
              aria-current={item === currentPage ? "page" : undefined}
            >
              {item}
            </button>
          )
        )}
      </div>

      {/* Label compact — visible mobile uniquement */}
      <span
        className="flex sm:hidden text-xs font-medium text-slate-600 dark:text-slate-400 px-2"
        aria-label={`Page ${currentPage} sur ${totalPages}`}
      >
        Page {currentPage} / {totalPages}
      </span>

      {/* Page suivante */}
      <button
        className={btnNav}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Page suivante"
      >
        <ChevronRight size={14} />
      </button>

      {/* Dernière page — masqué mobile */}
      <button
        className={`${btnNav} hidden sm:flex`}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(totalPages)}
        aria-label="Dernière page"
      >
        <ChevronsRight size={14} />
      </button>
    </nav>
  );
}
