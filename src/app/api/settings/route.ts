import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    trackedRepos: session.trackedRepos || [],
    theme: session.theme || "system",
  });
}

export async function PUT(req: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { trackedRepos, theme } = await req.json();
  if (trackedRepos !== undefined) {
    session.trackedRepos = trackedRepos;
  }
  if (theme !== undefined) {
    session.theme = theme;
  }
  await session.save();

  return NextResponse.json({ trackedRepos: session.trackedRepos, theme: session.theme });
}
