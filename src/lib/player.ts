"use client";

const ID_KEY = "pp:playerId";
const NAME_KEY = "pp:name";

/** Anonymous identity kept in this browser so refreshes keep your seat and vote. */
export function getPlayerId(): string {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    // Storage blocked (private mode etc.) — identity lasts for this tab only.
    return ((globalThis as { __ppId?: string }).__ppId ??= crypto.randomUUID());
  }
}

export function getSavedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {}
}
