import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    
    // Compter les jobs avec status=INBOX et category!=FILTERED (pour correspondre à la vue Inbox)
    const count = await db.collection("jobs").countDocuments({
      status: "INBOX",
      category: { $ne: "FILTERED" }
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error counting jobs:", error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}