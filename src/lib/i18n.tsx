"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "is";

const en = {
  headline: "Estimate together.",
  lede: "Create a game, share the link and vote in real time. No sign-up, no login.",
  startGame: "Start new game",
  gameName: "Game name",
  gameNamePlaceholder: "Sprint 42 planning",
  deck: "Cards",
  deckFibonacciName: "Fibonacci",
  deckFibonacciValues: "0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕",
  deckModifiedName: "Modified Fibonacci",
  deckModifiedValues: "0, ½, 1, 2, 3, 5, 8, 13, 20, 40, 100, ?, ☕",
  maxCard: "Highest card",
  creating: "Creating…",
  chooseName: "Choose your display name",
  yourName: "Your display name",
  join: "Continue to game",
  invite: "Invite players",
  copied: "Link copied!",
  pickCards: "Pick your cards!",
  reveal: "Reveal cards",
  newVote: "Start new vote",
  waitingFacilitator: "Waiting for the facilitator…",
  chooseCard: "Choose your card 👇",
  average: "Average",
  agreement: "Agreement",
  votes: (n: number) => (n === 1 ? "1 vote" : `${n} votes`),
  noVotes: "No votes",
  facilitator: "Facilitator",
  makeFacilitator: "Make facilitator",
  removeFacilitator: "Remove as facilitator",
  you: "you",
  notFound: "This game doesn't exist or has expired.",
  createNew: "Create a new game",
  loading: "Loading…",
  error: "Something went wrong. Please try again.",
  changeName: "Change name",
  language: "Íslenska",
};

const is: typeof en = {
  headline: "Metum saman.",
  lede: "Búðu til leik, deildu hlekknum og kjósið í rauntíma. Engin nýskráning, engin innskráning.",
  startGame: "Hefja nýjan leik",
  gameName: "Heiti leiks",
  gameNamePlaceholder: "Áætlun fyrir sprett 42",
  deck: "Spil",
  deckFibonacciName: "Fibonacci",
  deckFibonacciValues: "0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕",
  deckModifiedName: "Breytt Fibonacci",
  deckModifiedValues: "0, ½, 1, 2, 3, 5, 8, 13, 20, 40, 100, ?, ☕",
  maxCard: "Hæsta spil",
  creating: "Bý til leik…",
  chooseName: "Veldu nafn",
  yourName: "Nafnið þitt",
  join: "Áfram í leikinn",
  invite: "Bjóða leikmönnum",
  copied: "Hlekkur afritaður!",
  pickCards: "Veljið spil!",
  reveal: "Sýna spil",
  newVote: "Hefja nýja kosningu",
  waitingFacilitator: "Beðið eftir stjórnanda…",
  chooseCard: "Veldu spilið þitt 👇",
  average: "Meðaltal",
  agreement: "Samstaða",
  votes: (n: number) => `${n} atkvæði`,
  noVotes: "Engin atkvæði",
  facilitator: "Stjórnandi",
  makeFacilitator: "Gera að stjórnanda",
  removeFacilitator: "Fjarlægja sem stjórnanda",
  you: "þú",
  notFound: "Þessi leikur er ekki til eða er útrunninn.",
  createNew: "Búa til nýjan leik",
  loading: "Hleð…",
  error: "Eitthvað fór úrskeiðis. Reyndu aftur.",
  changeName: "Breyta nafni",
  language: "English",
};

const dictionaries = { en, is };
type Dict = typeof en;

const LangContext = createContext<{ lang: Lang; t: Dict; toggle: () => void }>({
  lang: "en",
  t: en,
  toggle: () => {},
});

const STORAGE_KEY = "pp:lang";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {}
    const initial: Lang = stored === "is" || stored === "en" ? stored : navigator.language.startsWith("is") ? "is" : "en";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
    setLang(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const toggle = useCallback(() => {
    setLang((current) => {
      const next = current === "en" ? "is" : "en";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  return <LangContext.Provider value={{ lang, t: dictionaries[lang], toggle }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

export function LangToggle() {
  const { t, toggle } = useLang();
  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
    >
      {t.language}
    </button>
  );
}
