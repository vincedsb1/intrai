import InboxView from "@/components/InboxView";
import { getJobs, getAvailableCountries } from "@/server/jobs.service";
import { INBOX_PAGE_SIZE } from "@/lib/constants";
import { redirect } from "next/navigation";

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

  const totalPages = Math.max(1, Math.ceil(total / INBOX_PAGE_SIZE));
  if (total > 0 && page > totalPages) {
    const qs = new URLSearchParams();
    if (totalPages > 1) qs.set("page", String(totalPages));
    if (params.mode) qs.set("mode", params.mode);
    if (params.easy) qs.set("easy", params.easy);
    if (params.country) qs.set("country", params.country);
    if (params.q) qs.set("q", params.q);
    const search = qs.toString();
    redirect(`/inbox${search ? `?${search}` : ""}`);
  }

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
