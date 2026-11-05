import { useCallback, useEffect, useRef } from "react";
import { MUSIC_TRACKS, type AudioSettings, type SoundName } from "./audioSettings";
export type { SoundName } from "./audioSettings";

const SOUNDS: Record<SoundName, readonly [number, number, OscillatorType, number]> = {
  click: [280, 0.055, "square", 280], coin: [620, 0.11, "triangle", 620],
  error: [130, 0.16, "sawtooth", 130], battle: [190, 0.2, "square", 90],
  reward: [760, 0.25, "triangle", 1120], splash: [210, 0.08, "triangle", 120],
  unlock: [520, 0.16, "square", 820], cast: [330, 0.16, "triangle", 660],
  hit: [120, 0.06, "triangle", 65], drain: [700, 0.22, "sine", 180],
  displace: [170, 0.1, "triangle", 420], transform: [220, 0.4, "triangle", 880],
  revive: [440, 0.5, "sine", 880],
};

export function useGameAudio(settings: AudioSettings, musicEnabled = true) {
  const contextRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const lastEffect = useRef(-Infinity);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const unlock = useCallback(() => {
    const current = settingsRef.current;
    if (current.muted || document.hidden) return;
    if (!contextRef.current && window.AudioContext) {
      const context = new AudioContext();
      const gain = context.createGain();
      gain.gain.value = current.volume * current.effectsVolume * 0.09;
      gain.connect(context.destination);
      gainRef.current = gain; contextRef.current = context;
    }
    if (contextRef.current?.state === "suspended") void contextRef.current.resume().catch(() => undefined);
    if (musicRef.current && current.musicVolume * current.volume > 0) void musicRef.current.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      void contextRef.current?.close().catch(() => undefined);
      contextRef.current = null; gainRef.current = null;
    };
  }, [unlock]);

  useEffect(() => {
    if (!musicEnabled) return;
    const track = MUSIC_TRACKS.find((entry) => entry.id === settings.musicTrack) ?? MUSIC_TRACKS[0];
    const audio = new Audio(track.path);
    audio.loop = true; audio.preload = "none";
    musicRef.current = audio;
    return () => { audio.pause(); audio.removeAttribute("src"); audio.load(); musicRef.current = null; };
  }, [musicEnabled, settings.musicTrack]);

  useEffect(() => {
    const sync = () => {
      const silent = settings.muted || document.hidden;
      if (gainRef.current) gainRef.current.gain.value = silent ? 0 : settings.volume * settings.effectsVolume * 0.09;
      if (musicRef.current) {
        musicRef.current.volume = settings.volume * settings.musicVolume;
        if (silent || settings.volume * settings.musicVolume === 0) musicRef.current.pause();
        else if (contextRef.current) void musicRef.current.play().catch(() => undefined);
      }
    };
    sync(); document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [settings.muted, settings.volume, settings.effectsVolume, settings.musicVolume, settings.musicTrack]);

  return useCallback((sound: SoundName) => {
    const current = settingsRef.current;
    if (current.muted || current.volume * current.effectsVolume <= 0 || document.hidden) return;
    unlock();
    const context = contextRef.current;
    if (!context || context.state !== "running" || !gainRef.current) return;
    const combat = ["cast", "hit", "drain", "displace", "transform", "revive"].includes(sound);
    const now = context.currentTime;
    if (combat && now - lastEffect.current < 0.06) return;
    if (combat) lastEffect.current = now;
    const [frequency, duration, type, end] = SOUNDS[sound];
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
    envelope.gain.setValueAtTime(combat ? 0.5 : 1, now);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope); envelope.connect(gainRef.current);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(now); oscillator.stop(now + duration);
  }, [unlock]);
}
