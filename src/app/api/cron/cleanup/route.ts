import { supabaseAdmin } from "@/lib/supabase-server";

const MAX_IDLE_DAYS = 30;

/** Daily Vercel Cron: delete games nobody has touched for 30 days. */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const cutoff = new Date(Date.now() - MAX_IDLE_DAYS * 86_400_000).toISOString();
  const { count, error } = await supabaseAdmin()
    .from("poker_rooms")
    .delete({ count: "exact" })
    .lt("last_active_at", cutoff);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ deleted: count });
}
