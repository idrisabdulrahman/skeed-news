import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

// Header auth controls. In the current Clerk SDK (v7), `<Show when="signed-in|signed-out">`
// replaces the old `<SignedIn>`/`<SignedOut>` components. `Show` is an async server
// component, so this is a server component that renders Clerk's client-only buttons
// (`SignInButton`, `SignUpButton`, `UserButton`) as children. Styling matches the SKEEM
// NEWS dark design system (accent fill for primary, outline for secondary).
export function AuthControls() {
  return (
    <div className="flex items-center gap-3">
      <Show when="signed-out">
        <SignInButton mode="redirect">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-accent-app text-accent-app rounded-brand-sm hover:bg-accent-app hover:text-on-accent transition-all duration-200 text-body-small font-medium font-mono">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="redirect">
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-accent-app text-on-accent rounded-brand-sm hover:opacity-90 transition-all duration-200 text-body-small font-medium font-mono">
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}
