import InboxView from "@/components/InboxView";
import { getJobs, getAvailableCountries } from "@/server/jobs.service";
import { INBOX_PAGE_SIZE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    mode?: string;
    easy?: string;
    country?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;

  const rawPage = parseInt(params.page ?? "1", 10);
  const page = isNaN(rawPage) ? 1 : Math.max(1, rawPage);
  const workMode = params.mode && params.mode !== "all" ? params.mode : undefined;
  const isEasyApply = params.easy === "true" ? true : undefined;
  const country = params.country && params.country !== "all" ? params.country : undefined;
  const q = params.q || undefined;

  const [{ items, total }, availableCountries] = await Promise.all([
    getJobs({ status: "INBOX", page, limit: INBOX_PAGE_SIZE, workMode, isEasyApply, country, q }),
    getAvailableCountries({ status: "INBOX", workMode, q, isEasyApply }),
  ]);

  return (
    <InboxView
      initialJobs={items}
      total={total}
      currentPage={page}
      pageSize={INBOX_PAGE_SIZE}
      availableCountries={availableCountries}
    />
  );
}
