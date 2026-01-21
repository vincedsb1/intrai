import InboxView from "@/components/InboxView";
import { getJobs } from "@/server/jobs.service";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const jobs = await getJobs({ status: "INBOX" });
  
  // Note: On passe les jobs de la DB au composant Client
  return <InboxView initialJobs={jobs} />;
}