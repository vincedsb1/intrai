"use client";

import React, { useState } from "react";
import { ShieldAlert, Inbox } from "lucide-react";
import JobCard from "./JobCard";
import { Job } from "@/lib/types";

interface FilteredViewProps {
  initialJobs: Job[];
}

export default function FilteredView({ initialJobs }: FilteredViewProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);

  const filteredJobs = jobs.filter((j) => j.category === "FILTERED");

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error("Restore failed");
      setJobs(jobs.filter((j) => j.id !== id));
    } catch (error) {
      console.error("Error restoring job:", error);
    }
  };

  return (
    <>
      {/* Page Header (Desktop) - Hidden on mobile */}
      <div className="hidden md:flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Bloquées</h2>
          <p className="text-sm mt-2 font-medium text-slate-500 dark:text-slate-400">
             Offres interceptées par vos filtres.
          </p>
        </div>
      </div>

      <div>
        <div className="rounded-2xl p-5 mb-8 flex items-start gap-4 shadow-sm border
        bg-amber-50 border-amber-100 
        dark:bg-amber-900/20 dark:border-amber-900/30">
          <div className="p-2 rounded-xl text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-500">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-amber-900 dark:text-amber-400">
              Le Mur de Protection
            </h3>
            <p className="text-xs mt-1 leading-relaxed text-amber-700 dark:text-amber-500/80">
              Ces {filteredJobs.length} offres ont été interceptées automatiquement
              par vos règles de Blacklist.
            </p>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-enter">
            <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-soft mb-6 
            bg-white text-slate-300
            dark:bg-slate-900 dark:text-slate-600">
              <Inbox size={48} strokeWidth={1.5} />
            </div>
            <p className="text-slate-500 dark:text-slate-500">Le filtre est vide. Tout est calme.</p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {filteredJobs.map((job, index) => (
              <JobCard
                key={job.id}
                job={job}
                isFilteredView={true}
                showActions={true}
                onRestore={handleRestore}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
