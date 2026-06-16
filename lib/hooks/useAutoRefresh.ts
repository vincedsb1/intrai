import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function useAutoRefresh(intervalMs: number = 60000) {
  const router = useRouter();
  const [lastCheckedAt, setLastCheckedAt] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentCount, setCurrentCount] = useState<number | null>(null);
  const [counts, setCounts] = useState<{
    inbox: number;
    processedToday: number;
    filteredToday: number;
  } | null>(null);

  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    const checkUpdates = async () => {
      try {
        setIsRefreshing(true);
        const res = await fetch("/api/jobs/count", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch count");

        const data = await res.json();
        const count = data.count;

        setLastCheckedAt(new Date());
        setCurrentCount(count);
        setCounts({
          inbox: data.inbox,
          processedToday: data.processedToday,
          filteredToday: data.filteredToday,
        });

        if (prevCountRef.current === null) {
          prevCountRef.current = count;
          return;
        }

        if (count !== prevCountRef.current) {
          const urlParams = new URLSearchParams(window.location.search);
          const currentPageInUrl = parseInt(urlParams.get("page") ?? "1", 10);

          if (currentPageInUrl > 1) {
            // Ne PAS mettre à jour prevCountRef ici : le delta reste en attente.
            // Au prochain tick où l'utilisateur sera sur page 1, le refresh sera déclenché.
            console.log(
              `[AutoRefresh] Count changed but page=${currentPageInUrl} > 1, deferring refresh`
            );
            return;
          }

          console.log(
            `[AutoRefresh] Count changed (${prevCountRef.current} -> ${count}). Refreshing...`
          );
          prevCountRef.current = count;
          router.refresh();
        }
      } catch (error) {
        console.error("[AutoRefresh] Error checking updates:", error);
      } finally {
        setIsRefreshing(false);
      }
    };

    checkUpdates();

    const timer = setInterval(checkUpdates, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs, router]);

  return { lastCheckedAt, isRefreshing, currentCount, counts };
}
