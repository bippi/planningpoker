"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import type { GameState, PlayerView } from "@/lib/types";
import { EmptySlot, FlipCard } from "@/components/playing-card";

type Props = {
  state: GameState;
  playerId: string;
  votedCount: number;
  onReveal: () => void;
  onReset: () => void;
  onSetFacilitator: (targetId: string, value: boolean) => void;
};

export function PokerTable({ state, playerId, votedCount, onReveal, onReset, onSetFacilitator }: Props) {
  const { t } = useLang();
  const { room, players, canControl, me } = state;
  const half = Math.ceil(players.length / 2);
  const top = players.slice(0, half);
  const bottom = players.slice(half);

  const seat = (p: PlayerView, i: number) => (
    <Seat
      key={p.id}
      player={p}
      revealed={room.revealed}
      delay={i * 70}
      isMe={p.id === playerId}
      canManage={Boolean(me?.isFacilitator)}
      onSetFacilitator={onSetFacilitator}
    />
  );

  let center: React.ReactNode;
  if (!canControl) {
    center = <p className="text-lg font-medium">{room.revealed || votedCount ? t.waitingFacilitator : t.pickCards}</p>;
  } else if (room.revealed) {
    center = <CenterButton onClick={onReset}>{t.newVote}</CenterButton>;
  } else if (votedCount > 0) {
    center = <CenterButton onClick={onReveal}>{t.reveal}</CenterButton>;
  } else {
    center = <p className="text-lg font-medium">{t.pickCards}</p>;
  }

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-5">
      <div className="flex min-h-32 flex-wrap items-end justify-center gap-x-5 gap-y-4 sm:gap-x-8">{top.map(seat)}</div>
      <div className="flex h-28 w-full max-w-xl items-center justify-center rounded-full bg-table px-6 text-center text-table-fg shadow-[inset_0_-10px_30px_rgba(0,0,0,.18),0_20px_40px_-24px_rgba(43,69,224,.7)] sm:h-40">
        {center}
      </div>
      <div className="flex min-h-32 flex-wrap items-start justify-center gap-x-5 gap-y-4 sm:gap-x-8">
        {bottom.map((p, i) => seat(p, half + i))}
      </div>
    </div>
  );
}

function CenterButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-white px-7 py-3.5 text-lg font-bold text-[#1a1e3a] shadow-lg transition hover:scale-[1.03] active:scale-100"
    >
      {children}
    </button>
  );
}

function Seat({
  player,
  revealed,
  delay,
  isMe,
  canManage,
  onSetFacilitator,
}: {
  player: PlayerView;
  revealed: boolean;
  delay: number;
  isMe: boolean;
  canManage: boolean;
  onSetFacilitator: (targetId: string, value: boolean) => void;
}) {
  const { t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const showCard = player.hasVoted || (revealed && player.vote !== null);

  return (
    <div className="relative flex w-28 flex-col items-center gap-2">
      {showCard ? (
        <FlipCard value={player.vote} faceUp={revealed && player.vote !== null} delay={delay} />
      ) : (
        <EmptySlot />
      )}
      <button
        type="button"
        disabled={!canManage}
        aria-expanded={canManage ? menuOpen : undefined}
        onClick={() => setMenuOpen((o) => !o)}
        className={`flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-sm ${
          isMe ? "bg-fg font-semibold text-bg" : ""
        } ${canManage ? "cursor-pointer hover:ring-2 hover:ring-line" : "cursor-default"}`}
      >
        {player.isFacilitator && (
          <span className="text-marigold" title={t.facilitator} aria-label={t.facilitator}>
            ♛
          </span>
        )}
        <span className="truncate">{player.name}</span>
      </button>
      {menuOpen && canManage && (
        <div className="absolute top-full z-10 mt-1 w-max rounded-xl bg-surface p-1 shadow-xl ring-1 ring-line">
          <button
            type="button"
            onClick={() => {
              onSetFacilitator(player.id, !player.isFacilitator);
              setMenuOpen(false);
            }}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
          >
            {player.isFacilitator ? t.removeFacilitator : t.makeFacilitator}
          </button>
        </div>
      )}
    </div>
  );
}
