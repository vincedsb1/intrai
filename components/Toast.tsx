"use client";

import React from "react";
import { Trash2, CheckCircle, X } from "lucide-react";

interface ToastProps {
  message: string;
  onUndo?: () => void;
  onClose?: () => void;
  actionLabel?: string;
  type?: 'trash' | 'success';
}

export default function Toast({ message, onUndo, onClose, actionLabel = "Annuler", type = 'trash' }: ToastProps) {
  return (
    <div className="fixed bottom-12 left-0 right-0 mx-auto z-50 animate-slide-up-toast w-[90%] md:w-fit max-w-md px-4">
      <div className="backdrop-blur-md pl-4 pr-3 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 
      bg-slate-900/95 text-white border border-slate-800/50 
      dark:bg-slate-800/95 dark:border-slate-700/80">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${type === 'trash' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
          {type === 'trash' ? <Trash2 size={16} /> : <CheckCircle size={16} />}
        </div>
        <div className="flex flex-col min-w-0 mr-auto">
          <span className="text-sm font-medium truncate">{message}</span>
        </div>
        {onUndo && (
          <button
            onClick={onUndo}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors border-l border-slate-700 pl-4 py-1"
          >
            {actionLabel}
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
