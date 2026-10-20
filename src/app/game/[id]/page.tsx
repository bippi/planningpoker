import { Suspense } from "react";
import { GameClient } from "./game-client";

export default function GamePage() {
  return (
    <Suspense>
      <GameClient />
    </Suspense>
  );
}
