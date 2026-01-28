"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Save } from "lucide-react";
import { SmartRule, RuleCondition, RuleField, RuleOperator } from "@/lib/types";

interface RuleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: SmartRule) => void;
  initialRule?: SmartRule | null;
}

const FIELD_OPTIONS: { value: RuleField; label: string }[] = [
  { value: "title", label: "Titre" },
  { value: "company", label: "Entreprise" },
  { value: "location", label: "Lieu" },
  { value: "workMode", label: "Mode de travail" },
  { value: "description", label: "Description brute" },
];

const OPERATOR_OPTIONS: { value: RuleOperator; label: string }[] = [
  { value: "contains", label: "Contient" },
  { value: "not_contains", label: "Ne contient pas" },
  { value: "equals", label: "Est égal à" },
  { value: "not_equals", label: "Est différent de" },
  { value: "in", label: "Est l'un de" },
  { value: "not_in", label: "N'est pas l'un de" },
];

export default function RuleEditorModal({
  isOpen,
  onClose,
  onSave,
  initialRule,
}: RuleEditorModalProps) {
  const [name, setName] = useState("");
  const [conditions, setConditions] = useState<RuleCondition[]>([]);

  useEffect(() => {
    if (initialRule) {
      setName(initialRule.name);
      setConditions(initialRule.conditions);
    } else {
      setName("");
      setConditions([
        {
          id: crypto.randomUUID(),
          field: "title",
          operator: "contains",
          value: "",
        },
      ]);
    }
  }, [initialRule, isOpen]);

  if (!isOpen) return null;

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      {
        id: crypto.randomUUID(),
        field: "title",
        operator: "contains",
        value: "",
      },
    ]);
  };

  const handleRemoveCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (
    id: string,
    key: keyof RuleCondition,
    value: string | string[]
  ) => {
    setConditions(
      conditions.map((c) => (c.id === id ? { ...c, [key]: value } : c))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rule: SmartRule = {
      id: initialRule?.id || crypto.randomUUID(),
      name: name || "Nouvelle règle",
      enabled: initialRule ? initialRule.enabled : true,
      conditions,
      action: "FILTER",
    };
    onSave(rule);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950 p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
            {initialRule ? "Modifier la règle" : "Nouvelle règle intelligente"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nom de la règle
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Anti-ESN Paris"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100"
              />
            </div>

            {/* Conditions */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Conditions (SI...)
              </label>
              <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                {conditions.map((condition, index) => (
                  <div key={condition.id} className="flex gap-2 items-start group">
                    {/* Lien logique */}
                    <div className="w-10 pt-2 text-center text-xs font-bold text-slate-400 uppercase">
                      {index === 0 ? "Si" : "Et"}
                    </div>

                    {/* Champ */}
                    <select
                      value={condition.field}
                      onChange={(e) =>
                        updateCondition(condition.id, "field", e.target.value)
                      }
                      className="w-1/4 px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-slate-100"
                    >
                      {FIELD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {/* Opérateur */}
                    <select
                      value={condition.operator}
                      onChange={(e) =>
                        updateCondition(condition.id, "operator", e.target.value)
                      }
                      className="w-1/4 px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-slate-100"
                    >
                      {OPERATOR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {/* Valeur (Dynamique) */}
                    <div className="flex-1">
                      {condition.field === "workMode" ? (
                        <select
                          value={condition.value as string}
                          onChange={(e) =>
                            updateCondition(condition.id, "value", e.target.value)
                          }
                          className="w-full px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-slate-100"
                        >
                          <option value="">Sélectionner...</option>
                          <option value="remote">Remote</option>
                          <option value="hybrid">Hybride</option>
                          <option value="on-site">Sur site</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={condition.value as string}
                          onChange={(e) =>
                            updateCondition(condition.id, "value", e.target.value)
                          }
                          placeholder="Valeur..."
                          className="w-full px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-slate-100"
                        />
                      )}
                    </div>

                    {/* Supprimer */}
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(condition.id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="ml-12 mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> Ajouter une condition
                </button>
              </div>
            </div>

            {/* Action Preview */}
            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl flex items-center gap-3">
              <div className="text-xs font-bold text-red-800 dark:text-red-400 uppercase">
                Alors
              </div>
              <div className="text-sm font-medium text-red-700 dark:text-red-300">
                Déplacer l'offre dans l'onglet <span className="font-bold">Filtrés</span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all"
          >
            <Save size={16} /> Enregistrer la règle
          </button>
        </div>
      </div>
    </div>
  );
}
