import { NextResponse } from "next/server";
import { getJobs } from "@/server/jobs.service";
import { JobStatus, JobCategory } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as JobStatus | undefined;
  const category = searchParams.get("category") as JobCategory | undefined;

  try {
    const jobs = await getJobs({ status, category });
    return NextResponse.json({ items: jobs });
  } catch (error) {
    return NextResponse.json({ error: "DB Error" }, { status: 500 });
  }
}
