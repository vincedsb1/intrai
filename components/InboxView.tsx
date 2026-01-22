"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Inbox } from "lucide-react";
import JobCard from "./JobCard";
import BlacklistModal from "./BlacklistModal";
import FilterBar from "./FilterBar";
import Toast from "./Toast";
import { Job, JobStatus } from "@/lib/types";

interface InboxViewProps {
  initialJobs: Job[];
}

export default function InboxView({ initialJobs }: InboxViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  
  // Filters State - Initialized from URL but managed locally for instant UI
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [filterWorkMode, setFilterWorkMode] = useState(searchParams.get("mode") || "all");
  const [filterEasyApply, setFilterEasyApply] = useState(searchParams.get("easy") === "true");
  const [filterCountry, setFilterCountry] = useState(searchParams.get("country") || "all");
  
  // URL Params Updater wrapped in Transition
  const updateUrlParams = (key: string, value: string | null) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (!value || value === "all" || value === "false") {
      current.delete(key);
    } else {
      current.set(key, value);
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    
    startTransition(() => {
      router.replace(`${pathname}${query}`, { scroll: false });
    });
  };

  // Handlers - Optimistic updates
  const handleModeChange = (val: string) => {
    setFilterWorkMode(val); // Instant UI update
    updateUrlParams("mode", val);
  };

  const handleEasyChange = (val: boolean) => {
    setFilterEasyApply(val); // Instant UI update
    updateUrlParams("easy", val ? "true" : "false");
  };

  const handleCountryChange = (val: string) => {
    setFilterCountry(val); // Instant UI update
    updateUrlParams("country", val);
  };

  const handleClearFilters = () => {
    // Instant UI reset
    setSearchQuery("");
    setFilterWorkMode("all");
    setFilterEasyApply(false);
    setFilterCountry("all");
    
    // Background URL update
    updateUrlParams("q", null);
    handleModeChange("all");
    handleEasyChange(false);
    handleCountryChange("all"); 
    // Optimization: we could batch these URL updates but `updateUrlParams` logic above 
    // isn't designed for batching easily without refactoring. 
    // Given the transition, multiple replace calls might be merged by Next.js or just execute fast enough.
    // For a cleaner reset:
    const current = new URLSearchParams(); // Clear all
    startTransition(() => {
        router.replace(`${pathname}`, { scroll: false });
    });
  };

  const isAnyFilterActive = 
    searchQuery !== "" || 
    filterWorkMode !== "all" || 
    filterEasyApply || 
    filterCountry !== "all";
  
  // Local State
  const [visitedIds, setVisitedIds] = useState<Set<string>>(() => {
    const initialVisited = new Set<string>();
    initialJobs.forEach((job) => {
      if (job.visitedAt) {
        initialVisited.add(job.id);
      }
    });
    return initialVisited;
  });
  
  const [isBlacklistModalOpen, setIsBlacklistModalOpen] = useState(false);
  const [blacklistTerm, setBlacklistTerm] = useState("");

  // Toast State
  const [toast, setToast] = useState<{ msg: string; type: 'trash' | 'success' } | null>(null);
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

      // Optimistic update
      setJobs(jobs.filter((j) => j.company !== term));
      setIsBlacklistModalOpen(false);
      setToast({ msg: `Auteur "${term}" banni`, type: 'trash' });
      
      setTimeout(() => {
        setToast((current) => current?.msg.includes(term) ? null : current);
      }, 4000);
    } catch (error) {
      console.error("Error blacklisting:", error);
      alert("Erreur lors du filtrage");
    }
  };

  // --- Filtering Logic ---
  const baseInboxJobs = jobs.filter(
    (j) => j.status === "INBOX" && j.category !== "FILTERED"
  );

  // Extract available countries dynamically
  const availableCountries = Array.from(
    new Set(baseInboxJobs.map((j) => j.country).filter((c): c is string => !!c))
  ).sort();

  const inboxJobs = baseInboxJobs.filter((job) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        job.title?.toLowerCase().includes(query) ||
        job.company?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    if (filterWorkMode !== "all" && job.workMode !== filterWorkMode) return false;
    if (filterEasyApply && !job.isEasyApply) return false;
    if (filterCountry !== "all" && job.country !== filterCountry) return false;
    return true;
  });

  const visitedCount = baseInboxJobs.filter((j) => visitedIds.has(j.id)).length;

  // Actions
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
    } catch (err) { console.error(err); }
  };

  const handleMoveJob = async (id: string, newStatus: JobStatus) => {
    const jobToMove = jobs.find((j) => j.id === id);
    if (!jobToMove) return;

    setJobs((prev) => prev.filter((j) => j.id !== id));

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
      alert("Erreur serveur, action annulée.");
    }
    
    setTimeout(() => {
        setToast((current) => current?.msg === (newStatus === "TRASH" ? "Offre ignorée" : "Offre sauvegardée") ? null : current);
    }, 4000);
  };

  const handleUndoTrash = async () => {
    if (!lastTrashedJob) return;
    const jobToRestore = lastTrashedJob;
    setLastTrashedJob(null);
    setToast(null);
    setJobs((prev) => [jobToRestore, ...prev]);

    try {
      await fetch(`/api/jobs/${jobToRestore.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INBOX" }),
      });
    } catch (error) {
      setJobs((prev) => prev.filter((j) => j.id !== jobToRestore.id));
    }
  };
  
  const handleBulkClean = async () => {
    const idsToTrash = inboxJobs.filter((j) => visitedIds.has(j.id)).map((j) => j.id);
    setJobs(jobs.filter((j) => !idsToTrash.includes(j.id)));
    setVisitedIds(new Set());
    
    idsToTrash.map((id) =>
          fetch(`/api/jobs/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "TRASH" }),
          })
    );
  };

  // Grouping
  const groupedJobs = inboxJobs.reduce((acc, job) => {
    const dateKey = job.createdAt
      ? new Date(job.createdAt).toLocaleDateString("fr-FR", { 
          day: "numeric", 
          month: "long", 
          hour: "2-digit", 
          minute: "2-digit" 
        }).replace(":", "h")
      : "Date inconnue";
    
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(job);
    return acc;
  }, {} as Record<string, Job[]>);
  
  const groupKeys = Object.keys(groupedJobs);

  return (
    <>
        {/* Page Header (Desktop) - Hidden on mobile */}
        <div className="hidden md:flex items-end justify-between mb-8">
            <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Opportunités</h2>
            <p className="text-slate-500 text-sm mt-2 font-medium">
                Gérez vos nouvelles offres d'emploi.
            </p>
            </div>
             <button onClick={() => setVisitedIds(new Set())} className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors shadow-sm">
                Tout marquer comme vu
            </button>
        </div>

        {/* Filter Bar */}
        <FilterBar 
            filterWorkMode={filterWorkMode}
            setFilterWorkMode={handleModeChange}
            filterEasyApply={filterEasyApply}
            setFilterEasyApply={handleEasyChange}
            filterCountry={filterCountry}
            setFilterCountry={handleCountryChange}
            availableCountries={availableCountries}
            isAnyFilterActive={isAnyFilterActive}
            onClearFilters={handleClearFilters}
        />

        {/* Empty State */}
        {inboxJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center animate-enter">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-soft mb-6 text-slate-300">
                    <Inbox size={48} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Aucun résultat</h3>
                <p className="text-slate-500 mt-2 max-w-xs mx-auto">Essayez de modifier vos filtres ou revenez plus tard.</p>
                <button 
                    onClick={handleClearFilters}
                    className="mt-6 text-sm font-bold text-blue-600 hover:underline"
                >
                    Réinitialiser les filtres
                </button>
            </div>
        ) : (
            <div className={`space-y-8 transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
                {groupKeys.map((dateKey, dateIndex) => (
                    <div key={dateKey} className="animate-enter" style={{ animationDelay: `${dateIndex * 100}ms` }}>
                        <div className="flex items-center gap-4 mb-5 px-1">
                             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{dateKey}</h3>
                             <div className="h-[1px] bg-slate-200 flex-1"></div>
                        </div>
                        <div className="space-y-3 md:space-y-4">
                            {groupedJobs[dateKey].map((job, index) => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    index={index}
                                    isVisited={visitedIds.has(job.id)}
                                    onVisit={handleVisit}
                                    onBlacklist={() => { setBlacklistTerm(job.company || ""); setIsBlacklistModalOpen(true); }}
                                    onSave={(id) => handleMoveJob(id, "SAVED")}
                                    onTrash={(id) => handleMoveJob(id, "TRASH")}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Toast Notification */}
        {toast && (
            <Toast 
                message={toast.msg} 
                type={toast.type} 
                onUndo={toast.type === 'trash' ? handleUndoTrash : undefined} 
            />
        )}
        
        {/* Bulk Clean Toast */}
        {visitedCount > 0 && showBulkCleanToast && !toast && (
             <Toast 
                message={`${visitedCount} offre${visitedCount > 1 ? 's' : ''} visitée${visitedCount > 1 ? 's' : ''}`}
                type="success"
                actionLabel="Nettoyer"
                onUndo={handleBulkClean}
             />
        )}

        {/* Modals */}
        <BlacklistModal
            isOpen={isBlacklistModalOpen}
            onClose={() => setIsBlacklistModalOpen(false)}
            initialTerm={blacklistTerm}
            onConfirm={handleBlacklistConfirm}
        />
    </>
  );
}
