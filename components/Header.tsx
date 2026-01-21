"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, CheckCircle, ShieldAlert, Settings } from "lucide-react";

export default function Header() {
  const pathname = usePathname();

  const tabs = [
    { id: "inbox", href: "/inbox", icon: Inbox, label: "Inbox" },
    { id: "processed", href: "/processed", icon: CheckCircle, label: "Traitées" },
    { id: "filtered", href: "/filtered", icon: ShieldAlert, label: "Filtrés" },
    { id: "settings", href: "/settings", icon: Settings, label: "Réglages" },
  ];

  return (
    <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
            J
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 hidden sm:block">
            intrai <span className="text-gray-300 text-sm font-light">v1</span>
          </h1>
        </div>

        <nav className="flex bg-gray-50 p-1 rounded-lg">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`
                  relative px-3 sm:px-4 py-2 rounded-md transition-all duration-200 text-xs font-medium flex items-center justify-center
                  ${
                    isActive
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
                  }
                `}
              >
                <tab.icon size={18} className="sm:mr-2" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
