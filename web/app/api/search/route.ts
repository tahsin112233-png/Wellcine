import { NextRequest, NextResponse } from "next/server";
import { fetchSearch } from "@/lib/bff/search";
import { toErrorResponse } from "@/lib/bff/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/search?q=&page=1 — catalog search. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  try {
    return NextResponse.json(await fetchSearch(q, page));
  } catch (err) {
    return toErrorResponse(err);
  }
}
