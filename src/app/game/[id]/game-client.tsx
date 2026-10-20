"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabaseBrowser, roomChannel } from "@/lib/supabase-browser";
import { getPlayerId, getSavedName, saveName } from "@/lib/player";
import { LangToggle, useLang } from "@/lib/i18n";
import { cardsFor } from "@/lib/decks";
import type { Action, GameState } from "@/lib/types";
import { PokerTable } from "./poker-table";
import { Results } from "./results";
import { CardFace } from "@/components/playing-card";

const HEARTBEAT_MS = 25_000;

export function GameClient() {
  const { id: roomId } = useParams<{ id: string }>();
  const { t } = useLang();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notFound" | "error">("loading");
  const [onlineIds, setOnlineIds] = useState<Set<string> | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const latestFetch = useRef(0);

  // localStorage is only readable after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setPlayerId(getPlayerId()), []);

  const refresh = useCallback(async () => {
    if (!playerId) return;
    const ticket = ++latestFetch.current;
    const res = await fetch(`/api/rooms/${roomId}?playerId=${playerId}`, { cache: "no-store" }).catch(() => null);
    if (ticket !== latestFetch.current) return; // a newer fetch superseded this one
    if (!res) return setStatus((s) => (s === "ready" ? s : "error"));
    if (res.status === 404) return setStatus("notFound");
    if (!res.ok) return setStatus((s) => (s === "ready" ? s : "error"));
    setState(await res.json());
    setStatus("ready");
  }, [roomId, playerId]);

  const act = useCallback(
    async (action: Action) => {
      if (!playerId) return;
      setActionError(null);
      const ticket = ++latestFetch.current;
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId, action }),
      }).catch(() => null);
      const body = await res?.json().catch(() => null);
      if (!res?.ok) {
        setActionError(body?.error ?? t.error);
        return;
      }
      if (ticket === latestFetch.current) setState(body);
    },
    [roomId, playerId, t.error],
  );

  // Initial load.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching external state
    refresh();
  }, [refresh]);

  const joined = Boolean(state?.me);

  // Realtime: presence (who's at the table) + change notifications from the server.
  useEffect(() => {
    if (!playerId || !joined) return;
    const supabase = supabaseBrowser();
    const channel = supabase.channel(roomChannel(roomId), { config: { presence: { key: playerId } } });
    channel
      .on("broadcast", { event: "changed" }, () => refresh())
      .on("presence", { event: "sync" }, () => setOnlineIds(new Set(Object.keys(channel.presenceState()))))
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          channel.track({ at: Date.now() });
          refresh(); // catch anything that happened while connecting
        }
      });

    const heartbeat = setInterval(() => act({ type: "heartbeat" }), HEARTBEAT_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [roomId, playerId, joined, refresh, act]);

  if (status === "notFound") {
    return (
      <Centered>
        <p className="text-lg">{t.notFound}</p>
        <Link href="/" className="mt-5 inline-block rounded-xl bg-accent px-5 py-3 font-bold text-accent-fg hover:brightness-110">
          {t.createNew}
        </Link>
      </Centered>
    );
  }
  if (status === "error") return <Centered>{t.error}</Centered>;
  if (!state || !playerId) return <Centered>{t.loading}</Centered>;

  if (!state.me || editingName) {
    return (
      <NameForm
        initial={state.me?.name ?? getSavedName()}
        onSubmit={async (name) => {
          saveName(name);
          await act({ type: "join", name });
          setEditingName(false);
        }}
        error={actionError}
      />
    );
  }

  // Show players who are connected right now (plus yourself, before presence syncs).
  const visible = state.players.filter((p) => !onlineIds || onlineIds.has(p.id) || p.id === playerId);
  const voted = state.players.filter((p) => p.hasVoted).length;
  const cards = cardsFor(state.room.deck, state.room.maxCard);

  return (
    <main className="flex flex-1 flex-col">
      <Header roomName={state.room.name} onEditName={() => setEditingName(true)} myName={state.me.name} />

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-2">
        <PokerTable
          state={{ ...state, players: visible }}
          playerId={playerId}
          votedCount={voted}
          onReveal={() => act({ type: "reveal" })}
          onReset={() => act({ type: "reset" })}
          onSetFacilitator={(targetId, value) => act({ type: "setFacilitator", targetId, value })}
        />
        {actionError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{actionError}</p>}
      </div>

      <footer className="px-4 pt-2 pb-8 sm:pb-14">
        {state.room.revealed ? (
          <Results players={state.players} deck={state.room.deck} />
        ) : (
          <>
            <p className="mb-3 text-center text-muted">{t.chooseCard}</p>
            <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-2 sm:flex-nowrap sm:gap-0">
              {cards.map((card, i) => {
                const selected = state.me?.vote === card;
                const offset = i - (cards.length - 1) / 2;
                return (
                  <button
                    key={card}
                    type="button"
                    aria-pressed={selected}
                    aria-label={card === "☕" ? "Coffee break" : card}
                    onClick={() => act({ type: "vote", card: selected ? null : card })}
                    className="hand-card group rounded-xl"
                    style={
                      {
                        "--tilt": `${offset * 2.2}deg`,
                        "--arc": `${offset * offset * 0.9}px`,
                        "--lift": selected ? "-22px" : "0px",
                      } as React.CSSProperties
                    }
                  >
                    <div className="transition-transform group-hover:-translate-y-2">
                      <CardFace value={card} size="hand" highlight={selected} />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </footer>
    </main>
  );
}

function Header({ roomName, myName, onEditName }: { roomName: string; myName: string; onEditName: () => void }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-10">
      <div className="flex min-w-0 items-baseline gap-3">
        <Link href="/" className="shrink-0 font-bold tracking-tight text-muted hover:text-fg">
          Planning Poker
        </Link>
        <h1 className="truncate text-lg font-bold">{roomName}</h1>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onEditName}
          title={t.changeName}
          className="max-w-36 truncate rounded-full px-3 py-1.5 text-sm font-medium hover:bg-surface-2"
        >
          {myName}
        </button>
        <LangToggle />
        <button
          type="button"
          onClick={copyLink}
          className="ml-1 rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-accent-fg hover:brightness-110"
        >
          {copied ? t.copied : t.invite}
        </button>
      </div>
    </header>
  );
}

function NameForm({
  initial,
  onSubmit,
  error,
}: {
  initial: string;
  onSubmit: (name: string) => Promise<void>;
  error: string | null;
}) {
  const { t } = useLang();
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);

  return (
    <Centered>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setBusy(true);
          await onSubmit(name.trim());
          setBusy(false);
        }}
        className="w-full max-w-sm rounded-3xl bg-surface p-6 text-left shadow-[0_24px_60px_-30px_rgba(26,30,58,.35)] sm:p-8"
      >
        <h1 className="text-3xl font-extrabold tracking-tight">{t.chooseName}</h1>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder={t.yourName}
          aria-label={t.yourName}
          className="mt-5 w-full rounded-xl border-2 border-line bg-bg px-4 py-3 outline-none focus:border-accent"
        />
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="mt-5 w-full rounded-xl bg-accent px-4 py-3.5 text-lg font-bold text-accent-fg hover:brightness-110 disabled:opacity-60"
        >
          {t.join}
        </button>
      </form>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col">
      <div className="flex justify-end px-4 py-3 sm:px-8">
        <LangToggle />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16 text-center">{children}</div>
    </main>
  );
}
