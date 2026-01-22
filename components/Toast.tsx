"use client";

import React from "react";
import { Trash2, CheckCircle } from "lucide-react";

interface ToastProps {
  message: string;
  onUndo?: () => void;
  actionLabel?: string;
  type?: 'trash' | 'success';
}

export default function Toast({ message, onUndo, actionLabel = "Annuler", type = 'trash' }: ToastProps) {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up-toast w-[90%] md:w-auto max-w-md">
      <div className="bg-slate-900/95 backdrop-blur-md text-white pl-4 pr-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-800/50">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${type === 'trash' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
          {type === 'trash' ? <Trash2 size={16} /> : <CheckCircle size={16} />}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{message}</span>
        </div>
        {onUndo && (
          <button
            onClick={onUndo}
            className="ml-auto text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors border-l border-slate-700 pl-4 py-1"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}