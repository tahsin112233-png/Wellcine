import { NextRequest, NextResponse } from "next/server";
import { fetchHome, homeTab } from "@/lib/bff/home";
import { toErrorResponse } from "@/lib/bff/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/home?tab=2&page=1 — home rails. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") ?? homeTab();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  try {
    return NextResponse.json(await fetchHome(tab, page));
  } catch (err) {
    return toErrorResponse(err);
  }
}
