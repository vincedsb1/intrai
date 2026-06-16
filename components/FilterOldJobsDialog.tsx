"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface FilterOldJobsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (days: number) => Promise<void>;
}

export default function FilterOldJobsDialog({
  isOpen,
  onClose,
  onSubmit,
}: FilterOldJobsDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [days, setDays] = useState("");
  const [estimatedCount, setEstimatedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNext = async () => {
    const n = parseInt(days, 10);
    if (isNaN(n) || n < 1) {
      setError("Minimum 1 jour");
      return;
    }
    if (n > 365) {
      setError("Maximum 365 jours");
      return;
    }
    setError("");

    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?status=INBOX&filterOlderThan=${n}`);
      if (!res.ok) throw new Error("Failed to count");
      const data = await res.json();
      setEstimatedCount(data.total || 0);
      setStep(2);
    } catch (err) {
      console.error("[FilterOldJobsDialog] Count fetch failed:", err);
      setError("Erreur lors du comptage");
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    setLoading(true);
    try {
      await onSubmit(parseInt(days, 10));
      onClose();
    } catch (err) {
      console.error("[FilterOldJobsDialog] Filter submit failed:", err);
      setError("Erreur lors du filtrage");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950 p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
            Filtrer les offres {step === 2 && `(${days} jours)`}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="days-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nombre de jours (1-365)
                </label>
                <input
                  id="days-input"
                  type="number"
                  min="1"
                  max="365"
                  value={days}
                  onChange={(e) => {
                    setDays(e.target.value);
                    setError("");
                  }}
                  placeholder="Ex: 14"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-50"
                />
              </div>
              {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Offres plus anciennes seront marquées comme "Filtrées" et retirées de l'Inbox.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {estimatedCount > 0 ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 p-4 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    <strong>⚠️ Confirmation</strong><br />
                    {estimatedCount} offre{estimatedCount !== 1 ? "s" : ""} de plus de {days} jour
                    {days !== "1" ? "s" : ""} seront filtrées.
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 p-4 rounded-lg">
                  <p className="text-sm text-amber-900 dark:text-amber-200">
                    Aucune offre ne correspond à ce critère ({`>`} {days} jour{days !== "1" ? "s" : ""}).
                  </p>
                </div>
              )}
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Cette action peut être annulée en supprimant la règle dans Réglages.
              </p>
              {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50 transition-colors"
          >
            {step === 1 ? "Annuler" : "Retour"}
          </button>
          <button
            onClick={step === 1 ? handleNext : handleFilter}
            disabled={loading || !days || (step === 2 && estimatedCount === 0)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-sm font-bold rounded-lg transition-all"
            title={step === 2 && estimatedCount === 0 ? "Aucune offre à filtrer" : ""}
          >
            {loading ? "Chargement..." : step === 1 ? "Suivant" : step === 2 && estimatedCount === 0 ? "Aucune offre" : "Filtrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
