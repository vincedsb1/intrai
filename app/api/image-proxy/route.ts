import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Sécurité : on ne proxy que les images LinkedIn
  if (!url.includes("media.licdn.com")) {
    return NextResponse.json({ error: "Only LinkedIn images are allowed" }, { status: 403 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        // Pas de Referer = LinkedIn accepte la requête
        "User-Agent": "Mozilla/5.0 (compatible; ImageProxy/1.0)",
      },
    });

    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable", // Cache 7 jours
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
