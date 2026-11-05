import { useCallback, useEffect, useRef, useState } from "react";
import type { GameContent, MatchState } from "../game";
import { newVoyageReplay, observeVoyage, replayCompatible, type VoyageReplay } from "./chronicle";
import { checkpointReplay, readReplayDraft } from "./chronicleStorage";

export function useChronicleRecorder(content: GameContent) {
  const draft = useRef<VoyageReplay | null>(null);
  const writes = useRef(Promise.resolve());
  const lastWrite = useRef(0);
  const [error, setError] = useState("");
  const observe = useCallback((state: MatchState, fresh = false) => {
    writes.current = writes.current.catch(() => undefined).then(async () => {
      if (fresh) draft.current = null;
      if (!draft.current || draft.current.seed !== state.seed) {
        draft.current = fresh ? null : await readReplayDraft(state.seed, content);
        if (!draft.current || !replayCompatible(draft.current, content)) draft.current = newVoyageReplay(state, content, crypto.randomUUID(), Date.now());
      }
      const previous = draft.current.frames.at(-1);
      draft.current = observeVoyage(draft.current, state, Date.now());
      if (draft.current.completedAt !== null || previous?.round !== state.round || previous?.phase !== state.phase || Date.now() - lastWrite.current >= 2000) {
        await checkpointReplay(draft.current, content); lastWrite.current = Date.now();
      }
    }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Chronicle recording could not be saved. Active voyage is unaffected."));
  }, [content]);
  const flush = useCallback(() => {
    writes.current = writes.current.catch(() => undefined).then(async () => { if (draft.current) await checkpointReplay(draft.current, content); }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Chronicle could not be saved."));
    return writes.current;
  }, [content]);
  useEffect(() => {
    const hide = () => { if (document.hidden) void flush(); };
    const leave = () => { void flush(); };
    document.addEventListener("visibilitychange", hide); window.addEventListener("pagehide", leave);
    return () => { document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", leave); };
  }, [flush]);
  return { observe, flush, error };
}
