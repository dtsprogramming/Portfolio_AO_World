import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const sampleRate = 32000;
const duration = 64;
const frames = sampleRate * duration;
const left = new Float32Array(frames);
const right = new Float32Array(frames);
const tau = Math.PI * 2;
const beat = 2 / 3;
const chordSpan = beat * 16;
const quantize = (frequency, span = chordSpan) => Math.round(frequency * span) / span;
const chords = [
  [73.42, 87.31, 110, 130.81],
  [58.27, 73.42, 87.31, 110],
  [43.65, 65.41, 73.42, 98],
  [65.41, 82.41, 98, 146.83],
  [49, 58.27, 73.42, 98],
  [55, 73.42, 82.41, 110],
];
const melodyPattern = [0, 2, 1, 3, 2, 1, 3, 0];

for (let i = 0; i < frames; i++) {
  const t = i / sampleRate;
  const segment = Math.floor(t / chordSpan) % chords.length;
  const local = t % chordSpan;
  const padEnvelope = Math.pow(Math.sin((local / chordSpan) * Math.PI), 0.5);
  const beatIndex = Math.floor(t / beat);
  const beatTime = (t % beat) / beat;
  const halfBeat = beat / 2;
  const halfIndex = Math.floor(t / halfBeat);
  const halfTime = (t % halfBeat) / halfBeat;
  const root = chords[segment][0];
  let l = Math.sin(tau * quantize(36.708, duration) * t) * 0.07;
  let r = Math.sin(tau * quantize(36.708, duration) * t + 0.06) * 0.07;
  chords[segment].forEach((frequency, voice) => {
    const f = quantize(frequency);
    const drift = Math.sin(tau * (voice + 1) * t / duration) * 0.55;
    l += Math.sin(tau * f * t + drift) * padEnvelope * (0.044 - voice * 0.004);
    r += Math.sin(tau * f * t - drift + voice * 0.13) * padEnvelope * (0.044 - voice * 0.004);
  });
  const bassFrequency = quantize(beatIndex % 4 === 3 ? root * 1.5 : root, beat);
  const bassEnvelope = Math.exp(-beatTime * 4.8);
  const bass = (Math.sin(tau * bassFrequency * t) + Math.sin(tau * bassFrequency * 2 * t) * 0.18) * bassEnvelope * 0.105;
  l += bass; r += bass * 0.96;
  const melodyNote = chords[segment][melodyPattern[Math.floor(beatIndex / 2) % melodyPattern.length]] * 4;
  const keyEnvelope = Math.exp(-halfTime * 7.2) * (halfIndex % 4 === 0 ? 1 : 0.38);
  const key = (Math.sin(tau * quantize(melodyNote, halfBeat) * t) + Math.sin(tau * quantize(melodyNote * 2.01, halfBeat) * t) * 0.2) * keyEnvelope * 0.027;
  if (halfIndex % 2 === 0) l += key; else r += key;
  const kickPhase = tau * (68 * beatTime - 22 * beatTime * beatTime);
  const kick = Math.sin(kickPhase) * Math.exp(-beatTime * 9) * (beatIndex % 2 === 0 ? 0.105 : 0.045);
  l += kick; r += kick;
  const shimmer =
    Math.sin(tau * quantize(1046.5, duration) * t + Math.sin(t / 7) * 2) * 0.0018 +
    Math.sin(tau * quantize(1567.98, duration) * t + Math.cos(t / 9)) * 0.001;
  l += shimmer * (0.65 + Math.sin(t / 5) * 0.25);
  r += shimmer * (0.65 + Math.cos(t / 6) * 0.25);
  const breathe = 0.82 + Math.sin(tau * t / 16) * 0.08;
  left[i] = l * breathe;
  right[i] = r * breathe;
}

let peak = 0;
for (let i = 0; i < frames; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
const scale = 0.72 / peak;
const bytesPerSample = 2;
const dataSize = frames * 2 * bytesPerSample;
const buffer = Buffer.alloc(44 + dataSize);
buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write("WAVE", 8);
buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(2, 22); buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2 * bytesPerSample, 28);
buffer.writeUInt16LE(2 * bytesPerSample, 32); buffer.writeUInt16LE(16, 34);
buffer.write("data", 36); buffer.writeUInt32LE(dataSize, 40);
for (let i = 0, offset = 44; i < frames; i++) {
  buffer.writeInt16LE(Math.max(-32768, Math.min(32767, left[i] * scale * 32767)), offset);
  buffer.writeInt16LE(Math.max(-32768, Math.min(32767, right[i] * scale * 32767)), offset + 2);
  offset += 4;
}
const output = resolve("public/audio/ambient/axon-starry-loop.wav");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, buffer);
console.log(`${output} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
