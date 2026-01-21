"use client";

import React, { useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import JobCard from "./JobCard";
import { Job, JobStatus } from "@/lib/types";

interface ProcessedViewProps {
  initialJobs: Job[];
}

export default function ProcessedView({ initialJobs }: ProcessedViewProps) {
  // Dans une vraie app, on fetcherait depuis l'API, ici on simule
  // Note: Comme on n'a pas de state global, les changements de l'Inbox ne se verront pas ici
  // tant qu'on n'a pas de DB. C'est normal pour cette phase UI.
  const [jobs] = useState<Job[]>(initialJobs);
  const [subTab, setSubTab] = useState<JobStatus>("SAVED"); // SAVED or TRASH

  const displayJobs = jobs.filter((j) => j.status === subTab);

  return (
    <div>
      <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
        <button
          onClick={() => setSubTab("SAVED")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            subTab === "SAVED"
              ? "bg-white text-green-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Sauvegardés ({jobs.filter((j) => j.status === "SAVED").length})
        </button>
        <button
          onClick={() => setSubTab("TRASH")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            subTab === "TRASH"
              ? "bg-white text-red-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Corbeille ({jobs.filter((j) => j.status === "TRASH").length})
        </button>
      </div>

      {displayJobs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="bg-gray-50 inline-block p-4 rounded-full mb-3">
            {subTab === "SAVED" ? (
              <Bookmark size={32} />
            ) : (
              <Trash2 size={32} />
            )}
          </div>
          <p>Aucune offre ici pour le moment.</p>
        </div>
      ) : (
        displayJobs.map((job) => (
          <JobCard key={job.id} job={job} showActions={false} />
        ))
      )}
    </div>
  );
}
