import { NextResponse } from "next/server";
import { analyzeJobAuthor } from "@/server/ai.service";
import { getJobForAnalysis, persistJobAnalysis } from "@/server/jobs.service";
import { assertSupportedRecordId } from "@/lib/ids";

export async function POST(req: Request) {
  try {
    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    if (typeof jobId !== "string") throw new TypeError("jobId must be text.");
    assertSupportedRecordId(jobId);
    const job = await getJobForAnalysis(jobId);

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Appel à l'IA
    const analysis = await analyzeJobAuthor(job.title || "", job.company || "");

    // Persister l'analyse dans le job
    const aiAnalysis = {
      ...analysis,
      createdAt: new Date()
    };

    await persistJobAnalysis(jobId, aiAnalysis);

    return NextResponse.json(aiAnalysis);
  } catch {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
