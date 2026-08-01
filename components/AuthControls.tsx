import Link from "next/link";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

// Header auth controls. In the current Clerk SDK (v7), `<Show when="signed-in|signed-out">`
// replaces the old `<SignedIn>`/`<SignedOut>` components. `Show` is an async server
// component, so this is a server component that renders Clerk's client-only buttons
// (`SignInButton`, `SignUpButton`, `UserButton`) as children. C1 voice: hairline
// outline for Sign in, ink fill for Sign up, sentence case, 44px targets.
export function AuthControls() {
  return (
    <div className="flex items-center gap-2.5">
      <Show when="signed-out">
        <SignInButton mode="redirect">
          <button className="inline-flex items-center justify-center gap-2 h-11 px-5 border border-border-strong text-text-primary rounded-brand-sm hover:border-text-tertiary hover:text-accent-app transition-colors duration-200 text-body-small font-medium">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="redirect">
          <button className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-text-primary text-bg-app rounded-brand-sm hover:bg-accent-app hover:text-on-accent transition-colors duration-200 text-body-small font-medium">
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Link
          href="/saved"
          className="text-caption font-mono text-text-tertiary hover:text-accent-app transition-colors duration-200"
        >
          Saved
        </Link>
        <UserButton />
      </Show>
    </div>
  );
}
