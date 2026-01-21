import { NextResponse } from "next/server";
import { updateJobStatus } from "@/server/jobs.service";
import { JobStatus } from "@/lib/types";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { status } = await req.json();
    if (!status) return NextResponse.json({ error: "Missing status" }, { status: 400 });

    await updateJobStatus(id, status as JobStatus);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
