/**
 * Keep-alive endpoint for an external uptime monitor (e.g. UptimeRobot).
 * Supabase's free tier pauses a project after 7 days with no API activity;
 * a periodic GET here touches the database via PostgREST, which counts as
 * activity and keeps the project from pausing. No auth required — it only
 * checks reachability, not data (RLS still applies; this runs as anon).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return Response.json(
      { ok: false, error: "Supabase non configurato." },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(`${url}/rest/v1/sync_items?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    // RLS denies anon rows (expect 200 with `[]`, or a permission error) —
    // either way the request reached Postgres, which is all this needs to do.
    if (res.status >= 500) {
      return Response.json({ ok: false, status: res.status }, { status: 502 });
    }
    return Response.json({ ok: true, checkedAt: new Date().toISOString() });
  } catch {
    return Response.json({ ok: false, error: "Supabase non raggiungibile." }, { status: 502 });
  }
}
