import { NextResponse } from "next/server";
import { restoreJob } from "@/server/jobs.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await restoreJob(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Restore failed" }, { status: 500 });
  }
}
