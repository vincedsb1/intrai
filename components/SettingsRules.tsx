"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2, Power, Zap } from "lucide-react";
import { SmartRule } from "@/lib/types";
import RuleEditorModal from "./RuleEditorModal";

interface SettingsRulesProps {
  rules: SmartRule[];
  onUpdateRules: (rules: SmartRule[]) => void;
}

export default function SettingsRules({ rules, onUpdateRules }: SettingsRulesProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SmartRule | null>(null);

  const handleAddRule = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const handleEditRule = (rule: SmartRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleSaveRule = (rule: SmartRule) => {
    if (editingRule) {
      // Update existing
      onUpdateRules(rules.map((r) => (r.id === rule.id ? rule : r)));
    } else {
      // Create new
      onUpdateRules([...rules, rule]);
    }
  };

  const handleDeleteRule = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette règle ?")) {
      onUpdateRules(rules.filter((r) => r.id !== id));
    }
  };

  const toggleRule = (id: string) => {
    onUpdateRules(
      rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-blue-700 dark:text-blue-400 flex items-center">
          <Zap size={18} className="mr-2" /> Règles Intelligentes
        </h3>
        <button
          onClick={handleAddRule}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
        >
          <Plus size={14} /> Nouvelle Règle
        </button>
      </div>

      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aucune règle active. Créez des filtres avancés pour automatiser le tri.
            </p>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 rounded-xl border transition-all ${
                rule.enabled
                  ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {rule.name}
                    </h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        rule.enabled
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                      }`}
                    >
                      {rule.enabled ? "Active" : "Désactivée"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    {rule.conditions.map((c, i) => (
                      <div key={c.id} className="flex gap-1">
                        <span className="font-mono text-slate-400 uppercase w-6 text-right inline-block mr-1">
                          {i === 0 ? "SI" : "ET"}
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          [{c.field}]
                        </span>
                        <span className="italic">{c.operator}</span>
                        <span className="font-bold">"{Array.isArray(c.value) ? c.value.join(", ") : c.value}"</span>
                      </div>
                    ))}
                    <div className="flex gap-1 pt-1 text-red-600 dark:text-red-400">
                      <span className="font-mono text-red-300 dark:text-red-800 uppercase w-6 text-right inline-block mr-1">
                        ALORS
                      </span>
                      <span>Filtrer l'annonce</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      rule.enabled
                        ? "text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        : "text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                    }`}
                    title={rule.enabled ? "Désactiver" : "Activer"}
                  >
                    <Power size={16} />
                  </button>
                  <button
                    onClick={() => handleEditRule(rule)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <RuleEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRule}
        initialRule={editingRule}
      />
    </div>
  );
}
