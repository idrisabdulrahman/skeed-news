import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

// Bolt mark shared with the masthead.
const BoltIcon = ({ className = "" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path
      fillRule="evenodd"
      d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z"
      clipRule="evenodd"
    />
  </svg>
);

// Sign-in: standalone editorial page, locked to the light paper theme like
// the landing page. Wordmark on top, Clerk card below, back link at the foot.
export default function SignInPage() {
  return (
    <div className="light min-h-dvh bg-bg-app text-text-primary flex flex-col items-center justify-center px-4 py-12 font-sans">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 text-center">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-brand-sm bg-accent-app text-on-accent">
              <BoltIcon className="w-5 h-5" />
            </span>
            <span className="font-bold text-lg tracking-tight">SKEEM NEWS</span>
          </Link>
          {/* <p className="mt-3 text-caption text-text-tertiary">
            Facts first. Framing visible.
          </p> */}
        </div>

        <SignIn appearance={clerkAppearance} />

        {/* <p className="mt-6 text-center">
          <Link
            href="/"
            className="text-caption text-text-tertiary hover:text-accent-app transition-colors duration-200"
          >
            ← Back to Top News
          </Link>
        </p> */}
      </div>
    </div>
  );
}
