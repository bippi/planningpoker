import { applyAction, assertPlayerId, GameError, getState } from "@/lib/game";
import type { Action } from "@/lib/types";

function handleError(err: unknown) {
  if (err instanceof GameError) return Response.json({ error: err.message }, { status: err.status });
  console.error(err);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

export async function GET(request: Request, { params }: RouteContext<"/api/rooms/[id]">) {
  try {
    const { id } = await params;
    const playerId = new URL(request.url).searchParams.get("playerId");
    assertPlayerId(playerId);
    return Response.json(await getState(id, playerId));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request, { params }: RouteContext<"/api/rooms/[id]">) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { playerId?: unknown; action?: Action };
    assertPlayerId(body.playerId);
    if (!body.action || typeof body.action !== "object") throw new GameError("Missing action");
    return Response.json(await applyAction(id, body.playerId, body.action));
  } catch (err) {
    return handleError(err);
  }
}
