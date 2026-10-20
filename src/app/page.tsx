"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LangToggle, useLang } from "@/lib/i18n";
import { cardsFor, maxOptions, type DeckId } from "@/lib/decks";
import { CardFace } from "@/components/playing-card";

const HERO_CARDS = ["1", "2", "3", "5", "8"];

export default function Home() {
  const { t } = useLang();
  const router = useRouter();
  const [name, setName] = useState("");
  const [deck, setDeck] = useState<DeckId>("fibonacci");
  const [maxCard, setMaxCard] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() || t.gameNamePlaceholder, deck, maxCard }),
      });
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      router.push(`/game/${id}`);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-10">
        <span className="text-lg font-bold tracking-tight">Planning Poker</span>
        <LangToggle />
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 pb-16 sm:px-10 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <div className="mb-10 flex h-36 items-end pl-8 sm:h-52" aria-hidden>
            {HERO_CARDS.map((value, i) => {
              const offset = i - (HERO_CARDS.length - 1) / 2;
              return (
                <div
                  key={value}
                  className="-ml-6 first:ml-0"
                  style={{ transform: `translateY(${Math.abs(offset) * 10}px) rotate(${offset * 9}deg)`, transformOrigin: "50% 130%" }}
                >
                  <CardFace value={value} size="hero" highlight={i === HERO_CARDS.length - 1} />
                </div>
              );
            })}
          </div>
          <h1 className="text-5xl leading-[1.02] font-extrabold tracking-tight sm:text-7xl">{t.headline}</h1>
          <p className="mt-5 max-w-md text-lg text-muted">{t.lede}</p>
        </section>

        <form onSubmit={create} className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-[0_24px_60px_-30px_rgba(26,30,58,.35)] sm:p-8 lg:justify-self-end">
          <label className="block font-semibold" htmlFor="game-name">
            {t.gameName}
          </label>
          <input
            id="game-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder={t.gameNamePlaceholder}
            className="mt-2 w-full rounded-xl border-2 border-line bg-bg px-4 py-3 outline-none focus:border-accent"
          />

          <fieldset className="mt-6">
            <legend className="font-semibold">{t.deck}</legend>
            <div className="mt-2 grid gap-2">
              {(["fibonacci", "modified"] as const).map((id) => (
                <label
                  key={id}
                  className={`flex cursor-pointer flex-col rounded-xl border-2 px-4 py-3 has-focus-visible:outline-3 has-focus-visible:outline-marigold ${
                    deck === id ? "border-accent bg-accent/5" : "border-line hover:border-muted"
                  }`}
                >
                  <input type="radio" name="deck" value={id} checked={deck === id} onChange={() => {
                      setDeck(id);
                      setMaxCard(null);
                    }} className="sr-only" />
                  <span className="font-semibold">{id === "fibonacci" ? t.deckFibonacciName : t.deckModifiedName}</span>
                  <span className="text-sm text-muted">
                    {deck === id ? cardsFor(id, maxCard).join(", ") : id === "fibonacci" ? t.deckFibonacciValues : t.deckModifiedValues}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-6 block font-semibold" htmlFor="max-card">
            {t.maxCard}
          </label>
          <select
            id="max-card"
            value={maxCard ?? ""}
            onChange={(e) => setMaxCard(e.target.value || null)}
            className="mt-2 w-full rounded-xl border-2 border-line bg-bg px-4 py-3 outline-none focus:border-accent"
          >
            {maxOptions(deck)
              .slice()
              .reverse()
              .map((card, i) => (
                <option key={card} value={i === 0 ? "" : card}>
                  {card}
                </option>
              ))}
          </select>

          {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{t.error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-7 w-full rounded-xl bg-accent px-4 py-3.5 text-lg font-bold text-accent-fg transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? t.creating : t.startGame}
          </button>
        </form>
      </div>
    </main>
  );
}
