"use client";

import React, { useState } from "react";
import { CheckCircle, Trash2, Search, X } from "lucide-react";
import JobCard from "./JobCard";
import BlacklistModal from "./BlacklistModal";
import AiDetectiveModal from "./AiDetectiveModal";
import { Job, JobStatus } from "@/lib/types";

interface InboxViewProps {
  initialJobs: Job[];
}

export default function InboxView({ initialJobs }: InboxViewProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [searchQuery, setSearchQuery] = useState("");
  const [visitedIds, setVisitedIds] = useState<Set<string>>(() => {
    // Initialisation depuis les données serveur
    const initialVisited = new Set<string>();
    initialJobs.forEach((job) => {
      if (job.visitedAt) {
        initialVisited.add(job.id);
      }
    });
    return initialVisited;
  });
  const [analyzingJobId, setAnalyzingJobId] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  
  // Blacklist Modal State
  const [isBlacklistModalOpen, setIsBlacklistModalOpen] = useState(false);
  const [blacklistTerm, setBlacklistTerm] = useState("");

  // Filtre de base: INBOX et pas FILTERED
  const baseInboxJobs = jobs.filter(
    (j) => j.status === "INBOX" && j.category !== "FILTERED"
  );

  // Application de la recherche
  const inboxJobs = baseInboxJobs.filter((job) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.title?.toLowerCase().includes(query) ||
      job.company?.toLowerCase().includes(query)
    );
  });

  const visitedCount = baseInboxJobs.filter((j) => visitedIds.has(j.id)).length;

  const currentAnalyzingJob = jobs.find((j) => j.id === analyzingJobId) || null;

  const handleVisit = async (id: string) => {
    const newVisited = new Set(visitedIds);
    newVisited.add(id);
    setVisitedIds(newVisited);
    
    console.log("Calling visit API for", id);

    // Appel API (fire and forget)
    try {
      await fetch(`/api/jobs/${id}/visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visited: true }),
      });
    } catch (err) {
      console.error("Failed to persist visit", err);
    }
  };

  const handleUnvisit = async (id: string) => {
    const newVisited = new Set(visitedIds);
    newVisited.delete(id);
    setVisitedIds(newVisited);

    // Appel API
    try {
      await fetch(`/api/jobs/${id}/visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visited: false }),
      });
    } catch (err) {
      console.error("Failed to persist unvisit", err);
    }
  };


  const handleMoveJob = async (id: string, newStatus: JobStatus) => {
    try {
      // 1. Appel API pour persister
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      // 2. Mise à jour optimiste de l'UI
      setJobs(jobs.filter((j) => j.id !== id));
    } catch (error) {
      console.error("Error moving job:", error);
      alert("Erreur lors de la mise à jour");
    }
  };

  const handleBulkClean = async () => {
    const idsToTrash = inboxJobs
      .filter((j) => visitedIds.has(j.id))
      .map((j) => j.id);

    try {
      // On fait les appels en parallèle pour la démo (on pourrait faire un endpoint bulk)
      await Promise.all(
        idsToTrash.map((id) =>
          fetch(`/api/jobs/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "TRASH" }),
          })
        )
      );

      setJobs(jobs.filter((j) => !idsToTrash.includes(j.id)));
      setVisitedIds(new Set());
    } catch (error) {
      console.error("Bulk clean error:", error);
    }
  };

  const handleAnalyze = (id: string) => {
    setAnalyzingJobId(id);
    setIsAiModalOpen(true);
  };

  const openBlacklistModal = (company: string) => {
    setBlacklistTerm(company);
    setIsBlacklistModalOpen(true);
  };

  const handleBlacklistConfirm = async (term: string) => {
    try {
      // On utilise l'endpoint existant qui fait exactement le job : 
      // Ajout blacklist + Update status FILTERED sur les jobs matchant ce terme
      // Note: L'endpoint attend { company: term }
      const res = await fetch("/api/ai/ban-author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: term }),
      });

      if (!res.ok) throw new Error("Failed to blacklist");

      // Optimistic update
      setJobs(jobs.filter((j) => j.company !== term)); // Simple check exact
      // Idéalement on devrait filtrer plus large (includes) comme le backend, 
      // mais pour l'instant c'est suffisant pour l'UX immédiate.
      
      console.log("Blacklisted:", term);
    } catch (error) {
      console.error("Error blacklisting:", error);
      alert("Erreur lors du filtrage");
    }
  };

  // Groupement des jobs par lot (Date + Heure)
  const groupedJobs = inboxJobs.reduce((acc, job) => {
    const dateKey = job.createdAt
      ? new Date(job.createdAt).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Date inconnue";
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(job);
    return acc;
  }, {} as Record<string, Job[]>);

  // Ordre des clés (déjà trié par date décroissante car inboxJobs l'est, mais on s'assure de l'ordre d'insertion)
  const groupKeys = Object.keys(groupedJobs); // Note: reduce préserve l'ordre d'insertion des clés si inboxJobs est trié

  return (
    <div className="relative pb-24">
      {/* Sub-header Inbox */}
      <div className="flex justify-between items-end mb-6 px-1">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Flux entrant</h2>
          <p className="text-xs text-gray-500">
            Toutes vos sources centralisées ici.
          </p>
        </div>
        <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">
          {inboxJobs.length} offres
        </span>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6 relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={16} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Rechercher un poste ou une entreprise..."
          className="block w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {inboxJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-green-100 p-4 rounded-full mb-4 animate-pulse">
            <CheckCircle size={48} className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Inbox Zero !</h3>
          <p className="text-gray-500 max-w-xs">
            Toutes les offres ont été traitées. Prenez une pause ou ajustez vos
            sources.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupKeys.map((dateKey) => (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded">
                  {dateKey}
                </span>
                <div className="h-[1px] bg-gray-100 flex-1"></div>
              </div>
              <div className="space-y-1">
                {groupedJobs[dateKey].map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isVisited={visitedIds.has(job.id)}
                    onVisit={handleVisit}
                    onUnvisit={handleUnvisit}
                    onBlacklist={openBlacklistModal}
                    onSave={(id) => handleMoveJob(id, "SAVED")}
                    onTrash={(id) => handleMoveJob(id, "TRASH")}
                    onAnalyze={handleAnalyze}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button (FAB) for Bulk Clean */}
      {visitedCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none">
          <button
            onClick={handleBulkClean}
            className="pointer-events-auto group flex items-center bg-gray-900 hover:bg-black text-white px-6 py-3.5 rounded-full shadow-xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Trash2
              size={18}
              className="mr-2.5 text-gray-400 group-hover:text-white transition-colors"
            />
            <div className="text-sm font-medium">
              Nettoyer les visités{" "}
              <span className="bg-gray-700 ml-1 px-1.5 py-0.5 rounded text-xs">
                {visitedCount}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* AI Detective Modal */}
      <AiDetectiveModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        job={currentAnalyzingJob}
        onBan={(company) => handleBlacklistConfirm(company)}
      />

      {/* Blacklist Modal */}
      <BlacklistModal
        isOpen={isBlacklistModalOpen}
        onClose={() => setIsBlacklistModalOpen(false)}
        initialTerm={blacklistTerm}
        onConfirm={handleBlacklistConfirm}
      />
    </div>
  );
}

