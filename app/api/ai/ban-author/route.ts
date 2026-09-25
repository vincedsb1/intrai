import { NextResponse } from "next/server";
import { banAuthor } from "@/server/jobs.service";
import { safeErrorSummary } from "@/lib/postgres";

export async function POST(req: Request) {
  try {
    const { company } = await req.json();
    if (!company) {
      return NextResponse.json({ error: "Company is required" }, { status: 400 });
    }

    await banAuthor(company);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ban error:", safeErrorSummary(error));
    return NextResponse.json({ error: "Failed to ban author" }, { status: 500 });
  }
}
