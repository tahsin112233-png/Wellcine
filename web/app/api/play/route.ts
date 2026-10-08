import { NextRequest, NextResponse } from "next/server";
import { fetchPlay } from "@/lib/bff/play";
import { toErrorResponse } from "@/lib/bff/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/play?id=&se=0&ep=0 — signed sources + subtitle tracks for the player. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  const se = Math.max(0, Number(searchParams.get("se") ?? 0) || 0);
  const ep = Math.max(0, Number(searchParams.get("ep") ?? 0) || 0);
  try {
    return NextResponse.json(await fetchPlay(id, se, ep));
  } catch (err) {
    return toErrorResponse(err);
  }
}
