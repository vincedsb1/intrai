"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("[GLOBAL ERROR] 🔴 Uncaught exception:", error);
    console.error("[GLOBAL ERROR] 🔴 Digest:", error.digest);
  }, [error]);

  return (
    <html>
      <body className="bg-slate-50 text-slate-900 p-10 flex flex-col items-center justify-center min-h-screen font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-slate-800">Une erreur critique est survenue</h2>
          <p className="text-slate-500 mb-6 text-sm">
            Désolé, l'application a rencontré un problème inattendu.
          </p>
          
          {error.digest && (
            <div className="bg-slate-100 p-3 rounded-lg mb-6 font-mono text-xs text-slate-600 break-all">
              Digest: {error.digest}
            </div>
          )}

          <div className="flex gap-3">
             <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              Recharger la page
            </button>
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
