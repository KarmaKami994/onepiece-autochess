import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { DEFAULT_AUDIO_SETTINGS, MUSIC_TRACKS, combatSound, normalizeAudioSettings } from "../app/audioSettings";

describe("offline audio and settings compatibility", () => {
  it("backfills legacy settings and bounds malformed volume/track inputs", () => {
    expect(normalizeAudioSettings({ volume: 0.8, muted: true })).toEqual({ ...DEFAULT_AUDIO_SETTINGS, volume: 0.8, muted: true });
    expect(normalizeAudioSettings({ volume: Infinity, musicVolume: -4, effectsVolume: 9, musicTrack: "missing" as "harbor" })).toEqual({ ...DEFAULT_AUDIO_SETTINGS, musicVolume: 0, effectsVolume: 1 });
    expect(combatSound({ id: "reset", tick: 0, kind: "energy", energyDelta: -100, reason: "cast-reset" })).toBeNull();
    expect(combatSound({ id: "drain", tick: 0, kind: "energy", energyDelta: -10, reason: "ability-drain" })).toBe("drain");
    expect(combatSound({ id: "revive", tick: 0, kind: "resurrect" })).toBe("revive");
  });
  it("ships original playable WAV loops matching the generator and provenance hashes", () => {
    const manifest = JSON.parse(readFileSync("public/assets/audio/manifest.json", "utf8")) as { source: string; sourceSha256: string; tracks: { path: string; sha256: string; bytes: number; durationSeconds: number }[] };
    const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
    expect(hash(readFileSync(manifest.source))).toBe(manifest.sourceSha256);
    expect(manifest.tracks.map((track) => track.path)).toEqual(MUSIC_TRACKS.map((track) => track.path));
    for (const track of manifest.tracks) {
      const bytes = readFileSync(`public${track.path}`);
      expect(hash(bytes)).toBe(track.sha256);
      expect(bytes.length).toBe(track.bytes);
      expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
      expect(bytes.toString("ascii", 8, 12)).toBe("WAVE");
      expect(bytes.readUInt32LE(24)).toBe(22050);
      expect(bytes.readUInt16LE(34)).toBe(16);
      expect((bytes.length - 44) / 44100).toBeCloseTo(track.durationSeconds, 3);
      let peak = 0;
      for (let index = 44; index < bytes.length; index += 2) peak = Math.max(peak, Math.abs(bytes.readInt16LE(index)));
      expect(peak).toBeGreaterThan(1000); expect(peak).toBeLessThan(32767);
    }
  });
});
