"use client";

import React, { useState } from "react";
import { Zap, ShieldAlert, X, Plus } from "lucide-react";

interface SettingsViewProps {
  initialData: {
    whitelist: string[];
    blacklist: string[];
  };
}

export default function SettingsView({ initialData }: SettingsViewProps) {
  const [whitelist, setWhitelist] = useState(initialData.whitelist);
  const [blacklist, setBlacklist] = useState(initialData.blacklist);
  const [newBlacklistTerm, setNewBlacklistTerm] = useState("");
  const [newWhitelistTerm, setNewWhitelistTerm] = useState("");

  const saveSettings = async (updatedWhitelist: string[], updatedBlacklist: string[]) => {
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whitelist: updatedWhitelist,
          blacklist: updatedBlacklist,
        }),
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const addWhitelist = () => {
    if (newWhitelistTerm.trim()) {
      const newList = [...whitelist, newWhitelistTerm.trim()];
      setWhitelist(newList);
      setNewWhitelistTerm("");
      saveSettings(newList, blacklist);
    }
  };

  const removeWhitelist = (term: string) => {
    const newList = whitelist.filter((t) => t !== term);
    setWhitelist(newList);
    saveSettings(newList, blacklist);
  };

  const addBlacklist = () => {
    if (newBlacklistTerm.trim()) {
      const newList = [...blacklist, newBlacklistTerm.trim()];
      setBlacklist(newList);
      setNewBlacklistTerm("");
      saveSettings(whitelist, newList);
    }
  };

  const removeBlacklist = (term: string) => {
    const newList = blacklist.filter((t) => t !== term);
    setBlacklist(newList);
    saveSettings(whitelist, newList);
  };

  return (
    <>
      {/* Page Header (Desktop) - Hidden on mobile */}
      <div className="hidden md:flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Configuration</h2>
          <p className="text-sm mt-2 font-medium text-slate-500 dark:text-slate-400">
             Gérez vos règles de tri automatique.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-enter pb-32">
        
        {/* Whitelist Section */}
        <div className="p-8 rounded-3xl shadow-soft border h-fit
        bg-white border-slate-100
        dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"><Zap size={24}/></div>
                <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Mots-clés Automatiques</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ces offres seront automatiquement traitées.</p>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6">
                {whitelist.map(t => (
                    <span key={t} className="px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-2 group cursor-pointer transition-colors
                    bg-slate-50 border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600
                    dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-red-900/20 dark:hover:border-red-500/30 dark:hover:text-red-400" onClick={() => removeWhitelist(t)}>
                        {t} <X size={14} className="opacity-50 group-hover:opacity-100" />
                    </span>
                ))}
            </div>

            <div className="flex gap-2">
                <input 
                    value={newWhitelistTerm}
                    onChange={(e) => setNewWhitelistTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addWhitelist()}
                    placeholder="Ajouter un mot-clé..." 
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-all
                    bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                    dark:bg-slate-950 dark:border-slate-800 dark:focus:ring-blue-500/50 dark:focus:border-blue-500/50 dark:text-slate-200 dark:placeholder-slate-500"
                />
                <button onClick={addWhitelist} className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95
                bg-blue-600 text-white hover:bg-blue-700
                dark:bg-blue-600 dark:hover:bg-blue-500">
                    <Plus size={20} />
                </button>
            </div>
        </div>

        {/* Blacklist Section */}
        <div className="p-8 rounded-3xl shadow-soft border h-fit
        bg-white border-slate-100
        dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"><ShieldAlert size={24}/></div>
                <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Mots-clés Bloqués</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ces offres seront ignorées.</p>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6">
                {blacklist.map(t => (
                    <span key={t} className="px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-2 group cursor-pointer transition-colors
                    bg-slate-50 border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600
                    dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-red-900/20 dark:hover:border-red-500/30 dark:hover:text-red-400" onClick={() => removeBlacklist(t)}>
                        {t} <X size={14} className="opacity-50 group-hover:opacity-100" />
                    </span>
                ))}
            </div>

            <div className="flex gap-2">
                <input 
                    value={newBlacklistTerm}
                    onChange={(e) => setNewBlacklistTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addBlacklist()}
                    placeholder="Ajouter un mot-clé..." 
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-all
                    bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500
                    dark:bg-slate-950 dark:border-slate-800 dark:focus:ring-red-500/50 dark:focus:border-red-500/50 dark:text-slate-200 dark:placeholder-slate-500"
                />
                <button onClick={addBlacklist} className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95
                bg-red-600 text-white hover:bg-red-700
                dark:bg-red-600 dark:hover:bg-red-500">
                    <Plus size={20} />
                </button>
            </div>
        </div>

      </div>
    </>
  );
}