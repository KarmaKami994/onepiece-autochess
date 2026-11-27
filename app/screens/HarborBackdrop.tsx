"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { HarborScene } from "./harborScene";

const motionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(change: () => void) {
  const preference = window.matchMedia(motionQuery);
  preference.addEventListener("change", change);
  return () => preference.removeEventListener("change", change);
}

function systemReducesMotion() {
  return window.matchMedia(motionQuery).matches;
}

export default function HarborBackdrop({ reducedMotion }: { reducedMotion: boolean }) {
  const systemReduced = useSyncExternalStore(subscribeToMotion, systemReducesMotion, () => true);
  return (
    <div className="menu-harbor">
      <div className="menu-harbor-art" aria-hidden="true" />
      <div className="menu-harbor-ship" aria-hidden="true" />
      {!reducedMotion && !systemReduced && <AnimatedHarbor />}
      <div className="menu-harbor-shade" aria-hidden="true" />
    </div>
  );
}

function AnimatedHarbor() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HarborScene | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let unmounted = false;

    function showStillImage() {
      sceneRef.current?.dispose();
      sceneRef.current = null;
      setReady(false);
    }

    void import("./harborScene").then(({ mountHarborScene }) => {
      if (unmounted) return;
      sceneRef.current = mountHarborScene(mount, showStillImage);
      setReady(true);
    }).catch(() => {
      if (!unmounted) showStillImage();
    });

    return () => {
      unmounted = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  return (
    <>
      <div className="menu-harbor-scene" ref={mountRef} data-ready={ready} aria-hidden="true" />
      {ready && (
        <button type="button" className="menu-motion" onClick={() => {
          sceneRef.current?.setPaused(!paused);
          setPaused(!paused);
        }}>
          <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
          {paused ? "Resume animation" : "Pause animation"}
        </button>
      )}
    </>
  );
}
