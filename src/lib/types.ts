import type { DeckId } from "./decks";

export type PlayerView = {
  id: string;
  name: string;
  isFacilitator: boolean;
  hasVoted: boolean;
  /** Only present for the viewer's own vote, or for everyone once revealed. */
  vote: string | null;
};

export type GameState = {
  room: { id: string; name: string; deck: DeckId; revealed: boolean; round: number };
  players: PlayerView[];
  me: PlayerView | null;
  /** Whether the viewer may reveal/reset (facilitator, or no facilitator online). */
  canControl: boolean;
};

export type Action =
  | { type: "join"; name: string }
  | { type: "heartbeat" }
  | { type: "vote"; card: string | null }
  | { type: "reveal" }
  | { type: "reset" }
  | { type: "setFacilitator"; targetId: string; value: boolean };
