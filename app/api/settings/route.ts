import { NextResponse } from "next/server";
import { getSettings, updateSettingsAndFilterNewRules } from "@/server/settings.service";
import { safeErrorSummary } from "@/lib/postgres";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "DB Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body: unknown = await req.json();
    const { settings, filteredCount } = await updateSettingsAndFilterNewRules(body);
    return NextResponse.json({ settings, filteredCount });
  } catch (error) {
    console.error("[PATCH /api/settings] Error:", safeErrorSummary(error));
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
