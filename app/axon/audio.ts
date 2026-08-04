/**
 * Web Audio engine for ambient music and responsive world effects. Keeping it
 * separate prevents rendering code from depending on synthesis internals.
 */
export type AxonAudio = ReturnType<typeof createAxonAudio>;

/** Synthesizes world ambience and responsive gameplay effects through Web Audio. */
export function createAxonAudio(
  initialVolume: number,
  initiallyMuted: boolean,
) {
  const Context =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Context) return null;
  const context = new Context();
  const master = context.createGain();
  master.gain.value = initiallyMuted ? 0 : initialVolume;
  master.connect(context.destination);
  const sfxGain = context.createGain();
  sfxGain.gain.value = 0.58;
  sfxGain.connect(master);
  const musicGain = context.createGain();
  musicGain.gain.value = 0.34;
  musicGain.connect(master);
  let musicSource: AudioBufferSourceNode | null = null;
  let destroyed = false;
  fetch("/audio/ambient/axon-starry-loop.wav")
    .then((response) => response.arrayBuffer())
    .then((data) => context.decodeAudioData(data))
    .then((buffer) => {
      if (destroyed) return;
      musicSource = context.createBufferSource();
      musicSource.buffer = buffer;
      musicSource.loop = true;
      musicSource.connect(musicGain);
      musicSource.start();
    })
    .catch(() => undefined);
  const ambience = context.createGain();
  ambience.gain.value = 0.09;
  ambience.connect(master);
  const hum = context.createOscillator();
  const humGain = context.createGain();
  hum.type = "triangle";
  hum.frequency.value = 43;
  humGain.gain.value = 0.055;
  hum.connect(humGain).connect(ambience);
  hum.start();
  const harmonic = context.createOscillator();
  const harmonicGain = context.createGain();
  harmonic.type = "sine";
  harmonic.frequency.value = 86;
  harmonicGain.gain.value = 0.006;
  harmonic.connect(harmonicGain).connect(ambience);
  harmonic.start();
  const noiseBuffer = context.createBuffer(
    1,
    context.sampleRate * 2,
    context.sampleRate,
  );
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++)
    noiseData[i] = Math.random() * 2 - 1;
  const fanNoise = context.createBufferSource();
  const fanFilter = context.createBiquadFilter();
  const fanGain = context.createGain();
  fanNoise.buffer = noiseBuffer;
  fanNoise.loop = true;
  fanFilter.type = "lowpass";
  fanFilter.frequency.value = 620;
  fanGain.gain.value = 0.012;
  fanNoise.connect(fanFilter).connect(fanGain).connect(ambience);
  fanNoise.start();
  const movementOsc = context.createOscillator();
  const movementGain = context.createGain();
  const movementHarmonic = context.createOscillator();
  const movementHarmonicGain = context.createGain();
  const movementFilter = context.createBiquadFilter();
  movementOsc.type = "triangle";
  movementOsc.frequency.value = 105;
  movementGain.gain.value = 0;
  movementHarmonic.type = "sine";
  movementHarmonic.frequency.value = 210;
  movementHarmonicGain.gain.value = 0;
  movementFilter.type = "lowpass";
  movementFilter.frequency.value = 720;
  movementFilter.Q.value = 1.2;
  movementOsc.connect(movementGain).connect(movementFilter);
  movementHarmonic.connect(movementHarmonicGain).connect(movementFilter);
  movementFilter.connect(sfxGain);
  movementOsc.start();
  movementHarmonic.start();
  const proximityOsc = context.createOscillator();
  const proximityGain = context.createGain();
  proximityOsc.type = "sine";
  proximityOsc.frequency.value = 132;
  proximityGain.gain.value = 0;
  proximityOsc.connect(proximityGain).connect(sfxGain);
  proximityOsc.start();
  let prototypeTimer = 0;
  let prototypeStep = 0;
  let liftWasActive = false;
  const tone = (
    frequency: number,
    duration: number,
    gain = 0.08,
    type: OscillatorType = "sine",
    delay = 0,
    endFrequency?: number,
  ) => {
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency)
      oscillator.frequency.exponentialRampToValueAtTime(
        endFrequency,
        now + duration,
      );
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(
      gain,
      now + Math.min(0.025, duration * 0.2),
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope).connect(sfxGain);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  };
  const noise = (
    duration: number,
    gain = 0.07,
    delay = 0,
    frequency = 1100,
  ) => {
    const now = context.currentTime + delay;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = "lowpass";
    filter.frequency.value = frequency;
    envelope.gain.setValueAtTime(gain, now);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(envelope).connect(sfxGain);
    source.start(now);
    source.stop(now + duration);
  };
  const setPrototype = (active: boolean) => {
    if (prototypeTimer) window.clearInterval(prototypeTimer);
    prototypeTimer = 0;
    prototypeStep = 0;
    musicGain.gain.setTargetAtTime(
      active ? 0.045 : 0.34,
      context.currentTime,
      0.35,
    );
    ambience.gain.setTargetAtTime(
      active ? 0.035 : 0.09,
      context.currentTime,
      0.25,
    );
    if (!active) return;
    const notes = [110, 165, 220, 165, 131, 196, 262, 196];
    prototypeTimer = window.setInterval(() => {
      tone(notes[prototypeStep++ % notes.length], 0.12, 0.045, "square");
      if (prototypeStep % 2 === 0) tone(55, 0.08, 0.025, "triangle");
    }, 180);
  };
  return {
    resume: () => context.resume(),
    setVolume: (value: number, muted = false) =>
      master.gain.setTargetAtTime(
        muted ? 0 : value,
        context.currentTime,
        0.035,
      ),
    ui: () => tone(420, 0.045, 0.035, "square"),
    jump: () => tone(150, 0.2, 0.075, "square", 0, 390),
    land: () => {
      tone(92, 0.09, 0.07, "triangle");
      noise(0.07, 0.035, 0, 420);
    },
    scan: () => {
      tone(180, 0.72, 0.075, "sine", 0, 1250);
      tone(360, 0.55, 0.035, "triangle", 0.18, 95);
    },
    pulse: () => {
      tone(760, 0.09, 0.045, "square", 0, 240);
      tone(190, 0.12, 0.025, "sine", 0.025);
    },
    unlock: () =>
      [262, 330, 392, 523].forEach((note, i) =>
        tone(note, 0.22, 0.07, "triangle", i * 0.1),
      ),
    pickup: () =>
      [520, 780, 1040].forEach((note, i) =>
        tone(note, 0.12, 0.055, "square", i * 0.055),
      ),
    success: () =>
      [220, 277, 330, 440].forEach((note, i) =>
        tone(note, 0.2, 0.06, "sine", i * 0.09),
      ),
    error: () => {
      tone(145, 0.14, 0.055, "sawtooth");
      tone(112, 0.18, 0.05, "sawtooth", 0.1);
    },
    network: () => {
      for (let i = 0; i < 5; i++)
        tone(120 + i * 95, 0.3, 0.045, "triangle", i * 0.22);
    },
    celebration: () => {
      const now = context.currentTime;
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setValueAtTime(musicGain.gain.value, now);
      musicGain.gain.linearRampToValueAtTime(0.46, now + 1.2);
      musicGain.gain.linearRampToValueAtTime(0.34, now + 7);
      [65, 98, 131, 196].forEach((note, i) =>
        tone(note, 6.6, 0.035, "sine", i * 0.08, note * 2),
      );
      [0.95, 2.05, 3.15, 4.25].forEach((delay, i) => {
        tone(
          105 + i * 18,
          0.92,
          0.055,
          "sawtooth",
          Math.max(0, delay - 0.92),
          980 + i * 130,
        );
        noise(0.8, 0.1, delay, 1800);
        noise(1.15, 0.18, delay, 210);
        tone(920 + i * 120, 0.65, 0.05, "sine", delay, 170);
        tone(58 - i * 3, 1.05, 0.18, "sine", delay, 27);
      });
    },
    setPrototype,
    update: (
      speed: number,
      sprinting: boolean,
      machineDistance: number,
      inLift: boolean,
    ) => {
      const now = context.currentTime;
      const motorFrequency = sprinting ? 285 : 105 + speed * 8.5;
      movementOsc.frequency.setTargetAtTime(motorFrequency, now, 0.045);
      movementHarmonic.frequency.setTargetAtTime(
        motorFrequency * 2.03,
        now,
        0.045,
      );
      movementFilter.frequency.setTargetAtTime(
        sprinting ? 980 : 580 + speed * 16,
        now,
        0.06,
      );
      movementGain.gain.setTargetAtTime(
        speed > 0.25 ? (sprinting ? 0.026 : 0.018) : 0,
        now,
        0.045,
      );
      movementHarmonicGain.gain.setTargetAtTime(
        speed > 0.25 ? (sprinting ? 0.012 : 0.007) : 0,
        now,
        0.045,
      );
      proximityGain.gain.setTargetAtTime(
        machineDistance < 16 ? (1 - machineDistance / 16) * 0.035 : 0,
        now,
        0.08,
      );
      proximityOsc.frequency.setTargetAtTime(
        110 + Math.max(0, 16 - machineDistance) * 7,
        now,
        0.08,
      );
      harmonicGain.gain.setTargetAtTime(inLift ? 0.045 : 0.006, now, 0.08);
      if (inLift && !liftWasActive) {
        tone(82, 1.35, 0.09, "sine", 0, 1450);
        tone(1320, 1.15, 0.045, "triangle", 0.12, 170);
        noise(0.9, 0.045, 0.08, 1300);
      }
      liftWasActive = inLift;
    },
    destroy: () => {
      destroyed = true;
      if (prototypeTimer) window.clearInterval(prototypeTimer);
      try {
        musicSource?.stop();
      } catch {}
      hum.stop();
      harmonic.stop();
      fanNoise.stop();
      movementOsc.stop();
      movementHarmonic.stop();
      proximityOsc.stop();
      context.close();
    },
  };
}
