"use client";

import { useState } from "react";
import "./visualIcon.css";

// The existing inventory/inspector fallback, shared with planner and replay.
export function VisualIcon({ imagePath, fallback, className }: {
  imagePath?: string; fallback: string; className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!imagePath || failed) return <span className={className} aria-hidden="true">{fallback}</span>;
  return <span className={className} aria-hidden="true">
    {/* Local SVGs retain the existing glyph fallback. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={imagePath} alt="" onError={() => setFailed(true)} />
  </span>;
}
