"use client";

import React, { useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import JobCard from "./JobCard";
import { Job, JobStatus } from "@/lib/types";

interface ProcessedViewProps {
  initialJobs: Job[];
}

export default function ProcessedView({ initialJobs }: ProcessedViewProps) {
  const [jobs] = useState<Job[]>(initialJobs);
  const [subTab, setSubTab] = useState<JobStatus>("SAVED");

  const displayJobs = jobs.filter((j) => j.status === subTab);

  return (
    <>
      {/* Page Header (Desktop) - Hidden on mobile */}
      <div className="hidden md:flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Historique</h2>
          <p className="text-sm mt-2 font-medium text-slate-500 dark:text-slate-400">
             Retrouvez vos décisions passées.
          </p>
        </div>
      </div>

      <div>
        <div className="flex p-1 backdrop-blur-sm rounded-xl mb-6
        bg-slate-200/50 dark:bg-slate-800/50">
          <button
            onClick={() => setSubTab("SAVED")}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              subTab === "SAVED"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Sauvegardés ({jobs.filter((j) => j.status === "SAVED").length})
          </button>
          <button
            onClick={() => setSubTab("TRASH")}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              subTab === "TRASH"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Corbeille ({jobs.filter((j) => j.status === "TRASH").length})
          </button>
        </div>

        {displayJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-enter">
            <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-soft mb-6 
            bg-white text-slate-300
            dark:bg-slate-900 dark:text-slate-600">
              {subTab === "SAVED" ? (
                <Bookmark size={48} strokeWidth={1.5} />
              ) : (
                <Trash2 size={48} strokeWidth={1.5} />
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-500">Aucune offre ici pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {displayJobs.map((job, index) => (
              <JobCard key={job.id} job={job} showActions={false} index={index} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
