import { NextResponse } from "next/server";
import { getJobs, countJobsMatchingOlderThan } from "@/server/jobs.service";
import { JobStatus, JobCategory } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as JobStatus | undefined;
  const category = searchParams.get("category") as JobCategory | undefined;
  const mode = searchParams.get("mode") ?? undefined;
  const isEasyApply = searchParams.get("easy") === "true" ? true : undefined;
  const country = searchParams.get("country") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  // Support for estimating jobs matching olderThan filter
  const filterOlderThan = searchParams.get("filterOlderThan");
  if (filterOlderThan && status === "INBOX") {
    const days = parseInt(filterOlderThan, 10);
    if (!isNaN(days) && days > 0) {
      try {
        const total = await countJobsMatchingOlderThan(days);
        return NextResponse.json({ items: [], total });
      } catch (error) {
        return NextResponse.json({ error: "Count failed" }, { status: 500 });
      }
    }
  }

  const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
  const page = isNaN(rawPage) ? 1 : Math.max(1, rawPage);

  const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(isNaN(rawLimit) ? 20 : Math.max(1, rawLimit), 100);

  try {
    const { items, total } = await getJobs({
      status,
      category,
      workMode: mode,
      isEasyApply,
      country,
      q,
      page,
      limit,
    });
    return NextResponse.json({ items, total });
  } catch (error) {
    return NextResponse.json({ error: "DB Error" }, { status: 500 });
  }
}
