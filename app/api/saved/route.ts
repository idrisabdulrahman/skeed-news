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

  if (typeof articleId !== "string" || articleId.length === 0) {
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
  if (!articleId) {
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
