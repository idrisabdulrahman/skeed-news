"use client";

import { useRef, useState } from "react";
import { SignInButton } from "@clerk/nextjs";
import posthog from "posthog-js";

interface ArticleActionsProps {
  /** Article row id — sent to POST /api/saved for the toggle. */
  articleId: string;
  articleSlug: string;
  articleTitle: string;
  /** Server-rendered auth state; signed-out clicks open the Clerk modal instead. */
  isSignedIn: boolean;
  /** Server-rendered bookmark state (details page already queries it, §api/saved). */
  initialSaved: boolean;
}

// Save (bookmark) and Share buttons for the article details page. Client
// component: the save toggle calls /api/saved, share uses the Web Share API
// with a clipboard-copy fallback, and PostHog captures both actions.
export function ArticleActions({
  articleId,
  articleSlug,
  articleTitle,
  isSignedIn,
  initialSaved,
}: ArticleActionsProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [copied, setCopied] = useState(false);
  // In-flight guard: disables the button so a double-click can't fire two
  // concurrent toggles (save + unsave racing to the same row).
  const [busy, setBusy] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  const handleSave = async () => {
    if (!isSignedIn || busy) return; // signed-out click: the wrapping SignInButton opens the modal
    setBusy(true);
    try {
      const res = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      if (!res.ok) return;
      const { saved: nowSaved } = (await res.json()) as { saved: boolean };
      setSaved(nowSaved);
      // Only a real save counts — unsaves are not captured (acceptance 7).
      if (nowSaved) {
        posthog.capture("article_saved", {
          article_slug: articleSlug,
          article_title: articleTitle,
        });
      }
    } catch (err) {
      console.error("[ArticleActions] save toggle failed:", err);
    } finally {
      setBusy(false);
    }
  };

  // Copy the URL, then flash "Link copied" for 2s. Falls back to a temp
  // textarea + execCommand when the Clipboard API is unavailable.
  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: articleTitle, url });
        posthog.capture("article_shared", {
          article_slug: articleSlug,
          article_title: articleTitle,
        });
        return;
      } catch (err) {
        // User cancelled the sheet — no capture, no fallback.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Any other failure falls through to the clipboard fallback.
      }
    }
    await copyLink(url);
    posthog.capture("article_shared", {
      article_slug: articleSlug,
      article_title: articleTitle,
    });
  };

  const saveButton = (
    <button
      className="inline-flex items-center gap-1.5 text-caption font-mono hover:text-text-primary transition-colors duration-200 disabled:cursor-wait"
      onClick={handleSave}
      disabled={busy}
      aria-pressed={saved}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        fill={saved ? "currentColor" : "none"}
        className="w-4 h-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
        />
      </svg>
      {saved ? "Saved" : "Save"}
    </button>
  );

  return (
    <div className="flex items-center gap-4 text-text-tertiary">
      {/* Signed-out: wrap Save in the Clerk modal (AnalysisGate pattern) so the
          click prompts sign-in; no API call is made, no row is written. */}
      {isSignedIn ? (
        saveButton
      ) : (
        <SignInButton mode="modal">{saveButton}</SignInButton>
      )}
      <button
        className="inline-flex items-center gap-1.5 text-caption font-mono hover:text-text-primary transition-colors duration-200"
        onClick={handleShare}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
        {copied ? "Link copied" : "Share"}
      </button>
    </div>
  );
}
