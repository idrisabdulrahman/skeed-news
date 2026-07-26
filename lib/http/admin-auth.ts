import "server-only";
import { NextResponse } from "next/server";

// Shared admin-secret gate for action routes (AGENTS.md §15). The secret is
// sent as the `x-skeem-admin-secret` header — never a query string — and
// compared against SKEEM_ADMIN_SECRET (server-only). Returns a 401 Response
// when missing/invalid, or null when the request is authorized.

const ADMIN_SECRET_HEADER = "x-skeem-admin-secret";

export function requireAdminSecret(req: Request): NextResponse | null {
  const expected = process.env.SKEEM_ADMIN_SECRET;
  if (!expected) {
    // Fail closed: if the server is misconfigured, do not allow the action.
    console.error("[admin-auth] SKEEM_ADMIN_SECRET is not set — rejecting request.");
    return NextResponse.json(
      { error: "Server not configured for admin actions." },
      { status: 401 },
    );
  }

  const provided = req.headers.get(ADMIN_SECRET_HEADER);
  if (!provided || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

// Constant-time compare to avoid leaking the secret via response timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
