import { NextResponse } from "next/server";
import { getJobCounts } from "@/server/jobs.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const counts = await getJobCounts();

    return NextResponse.json({ 
      count: counts.inbox, // Retain 'count' for backward compatibility
      ...counts
    });
  } catch (error) {
    console.error("Error counting jobs:", error);
    return NextResponse.json({ count: 0, inbox: 0, processedToday: 0, filteredToday: 0 }, { status: 500 });
  }
}