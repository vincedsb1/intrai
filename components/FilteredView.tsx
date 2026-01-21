"use client";

import React, { useState } from "react";
import { ShieldAlert } from "lucide-react";
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

      // Optimistic update: remove from filtered list
      setJobs(jobs.filter((j) => j.id !== id));
    } catch (error) {
      console.error("Error restoring job:", error);
      alert("Erreur lors de la restauration");
    }
  };

  return (
    <div>
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 flex items-start">
        <ShieldAlert size={20} className="text-red-600 mt-0.5 mr-3 shrink-0" />
        <div>
          <h3 className="font-semibold text-red-900 text-sm">
            Le Mur de Protection
          </h3>
          <p className="text-xs text-red-700 mt-1">
            Ces {filteredJobs.length} offres ont été interceptées automatiquement
            par vos règles de Blacklist.
          </p>
        </div>
      </div>
      {filteredJobs.length === 0 && (
        <p className="text-center text-gray-400 py-10 text-sm">
          Le filtre est vide. Tout est calme.
        </p>
      )}
      {filteredJobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          isFilteredView={true}
          showActions={true}
          onRestore={handleRestore}
        />
      ))}
    </div>
  );
}
