import { SignUp } from "@clerk/nextjs";

/** Clerk's hosted sign-up form, centred. Catch-all route per Clerk's routing. */
export default function SignUpPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <SignUp />
    </div>
  );
}
