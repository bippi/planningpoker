import "server-only";
import { supabaseAdmin } from "./supabase-server";
import { roomChannel } from "./supabase-browser";
import { cardsFor, type DeckId } from "./decks";
import type { Action, GameState, PlayerView } from "./types";

/** A player counts as online if they've sent a heartbeat within this window. */
const ONLINE_MS = 60_000;

type RoomRow = { id: string; name: string; deck: DeckId; max_card: string | null; revealed: boolean; round: number };
type PlayerRow = {
  player_id: string;
  name: string;
  is_facilitator: boolean;
  vote: string | null;
  last_seen_at: string;
  joined_at: string;
};

export class GameError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function assertPlayerId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !UUID.test(id)) throw new GameError("Invalid player id");
}

async function load(roomId: string) {
  const db = supabaseAdmin();
  const [{ data: room, error: roomErr }, { data: players, error: playersErr }] = await Promise.all([
    db.from("poker_rooms").select("id, name, deck, max_card, revealed, round").eq("id", roomId).maybeSingle<RoomRow>(),
    db
      .from("poker_players")
      .select("player_id, name, is_facilitator, vote, last_seen_at, joined_at")
      .eq("room_id", roomId)
      .order("joined_at")
      .returns<PlayerRow[]>(),
  ]);
  if (roomErr || playersErr) throw new GameError("Database error", 500);
  if (!room) throw new GameError("Room not found", 404);
  return { room, players: players ?? [] };
}

function canControl(players: PlayerRow[], viewerId: string): boolean {
  const viewer = players.find((p) => p.player_id === viewerId);
  if (!viewer) return false;
  if (viewer.is_facilitator) return true;
  const cutoff = Date.now() - ONLINE_MS;
  return !players.some((p) => p.is_facilitator && new Date(p.last_seen_at).getTime() > cutoff);
}

export async function getState(roomId: string, viewerId: string): Promise<GameState> {
  const { room, players } = await load(roomId);
  const views: PlayerView[] = players.map((p) => ({
    id: p.player_id,
    name: p.name,
    isFacilitator: p.is_facilitator,
    hasVoted: p.vote !== null,
    vote: room.revealed || p.player_id === viewerId ? p.vote : null,
  }));
  const { max_card, ...rest } = room;
  return {
    room: { ...rest, maxCard: max_card },
    players: views,
    me: views.find((p) => p.id === viewerId) ?? null,
    canControl: canControl(players, viewerId),
  };
}

/** Tell every connected client that the room changed so they refetch their own (masked) view. */
async function broadcast(roomId: string) {
  const channel = supabaseAdmin().channel(roomChannel(roomId));
  try {
    await channel.httpSend("changed", {});
  } catch (err) {
    console.error("broadcast failed", err);
  } finally {
    await supabaseAdmin().removeChannel(channel);
  }
}

export async function applyAction(roomId: string, playerId: string, action: Action): Promise<GameState> {
  const db = supabaseAdmin();
  const { room, players } = await load(roomId);
  const me = players.find((p) => p.player_id === playerId);
  const now = new Date().toISOString();
  let changed = true;

  if (action.type !== "join" && !me) throw new GameError("Join the game first", 403);

  switch (action.type) {
    case "join": {
      const name = String(action.name ?? "").trim().slice(0, 40);
      if (!name) throw new GameError("Name is required");
      if (me) {
        await db
          .from("poker_players")
          .update({ name, last_seen_at: now })
          .eq("room_id", roomId)
          .eq("player_id", playerId);
      } else {
        // The first person into a room (its creator) becomes facilitator.
        await db.from("poker_players").insert({
          room_id: roomId,
          player_id: playerId,
          name,
          is_facilitator: players.length === 0,
          last_seen_at: now,
        });
      }
      break;
    }
    case "heartbeat": {
      changed = false;
      await db
        .from("poker_players")
        .update({ last_seen_at: now })
        .eq("room_id", roomId)
        .eq("player_id", playerId);
      break;
    }
    case "vote": {
      if (room.revealed) throw new GameError("Cards are already revealed");
      const card = action.card;
      if (card !== null && !cardsFor(room.deck, room.max_card).includes(card)) throw new GameError("Invalid card");
      await db
        .from("poker_players")
        .update({ vote: card, last_seen_at: now })
        .eq("room_id", roomId)
        .eq("player_id", playerId);
      break;
    }
    case "reveal":
    case "reset": {
      if (!canControl(players, playerId)) throw new GameError("Only the facilitator can do that", 403);
      if (action.type === "reveal") {
        await db.from("poker_rooms").update({ revealed: true, last_active_at: now }).eq("id", roomId);
      } else {
        await db.from("poker_players").update({ vote: null }).eq("room_id", roomId);
        await db
          .from("poker_rooms")
          .update({ revealed: false, round: room.round + 1, last_active_at: now })
          .eq("id", roomId);
      }
      break;
    }
    case "setFacilitator": {
      if (!me?.is_facilitator) throw new GameError("Only a facilitator can do that", 403);
      if (!action.value && action.targetId === playerId && players.filter((p) => p.is_facilitator).length === 1) {
        throw new GameError("The game needs at least one facilitator");
      }
      await db
        .from("poker_players")
        .update({ is_facilitator: Boolean(action.value) })
        .eq("room_id", roomId)
        .eq("player_id", action.targetId);
      break;
    }
    default:
      throw new GameError("Unknown action");
  }

  if (changed) {
    await Promise.all([
      action.type === "reveal" || action.type === "reset"
        ? null
        : db.from("poker_rooms").update({ last_active_at: now }).eq("id", roomId),
      broadcast(roomId),
    ]);
  }
  return getState(roomId, playerId);
}
