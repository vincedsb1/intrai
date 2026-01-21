import ProcessedView from "@/components/ProcessedView";
import { getJobs } from "@/server/jobs.service";

export const dynamic = "force-dynamic";

export default async function ProcessedPage() {
  const [savedJobs, trashJobs] = await Promise.all([
    getJobs({ status: "SAVED" }),
    getJobs({ status: "TRASH" }),
  ]);

  const allProcessedJobs = [...savedJobs, ...trashJobs];

  return <ProcessedView initialJobs={allProcessedJobs} />;
}