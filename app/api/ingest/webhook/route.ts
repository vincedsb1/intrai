import { NextResponse } from "next/server";
import { ingestJob } from "@/server/jobs.service";

export async function POST(req: Request) {
  const secret = req.headers.get("x-webhook-secret");

  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const job = await ingestJob(body);
    return NextResponse.json({ item: job });
  } catch (error) {
    console.error("Ingestion error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
