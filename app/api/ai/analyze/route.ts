import { NextResponse } from "next/server";
import { analyzeJobAuthor } from "@/server/ai.service";
import { getDb } from "@/lib/mongo";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const db = await getDb();
    const job = await db.collection("jobs").findOne({ _id: new ObjectId(jobId) });

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Appel à l'IA
    const analysis = await analyzeJobAuthor(job.title || "", job.company || "");

    // Persister l'analyse dans le job
    const aiAnalysis = {
      ...analysis,
      createdAt: new Date()
    };

    await db.collection("jobs").updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { aiAnalysis } }
    );

    return NextResponse.json(aiAnalysis);
  } catch (error) {
    console.error("Route analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
