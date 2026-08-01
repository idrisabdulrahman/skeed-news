import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getSavedArticleIds,
  removeSaved,
  toggleSaved,
} from "@/lib/supabase/queries/saved";

// /api/saved — user bookmarks (Save button). Clerk-auth gated, NOT the admin
// secret (§15 scopes that to pipeline actions): end-user actions require only
// a signed-in userId, and every write is scoped by the server-side userId —
// a userId from the request body is never trusted.

// articleId must be a Postgres uuid (gen_random_uuid() form). Anything else is
// rejected up front — a malformed id would otherwise surface as a PostgREST
// "invalid input syntax for type uuid" 500 instead of a clean 400.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export const dynamic = "force-dynamic";

// GET /api/saved → { articleIds } for the signed-in user (hydrates the filled
// bookmark state on the details page).
export async function GET(): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const articleIds = await getSavedArticleIds(userId);
  return NextResponse.json({ articleIds });
}

// POST /api/saved { articleId } → toggles the bookmark; returns { saved }.
export async function POST(req: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let articleId: unknown;
  try {
    const body: unknown = await req.json();
    articleId = (body as { articleId?: unknown } | null)?.articleId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isUuid(articleId)) {
    return NextResponse.json(
      { error: "articleId is required." },
      { status: 400 },
    );
  }

  const result = await toggleSaved(userId, articleId);
  if (result.error) {
    console.error("[api/saved] toggle failed:", result.error);
    return NextResponse.json(
      { error: "Failed to update bookmark." },
      { status: 500 },
    );
  }
  return NextResponse.json({ saved: result.saved });
}

// DELETE /api/saved?articleId=… → removes a bookmark (idempotent).
export async function DELETE(req: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const articleId = new URL(req.url).searchParams.get("articleId");
  if (!isUuid(articleId)) {
    return NextResponse.json(
      { error: "articleId is required." },
      { status: 400 },
    );
  }

  const error = await removeSaved(userId, articleId);
  if (error) {
    console.error("[api/saved] remove failed:", error);
    return NextResponse.json(
      { error: "Failed to remove bookmark." },
      { status: 500 },
    );
  }
  return NextResponse.json({ saved: false });
}
