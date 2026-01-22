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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-enter pb-32">
        
      {/* Whitelist Section */}
      <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100 h-fit">
        <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Zap size={24}/></div>
            <div>
                <h3 className="font-bold text-lg text-slate-900">Mots-clés Automatiques</h3>
                <p className="text-sm text-slate-500">Ces offres seront automatiquement traitées.</p>
            </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6">
            {whitelist.map(t => (
                <span key={t} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex items-center gap-2 group hover:bg-red-50 hover:border-red-200 hover:text-red-600 cursor-pointer transition-colors" onClick={() => removeWhitelist(t)}>
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
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <button onClick={addWhitelist} className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all">
                <Plus size={20} />
            </button>
        </div>
      </div>

      {/* Blacklist Section */}
      <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100 h-fit">
        <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><ShieldAlert size={24}/></div>
            <div>
                <h3 className="font-bold text-lg text-slate-900">Mots-clés Bloqués</h3>
                <p className="text-sm text-slate-500">Ces offres seront ignorées.</p>
            </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6">
            {blacklist.map(t => (
                <span key={t} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex items-center gap-2 group hover:bg-red-50 hover:border-red-200 hover:text-red-600 cursor-pointer transition-colors" onClick={() => removeBlacklist(t)}>
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
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
            <button onClick={addBlacklist} className="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-xl hover:bg-red-700 active:scale-95 transition-all">
                <Plus size={20} />
            </button>
        </div>
      </div>

    </div>
  );
}