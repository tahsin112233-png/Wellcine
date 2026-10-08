import { NextResponse } from "next/server";
import { MovieBoxError } from "../provider/client";
import { BffError, errJson } from "./errors";

/** Map any thrown error to the §3.4 JSON error envelope. */
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof BffError) {
    return NextResponse.json(errJson(err), { status: err.status });
  }
  if (err instanceof MovieBoxError) {
    if (err.status === 404) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No results found." } },
        { status: 404 },
      );
    }
    const timeout = err.kind === "network";
    return NextResponse.json(
      {
        error: {
          code: timeout ? "PROVIDER_TIMEOUT" : "PROVIDER_UNREACHABLE",
          message: "The provider is unreachable.",
          retryable: true,
        },
      },
      { status: timeout ? 504 : 502 },
    );
  }
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Unexpected error." } },
    { status: 500 },
  );
}
