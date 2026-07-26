import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <div className="dark min-h-screen bg-bg-app flex items-center justify-center">
      <SignIn appearance={clerkAppearance} />
    </div>
  );
}
