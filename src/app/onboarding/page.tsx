import { redirect } from "next/navigation";

/** Sign-up fallback target (`NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`).
 *  Onboarding is a first-run dialog on "/", so just forward there. */
export default function OnboardingRedirect() {
  redirect("/app");
}
