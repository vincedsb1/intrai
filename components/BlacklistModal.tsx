"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, X } from "lucide-react";

interface BlacklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTerm: string;
  onConfirm: (term: string) => void;
}

export default function BlacklistModal({
  isOpen,
  onClose,
  initialTerm,
  onConfirm,
}: BlacklistModalProps) {
  const [term, setTerm] = useState(initialTerm);

  useEffect(() => {
    setTerm(initialTerm);
  }, [initialTerm, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
        <div className="bg-red-50 p-4 border-b border-red-100 flex items-center justify-between">
          <h3 className="font-bold text-red-800 flex items-center gap-2">
            <ShieldAlert size={20} />
            Filtrer une entreprise
          </h3>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-gray-600 mb-4">
            Ajoutez ce nom à la liste d'exclusion. Toutes les offres contenant ce terme seront automatiquement filtrées à l'avenir.
          </p>

          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none mb-4"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            autoFocus
          />

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (term.trim()) {
                  onConfirm(term.trim());
                  onClose();
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <ShieldAlert size={16} />
              Ajouter aux filtres
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
