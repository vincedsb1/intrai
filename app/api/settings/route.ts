import { NextResponse } from "next/server";
import { getSettings, updateSettings, addSmartRule } from "@/server/settings.service";
import { evaluateAndFilterOldJobs } from "@/server/jobs.service";
import { SmartRule, RuleCondition } from "@/lib/types";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: "DB Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    // Detect if a new createdAt/olderThan rule is being added
    const newRules = body.rules || [];
    const oldSettings = await getSettings();
    const addedRules = newRules.filter(
      (r: SmartRule) => !oldSettings.rules.some((or) => or.id === r.id)
    );

    let filteredCount = 0;

    // If new rule(s) with createdAt/olderThan, evaluate and filter jobs
    for (const rule of addedRules) {
      if (
        rule.action === "FILTER" &&
        rule.conditions?.some((c: RuleCondition) => c.field === "createdAt" && c.operator === "olderThan")
      ) {
        filteredCount += await evaluateAndFilterOldJobs(rule);
        // Add rule using atomic $push
        await addSmartRule(rule);
      } else {
        // For non-createdAt rules, use standard updateSettings
        await updateSettings({ rules: newRules });
      }
    }

    // If no rules added, just update normally
    if (addedRules.length === 0) {
      const settings = await updateSettings(body);
      return NextResponse.json({ settings, filteredCount: 0 });
    }

    const settings = await getSettings();
    return NextResponse.json({ settings, filteredCount });
  } catch (error) {
    console.error("[PATCH /api/settings] Error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
