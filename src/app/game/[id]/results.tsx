"use client";

import { useLang } from "@/lib/i18n";
import { summarize, type DeckId } from "@/lib/decks";
import type { PlayerView } from "@/lib/types";
import { CardFace } from "@/components/playing-card";

export function Results({ players, deck }: { players: PlayerView[]; deck: DeckId }) {
  const { t } = useLang();
  const votes = players.map((p) => p.vote).filter((v): v is string => v !== null);
  if (!votes.length) return <p className="py-6 text-center text-muted">{t.noVotes}</p>;

  const { average, agreement, counts } = summarize(votes, deck);
  const max = Math.max(...counts.map((c) => c.count));

  return (
    <div className="mx-auto flex max-w-4xl flex-wrap items-end justify-center gap-x-14 gap-y-6">
      <div className="flex items-end gap-5">
        {counts.map(({ card, count }) => (
          <div key={card} className="flex flex-col items-center gap-2">
            <span className="text-sm font-semibold text-muted">{t.votes(count)}</span>
            <div className="flex h-20 w-2 items-end overflow-hidden rounded-full bg-surface-2">
              <div className="w-full rounded-full bg-accent" style={{ height: `${(count / max) * 100}%` }} />
            </div>
            <CardFace value={card} size="sm" highlight={count === max} />
          </div>
        ))}
      </div>
      <dl className="flex gap-10">
        <div>
          <dt className="text-muted">{t.average}</dt>
          <dd className="text-6xl leading-none font-extrabold tracking-tight">{average ?? "–"}</dd>
        </div>
        <div>
          <dt className="text-muted">{t.agreement}</dt>
          <dd className="text-6xl leading-none font-extrabold tracking-tight">
            {agreement === null ? "–" : agreement}
            <span className="text-3xl text-muted">{agreement === null ? "" : "%"}</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
