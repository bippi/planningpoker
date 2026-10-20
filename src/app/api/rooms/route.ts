import { customAlphabet } from "nanoid";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isDeckId, isMaxCard } from "@/lib/decks";

const newRoomId = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 10);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 80);
  const deck = body.deck;
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  if (!isDeckId(deck)) return Response.json({ error: "Invalid deck" }, { status: 400 });
  const maxCard = body.maxCard ?? null;
  if (maxCard !== null && !isMaxCard(deck, maxCard)) return Response.json({ error: "Invalid max card" }, { status: 400 });

  const id = newRoomId();
  const { error } = await supabaseAdmin().from("poker_rooms").insert({ id, name, deck, max_card: maxCard });
  if (error) {
    console.error(error);
    return Response.json({ error: "Could not create game" }, { status: 500 });
  }
  return Response.json({ id });
}
