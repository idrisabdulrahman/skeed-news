import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <div className="dark min-h-screen bg-bg-app flex items-center justify-center">
      <SignUp appearance={clerkAppearance} />
    </div>
  );
}
