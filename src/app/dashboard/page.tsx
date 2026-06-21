import { redirect } from "next/navigation";

/** Sign-in fallback target (`NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`).
 *  The real dashboard lives at "/", so just forward there. */
export default function DashboardRedirect() {
  redirect("/app");
}
