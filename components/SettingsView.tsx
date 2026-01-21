"use client";

import React, { useState } from "react";
import { CheckCircle, ShieldAlert, X } from "lucide-react";

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
    <div className="space-y-6 pb-20">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Le Cerveau</h2>
        <p className="text-sm text-gray-600">
          Configurez ici les règles qui trient automatiquement votre Inbox.
        </p>
      </div>

      {/* Whitelist Section */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-green-700 flex items-center">
            <CheckCircle size={18} className="mr-2" /> Whitelist (Cibles)
          </h3>
          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
            {whitelist.length} règles
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
          {whitelist.map((term) => (
            <span
              key={term}
              className="px-3 py-1.5 bg-white text-gray-700 rounded-lg text-sm border border-green-200 shadow-sm flex items-center group"
            >
              {term}
              <button
                onClick={() => removeWhitelist(term)}
                className="ml-2 text-green-300 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newWhitelistTerm}
            onChange={(e) => setNewWhitelistTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addWhitelist()}
            placeholder="Ajouter un mot-clé cible..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
          <button
            onClick={addWhitelist}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Ajouter
          </button>
        </div>
      </div>

      {/* Blacklist Section */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-red-700 flex items-center">
            <ShieldAlert size={18} className="mr-2" /> Blacklist (Exclusions)
          </h3>
          <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">
            {blacklist.length} règles
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
          {blacklist.map((term) => (
            <span
              key={term}
              className="px-3 py-1.5 bg-white text-gray-700 rounded-lg text-sm border border-red-200 shadow-sm flex items-center"
            >
              {term}
              <button
                onClick={() => removeBlacklist(term)}
                className="ml-2 text-red-300 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newBlacklistTerm}
            onChange={(e) => setNewBlacklistTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addBlacklist()}
            placeholder="Exclure un mot ou une entreprise..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
          />
          <button
            onClick={addBlacklist}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
