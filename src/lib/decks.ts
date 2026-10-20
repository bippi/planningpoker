export type DeckId = "fibonacci" | "modified";

export const DECKS: Record<DeckId, string[]> = {
  fibonacci: ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"],
  modified: ["0", "½", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "☕"],
};

export function isDeckId(value: unknown): value is DeckId {
  return value === "fibonacci" || value === "modified";
}

function toNumber(card: string): number | null {
  if (card === "½") return 0.5;
  const n = Number(card);
  return Number.isFinite(n) ? n : null;
}

export type VoteSummary = {
  average: number | null;
  agreement: number | null;
  counts: { card: string; count: number }[];
};

export function summarize(votes: string[], deck: DeckId): VoteSummary {
  const order = DECKS[deck];
  const tally = new Map<string, number>();
  for (const v of votes) tally.set(v, (tally.get(v) ?? 0) + 1);
  const counts = [...tally.entries()]
    .map(([card, count]) => ({ card, count }))
    .sort((a, b) => order.indexOf(a.card) - order.indexOf(b.card));

  const numbers = votes.map(toNumber).filter((n): n is number => n !== null);
  const average = numbers.length
    ? Math.round((numbers.reduce((a, b) => a + b, 0) / numbers.length) * 10) / 10
    : null;
  const top = Math.max(0, ...counts.map((c) => c.count));
  const agreement = votes.length ? Math.round((top / votes.length) * 100) : null;

  return { average, agreement, counts };
}
