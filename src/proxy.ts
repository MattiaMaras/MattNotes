import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Next 16 renamed `middleware` → `proxy` (Node runtime, default export).
 * Clerk's `clerkMiddleware` works unchanged as the default export.
 *
 * Account-based: the workspace (`/app`, `/note`, `/review`) requires sign-in, so
 * notes are always tied to the signed-in user. The landing ("/"), `/sign-in`
 * and `/sign-up` stay public.
 */
const isProtectedRoute = createRouteMatcher([
  "/app(.*)",
  "/note(.*)",
  "/review(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Run on everything except Next internals and static files, plus API routes.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
