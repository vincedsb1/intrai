import ProcessedView from "@/components/ProcessedView";
import { getJobs } from "@/server/jobs.service";

export const dynamic = "force-dynamic";

export default async function ProcessedPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q || undefined;

  const [{ items: savedJobs }, { items: trashJobs }] = await Promise.all([
    getJobs({ status: "SAVED", q }),
    getJobs({ status: "TRASH", q }),
  ]);

  const allProcessedJobs = [...savedJobs, ...trashJobs];

  return <ProcessedView initialJobs={allProcessedJobs} />;
}
