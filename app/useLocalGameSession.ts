import { useCallback, useRef, useState } from "react";
import { applyCommand } from "@/game";
import type {
  CommandResult,
  GameCommand,
  GameContent,
  MatchState,
} from "@/game";

export function useLocalGameSession(content: GameContent) {
  const [state, setStateReact] = useState<MatchState | null>(null);
  const stateRef = useRef<MatchState | null>(null);

  const setState = useCallback((next: MatchState | null) => {
    stateRef.current = next;
    setStateReact(next);
  }, []);

  const dispatch = useCallback(
    (command: GameCommand): CommandResult | null => {
      const current = stateRef.current;
      if (!current) return null;
      const actorPlayerId =
        current.players.find((player) => !player.isBot)?.id ??
        current.players[0]?.id;
      if (!actorPlayerId) {
        throw new Error("The match has no active captain.");
      }
      return applyCommand(current, command, { actorPlayerId }, content);
    },
    [content],
  );

  const clear = useCallback(() => setState(null), [setState]);

  return { state, stateRef, setState, dispatch, clear } as const;
}
