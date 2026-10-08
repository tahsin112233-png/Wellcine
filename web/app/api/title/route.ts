import { NextRequest, NextResponse } from "next/server";
import { fetchTitle } from "@/lib/bff/title";
import { toErrorResponse } from "@/lib/bff/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/title?id=&se=&ep= — title details (+ seasons for series). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  try {
    return NextResponse.json(await fetchTitle(id));
  } catch (err) {
    return toErrorResponse(err);
  }
}
