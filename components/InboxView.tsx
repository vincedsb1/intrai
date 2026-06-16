"use client";

import React, { useState, useEffect, useTransition, useOptimistic } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Inbox } from "lucide-react";
import JobCard from "./JobCard";
import BlacklistModal from "./BlacklistModal";
import FilterBar from "./FilterBar";
import Toast from "./Toast";
import Pagination from "./Pagination";
import { Job, JobStatus } from "@/lib/types";

interface InboxViewProps {
  initialJobs: Job[];
  total: number;
  currentPage: number;
  pageSize: number;
  availableCountries: string[];
}

export default function InboxView({
  initialJobs,
  total,
  currentPage,
  pageSize,
  availableCountries,
}: InboxViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [jobs, setJobs] = useState<Job[]>(initialJobs);

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  const updateSidebarCount = (change: number) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("inbox-count-update", { detail: { change } }));
    }
  };

  const currentFilters = {
    q: searchParams.get("q") || "",
    mode: searchParams.get("mode") || "all",
    easy: searchParams.get("easy") === "true",
    country: searchParams.get("country") || "all",
  };

  const [optimisticFilters, setOptimisticFilters] = useOptimistic(
    currentFilters,
    (state, newFilters: Partial<typeof currentFilters>) => ({ ...state, ...newFilters })
  );

  const updateUrlParams = (key: string, value: string | null) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.delete("page");
    if (!value || value === "all" || value === "false") {
      current.delete(key);
    } else {
      current.set(key, value);
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.replace(`${pathname}${query}`, { scroll: false });
  };

  const handleModeChange = (val: string) => {
    startTransition(() => {
      setOptimisticFilters({ mode: val });
      updateUrlParams("mode", val);
    });
  };

  const handleEasyChange = (val: boolean) => {
    startTransition(() => {
      setOptimisticFilters({ easy: val });
      updateUrlParams("easy", val ? "true" : "false");
    });
  };

  const handleCountryChange = (val: string) => {
    startTransition(() => {
      setOptimisticFilters({ country: val });
      updateUrlParams("country", val);
    });
  };

  const handleClearFilters = () => {
    startTransition(() => {
      setOptimisticFilters({ q: "", mode: "all", easy: false, country: "all" });
      router.replace(`${pathname}`, { scroll: false });
    });
  };

  const handlePageChange = (page: number) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (page === 1) {
      current.delete("page");
    } else {
      current.set("page", String(page));
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`, { scroll: false });
  };

  const isAnyFilterActive =
    optimisticFilters.q !== "" ||
    optimisticFilters.mode !== "all" ||
    optimisticFilters.easy ||
    optimisticFilters.country !== "all";

  const [visitedIds, setVisitedIds] = useState(new Set<string>());

  useEffect(() => {
    const newSet = new Set<string>();
    initialJobs.forEach((job) => {
      if (job.visitedAt) newSet.add(job.id);
    });
    setVisitedIds(newSet);
  }, [initialJobs]);

  const [isBlacklistModalOpen, setIsBlacklistModalOpen] = useState(false);
  const [blacklistTerm, setBlacklistTerm] = useState("");

  const [toast, setToast] = useState<{ msg: string; type: "trash" | "success" } | null>(null);
  const [lastTrashedJob, setLastTrashedJob] = useState<Job | null>(null);
  const [showBulkCleanToast, setShowBulkCleanToast] = useState(true);

  const handleBlacklistConfirm = async (term: string) => {
    try {
      const res = await fetch("/api/ai/ban-author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: term }),
      });

      if (!res.ok) throw new Error("Failed to blacklist");

      const jobsToRemove = jobs.filter((j) => j.company === term);
      const countRemoved = jobsToRemove.length;

      setJobs(jobs.filter((j) => j.company !== term));
      updateSidebarCount(-countRemoved);

      setIsBlacklistModalOpen(false);
      setToast({ msg: `Auteur "${term}" banni`, type: "trash" });

      setTimeout(() => {
        setToast((current) => (current?.msg.includes(term) ? null : current));
      }, 4000);
    } catch (error) {
      console.error("Error blacklisting:", error);
      alert("Erreur lors du filtrage");
    }
  };

  const inboxJobs = jobs.filter((job) => {
    if (optimisticFilters.q.trim()) {
      const q = optimisticFilters.q.toLowerCase();
      const matchesSearch =
        job.title?.toLowerCase().includes(q) || job.company?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    if (optimisticFilters.mode !== "all" && job.workMode !== optimisticFilters.mode) return false;
    if (optimisticFilters.easy && !job.isEasyApply) return false;
    if (optimisticFilters.country !== "all" && job.country !== optimisticFilters.country)
      return false;
    return true;
  });

  const visitedCount = jobs.filter((j) => visitedIds.has(j.id)).length;

  const totalPages = Math.ceil(total / pageSize);

  const handleVisit = async (id: string) => {
    const newVisited = new Set(visitedIds);
    newVisited.add(id);
    setVisitedIds(newVisited);
    try {
      await fetch(`/api/jobs/${id}/visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visited: true }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveJob = async (id: string, newStatus: JobStatus) => {
    const jobToMove = jobs.find((j) => j.id === id);
    if (!jobToMove) return;

    setJobs((prev) => prev.filter((j) => j.id !== id));
    updateSidebarCount(-1);

    if (newStatus === "TRASH") {
      setLastTrashedJob(jobToMove);
      setToast({ msg: "Offre ignorée", type: "trash" });
    } else if (newStatus === "SAVED") {
      setToast({ msg: "Offre sauvegardée", type: "success" });
    }

    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch (error) {
      console.error(error);
      setJobs((prev) => [jobToMove, ...prev]);
      updateSidebarCount(1);
      alert("Erreur serveur, action annulée.");
    }

    setTimeout(() => {
      setToast((current) =>
        current?.msg ===
        (newStatus === "TRASH" ? "Offre ignorée" : "Offre sauvegardée")
          ? null
          : current
      );
    }, 4000);
  };

  const handleUndoTrash = async () => {
    if (!lastTrashedJob) return;
    const jobToRestore = lastTrashedJob;
    setLastTrashedJob(null);
    setToast(null);

    try {
      await fetch(`/api/jobs/${jobToRestore.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INBOX" }),
      });
      updateSidebarCount(1);
      router.refresh();
    } catch (error) {
      console.error("Undo API failed", error);
      alert("Erreur lors de la restauration.");
    }
  };

  const handleBulkClean = async () => {
    const idsToTrash = inboxJobs.filter((j) => visitedIds.has(j.id)).map((j) => j.id);
    const countRemoved = idsToTrash.length;

    setJobs(jobs.filter((j) => !idsToTrash.includes(j.id)));
    setVisitedIds(new Set());
    updateSidebarCount(-countRemoved);

    idsToTrash.map((id) =>
      fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "TRASH" }),
      })
    );
  };

  const groupedJobs = inboxJobs.reduce(
    (acc, job) => {
      const dateKey = job.createdAt
        ? new Date(job.createdAt)
            .toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })
            .replace(":", "h")
        : "Date inconnue";

      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(job);
      return acc;
    },
    {} as Record<string, Job[]>
  );

  const groupKeys = Object.keys(groupedJobs);

  return (
    <div className="pb-64">
      {/* Page Header (Desktop) */}
      <div className="hidden md:flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Opportunités
          </h2>
          <p className="text-sm mt-2 font-medium text-slate-500 dark:text-slate-400">
            Gérez vos nouvelles offres d&apos;emploi.
          </p>
        </div>
        <button
          onClick={() => setVisitedIds(new Set())}
          className="text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm
             text-blue-600 bg-blue-50 hover:bg-blue-100
             dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:border dark:border-blue-500/10"
        >
          Tout marquer comme vu
        </button>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filterWorkMode={optimisticFilters.mode}
        setFilterWorkMode={handleModeChange}
        filterEasyApply={optimisticFilters.easy}
        setFilterEasyApply={handleEasyChange}
        filterCountry={optimisticFilters.country}
        setFilterCountry={handleCountryChange}
        availableCountries={availableCountries}
        isAnyFilterActive={isAnyFilterActive}
        onClearFilters={handleClearFilters}
      />

      {/* Empty State */}
      {inboxJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-enter">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center shadow-soft mb-6
                bg-white text-slate-300
                dark:bg-slate-900 dark:text-slate-600"
          >
            <Inbox size={48} strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Aucun résultat
          </h3>
          <p className="mt-2 max-w-xs mx-auto text-slate-500 dark:text-slate-500">
            Essayez de modifier vos filtres ou revenez plus tard.
          </p>
          <button
            onClick={handleClearFilters}
            className="mt-6 text-sm font-bold hover:underline text-blue-600 dark:text-blue-400"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div
          className={`space-y-8 transition-opacity duration-200 ${
            isPending ? "opacity-50" : "opacity-100"
          }`}
        >
          {groupKeys.map((dateKey, dateIndex) => (
            <div
              key={dateKey}
              className="animate-enter"
              style={{ animationDelay: `${dateIndex * 100}ms` }}
            >
              <div className="flex items-center gap-4 mb-5 px-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {dateKey}
                </h3>
                <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
              </div>
              <div className="space-y-3 md:space-y-4">
                {groupedJobs[dateKey].map((job, index) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    index={index}
                    isVisited={visitedIds.has(job.id)}
                    onVisit={handleVisit}
                    onBlacklist={() => {
                      setBlacklistTerm(job.company || "");
                      setIsBlacklistModalOpen(true);
                    }}
                    onSave={(id) => handleMoveJob(id, "SAVED")}
                    onTrash={(id) => handleMoveJob(id, "TRASH")}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onUndo={toast.type === "trash" ? handleUndoTrash : undefined}
          onClose={() => setToast(null)}
        />
      )}

      {/* Bulk Clean Toast */}
      {visitedCount > 0 && showBulkCleanToast && !toast && (
        <Toast
          message={`${visitedCount} offre${visitedCount > 1 ? "s" : ""} visitée${visitedCount > 1 ? "s" : ""}`}
          type="success"
          actionLabel="Nettoyer"
          onUndo={handleBulkClean}
          onClose={() => setShowBulkCleanToast(false)}
        />
      )}

      {/* Modals */}
      <BlacklistModal
        isOpen={isBlacklistModalOpen}
        onClose={() => setIsBlacklistModalOpen(false)}
        initialTerm={blacklistTerm}
        onConfirm={handleBlacklistConfirm}
      />
    </div>
  );
}
