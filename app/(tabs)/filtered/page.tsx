import FilteredView from "@/components/FilteredView";
import { getJobs } from "@/server/jobs.service";

export const dynamic = "force-dynamic";

export default async function FilteredPage() {
  const filteredJobs = await getJobs({ category: "FILTERED" });

  return <FilteredView initialJobs={filteredJobs} />;
}