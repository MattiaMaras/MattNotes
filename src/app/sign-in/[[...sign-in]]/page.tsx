import { SignIn } from "@clerk/nextjs";

/** Clerk's hosted sign-in form, centred. Catch-all route per Clerk's routing. */
export default function SignInPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <SignIn />
    </div>
  );
}
