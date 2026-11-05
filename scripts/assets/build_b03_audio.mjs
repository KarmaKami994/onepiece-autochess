// Original project-authored compositions and additive synthesis. No sampled audio.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const directory = new URL("../../public/assets/audio/", import.meta.url);
const rate = 22050;
const tracks = [
  { id: "harbor", title: "Harbor at Dawn", bpm: 96, melody: [69, 72, 76, 72, 67, 71, 74, 71, 65, 69, 72, 69, 67, 71, 74, 76], bass: [45, 43, 41, 43] },
  { id: "pursuit", title: "Grand Line Pursuit", bpm: 120, melody: [64, 67, 71, 76, 74, 71, 67, 64, 62, 66, 69, 74, 71, 69, 66, 62], bass: [40, 40, 38, 43] },
];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
await mkdir(directory, { recursive: true });
const outputs = [];
for (const track of tracks) {
  const beat = 60 / track.bpm;
  const duration = beat * 32;
  const samples = Math.round(duration * rate);
  const pcm = Buffer.alloc(44 + samples * 2);
  pcm.write("RIFF"); pcm.writeUInt32LE(pcm.length - 8, 4); pcm.write("WAVEfmt ", 8);
  pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
  pcm.writeUInt32LE(rate, 24); pcm.writeUInt32LE(rate * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
  pcm.write("data", 36); pcm.writeUInt32LE(samples * 2, 40);
  const hz = (note) => 440 * 2 ** ((note - 69) / 12);
  for (let index = 0; index < samples; index += 1) {
    const time = index / rate;
    const step = Math.floor(time / beat);
    const local = time - step * beat;
    const melody = hz(track.melody[step % track.melody.length]);
    const bass = hz(track.bass[Math.floor(step / 8) % track.bass.length]);
    const envelope = Math.min(1, local / 0.015) * Math.max(0, 1 - local / (beat * 0.93));
    const tone = (Math.sin(2 * Math.PI * melody * local) + 0.2 * Math.sin(4 * Math.PI * melody * local)) * envelope * 0.16;
    const low = Math.sin(2 * Math.PI * bass * local) * envelope * 0.12;
    const pulse = Math.sin(2 * Math.PI * (75 * local + 0.9 * (1 - Math.exp(-local * 28)))) * Math.exp(-local * 28) * (step % 2 ? 0.03 : 0.1);
    const fade = Math.min(1, time / 0.02, (duration - time) / 0.04);
    pcm.writeInt16LE(Math.round((tone + low + pulse) * fade * 32767), 44 + index * 2);
  }
  await writeFile(new URL(`${track.id}.wav`, directory), pcm);
  outputs.push({ ...track, path: `/assets/audio/${track.id}.wav`, durationSeconds: duration, bytes: pcm.length, sha256: hash(pcm) });
}
const manifest = {
  source: "scripts/assets/build_b03_audio.mjs", sourceSha256: hash(await readFile(fileURLToPath(import.meta.url))),
  permissionBasis: "Original project-authored note sequences and synthesis; no third-party samples or music copied. Use under the repository terms.",
  format: "mono PCM16 WAV, 22050 Hz", tracks: outputs,
};
await writeFile(new URL("manifest.json", directory), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${outputs.map((track) => `${track.id}: ${track.sha256}`).join("\n")}\n`);
