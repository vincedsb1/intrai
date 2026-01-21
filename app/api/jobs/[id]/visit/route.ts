import { NextResponse } from "next/server";
import { toggleJobVisited } from "@/server/jobs.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { visited } = await req.json();
    
    console.log(`[API Visit] Toggling visit for ${id} to ${visited}`);

    if (typeof visited !== "boolean") {
      return NextResponse.json({ error: "Missing visited boolean" }, { status: 400 });
    }

    await toggleJobVisited(id, visited);
    console.log(`[API Visit] Success for ${id}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Visit update failed" }, { status: 500 });
  }
}
