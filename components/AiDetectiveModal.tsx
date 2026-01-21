"use client";

import React, { useState, useEffect } from "react";
import { Bot, X, AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";
import { Job } from "@/lib/types";

interface AiResult {
  isPlatformOrAgency: boolean;
  type: string;
  reason: string;
}

interface AiDetectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onBan: (company: string) => void;
}

export default function AiDetectiveModal({
  isOpen,
  onClose,
  job,
  onBan,
}: AiDetectiveModalProps) {
  const [status, setStatus] = useState<"loading" | "result">("loading");
  const [result, setResult] = useState<AiResult | null>(null);

  useEffect(() => {
    if (isOpen && job) {
      const fetchAnalysis = async () => {
        setStatus("loading");
        setResult(null);
        try {
          const res = await fetch("/api/ai/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: job.id }),
          });
          const data = await res.json();
          setResult(data);
          setStatus("result");
        } catch (error) {
          console.error("AI Fetch error:", error);
          setStatus("result");
          setResult({
            isPlatformOrAgency: false,
            type: "Erreur",
            reason: "Impossible de contacter l'IA.",
          });
        }
      };

      fetchAnalysis();
    }
  }, [isOpen, job]);

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
        {/* Header Modal */}
        <div className="bg-indigo-600 p-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">AI Detective</h3>
              <p className="text-indigo-200 text-xs">
                Analyse sémantique de l'auteur
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {status === "loading" ? (
            <div className="text-center py-10 space-y-4">
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-gray-500 font-medium animate-pulse">
                L'IA analyse {job.company}...
              </p>
            </div>
          ) : (
            result && (
              <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
                <div
                  className={`p-5 rounded-xl border ${
                    result.isPlatformOrAgency
                      ? "bg-orange-50 border-orange-100"
                      : "bg-green-50 border-green-100"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.isPlatformOrAgency ? (
                      <AlertTriangle className="text-orange-600" size={20} />
                    ) : (
                      <CheckCircle className="text-green-600" size={20} />
                    )}
                    <h4
                      className={`font-bold ${
                        result.isPlatformOrAgency
                          ? "text-orange-800"
                          : "text-green-800"
                      }`}
                    >
                      {result.type}
                    </h4>
                  </div>
                  <p
                    className={`text-sm leading-relaxed ${
                      result.isPlatformOrAgency
                        ? "text-orange-700"
                        : "text-green-700"
                    }`}
                  >
                    "{result.reason}"
                  </p>
                </div>

                {result.isPlatformOrAgency ? (
                  <>
                    <p className="text-gray-600 text-sm">
                      L'IA recommande de bannir <strong>{job.company}</strong>{" "}
                      pour nettoyer votre flux futur.
                    </p>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={onClose}
                        className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors cursor-pointer"
                      >
                        Ignorer
                      </button>
                      <button
                        onClick={() => {
                          if (job.company) onBan(job.company);
                          onClose();
                        }}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md shadow-red-200 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShieldAlert size={18} />
                        Bannir l'auteur
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="pt-2">
                    <button
                      onClick={onClose}
                      className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-black transition-colors cursor-pointer"
                    >
                      Compris, retour à l'Inbox
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
