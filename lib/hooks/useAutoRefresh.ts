import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function useAutoRefresh(intervalMs: number = 60000) {
  const router = useRouter();
  const [lastCheckedAt, setLastCheckedAt] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentCount, setCurrentCount] = useState<number | null>(null);
  
  // On utilise un ref pour stocker le count précédent afin de comparer
  // sans déclencher de re-renders inutiles
  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    // Fonction de vérification
    const checkUpdates = async () => {
      try {
        setIsRefreshing(true);
        const res = await fetch("/api/jobs/count", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch count");
        
        const data = await res.json();
        const count = data.count;
        
        setLastCheckedAt(new Date());
        setCurrentCount(count);

        // Première exécution : on initialise juste la ref
        if (prevCountRef.current === null) {
          prevCountRef.current = count;
          return;
        }

        // Si le nombre a changé, on rafraîchit les Server Components
        if (count !== prevCountRef.current) {
          console.log(`[AutoRefresh] Count changed (${prevCountRef.current} -> ${count}). Refreshing...`);
          prevCountRef.current = count;
          router.refresh();
        }
      } catch (error) {
        console.error("[AutoRefresh] Error checking updates:", error);
      } finally {
        setIsRefreshing(false);
      }
    };

    // Lancer immédiatement au montage pour synchro initiale
    checkUpdates();

    // Setup interval
    const timer = setInterval(checkUpdates, intervalMs);

    // Cleanup
    return () => clearInterval(timer);
  }, [intervalMs, router]);

  return { lastCheckedAt, isRefreshing, currentCount };
}
