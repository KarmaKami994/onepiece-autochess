"use client";

import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const ActiveTooltip = createContext<{ active: string | null; show: (id: string | null) => void } | null>(null);

/** Ephemeral presentation state only. One primary card, at most one recipe level. */
export function HudTooltipProvider({ children, resetKey }: { children: ReactNode; resetKey: string }) {
  const [active, setActive] = useState<{ key: string; id: string | null } | null>(null);
  return <ActiveTooltip.Provider value={{ active: active?.key === resetKey ? active.id : null, show: id => setActive({ key: resetKey, id }) }}>{children}</ActiveTooltip.Provider>;
}

export function HudTooltip({ children, content, label, side = "right", nested = false, focusable = false, className = "", onOpenChange, onEscape }: {
  children: ReactNode; content: ReactNode; label: string; side?: "right" | "left" | "top";
  nested?: boolean; focusable?: boolean; className?: string; onOpenChange?: (open: boolean) => void;
  onEscape?: () => void;
}) {
  const group = useContext(ActiveTooltip), id = useId();
  const [localOpen, setLocalOpen] = useState(false);
  const visible = localOpen && (nested || !group || group.active === id);
  const anchor = useRef<HTMLSpanElement>(null), card = useRef<HTMLDivElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null), hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const change = useRef(onOpenChange);
  useLayoutEffect(() => { change.current = onOpenChange; }, [onOpenChange]);
  const returningFocus = useRef(false);
  const [position, setPosition] = useState({ left: 0, top: 0, ready: false });
  function clearTimers() { if (showTimer.current) clearTimeout(showTimer.current); if (hideTimer.current) clearTimeout(hideTimer.current); }
  function open() { clearTimers(); setLocalOpen(true); if (!nested) group?.show(id); }
  function close() { clearTimers(); setLocalOpen(false); }
  function enter() { clearTimers(); showTimer.current = setTimeout(open, 100); }
  function leave() { clearTimers(); hideTimer.current = setTimeout(close, 100); }
  useEffect(() => { change.current?.(visible); return () => change.current?.(false); }, [visible]);
  useEffect(() => () => clearTimers(), []);
  useLayoutEffect(() => {
    if (!visible) return;
    const place = () => {
      const a = anchor.current?.getBoundingClientRect(), c = card.current?.getBoundingClientRect(); if (!a || !c) return;
      let left = side === "left" ? a.left - c.width - 8 : side === "top" ? a.left + (a.width - c.width) / 2 : a.right + 8;
      let top = side === "top" ? a.top - c.height - 8 : a.top;
      if (side === "right" && left + c.width > innerWidth - 8) left = a.left - c.width - 8;
      if (side === "left" && left < 8) left = a.right + 8;
      if (side === "top" && top < 8) top = a.bottom + 8;
      setPosition({ left: Math.max(8, Math.min(left, innerWidth - c.width - 8)), top: Math.max(8, Math.min(top, innerHeight - c.height - 8)), ready: true });
    };
    place(); const observer = new ResizeObserver(place); if (card.current) observer.observe(card.current);
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [visible, side]);
  const popup = visible ? <div ref={card} id={id} role="dialog" tabIndex={-1} aria-label={label} className={`pac-hud-tooltip ${nested ? "is-nested" : ""}`}
    style={{ left: position.left, top: position.top, visibility: position.ready ? "visible" : "hidden" }}
    onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current); }} onMouseLeave={leave}
    onFocus={() => { if (hideTimer.current) clearTimeout(hideTimer.current); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && !anchor.current?.contains(event.relatedTarget)) leave(); }}
    onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}
    onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); close(); onEscape?.(); const target = anchor.current; returningFocus.current = true; (target?.querySelector<HTMLElement>("button, [tabindex='0']") ?? target)?.focus(); } }}>{content}</div> : null;
  return <span ref={anchor} className={`hud-tooltip-anchor ${className}`} tabIndex={focusable ? 0 : undefined}
    role={focusable ? "button" : undefined} aria-label={focusable ? label : undefined} aria-haspopup={focusable ? "dialog" : undefined} aria-expanded={focusable ? visible : undefined}
    onMouseEnter={enter} onMouseLeave={leave} onFocus={() => { if (returningFocus.current) returningFocus.current = false; else open(); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && !card.current?.contains(event.relatedTarget)) leave(); }}
    onKeyDown={event => { if (event.key === "Escape" && visible) { event.stopPropagation(); close(); onEscape?.(); } if (visible && (event.key === "ArrowRight" || event.key === "F2")) { event.preventDefault(); event.stopPropagation(); (card.current?.querySelector<HTMLElement>("button, [tabindex='0']") ?? card.current)?.focus(); } if (focusable && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); event.stopPropagation(); open(); } }}>
    {children}{nested ? popup : popup && createPortal(popup, document.body)}
  </span>;
}
