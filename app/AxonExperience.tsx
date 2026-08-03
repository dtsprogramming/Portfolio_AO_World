"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";

type Ability = "sprint" | "jump" | "scan";
type ForgeLanguage = "C#" | "Python" | "JavaScript" | "Java";
type ForgeMode = "sum" | "product" | "evens";

type AxonAudio = ReturnType<typeof createAxonAudio>;

function createAxonAudio(initialVolume: number, initiallyMuted: boolean) {
  const Context = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
  hum.type = "triangle"; hum.frequency.value = 43; humGain.gain.value = 0.055;
  hum.connect(humGain).connect(ambience); hum.start();
  const harmonic = context.createOscillator();
  const harmonicGain = context.createGain();
  harmonic.type = "sine"; harmonic.frequency.value = 86; harmonicGain.gain.value = 0.006;
  harmonic.connect(harmonicGain).connect(ambience); harmonic.start();
  const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
  const fanNoise = context.createBufferSource();
  const fanFilter = context.createBiquadFilter();
  const fanGain = context.createGain();
  fanNoise.buffer = noiseBuffer; fanNoise.loop = true;
  fanFilter.type = "lowpass"; fanFilter.frequency.value = 620;
  fanGain.gain.value = 0.012;
  fanNoise.connect(fanFilter).connect(fanGain).connect(ambience); fanNoise.start();
  const movementOsc = context.createOscillator();
  const movementGain = context.createGain();
  const movementHarmonic = context.createOscillator();
  const movementHarmonicGain = context.createGain();
  const movementFilter = context.createBiquadFilter();
  movementOsc.type = "triangle"; movementOsc.frequency.value = 105; movementGain.gain.value = 0;
  movementHarmonic.type = "sine"; movementHarmonic.frequency.value = 210; movementHarmonicGain.gain.value = 0;
  movementFilter.type = "lowpass"; movementFilter.frequency.value = 720; movementFilter.Q.value = 1.2;
  movementOsc.connect(movementGain).connect(movementFilter);
  movementHarmonic.connect(movementHarmonicGain).connect(movementFilter);
  movementFilter.connect(sfxGain); movementOsc.start(); movementHarmonic.start();
  const proximityOsc = context.createOscillator();
  const proximityGain = context.createGain();
  proximityOsc.type = "sine"; proximityOsc.frequency.value = 132; proximityGain.gain.value = 0;
  proximityOsc.connect(proximityGain).connect(sfxGain); proximityOsc.start();
  let prototypeTimer = 0;
  let prototypeStep = 0;
  let liftWasActive = false;
  const tone = (frequency: number, duration: number, gain = 0.08, type: OscillatorType = "sine", delay = 0, endFrequency?: number) => {
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + Math.min(0.025, duration * 0.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope).connect(sfxGain); oscillator.start(now); oscillator.stop(now + duration + 0.03);
  };
  const noise = (duration: number, gain = 0.07, delay = 0, frequency = 1100) => {
    const now = context.currentTime + delay;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = noiseBuffer; filter.type = "lowpass"; filter.frequency.value = frequency;
    envelope.gain.setValueAtTime(gain, now); envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(envelope).connect(sfxGain); source.start(now); source.stop(now + duration);
  };
  const setPrototype = (active: boolean) => {
    if (prototypeTimer) window.clearInterval(prototypeTimer);
    prototypeTimer = 0; prototypeStep = 0;
    musicGain.gain.setTargetAtTime(active ? 0.045 : 0.34, context.currentTime, 0.35);
    ambience.gain.setTargetAtTime(active ? 0.035 : 0.09, context.currentTime, 0.25);
    if (!active) return;
    const notes = [110, 165, 220, 165, 131, 196, 262, 196];
    prototypeTimer = window.setInterval(() => {
      tone(notes[prototypeStep++ % notes.length], 0.12, 0.045, "square");
      if (prototypeStep % 2 === 0) tone(55, 0.08, 0.025, "triangle");
    }, 180);
  };
  return {
    resume: () => context.resume(),
    setVolume: (value: number, muted = false) => master.gain.setTargetAtTime(muted ? 0 : value, context.currentTime, 0.035),
    ui: () => tone(420, 0.045, 0.035, "square"),
    jump: () => tone(150, 0.2, 0.075, "square", 0, 390),
    land: () => { tone(92, 0.09, 0.07, "triangle"); noise(0.07, 0.035, 0, 420); },
    scan: () => { tone(180, 0.72, 0.075, "sine", 0, 1250); tone(360, 0.55, 0.035, "triangle", 0.18, 95); },
    unlock: () => [262, 330, 392, 523].forEach((note, i) => tone(note, 0.22, 0.07, "triangle", i * 0.1)),
    pickup: () => [520, 780, 1040].forEach((note, i) => tone(note, 0.12, 0.055, "square", i * 0.055)),
    success: () => [220, 277, 330, 440].forEach((note, i) => tone(note, 0.2, 0.06, "sine", i * 0.09)),
    error: () => { tone(145, 0.14, 0.055, "sawtooth"); tone(112, 0.18, 0.05, "sawtooth", 0.1); },
    network: () => { for (let i = 0; i < 5; i++) tone(120 + i * 95, 0.3, 0.045, "triangle", i * 0.22); },
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
        tone(105 + i * 18, 0.92, 0.055, "sawtooth", Math.max(0, delay - 0.92), 980 + i * 130);
        noise(0.8, 0.1, delay, 1800);
        noise(1.15, 0.18, delay, 210);
        tone(920 + i * 120, 0.65, 0.05, "sine", delay, 170);
        tone(58 - i * 3, 1.05, 0.18, "sine", delay, 27);
      });
    },
    setPrototype,
    update: (speed: number, sprinting: boolean, machineDistance: number, inLift: boolean) => {
      const now = context.currentTime;
      const motorFrequency = sprinting ? 285 : 105 + speed * 8.5;
      movementOsc.frequency.setTargetAtTime(motorFrequency, now, 0.045);
      movementHarmonic.frequency.setTargetAtTime(motorFrequency * 2.03, now, 0.045);
      movementFilter.frequency.setTargetAtTime(sprinting ? 980 : 580 + speed * 16, now, 0.06);
      movementGain.gain.setTargetAtTime(speed > 0.25 ? (sprinting ? 0.026 : 0.018) : 0, now, 0.045);
      movementHarmonicGain.gain.setTargetAtTime(speed > 0.25 ? (sprinting ? 0.012 : 0.007) : 0, now, 0.045);
      proximityGain.gain.setTargetAtTime(machineDistance < 16 ? (1 - machineDistance / 16) * 0.035 : 0, now, 0.08);
      proximityOsc.frequency.setTargetAtTime(110 + Math.max(0, 16 - machineDistance) * 7, now, 0.08);
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
      try { musicSource?.stop(); } catch {}
      hum.stop(); harmonic.stop(); fanNoise.stop(); movementOsc.stop(); movementHarmonic.stop(); proximityOsc.stop(); context.close();
    },
  };
}

const shuffle = <T,>(items: T[]) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

function ArchivedPrototype({
  onExit,
  onComplete,
}: {
  onExit: () => void;
  onComplete: (score: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const input = useRef({ x: 0, jump: false });
  const [circuits, setCircuits] = useState(0);
  const [viruses, setViruses] = useState(0);
  const [message, setMessage] = useState("COLLECT 10 CIRCUITS // REACH THE PORT");
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const keys = new Set<string>();
    const player = { x: 70, y: 310, vx: 0, vy: 0, grounded: false, face: 1, invincible: 0 };
    const platforms = [
      [0,370,440,50],[510,370,310,50],[900,370,430,50],[1410,370,390,50],[1890,370,710,50],
      [190,292,130,18],[580,275,150,18],[990,285,120,18],[1190,225,125,18],
      [1480,290,135,18],[1690,235,115,18],[2000,285,150,18],[2250,220,150,18],
    ];
    const pickups = [230,610,760,1025,1235,1515,1735,2050,2300,2480].map((x, i) => ({ x, y: i % 3 === 1 ? 235 : i % 3 === 2 ? 185 : 330, got:false }));
    const enemies = [390,690,1080,1540,1760,2110,2380].map((x, i) => ({ x, y: 342, vx: i % 2 ? 42 : -42, alive:true }));
    let collected = 0, defeated = 0, cameraX = 0;
    let score = 1000;
    let last = performance.now();
    let frame = 0;
    let ended = false;
    const keydown = (event: KeyboardEvent) => {
      keys.add(event.key.toLowerCase());
      if ([" ", "w", "arrowup"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        input.current.jump = true;
      }
    };
    const keyup = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    addEventListener("keydown", keydown);
    addEventListener("keyup", keyup);
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (!ended) score = Math.max(100, score - dt * 8);
      const ix = input.current.x + (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      player.vx += (ix * 190 - player.vx) * Math.min(1, dt * 11);
      if (Math.abs(ix) > .1) player.face = Math.sign(ix);
      if (input.current.jump && player.grounded) { player.vy = -470; player.grounded = false; }
      input.current.jump = false;
      const oldY = player.y;
      player.vy += 900 * dt; player.x = Math.max(18, Math.min(2575, player.x + player.vx * dt)); player.y += player.vy * dt; player.grounded = false;
      platforms.forEach(([x,y,w]) => {
        if (player.x+12>x && player.x-12<x+w && oldY+22<=y && player.y+22>=y && player.vy>=0) { player.y=y-22; player.vy=0; player.grounded=true; }
      });
      if (player.y > 470) { player.x=Math.max(35,cameraX+45); player.y=300; player.vy=0; score=Math.max(100,score-80); setMessage("SIGNAL LOST // CHECKPOINT RESTORED"); }
      player.invincible=Math.max(0,player.invincible-dt);
      pickups.forEach((p) => { if (!p.got && Math.hypot(player.x-p.x,player.y-p.y)<30) { p.got=true; collected++; setCircuits(collected); score+=50; setMessage(`CIRCUIT TRACE ${collected}/10`); } });
      enemies.forEach((e) => {
        if (!e.alive) return; e.x += e.vx*dt;
        if (e.x%400<35 || e.x%400>365) e.vx*=-1;
        if (Math.abs(player.x-e.x)<25 && Math.abs(player.y-e.y)<31 && player.invincible<=0) {
          if (player.vy>80 && player.y<e.y) { e.alive=false; player.vy=-245; defeated++; setViruses(defeated); score+=100; setMessage("VIRUS SMASHED"); }
          else { player.invincible=1.2; player.vx=-player.face*230; player.vy=-220; score=Math.max(100,score-60); setMessage("FIREWALL BREACH"); }
        }
      });
      if (!ended && collected >= 10 && player.x > 2525) {
        ended = true; setFinished(true); setMessage("ARCHIVED BUILD COMPLETE");
        onComplete(Math.round(score));
      }
      cameraX=Math.max(0,Math.min(1880,player.x-240));
      ctx.fillStyle="#050713"; ctx.fillRect(0,0,720,420);
      ctx.fillStyle="#0c1730"; for(let i=0;i<18;i++){const sx=(i*173-cameraX*.18)%760;ctx.fillRect(sx,45+(i%5)*31,2,2);}
      ctx.save(); ctx.translate(-cameraX,0);
      ctx.strokeStyle="#183c52"; ctx.lineWidth=2; for(let x=0;x<2600;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,420);ctx.stroke();}
      platforms.forEach(([x,y,w,h])=>{ctx.fillStyle="#162b2c";ctx.fillRect(x,y,w,h);ctx.fillStyle="#39d6b1";ctx.fillRect(x,y,w,4);for(let px=x+18;px<x+w;px+=38){ctx.fillStyle="#d87c31";ctx.fillRect(px,y+12,13,4);}});
      pickups.forEach((p)=>{if(p.got)return;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(now/500);ctx.fillStyle="#ffd84d";ctx.fillRect(-8,-8,16,16);ctx.fillStyle="#fff3a0";ctx.fillRect(-3,-3,6,6);ctx.restore();});
      enemies.forEach((e)=>{if(!e.alive)return;ctx.fillStyle="#ff4f75";ctx.fillRect(e.x-16,e.y-17,32,25);ctx.fillStyle="#07100e";ctx.fillRect(e.x-9,e.y-10,5,5);ctx.fillRect(e.x+5,e.y-10,5,5);ctx.fillStyle="#ff8ba5";ctx.fillRect(e.x-21,e.y-8,5,16);ctx.fillRect(e.x+16,e.y-8,5,16);});
      ctx.fillStyle=collected>=10?"#c8ff55":"#263b34";ctx.fillRect(2535,270,45,100);ctx.strokeStyle="#c8ff55";ctx.strokeRect(2535,270,45,100);
      if(player.invincible<=0||Math.floor(now/90)%2===0){ctx.save();ctx.translate(player.x,player.y);ctx.scale(player.face,1);ctx.fillStyle="#7cf5ff";ctx.fillRect(-11,-29,22,20);ctx.fillStyle="#aeb9b8";ctx.fillRect(-14,-8,28,22);ctx.fillStyle="#43e5c4";ctx.fillRect(5,-24,4,4);ctx.fillStyle="#1a2423";ctx.beginPath();ctx.arc(0,18,12,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#43e5c4";ctx.stroke();ctx.restore();}
      ctx.restore();
      ctx.fillStyle="#8ca69e";ctx.font="12px monospace";ctx.fillText(`SCORE ${Math.round(score)}   CIRCUITS ${collected}/10   VIRUSES ${defeated}`,18,24);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); removeEventListener("keydown", keydown); removeEventListener("keyup", keyup); };
  }, [onComplete]);

  const move = (x: number) => { input.current.x = x; };
  return (
    <section className="prototype-overlay" aria-label="Axon Override archived prototype">
      <div className="prototype-shell">
        <header><span>AXON OVERRIDE // ARCHIVED BUILD 0.1</span><button onClick={onExit}>EXIT ARCHIVE</button></header>
        <div className="prototype-status"><b>{message}</b><span>CIRCUITS {circuits}/10 // VIRUSES {viruses} // MOVE + JUMP + STOMP</span></div>
        <canvas ref={canvasRef} width="720" height="420" />
        <div className="prototype-mobile">
          <div className="prototype-pad">
            <button onPointerDown={() => move(-1)} onPointerUp={() => move(0)}>◀</button>
            <button onPointerDown={() => move(1)} onPointerUp={() => move(0)}>▶</button>
          </div>
          <div className="prototype-actions"><button onPointerDown={() => { input.current.jump = true; }}>JUMP</button></div>
        </div>
        {finished && <button className="prototype-return" onClick={onExit}>RETURN TO MAINBOARD</button>}
      </div>
    </section>
  );
}

const forgeProgram = (language: ForgeLanguage, mode: ForgeMode, limit: number) => {
  const initial = mode === "product" ? 1 : 0;
  const start = mode === "product" ? 1 : 0;
  const condition = mode === "product" ? `i <= ${limit}` : `i < ${limit}`;
  const operation =
    mode === "sum"
      ? "signal += i;"
      : mode === "product"
        ? "signal *= i;"
        : "if (i % 2 == 0) signal++;";
  if (language === "Python") {
    const range = mode === "product" ? `range(1, ${limit + 1})` : `range(${limit})`;
    const pythonOperation =
      mode === "sum"
        ? "signal += i"
        : mode === "product"
          ? "signal *= i"
          : "if i % 2 == 0:\n        signal += 1";
    return `signal = ${initial}\nfor i in ${range}:\n    ${pythonOperation}\nprint(signal)`;
  }
  const declaration = language === "JavaScript" ? "let" : "int";
  const output =
    language === "C#"
      ? "Console.WriteLine(signal);"
      : language === "Java"
        ? "System.out.println(signal);"
        : "console.log(signal);";
  return `${declaration} signal = ${initial};\nfor (${declaration} i = ${start}; ${condition}; i++) {\n    ${operation}\n}\n${output}`;
};

const forgeResult = (mode: ForgeMode, limit: number) => {
  if (mode === "sum") return (limit * (limit - 1)) / 2;
  if (mode === "evens") return Math.ceil(limit / 2);
  let result = 1;
  for (let i = 1; i <= limit; i++) result *= i;
  return result;
};

const archivePractice = [
  {
    question: "Which Unity method is called once before the first frame update?",
    answers: ["Start()", "Update()", "OnGUI()"],
    correct: 0,
  },
  {
    question: "Which Unity component supplies gravity and physics forces to a GameObject?",
    answers: ["Rigidbody", "Transform", "Animator"],
    correct: 0,
  },
  {
    question: "Which programming structure repeats code while a condition remains true?",
    answers: ["Loop", "Class", "Property"],
    correct: 0,
  },
  {
    question: "What does a Boolean variable store?",
    answers: ["True or false", "Decimal text", "A 3D position"],
    correct: 0,
  },
  {
    question: "Which access modifier limits a C# member to its own class?",
    answers: ["public", "private", "static"],
    correct: 1,
  },
  {
    question: "Which Unity callback is best suited to physics movement?",
    answers: ["LateUpdate()", "FixedUpdate()", "Awake()"],
    correct: 1,
  },
  {
    question: "What collection stores unique values without duplicates?",
    answers: ["List", "Queue", "Set"],
    correct: 2,
  },
  {
    question: "Which operator compares two values for equality in JavaScript?",
    answers: ["=", "===", "=>"],
    correct: 1,
  },
  {
    question: "Which principle hides internal implementation behind a public interface?",
    answers: ["Inheritance", "Recursion", "Encapsulation"],
    correct: 2,
  },
];

const landmarks = [
  {
    id: "forge",
    name: "LOOP FORGE",
    role: "Generative systems",
    color: "#4dff91",
    x: -38,
    z: -28,
  },
  {
    id: "relay",
    name: "SIGNAL RELAY",
    role: "Interactive experiences",
    color: "#38e6ff",
    x: 36,
    z: -34,
  },
  {
    id: "archive",
    name: "MEMORY ARCHIVE",
    role: "Selected work",
    color: "#c8ff55",
    x: 42,
    z: 30,
  },
  {
    id: "nexus",
    name: "POWER NEXUS",
    role: "Runtime architecture",
    color: "#c56cff",
    x: 0,
    z: 80,
  },
] as const;

const profileSite = {
  id: "profile",
  name: "IDENTITY HOLOGRAM",
  role: "Personal profile // creative developer",
  color: "#38e6ff",
  x: 59,
  z: 2,
} as const;

const prototypeSite = {
  id: "prototype",
  name: "PROTOTYPE ARCHIVE",
  role: "Playable build // version 0.1",
  color: "#43e5c4",
  x: -34,
  z: 72,
} as const;

const scanSites = [...landmarks, profileSite, prototypeSite] as const;

export function AxonExperience() {
  const mountRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AxonAudio>(null);
  const runtime = useRef<{
    axis: (x: number, y: number) => void;
    look: (x: number, y: number) => void;
    boost: (active: boolean) => void;
    jump: () => void;
    investigate: (id: string) => void;
    activateNetwork: () => void;
    spawnMachineBattery: (id: string) => void;
    activateCoreReward: () => void;
  } | null>(null);
  const [phase, setPhase] = useState<"boot" | "ready" | "reveal" | "play">(
    "boot",
  );
  const [bootLine, setBootLine] = useState(0);
  const [nearest, setNearest] = useState<string | null>(null);
  const nearestRef = useRef<string | null>(null);
  const [zone, setZone] = useState("CENTRAL BASIN");
  const [panel, setPanel] = useState<string | null>(null);
  const [scanning, setScanning] = useState<string | null>(null);
  const [powerPieces, setPowerPieces] = useState(0);
  const [coreReward, setCoreReward] = useState(false);
  const [showCoreReward, setShowCoreReward] = useState(false);
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const abilitiesRef = useRef(new Set<Ability>());
  const [systemNotice, setSystemNotice] = useState(
    "Locate CMOS-01 on the main signal bus.",
  );
  const [showIntro, setShowIntro] = useState(true);
  const [unlockCard, setUnlockCard] = useState<Ability | null>(null);
  const [completedMachines, setCompletedMachines] = useState<string[]>([]);
  const completedMachinesRef = useRef(new Set<string>());
  const [, setCollectedMachineRewards] = useState<string[]>([]);
  const collectedMachineRewardsRef = useRef(new Set<string>());
  const [archiveTab, setArchiveTab] = useState(0);
  const [loopResult, setLoopResult] = useState<string | null>(null);
  const [loopLanguage, setLoopLanguage] =
    useState<ForgeLanguage>("JavaScript");
  const [loopMode, setLoopMode] = useState<ForgeMode>("sum");
  const [loopLimit, setLoopLimit] = useState(4);
  const [loopStep, setLoopStep] = useState(-1);
  const [loopChoices, setLoopChoices] = useState([4, 6, 10]);
  const [relayNodes, setRelayNodes] = useState(() => Array(8).fill(false));
  const [relayTarget, setRelayTarget] = useState(37);
  const [archivePrompt, setArchivePrompt] = useState(0);
  const [archiveAnswer, setArchiveAnswer] = useState<number | null>(null);
  const [archiveOrder, setArchiveOrder] = useState([0, 1, 2]);
  const [profileTab, setProfileTab] = useState(0);
  const [prototypeOpen, setPrototypeOpen] = useState(false);
  const prototypeOpenRef = useRef(false);
  const [audioVolume, setAudioVolume] = useState(0.58);
  const [audioMuted, setAudioMuted] = useState(false);
  const [practiceScore, setPracticeScore] = useState(0);
  const [challengeNotice, setChallengeNotice] = useState<string | null>(null);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const stickPointer = useRef<number | null>(null);
  const [boostToggled, setBoostToggled] = useState(false);
  const [lookStick, setLookStick] = useState({ x: 0, y: 0 });
  const lookPointer = useRef<number | null>(null);
  const closePrototype = useCallback(() => {
    prototypeOpenRef.current = false;
    setPrototypeOpen(false);
    audioRef.current?.setPrototype(false);
  }, []);
  const completePrototype = useCallback((score: number) => {
    audioRef.current?.success();
    setPracticeScore((current) => {
      const next = current + score;
      localStorage.setItem("axon-practice-score-v1", String(next));
      return next;
    });
  }, []);
  useEffect(() => {
    const savedVolume = Number(localStorage.getItem("axon-audio-volume-v1"));
    const savedMuted = localStorage.getItem("axon-audio-muted-v1") === "1";
    if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1)
      setAudioVolume(savedVolume);
    setAudioMuted(savedMuted);
    return () => audioRef.current?.destroy();
  }, []);
  useEffect(() => {
    if (!challengeNotice) return;
    if (/INCORRECT|MISMATCH|FAILED|INVALID/.test(challengeNotice))
      audioRef.current?.error();
    else if (/PRACTICE CLEARED/.test(challengeNotice))
      audioRef.current?.success();
  }, [challengeNotice]);
  const boot = [
    "WAKE SIGNAL ........ OK",
    "MOUNTING WORLD ...... OK",
    "CALIBRATING SHELL ... OK",
    "AXON LINK ........... READY",
  ];
  useEffect(() => {
    if (phase !== "boot") return;
    const t = setInterval(
      () =>
        setBootLine((v) => {
          if (v >= boot.length - 1) {
            clearInterval(t);
            setPhase("ready");
            return v;
          }
          return v + 1;
        }),
      420,
    );
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => setLoopChoices(shuffle([4, 6, 10])), []);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("axon-progress-v1") || "[]",
      ) as Ability[];
      const valid = saved.filter((item): item is Ability =>
        ["sprint", "jump", "scan"].includes(item),
      );
      abilitiesRef.current = new Set(valid);
      setAbilities(valid);
      const completed = JSON.parse(
        localStorage.getItem("axon-machines-v1") || "[]",
      ) as string[];
      const collectedRewards = JSON.parse(
        localStorage.getItem("axon-machine-batteries-v1") || "[]",
      ) as string[];
      const transistorCmosCollected =
        localStorage.getItem("axon-transistor-cmos-v1") === "1";
      const platformCmosCollected =
        localStorage.getItem("axon-platform-cmos-v1") === "1";
      const mazeCmosCollected = localStorage.getItem("axon-maze-cmos-v1") === "1";
      const rewardUnlocked = localStorage.getItem("axon-core-reward-v1") === "1";
      completedMachinesRef.current = new Set(completed);
      collectedMachineRewardsRef.current = new Set(collectedRewards);
      setCompletedMachines(completed);
      setCollectedMachineRewards(collectedRewards);
      setPowerPieces(
        collectedRewards.length +
          (transistorCmosCollected ? 1 : 0) +
          (platformCmosCollected ? 1 : 0) +
          (mazeCmosCollected ? 1 : 0),
      );
      setCoreReward(rewardUnlocked);
      setPracticeScore(Number(localStorage.getItem("axon-practice-score-v1")) || 0);
      if (valid.length) setShowIntro(false);
      if (valid.includes("scan"))
        setSystemNotice("Optical Array online. Machine signatures revealed.");
      else if (valid.includes("jump"))
        setSystemNotice("Locate CMOS-03 above the capacitor bank.");
      else if (valid.includes("sprint"))
        setSystemNotice("Locate CMOS-02 along the western bus.");
    } catch {}
  }, []);
  useEffect(() => {
    if (panel !== "relay") return;
    setRelayTarget(Math.floor(Math.random() * 128) + 1);
    setRelayNodes(Array(8).fill(false));
    setChallengeNotice(null);
  }, [panel]);
  useEffect(() => {
    if (panel !== "forge" || !completedMachines.includes("forge")) return;
    const modes: ForgeMode[] = ["sum", "product", "evens"];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    const limit =
      mode === "product"
        ? Math.floor(Math.random() * 4) + 3
        : Math.floor(Math.random() * 7) + 4;
    const answer = forgeResult(mode, limit);
    setLoopMode(mode);
    setLoopLimit(limit);
    setLoopChoices(
      shuffle([
        Math.max(0, answer - Math.max(2, limit - 2)),
        answer,
        answer + Math.max(2, limit),
      ]),
    );
    setLoopResult(null);
    setLoopStep(-1);
    setChallengeNotice(null);
  }, [panel, completedMachines]);
  useEffect(() => {
    if (panel !== "archive") return;
    setArchivePrompt(Math.floor(Math.random() * archivePractice.length));
    setArchiveAnswer(null);
    setArchiveOrder(shuffle([0, 1, 2]));
  }, [panel]);
  useEffect(() => {
    if (loopResult === null) {
      setLoopStep(-1);
      return;
    }
    setLoopStep(0);
    const timer = setInterval(
      () => setLoopStep((step) => (step >= loopLimit - 1 ? step : step + 1)),
      480,
    );
    return () => clearInterval(timer);
  }, [loopResult, loopLimit]);
  useEffect(() => {
    if (abilities.length + powerPieces < 10 || coreReward) return;
    setCoreReward(true);
    setShowCoreReward(true);
    localStorage.setItem("axon-core-reward-v1", "1");
    setPracticeScore((current) => {
      const next = current + 1000;
      localStorage.setItem("axon-practice-score-v1", String(next));
      return next;
    });
    runtime.current?.activateCoreReward();
  }, [abilities.length, powerPieces, coreReward]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1814);
    scene.fog = new THREE.Fog(0x0d1814, 72, 172);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 280);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.42;
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const compactFx = matchMedia(
      "(max-width: 820px), (pointer: coarse)",
    ).matches;
    const bokeh = new BokehPass(scene, camera, {
      focus: 15,
      aperture: compactFx ? 0.000012 : 0.000045,
      maxblur: compactFx ? 0.0008 : 0.0028,
    });
    composer.addPass(bokeh);
    scene.add(new THREE.HemisphereLight(0xe0fff3, 0x173228, 2.65));
    scene.add(new THREE.AmbientLight(0x79a994, 0.7));
    const sun = new THREE.DirectionalLight(0xfff3d4, 4.2);
    sun.position.set(-18, 28, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -45;
    scene.add(sun);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x102d24,
      roughness: 0.82,
      metalness: 0.18,
    });
    const geo = new THREE.PlaneGeometry(180, 180);
    geo.rotateX(-Math.PI / 2);
    const terrain = new THREE.Mesh(geo, groundMat);
    terrain.receiveShadow = true;
    scene.add(terrain);
    const groundSurfaces: THREE.Object3D[] = [terrain];
    const groundRay = new THREE.Raycaster();
    let groundCeiling = 40;
    const groundAt = (x: number, z: number, maxY = groundCeiling) => {
      groundRay.set(new THREE.Vector3(x, maxY, z), new THREE.Vector3(0, -1, 0));
      return groundRay.intersectObjects(groundSurfaces, false)[0]?.point.y ?? 0;
    };
    const grid = new THREE.GridHelper(180, 90, 0x4f806f, 0x234c3e);
    grid.position.y = 0.025;
    (grid.material as THREE.Material).opacity = 0.28;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);
    const makeBox = (
      w: number,
      h: number,
      d: number,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      return m;
    };
    const dark = new THREE.MeshStandardMaterial({
      color: 0x101713,
      roughness: 0.48,
      metalness: 0.72,
    });
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x173c30,
      roughness: 0.72,
      metalness: 0.28,
    });
    const copper = new THREE.MeshStandardMaterial({
      color: 0xffa44f,
      emissive: 0xff5a12,
      emissiveIntensity: 2.2,
      roughness: 0.35,
      metalness: 0.7,
    });
    const topBorderMat = new THREE.LineBasicMaterial({
      color: 0x65efff,
      transparent: true,
      opacity: 0.78,
    });
    const addTopBorder = (
      mesh: THREE.Mesh,
      w: number,
      h: number,
      d: number,
      material = topBorderMat,
    ) => {
      const y = h / 2 + 0.025,
        points = [
          new THREE.Vector3(-w / 2, y, -d / 2),
          new THREE.Vector3(w / 2, y, -d / 2),
          new THREE.Vector3(w / 2, y, d / 2),
          new THREE.Vector3(-w / 2, y, d / 2),
        ];
      mesh.add(
        new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(points),
          material,
        ),
      );
    };
    const createBatteryModel = (color: number) => {
      const group = new THREE.Group();
      const glow = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 2.4,
        metalness: 0.55,
        roughness: 0.25,
      });
      const cell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.34, 1.1, 18),
        new THREE.MeshStandardMaterial({
          color: 0x17201d,
          metalness: 0.82,
          roughness: 0.3,
        }),
      );
      cell.rotation.z = Math.PI / 2;
      group.add(cell);
      [-0.58, 0.58].forEach((x) => {
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.38, 0.12, 18),
          glow,
        );
        cap.rotation.z = Math.PI / 2;
        cap.position.x = x;
        group.add(cap);
      });
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.055, 8, 24),
        glow,
      );
      band.rotation.y = Math.PI / 2;
      group.add(band);
      return group;
    };
    const controlsCanvas = document.createElement("canvas");
    controlsCanvas.width = 718;
    controlsCanvas.height = 512;
    const controlsTexture = new THREE.CanvasTexture(controlsCanvas);
    controlsTexture.colorSpace = THREE.SRGBColorSpace;
    const drawControlDisplay = () => {
      const ctx = controlsCanvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#07110d";
      ctx.fillRect(0, 0, 718, 512);
      ctx.strokeStyle = "#38e6ff";
      ctx.lineWidth = 5;
      ctx.strokeRect(18, 18, 682, 476);
      ctx.fillStyle = "#38e6ff";
      ctx.font = "700 31px monospace";
      ctx.fillText("SHELL CONTROL MAP", 42, 68);
      ctx.fillStyle = "#7fa396";
      ctx.font = "20px monospace";
      ctx.fillText(
        compactFx ? "TOUCH CONTROL INTERFACE" : "LIVE MODIFICATION INTERFACE",
        42,
        104,
      );
      const rows: [
        [string, string, Ability | null],
        [string, string, Ability | null],
        [string, string, Ability | null],
        [string, string, Ability | null],
        [string, string, Ability | null],
      ] = compactFx
        ? [
            ["MOVE / STEER", "LEFT STICK", null],
            ["CAMERA ORBIT", "RIGHT STICK", null],
            ["OVERCLOCK", "BOOST TOGGLE", "sprint"],
            ["ACTUATOR", "JUMP BUTTON", "jump"],
            ["OPTICAL SCAN", "TAP PROMPT // NEAR", "scan"],
          ]
        : [
            ["MOVE / STEER", "W S / A D", null],
            ["CAMERA ORBIT", "LEFT MOUSE DRAG", null],
            ["OVERCLOCK", "SHIFT", "sprint"],
            ["ACTUATOR", "SPACE", "jump"],
            ["OPTICAL SCAN", "E // NEAR MACHINES", "scan"],
          ];
      rows.forEach(([label, key, ability], i) => {
        const y = 164 + i * 66,
          online = !ability || abilitiesRef.current.has(ability);
        ctx.fillStyle = online ? "#d8e8df" : "#56665e";
        ctx.font = "700 25px monospace";
        ctx.fillText(label, 42, y);
        ctx.fillStyle = online ? "#c8ff55" : "#526158";
        ctx.textAlign = "right";
        ctx.font =
          key.length > 18
            ? "700 15px monospace"
            : key.length > 12
              ? "700 18px monospace"
              : "700 23px monospace";
        ctx.fillText(online ? key : "LOCKED", 676, y);
        ctx.textAlign = "left";
        ctx.strokeStyle = online ? "#254c3d" : "#1b2822";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(42, y + 20);
        ctx.lineTo(676, y + 20);
        ctx.stroke();
      });
      controlsTexture.needsUpdate = true;
    };
    drawControlDisplay();
    const controlScreenShell = makeBox(8.1, 5.8, 0.5, dark, -12, 3.05, 0.2);
    addTopBorder(controlScreenShell, 8.1, 5.8, 0.5);
    const screenGeometry = new THREE.PlaneGeometry(7.3, 5),
      screenMaterial = new THREE.MeshBasicMaterial({
        map: controlsTexture,
        toneMapped: false,
      });
    const controlScreenFront = new THREE.Mesh(screenGeometry, screenMaterial);
    controlScreenFront.position.set(-12, 3.1, 0.46);
    scene.add(controlScreenFront);
    const controlScreenBack = new THREE.Mesh(screenGeometry, screenMaterial);
    controlScreenBack.position.set(-12, 3.1, -0.06);
    controlScreenBack.rotation.y = Math.PI;
    scene.add(controlScreenBack);
    makeBox(0.35, 2.1, 0.35, dark, -15.15, 1.05, 0.2);
    makeBox(0.35, 2.1, 0.35, dark, -8.85, 1.05, 0.2);
    // Distant machine enclosure: circuit-stars, cooling fans, and RAM light banks
    const fanRigs: THREE.Group[] = [];
    const skyGlow = new THREE.MeshStandardMaterial({
      color: 0x35e7ff,
      emissive: 0x11b9e8,
      emissiveIntensity: 3.2,
      transparent: true,
      opacity: 0.82,
    });
    [-34, 34].forEach((x, index) => {
      const fan = new THREE.Group();
      fan.position.set(x, 25, -78);
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(12, 0.55, 12, 64),
        skyGlow,
      );
      fan.add(rim);
      const hubMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 1.4, 0.8, 24),
        skyGlow,
      );
      hubMesh.rotation.x = Math.PI / 2;
      fan.add(hubMesh);
      for (let n = 0; n < 8; n++) {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 8, 0.22),
          new THREE.MeshStandardMaterial({
            color: index ? 0x1b4760 : 0x203d52,
            emissive: index ? 0x0f91d1 : 0x195f96,
            emissiveIntensity: 1.4,
            transparent: true,
            opacity: 0.72,
          }),
        );
        blade.position.y = 5.1;
        blade.rotation.z = (n * Math.PI) / 4;
        const pivot = new THREE.Group();
        pivot.rotation.z = (n * Math.PI) / 4;
        pivot.add(blade);
        fan.add(pivot);
      }
      scene.add(fan);
      fanRigs.push(fan);
      const fanLight = new THREE.PointLight(
        index ? 0x38e6ff : 0x6da8ff,
        38,
        44,
      );
      fanLight.position.set(x, 25, -70);
      scene.add(fanLight);
    });
    const starPositions: number[] = [];
    for (let i = 0; i < 340; i++) {
      const side = i % 4;
      const x =
          side === 0
            ? (Math.random() - 0.5) * 160
            : side === 3
              ? (Math.random() - 0.5) * 145
              : side === 1
                ? -104
                : 104,
        z = side === 0 ? -104 : side === 3 ? 112 : (Math.random() - 0.5) * 140;
      starPositions.push(x, 8 + Math.random() * 52, z);
    }
    const stars = new THREE.Points(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(starPositions, 3),
      ),
      new THREE.PointsMaterial({
        color: 0x7cf5ff,
        size: 0.28,
        transparent: true,
        opacity: 0.72,
        sizeAttenuation: true,
      }),
    );
    scene.add(stars);
    const ramGlow = new THREE.MeshStandardMaterial({
      color: 0x152b28,
      emissive: 0x28ffc5,
      emissiveIntensity: 2.4,
    });
    [-72, 72].forEach((x) => {
      for (let z = -55; z <= 50; z += 18) {
        makeBox(2.4, 15, 10, dark, x, 8, z);
        for (let y = 3; y <= 13; y += 2.5)
          makeBox(2.55, 0.35, 8.6, ramGlow, x, y, z);
      }
    });
    // PCB edge rails and copper trace highways
    makeBox(180, 0.7, 2, dark, 0, -0.25, -89);
    makeBox(180, 0.7, 2, dark, 0, -0.25, 89);
    makeBox(2, 0.7, 176, dark, -89, -0.25, 0);
    makeBox(2, 0.7, 176, dark, 89, -0.25, 0);
    makeBox(178, 0.12, 0.22, skyGlow, 0, 0.14, -88.9);
    makeBox(178, 0.12, 0.22, skyGlow, 0, 0.14, 88.9);
    makeBox(0.22, 0.12, 176, skyGlow, -88.9, 0.14, 0);
    makeBox(0.22, 0.12, 176, skyGlow, 88.9, 0.14, 0);
    const addTrace = (
      a: [number, number],
      b: [number, number],
      width = 0.34,
    ) => {
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        length = Math.hypot(dx, dz);
      const trace = makeBox(
        width,
        0.028,
        length,
        copper,
        (a[0] + b[0]) / 2,
        0.048,
        (a[1] + b[1]) / 2,
      );
      trace.rotation.y = Math.atan2(dx, dz);
    };
    const addBus = (points: [number, number][], width = 0.34) =>
      points.slice(1).forEach((point, i) => addTrace(points[i], point, width));
    addBus(
      [
        [-38, -28],
        [-38, -8],
        [0, -8],
        [0, 0],
      ],
      0.62,
    );
    addBus(
      [
        [36, -34],
        [36, -8],
        [0, -8],
      ],
      0.62,
    );
    addBus(
      [
        [42, 30],
        [42, 8],
        [0, 8],
        [0, 0],
      ],
      0.62,
    );
    addBus(
      [
        [0, 80],
        [0, 8],
      ],
      0.7,
    );
    addBus(
      [
        [0, 72],
        [60, 72],
        [60, 63],
      ],
      0.34,
    );
    addBus(
      [
        [-34, 72],
        [-34, 54],
        [0, 54],
      ],
      0.34,
    );
    addBus(
      [
        [-20, -30],
        [-20, -20],
        [-38, -20],
      ],
      0.3,
    );
    addBus(
      [
        [-14, -30],
        [-14, -16],
        [-38, -16],
      ],
      0.3,
    );
    addBus(
      [
        [-8, -30],
        [-8, -12],
        [-38, -12],
      ],
      0.3,
    );
    addBus(
      [
        [15, 26],
        [15, 8],
        [42, 8],
      ],
      0.3,
    );
    addBus(
      [
        [21, 26],
        [21, 12],
        [42, 12],
      ],
      0.3,
    );
    addBus(
      [
        [27, 26],
        [27, 16],
        [42, 16],
      ],
      0.3,
    );
    addBus(
      [
        [46, -12],
        [36, -12],
        [36, -34],
      ],
      0.3,
    );
    addBus(
      [
        [52, -12],
        [52, -20],
        [36, -20],
      ],
      0.3,
    );
    addBus(
      [
        [-58, 12],
        [-38, 12],
        [-38, -8],
      ],
      0.42,
    );
    addBus(
      [
        [8, -46],
        [8, -34],
        [36, -34],
      ],
      0.42,
    );
    addBus(
      [
        [13, 45],
        [42, 45],
        [42, 30],
      ],
      0.42,
    );
    addBus(
      [
        [-48, 52],
        [-48, 8],
        [0, 8],
      ],
      0.42,
    );
    const brandCanvas = document.createElement("canvas");
    brandCanvas.width = 1536;
    brandCanvas.height = 512;
    const brandContext = brandCanvas.getContext("2d");
    if (brandContext) {
      brandContext.clearRect(0, 0, 1536, 512);
      brandContext.fillStyle = "#08130f";
      brandContext.fillRect(0, 0, 1536, 512);
      brandContext.strokeStyle = "#2b746c";
      brandContext.lineWidth = 8;
      brandContext.strokeRect(20, 20, 1496, 472);
      brandContext.textAlign = "center";
      brandContext.fillStyle = "#c8ff55";
      brandContext.shadowColor = "#6effb3";
      brandContext.shadowBlur = 34;
      brandContext.font = "800 168px sans-serif";
      brandContext.fillText("DANIEL SILVA", 768, 286);
      brandContext.shadowBlur = 0;
      brandContext.fillStyle = "#61ddeb";
      brandContext.font = "700 31px monospace";
      brandContext.letterSpacing = "12px";
      brandContext.fillText("CREATIVE DEVELOPER // SYSTEM BUILDER", 768, 382);
    }
    const brandTexture = new THREE.CanvasTexture(brandCanvas);
    brandTexture.colorSpace = THREE.SRGBColorSpace;
    brandTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const plaqueBase = makeBox(25, 0.08, 9, dark, 18, 0.02, 0.2);
    const plaqueBorder = new THREE.LineBasicMaterial({
      color: 0x56edee,
      transparent: true,
      opacity: 0.9,
    });
    addTopBorder(plaqueBase, 25, 0.08, 9, plaqueBorder);
    const brandGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(23.8, 7.8),
      new THREE.MeshBasicMaterial({
        map: brandTexture,
        transparent: true,
        opacity: 0.94,
        toneMapped: false,
      }),
    );
    brandGlass.rotation.x = -Math.PI / 2;
    brandGlass.position.set(18, 0.075, 0.2);
    scene.add(brandGlass);
    [
      [18, -4.25, 24.9, 0.08],
      [18, 4.65, 24.9, 0.08],
      [5.55, 0.2, 0.08, 8.9],
      [30.45, 0.2, 0.08, 8.9],
    ].forEach(([x, z, w, d]) => makeBox(w, 0.055, d, skyGlow, x, 0.09, z));
    // East-side identity hologram, positioned between the name plaque and RAM bank.
    const profileTexture = new THREE.TextureLoader().load(
      "/daniel-silva-profile.png",
    );
    profileTexture.colorSpace = THREE.SRGBColorSpace;
    const hologramMaterial = new THREE.MeshBasicMaterial({
      map: profileTexture,
      color: 0xc8f8ff,
      transparent: true,
      opacity: 0.96,
      blending: THREE.NormalBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const profileHologram = new THREE.Mesh(
      new THREE.PlaneGeometry(7.4, 4.8),
      hologramMaterial,
    );
    profileHologram.rotation.y = -Math.PI / 2;
    profileHologram.position.set(profileSite.x, 3.65, profileSite.z);
    scene.add(profileHologram);
    const hologramFrame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(7.75, 5.15)),
      new THREE.LineBasicMaterial({ color: 0x38e6ff, transparent: true, opacity: 0.9 }),
    );
    hologramFrame.rotation.y = -Math.PI / 2;
    hologramFrame.position.copy(profileHologram.position);
    scene.add(hologramFrame);
    const hologramBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.5, 0.35, 40),
      new THREE.MeshStandardMaterial({
        color: 0x122420,
        emissive: 0x38e6ff,
        emissiveIntensity: 1.4,
        metalness: 0.8,
        roughness: 0.25,
      }),
    );
    hologramBase.position.set(profileSite.x, 0.18, profileSite.z);
    scene.add(hologramBase);
    const profileLight = new THREE.PointLight(0x38e6ff, 18, 18);
    profileLight.position.set(profileSite.x - 2, 4, profileSite.z);
    scene.add(profileLight);
    // Playable prototype archive between the mirror maze and Power Nexus.
    const prototypeCanvas = document.createElement("canvas");
    prototypeCanvas.width = 1024;
    prototypeCanvas.height = 512;
    const prototypeContext = prototypeCanvas.getContext("2d");
    if (prototypeContext) {
      const gradient = prototypeContext.createLinearGradient(0, 0, 1024, 512);
      gradient.addColorStop(0, "#061310");
      gradient.addColorStop(1, "#0a2620");
      prototypeContext.fillStyle = gradient;
      prototypeContext.fillRect(0, 0, 1024, 512);
      // Static cartridge-era title artwork for the dormant archive screen.
      prototypeContext.fillStyle = "#16493f";
      for (let i = 0; i < 34; i++) {
        const x = (i * 197) % 1000 + 12;
        const y = (i * 83) % 235 + 18;
        prototypeContext.fillRect(x, y, i % 4 === 0 ? 5 : 3, i % 4 === 0 ? 5 : 3);
      }
      prototypeContext.strokeStyle = "#216e5e";
      prototypeContext.lineWidth = 5;
      for (let x = -80; x < 1100; x += 96) {
        prototypeContext.beginPath();
        prototypeContext.moveTo(512, 330);
        prototypeContext.lineTo(x, 512);
        prototypeContext.stroke();
      }
      for (let y = 350; y < 512; y += 38) {
        prototypeContext.beginPath();
        prototypeContext.moveTo(0, y);
        prototypeContext.lineTo(1024, y);
        prototypeContext.stroke();
      }
      prototypeContext.fillStyle = "#070d11";
      prototypeContext.fillRect(445, 294, 134, 88);
      prototypeContext.fillStyle = "#a9b8b6";
      prototypeContext.fillRect(461, 268, 102, 78);
      prototypeContext.fillStyle = "#78f4ff";
      prototypeContext.fillRect(471, 280, 82, 45);
      prototypeContext.fillStyle = "#071411";
      prototypeContext.fillRect(485, 292, 13, 13);
      prototypeContext.fillRect(526, 292, 13, 13);
      prototypeContext.fillStyle = "#43e5c4";
      prototypeContext.fillRect(489, 296, 7, 7);
      prototypeContext.fillRect(530, 296, 7, 7);
      prototypeContext.fillStyle = "#101b1c";
      prototypeContext.beginPath();
      prototypeContext.arc(512, 385, 43, 0, Math.PI * 2);
      prototypeContext.fill();
      prototypeContext.strokeStyle = "#43e5c4";
      prototypeContext.lineWidth = 8;
      prototypeContext.stroke();
      prototypeContext.textAlign = "center";
      prototypeContext.shadowColor = "#43e5c4";
      prototypeContext.shadowBlur = 22;
      prototypeContext.fillStyle = "#a5ffec";
      prototypeContext.font = "900 78px monospace";
      prototypeContext.fillText("AXON", 512, 112);
      prototypeContext.fillStyle = "#43e5c4";
      prototypeContext.font = "700 48px monospace";
      prototypeContext.fillText("OVERRIDE", 512, 164);
      prototypeContext.shadowBlur = 0;
      prototypeContext.fillStyle = "#9bbeb6";
      prototypeContext.font = "19px monospace";
      prototypeContext.fillText("PROTOTYPE CARTRIDGE // BUILD 0.1", 512, 205);
      prototypeContext.fillStyle = "#c8ff55";
      prototypeContext.font = "700 23px monospace";
      prototypeContext.fillText("[ SCAN TO PLAY ]", 512, 468);
    }
    const prototypeTexture = new THREE.CanvasTexture(prototypeCanvas);
    prototypeTexture.colorSpace = THREE.SRGBColorSpace;
    const prototypeHousing = new THREE.MeshStandardMaterial({
      color: 0x182824,
      emissive: 0x0b4036,
      emissiveIntensity: 1.35,
      metalness: 0.82,
      roughness: 0.24,
    });
    const prototypeBezel = new THREE.MeshStandardMaterial({
      color: 0x43e5c4,
      emissive: 0x43e5c4,
      emissiveIntensity: 3.2,
      metalness: 0.3,
      roughness: 0.2,
      toneMapped: false,
    });
    makeBox(9.7, 6.1, 1.05, prototypeHousing, prototypeSite.x, 3.05, prototypeSite.z);
    const prototypeScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(8.5, 4.9),
      new THREE.MeshBasicMaterial({
        map: prototypeTexture,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    prototypeScreen.position.set(prototypeSite.x, 3.15, prototypeSite.z - 0.68);
    prototypeScreen.rotation.y = Math.PI;
    prototypeScreen.renderOrder = 10;
    scene.add(prototypeScreen);
    makeBox(9.05, 0.12, 0.15, prototypeBezel, prototypeSite.x, 5.72, prototypeSite.z - 0.57);
    makeBox(9.05, 0.12, 0.15, prototypeBezel, prototypeSite.x, 0.58, prototypeSite.z - 0.57);
    makeBox(0.12, 5.25, 0.15, prototypeBezel, prototypeSite.x - 4.47, 3.15, prototypeSite.z - 0.57);
    makeBox(0.12, 5.25, 0.15, prototypeBezel, prototypeSite.x + 4.47, 3.15, prototypeSite.z - 0.57);
    makeBox(4.8, 0.35, 2.8, prototypeHousing, prototypeSite.x, 0.18, prototypeSite.z);
    makeBox(3.8, 0.08, 2.25, prototypeBezel, prototypeSite.x, 0.39, prototypeSite.z - 0.2);
    const prototypeLight = new THREE.PointLight(0x59f5d6, 28, 22);
    prototypeLight.position.set(prototypeSite.x, 3, prototypeSite.z - 3);
    scene.add(prototypeLight);
    const vias = new THREE.MeshStandardMaterial({
      color: 0xbfc9bd,
      emissive: 0x31473d,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.25,
    });
    for (let z = -70; z <= 70; z += 14) {
      [-58, 58].forEach((x) => {
        const v = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.55, 0.12, 20),
          vias,
        );
        v.position.set(x, 0.08, z);
        scene.add(v);
      });
    }
    // Fabricated decks and traversable ramps
    const componentSolids: {
      x: number;
      z: number;
      hx: number;
      hz: number;
      top: number;
    }[] = [];
    const addDeck = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
    ) => {
      const m = makeBox(w, h, d, deckMat, x, y, z);
      addTopBorder(m, w, h, d);
      groundSurfaces.push(m);
      return m;
    };
    addDeck(24, 3, 22, -36, 1.5, 28);
    addDeck(26, 2.2, 22, 36, 1.1, -32);
    addDeck(22, 1.4, 20, 42, 0.7, 30);
    componentSolids.push(
      { x: -36, z: 28, hx: 12.15, hz: 11.15, top: 3 },
      { x: 36, z: -32, hx: 13.15, hz: 11.15, top: 2.2 },
      { x: 42, z: 30, hx: 11.15, hz: 10.15, top: 1.4 },
    );
    const addRamp = (
      w: number,
      len: number,
      x: number,
      z: number,
      height: number,
      angle: number,
    ) => {
      const r = makeBox(w, 0.5, len, deckMat, x, height / 2, z);
      addTopBorder(r, w, 0.5, len);
      r.rotation.x = angle;
      groundSurfaces.push(r);
      return r;
    };
    addRamp(8, 18, -36, 11, 1.55, -Math.atan2(3, 18));
    addRamp(8, 16, 36, -15, 1.15, Math.atan2(2.2, 16));
    addRamp(7, 14, 42, 16, 0.75, -Math.atan2(1.4, 14));
    // Degree credential illuminated across the east wall of Capacitor Terrace.
    const degreeCanvas = document.createElement("canvas");
    degreeCanvas.width = 1536;
    degreeCanvas.height = 384;
    const degreeContext = degreeCanvas.getContext("2d");
    if (degreeContext) {
      degreeContext.fillStyle = "#07110f";
      degreeContext.fillRect(0, 0, 1536, 384);
      degreeContext.strokeStyle = "#38e6ff";
      degreeContext.lineWidth = 8;
      degreeContext.strokeRect(18, 18, 1500, 348);
      degreeContext.fillStyle = "#38e6ff";
      degreeContext.fillRect(54, 74, 12, 236);
      degreeContext.textAlign = "left";
      degreeContext.shadowColor = "#38e6ff";
      degreeContext.shadowBlur = 24;
      degreeContext.fillStyle = "#baf8ff";
      degreeContext.font = "700 92px monospace";
      degreeContext.fillText("BS IN GAME PROGRAMMING", 108, 180);
      degreeContext.shadowBlur = 8;
      degreeContext.fillStyle = "#73cfdc";
      degreeContext.font = "38px monospace";
      degreeContext.fillText("UNIVERSITY OF ADVANCING TECHNOLOGY", 112, 258);
    }
    const degreeTexture = new THREE.CanvasTexture(degreeCanvas);
    degreeTexture.colorSpace = THREE.SRGBColorSpace;
    const degreeDisplay = new THREE.Mesh(
      new THREE.PlaneGeometry(18.8, 2.45),
      new THREE.MeshBasicMaterial({
        map: degreeTexture,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    );
    degreeDisplay.rotation.y = Math.PI / 2;
    degreeDisplay.position.set(-23.98, 1.5, 28);
    degreeDisplay.renderOrder = 5;
    scene.add(degreeDisplay);
    // Tractor beam through a framed developer deck
    addDeck(8, 0.7, 18, -42, 10.05, 28);
    addDeck(8, 0.7, 18, -30, 10.05, 28);
    addDeck(4, 0.7, 7, -36, 10.05, 22.5);
    addDeck(4, 0.7, 7, -36, 10.05, 33.5);
    const liftLightMat = new THREE.MeshStandardMaterial({
      color: 0x74f5ff,
      emissive: 0x25dfff,
      emissiveIntensity: 1.35,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const liftBase = makeBox(3.5, 0.08, 3.5, liftLightMat, -36, 0.04, 28);
    const liftColumn = new THREE.Mesh(
      new THREE.CylinderGeometry(1.65, 1.65, 10.4, 24, 1, true),
      liftLightMat,
    );
    liftColumn.position.set(-36, 5.2, 28);
    scene.add(liftColumn);
    for (let y = 0.35; y <= 10.35; y += 1.35) {
      const liftRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.72, 0.045, 8, 32),
        liftLightMat,
      );
      liftRing.rotation.x = Math.PI / 2;
      liftRing.position.set(-36, y, 28);
      scene.add(liftRing);
    }
    const lookoutGlass = new THREE.MeshStandardMaterial({
      color: 0x56dff2,
      emissive: 0x1da9ce,
      emissiveIntensity: 1.25,
      transparent: true,
      opacity: 0.26,
      metalness: 0.18,
      roughness: 0.12,
      depthWrite: false,
    });
    const addLookoutRail = (w: number, d: number, x: number, z: number) => {
      const rail = makeBox(w, 1.65, d, lookoutGlass, x, 11.23, z);
      addTopBorder(rail, w, 1.65, d);
    };
    addLookoutRail(20, 0.18, -36, 19.08);
    addLookoutRail(0.18, 18, -45.92, 28);
    addLookoutRail(0.18, 18, -26.08, 28);
    addLookoutRail(8, 0.18, -42, 36.92);
    addLookoutRail(8, 0.18, -30, 36.92);
    const lookoutButtonMaterial = new THREE.MeshStandardMaterial({
      color: 0x263b30,
      emissive: 0xc8ff55,
      emissiveIntensity: 1.8,
      metalness: 0.7,
      roughness: 0.22,
    });
    const lookoutButton = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.25, 0.18, 32),
      lookoutButtonMaterial,
    );
    lookoutButton.position.set(-27.8, 10.49, 20.6);
    scene.add(lookoutButton);
    const fireworkColors = [0x43e5c4, 0xc8ff55, 0xc56cff, 0xff9b45];
    const fireworkBursts = [
      { position: [-5, 27, 18], delay: 0.95 },
      { position: [34, 32, -12], delay: 2.05 },
      { position: [-48, 35, -25], delay: 3.15 },
      { position: [18, 42, 38], delay: 4.25 },
    ].map((burst, burstIndex) => {
      const group = new THREE.Group();
      group.position.set(...(burst.position as [number, number, number]));
      const material = new THREE.MeshBasicMaterial({
        color: fireworkColors[burstIndex],
        transparent: true,
        opacity: 0,
        toneMapped: false,
      });
      const particles: THREE.Mesh[] = [];
      for (let i = 0; i < 30; i++) {
        const particle = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 6, 6),
          material,
        );
        const phi = (i / 30) * Math.PI * 2;
        const rise = ((i * 7) % 15) / 14 * 1.5 - 0.4;
        particle.userData.direction = new THREE.Vector3(
          Math.cos(phi) * (0.7 + (i % 4) * 0.12),
          rise,
          Math.sin(phi) * (0.7 + ((i + 2) % 4) * 0.12),
        ).normalize();
        group.add(particle);
        particles.push(particle);
      }
      const light = new THREE.PointLight(fireworkColors[burstIndex], 0, 35);
      group.add(light);
      group.visible = false;
      scene.add(group);
      const rocketMaterial = new THREE.MeshBasicMaterial({
        color: fireworkColors[burstIndex],
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      const rocket = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 10, 10),
        rocketMaterial,
      );
      const trail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.16, 1, 8),
        rocketMaterial,
      );
      rocket.visible = false;
      trail.visible = false;
      scene.add(rocket, trail);
      return { ...burst, group, particles, material, light, rocket, trail, rocketMaterial };
    });
    const laserColors = [0x43e5c4, 0xc56cff, 0xc8ff55, 0xff9b45, 0x38e6ff, 0xff4f91];
    const laserOrigins: [number, number, number][] = [
      [-72, 1, 55], [72, 1, 55], [-62, 1, -45],
      [62, 1, -45], [-20, 1, 78], [20, 1, 78],
    ];
    const laserBeams = laserOrigins.map((origin, index) => {
      const material = new THREE.MeshBasicMaterial({
        color: laserColors[index],
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.1, 1, 8),
        material,
      );
      mesh.visible = false;
      scene.add(mesh);
      return { origin: new THREE.Vector3(...origin), mesh, material, phase: index * 1.17 };
    });
    let lightShowStart = -20;
    let lookoutLatched = false;
    // Southbound light bridge and elevated platform challenge
    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0x18363a,
      emissive: 0x32d9ff,
      emissiveIntensity: 1.1,
      transparent: true,
      opacity: 0.66,
    });
    const bridge = makeBox(4, 0.28, 23, bridgeMat, -36, 10.55, 48.5);
    addTopBorder(bridge, 4, 0.28, 23);
    groundSurfaces.push(bridge);
    const movingPlatforms: THREE.Mesh[] = [];
    const movingBases: { x: number; z: number; phase: number }[] = [];
    const addPuzzlePlatform = (
      x: number,
      z: number,
      moving = false,
      phase = 0,
    ) => {
      const platform = makeBox(6, 0.48, 6, deckMat, x, 10.35, z);
      addTopBorder(platform, 6, 0.48, 6);
      groundSurfaces.push(platform);
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(2.65, 0.06, 8, 36),
        bridgeMat,
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.28;
      platform.add(rim);
      if (moving) {
        movingPlatforms.push(platform);
        movingBases.push({ x, z, phase });
      }
      return platform;
    };
    addPuzzlePlatform(-36, 63);
    addPuzzlePlatform(-24, 63, true, 0);
    addPuzzlePlatform(-12, 63);
    addPuzzlePlatform(0, 63, true, 1.5);
    addPuzzlePlatform(12, 63);
    addPuzzlePlatform(24, 63, true, 3);
    addPuzzlePlatform(36, 63);
    addPuzzlePlatform(48, 63, true, 4.5);
    const goalPlatform = addPuzzlePlatform(60, 63);
    const powerPiece = createBatteryModel(0xbaff4b);
    powerPiece.scale.setScalar(1.15);
    powerPiece.position.set(60, 11.75, 63);
    scene.add(powerPiece);
    const pieceLight = new THREE.PointLight(0xbaff4b, 14, 10);
    powerPiece.add(pieceLight);
    let pieceCollected = localStorage.getItem("axon-platform-cmos-v1") === "1";
    powerPiece.visible = !pieceCollected;
    // Component fields: capacitors form steps, chips and heat sinks form architecture
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x28332d,
      metalness: 0.74,
      roughness: 0.32,
    });
    [
      [-20, -30],
      [-14, -30],
      [-8, -30],
      [15, 26],
      [21, 26],
      [27, 26],
      [46, -12],
      [52, -12],
    ].forEach(([x, z], i) => {
      const h = 1 + (i % 3) * 0.45;
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(1.45, 1.45, h, 28),
        capMat,
      );
      cap.position.set(x, h / 2, z);
      cap.castShadow = true;
      cap.receiveShadow = true;
      scene.add(cap);
      groundSurfaces.push(cap);
      const capBorder = new THREE.Mesh(
        new THREE.TorusGeometry(1.37, 0.045, 8, 40),
        new THREE.MeshBasicMaterial({
          color: 0x65efff,
          transparent: true,
          opacity: 0.82,
        }),
      );
      capBorder.rotation.x = Math.PI / 2;
      capBorder.position.set(x, h + 0.025, z);
      scene.add(capBorder);
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, h + 0.05, 2.92),
        copper,
      );
      stripe.position.set(x, h / 2 + 0.03, z);
      scene.add(stripe);
      const capLight = new THREE.PointLight(0xff6a22, 2.8, 5);
      capLight.position.set(x, h + 0.35, z);
      scene.add(capLight);
      componentSolids.push({ x, z, hx: 1.55, hz: 1.55, top: h });
    });
    const transistorSteps: [number, number, number][] = [
      [-8, -36, 2.35],
      [-8, -42, 2.8],
      [-8, -48, 3.25],
      [-14, -48, 3.7],
      [-20, -48, 4.15],
      [-26, -48, 4.6],
      [-32, -48, 5.05],
      [-38, -48, 5.5],
      [-44, -48, 5.95],
      [-44, -54, 6.4],
      [-44, -60, 6.85],
      [-44, -66, 7.3],
      [-38, -66, 7.75],
      [-32, -66, 8.2],
      [-26, -66, 8.65],
      [-20, -66, 9.1],
      [-14, -66, 9.55],
      [-8, -66, 10],
    ];
    transistorSteps.forEach(([x, z, h]) => {
      const step = new THREE.Mesh(
        new THREE.CylinderGeometry(1.55, 1.55, h, 28),
        capMat,
      );
      step.position.set(x, h / 2, z);
      step.castShadow = true;
      step.receiveShadow = true;
      scene.add(step);
      groundSurfaces.push(step);
      const border = new THREE.Mesh(
        new THREE.TorusGeometry(1.47, 0.055, 8, 40),
        new THREE.MeshBasicMaterial({
          color: 0x65efff,
          transparent: true,
          opacity: 0.82,
        }),
      );
      border.rotation.x = Math.PI / 2;
      border.position.set(x, h + 0.025, z);
      scene.add(border);
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, h + 0.05, 3.12),
        copper,
      );
      stripe.position.set(x, h / 2 + 0.03, z);
      scene.add(stripe);
      const stepLight = new THREE.PointLight(0xff6a22, 2.4, 5);
      stepLight.position.set(x, h + 0.35, z);
      scene.add(stepLight);
      componentSolids.push({ x, z, hx: 1.65, hz: 1.65, top: h });
    });
    const finalTransistorStep = transistorSteps[transistorSteps.length - 1];
    const transistorBattery = createBatteryModel(0xff8a42);
    transistorBattery.position.set(
      finalTransistorStep[0],
      finalTransistorStep[2] + 1.05,
      finalTransistorStep[1],
    );
    let transistorBatteryCollected =
      localStorage.getItem("axon-transistor-cmos-v1") === "1";
    transistorBattery.visible = !transistorBatteryCollected;
    scene.add(transistorBattery);
    // Southwest mirror maze: deterministic perfect maze with an eastern entrance.
    const mazeCols = 5,
      mazeRows = 5,
      mazeCell = 4.4,
      mazeOriginX = -82,
      mazeOriginZ = 58;
    const mazeWalls = Array.from({ length: mazeRows }, () =>
      Array.from({ length: mazeCols }, () => [true, true, true, true]),
    );
    const mazeVisited = Array.from({ length: mazeRows }, () =>
      Array(mazeCols).fill(false),
    );
    let mazeSeed = 9173;
    const mazeRandom = () => {
      mazeSeed = (mazeSeed * 16807) % 2147483647;
      return mazeSeed / 2147483647;
    };
    const mazeStack: [number, number][] = [[4, 0]];
    mazeVisited[0][4] = true;
    let mazeGoal: [number, number] = [4, 0];
    while (mazeStack.length) {
      const [column, row] = mazeStack[mazeStack.length - 1];
      const neighbors: [number, number, number, number][] = [
        [column, row - 1, 0, 2],
        [column + 1, row, 1, 3],
        [column, row + 1, 2, 0],
        [column - 1, row, 3, 1],
      ].filter(
        ([nextColumn, nextRow]) =>
          nextColumn >= 0 &&
          nextColumn < mazeCols &&
          nextRow >= 0 &&
          nextRow < mazeRows &&
          !mazeVisited[nextRow][nextColumn],
      );
      if (!neighbors.length) {
        mazeStack.pop();
        continue;
      }
      const [nextColumn, nextRow, wall, opposite] =
        neighbors[Math.floor(mazeRandom() * neighbors.length)];
      mazeWalls[row][column][wall] = false;
      mazeWalls[nextRow][nextColumn][opposite] = false;
      mazeVisited[nextRow][nextColumn] = true;
      mazeStack.push([nextColumn, nextRow]);
      mazeGoal = [nextColumn, nextRow];
    }
    const mirrorWall = new THREE.MeshStandardMaterial({
      color: 0x718b89,
      emissive: 0x071918,
      emissiveIntensity: 0.55,
      metalness: 0.96,
      roughness: 0.08,
    });
    const mazeLine = new THREE.LineBasicMaterial({
      color: 0x38e6ff,
      transparent: true,
      opacity: 0.9,
    });
    let mazeWallIndex = 0;
    const addMazeWall = (x: number, z: number, width: number, depth: number) => {
      const wall = makeBox(width, 6.4, depth, mirrorWall, x, 3.2, z);
      addTopBorder(wall, width, 6.4, depth, mazeLine);
      makeBox(0.09, 4.8, 0.09, skyGlow, x, 3.1, z);
      [1.35, 3.15, 4.95].forEach((y, patternIndex) => {
        const pattern = makeBox(
          width > depth ? width * 0.72 : width + 0.035,
          0.075,
          width > depth ? depth + 0.035 : depth * 0.72,
          patternIndex === 1 ? copper : skyGlow,
          x,
          y,
          z,
        );
        pattern.castShadow = false;
      });
      if (mazeWallIndex++ % 3 === 0) {
        const interiorLight = new THREE.PointLight(0x38e6ff, 5.5, 8);
        interiorLight.position.set(x, 2.7, z);
        scene.add(interiorLight);
      }
      componentSolids.push({
        x,
        z,
        hx: width / 2 + 0.22,
        hz: depth / 2 + 0.22,
        top: 6.4,
      });
    };
    for (let row = 0; row < mazeRows; row++) {
      for (let column = 0; column < mazeCols; column++) {
        const centerX = mazeOriginX + (column + 0.5) * mazeCell;
        const centerZ = mazeOriginZ + (row + 0.5) * mazeCell;
        if (mazeWalls[row][column][0])
          addMazeWall(centerX, centerZ - mazeCell / 2, mazeCell + 0.18, 0.32);
        if (mazeWalls[row][column][3])
          addMazeWall(centerX - mazeCell / 2, centerZ, 0.32, mazeCell + 0.18);
        if (row === mazeRows - 1 && mazeWalls[row][column][2])
          addMazeWall(centerX, centerZ + mazeCell / 2, mazeCell + 0.18, 0.32);
        if (
          column === mazeCols - 1 &&
          mazeWalls[row][column][1] &&
          row !== 0
        )
          addMazeWall(centerX + mazeCell / 2, centerZ, 0.32, mazeCell + 0.18);
      }
    }
    const entranceGlow = new THREE.MeshStandardMaterial({
      color: 0x143238,
      emissive: 0x38e6ff,
      emissiveIntensity: 3.4,
      metalness: 0.5,
      roughness: 0.25,
    });
    makeBox(0.34, 5.6, 0.34, entranceGlow, -59.7, 2.8, 58.15);
    makeBox(0.34, 5.6, 0.34, entranceGlow, -59.7, 2.8, 62.25);
    makeBox(0.34, 0.34, 4.45, entranceGlow, -59.7, 5.45, 60.2);
    const mazeSignCanvas = document.createElement("canvas");
    mazeSignCanvas.width = 768;
    mazeSignCanvas.height = 220;
    const mazeSignContext = mazeSignCanvas.getContext("2d");
    if (mazeSignContext) {
      mazeSignContext.fillStyle = "#06100d";
      mazeSignContext.fillRect(0, 0, 768, 220);
      mazeSignContext.strokeStyle = "#38e6ff";
      mazeSignContext.lineWidth = 8;
      mazeSignContext.strokeRect(10, 10, 748, 200);
      mazeSignContext.textAlign = "center";
      mazeSignContext.fillStyle = "#c8ff55";
      mazeSignContext.font = "800 55px monospace";
      mazeSignContext.fillText("MIRROR MAZE", 384, 93);
      mazeSignContext.fillStyle = "#38e6ff";
      mazeSignContext.font = "700 27px monospace";
      mazeSignContext.fillText("CMOS SIGNAL // ENTER", 384, 154);
    }
    const mazeSignTexture = new THREE.CanvasTexture(mazeSignCanvas);
    mazeSignTexture.colorSpace = THREE.SRGBColorSpace;
    const mazeSign = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 1.15),
      new THREE.MeshBasicMaterial({ map: mazeSignTexture, toneMapped: false }),
    );
    mazeSign.rotation.y = Math.PI / 2;
    mazeSign.position.set(-59.48, 4.55, 60.2);
    scene.add(mazeSign);
    const entranceLight = new THREE.PointLight(0x38e6ff, 14, 13);
    entranceLight.position.set(-58.8, 3, 60.2);
    scene.add(entranceLight);
    const mazeBattery = createBatteryModel(0xc56cff);
    mazeBattery.position.set(
      mazeOriginX + (mazeGoal[0] + 0.5) * mazeCell,
      1.3,
      mazeOriginZ + (mazeGoal[1] + 0.5) * mazeCell,
    );
    let mazeBatteryCollected = localStorage.getItem("axon-maze-cmos-v1") === "1";
    mazeBattery.visible = !mazeBatteryCollected;
    scene.add(mazeBattery);
    [
      [-58, 12, 10, 5],
      [8, -46, 13, 6],
      [13, 45, 9, 7],
      [-48, 52, 12, 6],
    ].forEach(([x, z, w, d]) => {
      const chip = makeBox(w, 1.1, d, dark, x, 0.55, z);
      addTopBorder(chip, w, 1.1, d);
      groundSurfaces.push(chip);
      for (let n = -w / 2 + 0.7; n < w / 2; n += 1.35) {
        makeBox(0.16, 0.18, 1.2, vias, x + n, 0.12, z - d / 2 - 0.65);
        makeBox(0.16, 0.18, 1.2, vias, x + n, 0.12, z + d / 2 + 0.65);
      }
      componentSolids.push({
        x,
        z,
        hx: w / 2 + 0.4,
        hz: d / 2 + 0.8,
        top: 1.1,
      });
    });
    const machineRings: THREE.Mesh[] = [],
      machineGlowMats: THREE.MeshStandardMaterial[] = [],
      machineLights: THREE.PointLight[] = [];
    let machineBootStart = -1;
    const scanAlreadyOnline = abilitiesRef.current.has("scan");
    landmarks.forEach((l, i) => {
      const c = new THREE.Color(l.color);
      const glow = new THREE.MeshStandardMaterial({
        color: scanAlreadyOnline ? c : new THREE.Color(0x17201d),
        emissive: c,
        emissiveIntensity: scanAlreadyOnline ? 2 : 0,
      });
      machineGlowMats.push(glow);
      const deckTop = l.id === "relay" ? 2.2 : l.id === "archive" ? 1.4 : 0;
      const machineW = i === 1 ? 6.5 : 5,
        machineD = i === 1 ? 4 : 5,
        machineH = i === 1 ? 4 : 5.8,
        baseY = deckTop + machineH / 2;
      makeBox(machineW, machineH, machineD, dark, l.x, baseY, l.z);
      for (let n = 0; n < 4; n++) {
        const across = -machineW * 0.34 + n * ((machineW * 0.68) / 3),
          deep = -machineD * 0.34 + n * ((machineD * 0.68) / 3);
        makeBox(
          0.14,
          3.8,
          0.14,
          glow,
          l.x + across,
          deckTop + 2.1,
          l.z + machineD / 2 + 0.05,
        );
        makeBox(
          0.14,
          3.8,
          0.14,
          glow,
          l.x + across,
          deckTop + 2.1,
          l.z - machineD / 2 - 0.05,
        );
        makeBox(
          0.14,
          3.8,
          0.14,
          glow,
          l.x + machineW / 2 + 0.05,
          deckTop + 2.1,
          l.z + deep,
        );
        makeBox(
          0.14,
          3.8,
          0.14,
          glow,
          l.x - machineW / 2 - 0.05,
          deckTop + 2.1,
          l.z + deep,
        );
      }
      const targetIntensity = l.id === "nexus" ? 32 : 22;
      const light = new THREE.PointLight(
        c,
        scanAlreadyOnline ? targetIntensity : 0,
        l.id === "nexus" ? 26 : 20,
      );
      light.position.set(l.x, deckTop + 5, l.z);
      scene.add(light);
      machineLights.push(light);
      const perimeter = new THREE.Mesh(
        new THREE.RingGeometry(7.8, 8, 96),
        new THREE.MeshBasicMaterial({
          color: c,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
        }),
      );
      perimeter.rotation.x = -Math.PI / 2;
      perimeter.position.set(l.x, deckTop + 0.08, l.z);
      perimeter.visible = scanAlreadyOnline;
      scene.add(perimeter);
      machineRings.push(perimeter);
    });
    const bot = new THREE.Group();
    const shell = new THREE.MeshStandardMaterial({
      color: 0xaeb9b5,
      roughness: 0.28,
      metalness: 0.78,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: 0x173238,
      emissive: 0x50ddf5,
      emissiveIntensity: 1.45,
      roughness: 0.38,
      metalness: 0.62,
    });
    const eyeAccent = accent.clone();
    eyeAccent.emissiveIntensity = 2.15;
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x67e9f4,
      transparent: true,
      opacity: 0.58,
    });
    const activatePrismCore = () => {
      accent.emissive.setHex(0xc56cff);
      accent.color.setHex(0x2b1738);
      eyeAccent.emissive.setHex(0xc8ff55);
      eyeAccent.color.setHex(0x273315);
      edgeMat.color.setHex(0xffd36a);
      edgeMat.opacity = 0.92;
    };
    if (localStorage.getItem("axon-core-reward-v1") === "1") activatePrismCore();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.08, 0.64), shell);
    body.position.y = 1.65;
    body.castShadow = true;
    body.add(
      new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), edgeMat),
    );
    bot.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.52, 0.56), shell);
    head.position.y = 2.45;
    head.castShadow = true;
    head.add(
      new THREE.LineSegments(new THREE.EdgesGeometry(head.geometry), edgeMat),
    );
    bot.add(head);
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.075, 0.028),
      eyeAccent,
    );
    visor.position.set(0, 2.47, 0.298);
    bot.add(visor);
    const rearBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.045, 0.028),
      accent,
    );
    rearBand.position.set(0, 1.72, -0.338);
    bot.add(rearBand);
    const wheelRig = new THREE.Group();
    wheelRig.position.y = 0.62;
    const wheelRadius = 0.42;
    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(wheelRadius, 0.13, 10, 28),
      dark,
    );
    wheel.rotation.y = Math.PI / 2;
    wheel.castShadow = true;
    wheelRig.add(wheel);
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.6, 12),
      accent,
    );
    hub.rotation.z = Math.PI / 2;
    wheelRig.add(hub);
    const tracker = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.11, 0.11),
      accent,
    );
    tracker.position.y = wheelRadius;
    tracker.rotation.z = Math.PI / 2;
    wheelRig.add(tracker);
    bot.add(wheelRig);
    [-0.32, 0.32].forEach((x) => {
      const fork = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.74, 0.13),
        shell,
      );
      fork.position.set(x, 1.04, 0);
      fork.rotation.z = x > 0 ? -0.25 : 0.25;
      fork.add(
        new THREE.LineSegments(new THREE.EdgesGeometry(fork.geometry), edgeMat),
      );
      bot.add(fork);
    });
    scene.add(bot);
    const scanGrid = new THREE.GridHelper(11, 14, 0x5ef2ff, 0x1b91aa);
    (scanGrid.material as THREE.Material).transparent = true;
    (scanGrid.material as THREE.Material).opacity = 0.7;
    scanGrid.visible = false;
    scene.add(scanGrid);
    const scanBeamGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const scanBeam = new THREE.Line(
      scanBeamGeometry,
      new THREE.LineBasicMaterial({
        color: 0x77f7ff,
        transparent: true,
        opacity: 0.85,
      }),
    );
    scanBeam.visible = false;
    scene.add(scanBeam);
    let scanTarget: (typeof scanSites)[number] | null = null,
      scanProgress = 0;
    const waveMaterial = new THREE.MeshBasicMaterial({
      color: 0x62f4ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const scanUnlockWave = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1, 96),
      waveMaterial,
    );
    scanUnlockWave.rotation.x = -Math.PI / 2;
    scanUnlockWave.position.y = 0.12;
    scanUnlockWave.visible = false;
    scene.add(scanUnlockWave);
    let scanWaveProgress = 0;
    const batteryData: {
      ability: Ability;
      name: string;
      color: number;
      x: number;
      y: number;
      z: number;
    }[] = [
      {
        ability: "sprint",
        name: "CMOS-01 // OVERCLOCK",
        color: 0xff8a42,
        x: 11,
        y: 1.15,
        z: -17,
      },
      {
        ability: "jump",
        name: "CMOS-02 // ACTUATOR",
        color: 0xc8ff55,
        x: -23,
        y: 1.15,
        z: -7,
      },
      {
        ability: "scan",
        name: "CMOS-03 // OPTICAL ARRAY",
        color: 0x54eaff,
        x: 15,
        y: 2.45,
        z: 26,
      },
    ];
    const batteryMeshes = batteryData.map((data) => {
      const group = createBatteryModel(data.color);
      group.position.set(data.x, data.y, data.z);
      group.visible = !abilitiesRef.current.has(data.ability);
      scene.add(group);
      return group;
    });
    const machineRewardStations = landmarks.map((landmark, index) => {
      const deckTop =
        landmark.id === "relay" ? 2.2 : landmark.id === "archive" ? 1.4 : 0;
      const x = landmark.x + (index % 2 === 0 ? 8 : -8);
      const z = landmark.z;
      const color = new THREE.Color(landmark.color);
      const padMaterial = new THREE.MeshStandardMaterial({
        color: 0x111b17,
        emissive: color,
        emissiveIntensity: 0.65,
        transparent: true,
        opacity: 0.72,
        metalness: 0.65,
        roughness: 0.3,
      });
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(1.45, 1.45, 0.12, 40),
        padMaterial,
      );
      pad.position.set(x, deckTop + 0.08, z);
      scene.add(pad);
      const outlineMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
      const outline = new THREE.Mesh(
        new THREE.RingGeometry(1.2, 1.38, 48),
        outlineMaterial,
      );
      outline.rotation.x = -Math.PI / 2;
      outline.position.set(x, deckTop + 0.15, z);
      scene.add(outline);
      const battery = createBatteryModel(color.getHex());
      battery.position.set(x, deckTop + 0.3, z);
      scene.add(battery);
      const active =
        completedMachinesRef.current.has(landmark.id) &&
        !collectedMachineRewardsRef.current.has(landmark.id);
      pad.visible = active;
      outline.visible = active;
      battery.visible = active;
      return {
        id: landmark.id,
        pad,
        padMaterial,
        outline,
        outlineMaterial,
        battery,
        baseY: deckTop,
        active,
        collected: false,
        rise: active ? 1 : 0,
        fade: 1,
      };
    });
    const solids: {
      x: number;
      z: number;
      hx: number;
      hz: number;
      top: number;
      bottom?: number;
    }[] = [
      ...landmarks.map((l, i) => ({
        x: l.x,
        z: l.z,
        hx: (i === 1 ? 6.5 : 5) / 2 + 0.65,
        hz: (i === 1 ? 4 : 5) / 2 + 0.65,
        top: i === 1 ? 6.2 : 5.8,
      })),
      ...componentSolids,
      { x: -36, z: 19.08, hx: 10, hz: 0.2, bottom: 10.35, top: 12.1 },
      { x: -45.92, z: 28, hx: 0.2, hz: 9, bottom: 10.35, top: 12.1 },
      { x: -26.08, z: 28, hx: 0.2, hz: 9, bottom: 10.35, top: 12.1 },
      { x: -42, z: 36.92, hx: 4, hz: 0.2, bottom: 10.35, top: 12.1 },
      { x: -30, z: 36.92, hx: 4, hz: 0.2, bottom: 10.35, top: 12.1 },
      { x: -12, z: 0.2, hx: 4.35, hz: 0.65, top: 5.95 },
      { x: profileSite.x, z: profileSite.z, hx: 0.75, hz: 4.1, top: 6.3 },
      { x: prototypeSite.x, z: prototypeSite.z, hx: 5.1, hz: 0.9, top: 6.2 },
    ];
    const blocked = (x: number, z: number, playerY = bot.position.y) =>
      solids.some(
        (s) =>
          playerY >= (s.bottom ?? -Infinity) &&
          playerY < s.top - 0.05 &&
          Math.abs(x - s.x) < s.hx &&
          Math.abs(z - s.z) < s.hz,
      );
    const keys = new Set<string>();
    let ax = 0,
      ay = 0,
      lookX = 0,
      lookY = 0,
      mobileBoost = false,
      vy = 0,
      onGround = true,
      cameraYaw = 0,
      cameraPitch = 0,
      cameraDistance = 12,
      jumpBuffer = 0,
      coyoteTime = 0.12;
    bot.position.set(0, groundAt(0, 18) + 0.06, 18);
    bot.rotation.y = Math.PI;
    const unlockAbility = (ability: Ability) => {
      if (abilitiesRef.current.has(ability)) return;
      audioRef.current?.unlock();
      abilitiesRef.current.add(ability);
      drawControlDisplay();
      const next = [...abilitiesRef.current];
      setAbilities(next);
      setUnlockCard(ability);
      localStorage.setItem("axon-progress-v1", JSON.stringify(next));
      if (ability === "sprint")
        setSystemNotice(
          "OVERCLOCK ONLINE // Hold Shift to sprint. Locate CMOS-02.",
        );
      if (ability === "jump")
        setSystemNotice("ACTUATOR ONLINE // Space to jump. Reach CMOS-03.");
      if (ability === "scan")
        setSystemNotice(
          "OPTICAL ARRAY RESTORED // Awaiting network initialization.",
        );
    };
    runtime.current = {
      axis: (x, y) => {
        ax = x;
        ay = y;
      },
      look: (x, y) => {
        lookX = x;
        lookY = y;
      },
      boost: (active) => {
        if (prototypeOpenRef.current) return;
        mobileBoost = active && abilitiesRef.current.has("sprint");
      },
      jump: () => {
        if (prototypeOpenRef.current) return;
        if (!abilitiesRef.current.has("jump")) {
          setSystemNotice("ACTUATOR OFFLINE // Locate CMOS-02.");
          return;
        }
        audioRef.current?.jump();
        jumpBuffer = 0.16;
      },
      investigate: (id: string) => {
        if (prototypeOpenRef.current) return;
        if (!abilitiesRef.current.has("scan")) {
          setSystemNotice("OPTICAL ARRAY OFFLINE // Locate CMOS-03.");
          return;
        }
        const target = scanSites.find((site) => site.id === id);
        if (!target || scanTarget) return;
        audioRef.current?.scan();
        scanTarget = target;
        scanProgress = 0;
        scanGrid.visible = true;
        scanBeam.visible = true;
        setScanning(id);
        setPanel(null);
      },
      activateNetwork: () => {
        audioRef.current?.network();
        setSystemNotice(
          "OPTICAL ARRAY RESTORED // Initializing machine network.",
        );
        scanUnlockWave.visible = true;
        scanWaveProgress = 0;
        machineBootStart = clock.elapsedTime;
      },
      spawnMachineBattery: (id: string) => {
        const station = machineRewardStations.find((item) => item.id === id);
        if (!station) return;
        station.active = true;
        station.collected = false;
        station.rise = 0;
        station.fade = 1;
        station.pad.visible = true;
        station.outline.visible = true;
        station.battery.visible = true;
        station.padMaterial.opacity = 0.72;
        station.outlineMaterial.opacity = 0.9;
        station.battery.position.y = station.baseY + 0.3;
      },
      activateCoreReward: () => {
        audioRef.current?.unlock();
        audioRef.current?.success();
        activatePrismCore();
      },
    };
    const keydown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) runtime.current?.jump();
      }
      if (e.key.toLowerCase() === "e" && nearestRef.current && !e.repeat)
        runtime.current?.investigate(nearestRef.current);
    };
    const keyup = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    addEventListener("keydown", keydown);
    addEventListener("keyup", keyup);
    let mouseOrbit = false,
      lastMouseX = 0,
      lastMouseY = 0;
    const mouseDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      mouseOrbit = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const mouseMove = (e: PointerEvent) => {
      if (!mouseOrbit) return;
      const deltaX = e.clientX - lastMouseX,
        deltaY = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      cameraYaw += deltaX * 0.008;
      cameraPitch = THREE.MathUtils.clamp(
        cameraPitch - deltaY * 0.006,
        -0.3,
        0.62,
      );
    };
    const mouseUp = (e: PointerEvent) => {
      mouseOrbit = false;
      if (renderer.domElement.hasPointerCapture(e.pointerId))
        renderer.domElement.releasePointerCapture(e.pointerId);
    };
    renderer.domElement.addEventListener("pointerdown", mouseDown);
    renderer.domElement.addEventListener("pointermove", mouseMove);
    renderer.domElement.addEventListener("pointerup", mouseUp);
    renderer.domElement.addEventListener("pointercancel", mouseUp);
    const resize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      composer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    addEventListener("resize", resize);
    const clock = new THREE.Clock();
    scene.onBeforeRender = () => {
      const t = clock.elapsedTime;
      groundCeiling = bot.position.y + 0.8;
      fanRigs.forEach((fan) => (fan.rotation.z += 0.007176));
      accent.emissiveIntensity = 1.35 + Math.sin(t * 2.2) * 0.12;
      eyeAccent.emissiveIntensity = 2.05 + Math.sin(t * 2.2) * 0.12;
      hologramMaterial.opacity = 0.95 + Math.sin(t * 5.2) * 0.012;
      const onLookoutButton =
        bot.position.y > 9.8 &&
        Math.hypot(bot.position.x + 27.8, bot.position.z - 20.6) < 1.35;
      if (onLookoutButton && !lookoutLatched && t - lightShowStart > 7.5) {
        lightShowStart = t;
        audioRef.current?.celebration();
        lookoutButtonMaterial.emissiveIntensity = 4;
        setSystemNotice("LOOKOUT SPECTRUM SHOW // BOARD CELEBRATION ONLINE");
      }
      lookoutLatched = onLookoutButton;
      const showElapsed = t - lightShowStart;
      lookoutButtonMaterial.emissiveIntensity =
        showElapsed < 6.8 ? 2.2 + Math.sin(t * 9) * 1.4 : 1.8;
      fireworkBursts.forEach((burst) => {
        const local = showElapsed - burst.delay;
        if (local >= -0.95 && local < 0) {
          const launch = 1 + local / 0.95;
          const target = burst.position as [number, number, number];
          const rocketY = THREE.MathUtils.lerp(0.7, target[1], launch);
          const trailHeight = 2 + launch * 8;
          burst.rocket.visible = true;
          burst.trail.visible = true;
          burst.rocketMaterial.opacity = 0.75 + Math.sin(t * 28) * 0.2;
          burst.rocket.position.set(target[0], rocketY, target[2]);
          burst.trail.position.set(target[0], rocketY - trailHeight / 2, target[2]);
          burst.trail.scale.set(1, trailHeight, 1);
        } else {
          burst.rocket.visible = false;
          burst.trail.visible = false;
        }
        if (local >= 0 && local < 2.25) {
          const radius = Math.sin(Math.min(1, local * 1.7) * Math.PI / 2) * 12;
          burst.group.visible = true;
          burst.material.opacity = Math.max(0, 1 - local / 2.25);
          burst.light.intensity = Math.max(0, 48 * (1 - local / 1.4));
          burst.particles.forEach((particle) => {
            const direction = particle.userData.direction as THREE.Vector3;
            particle.position.copy(direction).multiplyScalar(radius);
            particle.position.y -= local * local * 1.4;
          });
        } else {
          burst.group.visible = false;
          burst.light.intensity = 0;
        }
      });
      const lasersActive = showElapsed >= 0 && showElapsed < 7;
      laserBeams.forEach((beam, index) => {
        beam.mesh.visible = lasersActive;
        if (!lasersActive) return;
        beam.material.opacity = 0.28 + Math.sin(t * 8 + beam.phase) * 0.16;
        const target = new THREE.Vector3(
          Math.sin(t * 1.7 + beam.phase) * 48,
          30 + Math.sin(t * 2.1 + index) * 10,
          Math.cos(t * 1.35 + beam.phase) * 42 - 4,
        );
        const direction = target.clone().sub(beam.origin);
        const length = direction.length();
        beam.mesh.position.copy(beam.origin).add(target).multiplyScalar(0.5);
        beam.mesh.scale.set(1, length, 1);
        beam.mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.normalize(),
        );
      });
      if (showElapsed >= 0 && showElapsed < 7) {
        const cinematicPosition = new THREE.Vector3(-72, 52, 102);
        camera.position.lerp(cinematicPosition, 0.085);
        camera.lookAt(0, 13, -14);
      }
      const insideLift =
        Math.hypot(bot.position.x + 36, bot.position.z - 28) < 1.38;
      if (insideLift && bot.position.y < 10.32) {
        bot.position.y = Math.min(10.34, bot.position.y + 0.06);
        vy = 0;
        onGround = false;
        if (bot.position.y >= 10.32) bot.position.x = -33.55;
      }
      movingPlatforms.forEach((platform, i) => {
        const oldX = platform.position.x,
          oldY = platform.position.y,
          oldZ = platform.position.z,
          standing =
            onGround &&
            vy <= 0 &&
            Math.abs(bot.position.y - (oldY + 0.3)) < 0.32 &&
            Math.abs(bot.position.x - oldX) < 3 &&
            Math.abs(bot.position.z - oldZ) < 3,
          base = movingBases[i];
        platform.position.x = base.x;
        platform.position.z = base.z + Math.sin(t * 0.82 + base.phase) * 4.4;
        platform.position.y = 10.35 + Math.sin(t * 0.48 + base.phase) * 0.38;
        if (standing) {
          bot.position.x += platform.position.x - oldX;
          bot.position.y += platform.position.y - oldY;
          bot.position.z += platform.position.z - oldZ;
        }
      });
      powerPiece.position.set(
        goalPlatform.position.x,
        11.75 + Math.sin(t * 2) * 0.16,
        goalPlatform.position.z,
      );
      powerPiece.rotation.y = t * 1.5;
      if (
        !pieceCollected &&
        bot.position.distanceTo(powerPiece.position) < 1.65
      ) {
        audioRef.current?.pickup();
        pieceCollected = true;
        powerPiece.visible = false;
        localStorage.setItem("axon-platform-cmos-v1", "1");
        setPowerPieces((v) => v + 1);
        setChallengeNotice("PLATFORM CMOS RECOVERED // CORE CHARGE +1");
      }
      stars.rotation.y = t * 0.002;
      if (scanTarget) {
        scanProgress += 0.018;
        const deckTop =
          scanTarget.id === "relay"
            ? 2.2
            : scanTarget.id === "archive"
              ? 1.4
              : 0;
        scanGrid.position.set(
          scanTarget.x,
          deckTop + 0.15 + Math.sin(Math.min(1, scanProgress) * Math.PI) * 6,
          scanTarget.z,
        );
        const positions = scanBeamGeometry.attributes
          .position as THREE.BufferAttribute;
        positions.setXYZ(
          0,
          bot.position.x,
          bot.position.y + 2.47,
          bot.position.z,
        );
        positions.setXYZ(1, scanTarget.x, scanGrid.position.y, scanTarget.z);
        positions.needsUpdate = true;
        if (scanProgress >= 1) {
          const id = scanTarget.id;
          scanTarget = null;
          scanGrid.visible = false;
          scanBeam.visible = false;
          setScanning(null);
          if (id === "prototype") {
            prototypeOpenRef.current = true;
            setPrototypeOpen(true);
            audioRef.current?.setPrototype(true);
          } else {
            setPanel(id);
          }
        }
      }
    };
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.04);
      const lightShowPlaying =
        clock.elapsedTime - lightShowStart >= 0 &&
        clock.elapsedTime - lightShowStart < 7;
      const worldPaused = prototypeOpenRef.current || lightShowPlaying;
      const turn = worldPaused ? 0 :
        (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
        (keys.has("a") || keys.has("arrowleft") ? 1 : 0) +
        ax;
      const drive = worldPaused ? 0 :
        (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
        (keys.has("s") || keys.has("arrowdown") ? 1 : 0) -
        ay;
      const shiftHeld =
        abilitiesRef.current.has("sprint") &&
        (mobileBoost ||
          keys.has("shift") ||
          keys.has("shiftleft") ||
          keys.has("shiftright"));
      const sprinting = shiftHeld && Math.abs(drive) > 0.08;
      const moveSpeed = sprinting ? 17 : 10;
      jumpBuffer = Math.max(0, jumpBuffer - dt);
      coyoteTime = onGround ? 0.12 : Math.max(0, coyoteTime - dt);
      if (jumpBuffer > 0 && coyoteTime > 0) {
        vy = shiftHeld ? 10.25 : 8.5;
        onGround = false;
        coyoteTime = 0;
        jumpBuffer = 0;
      }
      cameraDistance = THREE.MathUtils.lerp(
        cameraDistance,
        sprinting ? 15 : 12,
        1 - Math.exp(-5 * dt),
      );
      cameraYaw += turn * 2.15 * dt;
      cameraYaw += lookX * 2.25 * dt;
      cameraPitch = THREE.MathUtils.clamp(
        cameraPitch - lookY * 1.45 * dt,
        -0.3,
        0.62,
      );
      const fx = Math.sin(cameraYaw),
        fz = -Math.cos(cameraYaw);
      if (Math.abs(drive) > 0.08) {
        const direction = drive >= 0 ? 1 : -1,
          nx = fx * direction,
          nz = fz * direction,
          nextX = THREE.MathUtils.clamp(
            bot.position.x + nx * moveSpeed * dt,
            -82,
            82,
          ),
          nextZ = THREE.MathUtils.clamp(
            bot.position.z + nz * moveSpeed * dt,
            -82,
            82,
          ),
          nextGround = groundAt(nextX, nextZ),
          currentGround = groundAt(bot.position.x, bot.position.z);
        if (
          !blocked(nextX, nextZ) &&
          (!onGround || nextGround - currentGround < 0.65)
        ) {
          bot.position.x = nextX;
          bot.position.z = nextZ;
          wheelRig.rotation.x += (drive * moveSpeed * dt) / wheelRadius;
        }
        bot.rotation.y = Math.atan2(nx, nz);
      }
      const wasGrounded = onGround;
      vy -= 18 * dt;
      bot.position.y += vy * dt;
      const impactVelocity = vy;
      const ground = groundAt(bot.position.x, bot.position.z) + 0.06;
      if (bot.position.y <= ground) {
        bot.position.y = ground;
        vy = 0;
        onGround = true;
      } else onGround = false;
      if (!wasGrounded && onGround && impactVelocity < -2.8)
        audioRef.current?.land();
      const insideMaze =
        bot.position.x > mazeOriginX - 0.25 &&
        bot.position.x < mazeOriginX + mazeCols * mazeCell + 0.25 &&
        bot.position.z > mazeOriginZ - 0.25 &&
        bot.position.z < mazeOriginZ + mazeRows * mazeCell + 0.25;
      bot.visible = !insideMaze;
      if (insideMaze) {
        const firstPersonTarget = new THREE.Vector3(
          bot.position.x + fx * 0.22,
          bot.position.y + 2.3,
          bot.position.z + fz * 0.22,
        );
        camera.position.lerp(firstPersonTarget, 0.24);
        camera.lookAt(
          bot.position.x + fx * 12,
          bot.position.y + 2.3 + Math.tan(cameraPitch) * 8,
          bot.position.z + fz * 12,
        );
      } else {
        const cameraTarget = new THREE.Vector3(
          bot.position.x - fx * cameraDistance,
          bot.position.y + 6.2 + (cameraDistance - 12) * 0.12,
          bot.position.z - fz * cameraDistance,
        );
        camera.position.lerp(cameraTarget, 0.12);
        camera.lookAt(
          bot.position.x,
          bot.position.y + 1.4 + Math.tan(cameraPitch) * 8,
          bot.position.z,
        );
      }
      let n: string | null = null,
        best = 8;
      if (abilitiesRef.current.has("scan")) {
        scanSites.forEach((l) => {
          const d = Math.hypot(bot.position.x - l.x, bot.position.z - l.z);
          if (d < best) {
            best = d;
            n = l.id;
          }
        });
      }
      nearestRef.current = n;
      const audioMachineDistance = Math.min(
        ...scanSites.map((site) =>
          Math.hypot(bot.position.x - site.x, bot.position.z - site.z),
        ),
      );
      audioRef.current?.update(
        Math.abs(drive) * moveSpeed,
        sprinting,
        audioMachineDistance,
        Math.hypot(bot.position.x + 36, bot.position.z - 28) < 1.7,
      );
      setNearest((v) => (v === n ? v : n));
      setPanel((v) => (v && v !== n ? null : v));
      setZone(
        bot.position.x < -24 && bot.position.z > 17
          ? "CAPACITOR TERRACE"
          : bot.position.x > 23 && bot.position.z < -20
            ? "RELAY DECK"
            : bot.position.x > 30 && bot.position.z > 20
              ? "ARCHIVE MODULE"
              : "MAINBOARD // A0",
      );
      composer.render();
    };
    animate();
    const existingBeforeRender = scene.onBeforeRender;
    scene.onBeforeRender = (...args) => {
      existingBeforeRender.call(scene, ...args);
      if (!abilitiesRef.current.has("sprint")) {
        keys.delete("shift");
        keys.delete("shiftleft");
        keys.delete("shiftright");
      }
      batteryMeshes.forEach((battery, i) => {
        battery.rotation.y += 0.018;
        battery.position.y =
          batteryData[i].y + Math.sin(clock.elapsedTime * 2 + i) * 0.16;
        const prerequisite =
            i === 0 || abilitiesRef.current.has(batteryData[i - 1].ability),
          available =
            prerequisite && !abilitiesRef.current.has(batteryData[i].ability);
        battery.visible = available;
        if (available && bot.position.distanceTo(battery.position) < 1.55) {
          battery.visible = false;
          unlockAbility(batteryData[i].ability);
        }
      });
      if (!transistorBatteryCollected) {
        transistorBattery.rotation.y += 0.022;
        transistorBattery.position.y =
          finalTransistorStep[2] +
          1.05 +
          Math.sin(clock.elapsedTime * 2.1) * 0.14;
        if (bot.position.distanceTo(transistorBattery.position) < 1.6) {
          audioRef.current?.pickup();
          transistorBatteryCollected = true;
          transistorBattery.visible = false;
          localStorage.setItem("axon-transistor-cmos-v1", "1");
          setPowerPieces((value) => value + 1);
          setChallengeNotice("TRANSISTOR ASCENT CMOS COLLECTED // CORE CHARGE +1");
        }
      }
      if (!mazeBatteryCollected) {
        mazeBattery.rotation.y -= 0.024;
        mazeBattery.position.y = 1.3 + Math.sin(clock.elapsedTime * 2.25) * 0.14;
        if (bot.position.distanceTo(mazeBattery.position) < 1.55) {
          audioRef.current?.pickup();
          mazeBatteryCollected = true;
          mazeBattery.visible = false;
          localStorage.setItem("axon-maze-cmos-v1", "1");
          setPowerPieces((value) => value + 1);
          setChallengeNotice("MIRROR MAZE CMOS COLLECTED // CORE CHARGE +1");
        }
      }
      machineRewardStations.forEach((station, index) => {
        if (!station.active) return;
        station.rise = Math.min(1, station.rise + 0.018);
        const eased = 1 - Math.pow(1 - station.rise, 3);
        station.battery.position.y =
          station.baseY + 0.3 + eased * 1.35 + Math.sin(clock.elapsedTime * 2 + index) * 0.1;
        station.battery.rotation.y += 0.025;
        station.outline.rotation.z -= 0.008;
        if (
          !station.collected &&
          station.rise > 0.85 &&
          bot.position.distanceTo(station.battery.position) < 1.7
        ) {
          audioRef.current?.pickup();
          station.collected = true;
          station.battery.visible = false;
          collectedMachineRewardsRef.current.add(station.id);
          const collected = [...collectedMachineRewardsRef.current];
          setCollectedMachineRewards(collected);
          localStorage.setItem(
            "axon-machine-batteries-v1",
            JSON.stringify(collected),
          );
          setPowerPieces((value) => value + 1);
          setChallengeNotice("CMOS BATTERY COLLECTED // CORE CHARGE +1");
        }
        if (station.collected) {
          station.fade = Math.max(0, station.fade - 0.025);
          station.padMaterial.opacity = 0.72 * station.fade;
          station.outlineMaterial.opacity = 0.9 * station.fade;
          if (station.fade === 0) {
            station.active = false;
            station.pad.visible = false;
            station.outline.visible = false;
          }
        }
      });
      if (scanUnlockWave.visible) {
        scanWaveProgress += 0.018;
        scanUnlockWave.scale.setScalar(1 + scanWaveProgress * 72);
        waveMaterial.opacity = Math.max(0, 0.75 - scanWaveProgress * 0.75);
        if (scanWaveProgress >= 1) scanUnlockWave.visible = false;
      }
      if (machineBootStart >= 0) {
        const elapsed = clock.elapsedTime - machineBootStart;
        machineGlowMats.forEach((material, i) => {
          const raw = THREE.MathUtils.clamp((elapsed - i * 1.15) / 0.85, 0, 1),
            power = raw * raw * (3 - 2 * raw),
            color = new THREE.Color(landmarks[i].color);
          material.color.copy(new THREE.Color(0x17201d).lerp(color, power));
          material.emissiveIntensity = 2 * power;
          machineLights[i].intensity =
            (landmarks[i].id === "nexus" ? 32 : 22) * power;
          machineRings[i].visible = power > 0;
          machineRings[i].scale.setScalar(0.72 + 0.28 * power);
          (machineRings[i].material as THREE.MeshBasicMaterial).opacity =
            0.7 * power;
        });
        const focusIndex = Math.floor(elapsed / 1.15);
        if (focusIndex < landmarks.length) {
          const target = landmarks[focusIndex],
            deckTop =
              target.id === "relay" ? 2.2 : target.id === "archive" ? 1.4 : 0,
            side = focusIndex % 2 ? 1 : -1;
          camera.position.set(
            target.x + side * 8,
            deckTop + 7.5,
            target.z + 11,
          );
          camera.lookAt(target.x, deckTop + 2.4, target.z);
          camera.updateMatrixWorld();
        }
        if (elapsed > landmarks.length * 1.15 + 0.5) {
          machineBootStart = -1;
          setSystemNotice(
            "MACHINE NETWORK ONLINE // Approach a signal ring and press E.",
          );
        }
      }
    };
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("keydown", keydown);
      removeEventListener("keyup", keyup);
      renderer.domElement.removeEventListener("pointerdown", mouseDown);
      renderer.domElement.removeEventListener("pointermove", mouseMove);
      renderer.domElement.removeEventListener("pointerup", mouseUp);
      renderer.domElement.removeEventListener("pointercancel", mouseUp);
      composer.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      runtime.current = null;
    };
  }, []);
  const enter = () => {
    if (!audioRef.current)
      audioRef.current = createAxonAudio(audioVolume, audioMuted);
    audioRef.current?.resume();
    audioRef.current?.network();
    setPhase("reveal");
    setTimeout(() => setPhase("play"), 1500);
  };
  const moveStick = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (stickPointer.current !== e.pointerId) return;
    const r = e.currentTarget.getBoundingClientRect(),
      x = (e.clientX - (r.left + r.width / 2)) / (r.width * 0.34),
      y = (e.clientY - (r.top + r.height / 2)) / (r.height * 0.34),
      m = Math.max(1, Math.hypot(x, y)),
      v = { x: x / m, y: y / m };
    setStick(v);
    runtime.current?.axis(v.x, v.y);
  };
  const stopStick = () => {
    stickPointer.current = null;
    setStick({ x: 0, y: 0 });
    runtime.current?.axis(0, 0);
  };
  const moveLookStick = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (lookPointer.current !== e.pointerId) return;
    const r = e.currentTarget.getBoundingClientRect(),
      x = (e.clientX - (r.left + r.width / 2)) / (r.width * 0.34),
      y = (e.clientY - (r.top + r.height / 2)) / (r.height * 0.34),
      m = Math.max(1, Math.hypot(x, y)),
      v = { x: x / m, y: y / m };
    setLookStick(v);
    runtime.current?.look(v.x, v.y);
  };
  const stopLookStick = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (lookPointer.current !== e.pointerId) return;
    lookPointer.current = null;
    setLookStick({ x: 0, y: 0 });
    runtime.current?.look(0, 0);
  };
  const active = landmarks.find((l) => l.id === panel);
  const relayBitValues = [128, 64, 32, 16, 8, 4, 2, 1];
  const relayValue = relayNodes.reduce(
    (total, on, index) => total + (on ? relayBitValues[index] : 0),
    0,
  );
  const loopAnswer = forgeResult(loopMode, loopLimit);
  const loopExpression =
    loopStep >= 0
      ? loopMode === "sum"
        ? Array.from({ length: loopStep + 1 }, (_, index) => index).join(" + ")
        : loopMode === "product"
          ? Array.from({ length: loopStep + 1 }, (_, index) => index + 1).join(
              " × ",
            )
          : String(Math.ceil((loopStep + 1) / 2))
      : "";
  const addPracticeScore = (points = 100) => {
    setPracticeScore((current) => {
      const next = current + points;
      localStorage.setItem("axon-practice-score-v1", String(next));
      return next;
    });
  };
  const generateForgePractice = () => {
    const modes: ForgeMode[] = ["sum", "product", "evens"];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    const limit =
      mode === "product"
        ? Math.floor(Math.random() * 4) + 3
        : Math.floor(Math.random() * 7) + 4;
    const answer = forgeResult(mode, limit);
    setLoopMode(mode);
    setLoopLimit(limit);
    setLoopChoices(
      shuffle([
        Math.max(0, answer - Math.max(2, limit - 2)),
        answer,
        answer + Math.max(2, limit),
      ]),
    );
    setLoopResult(null);
    setLoopStep(-1);
  };
  const completeMachine = (id: string) => {
    if (completedMachines.includes(id)) {
      audioRef.current?.error();
      setChallengeNotice("MODULE ALREADY SYNCHRONIZED");
      return;
    }
    audioRef.current?.success();
    const next = [...completedMachines, id];
    completedMachinesRef.current.add(id);
    setCompletedMachines(next);
    localStorage.setItem("axon-machines-v1", JSON.stringify(next));
    addPracticeScore();
    runtime.current?.spawnMachineBattery(id);
    setChallengeNotice("MACHINE CLEARED // SCORE +100 // CMOS REWARD ONLINE");
  };
  return (
    <main className={`experience phase-${phase}`}>
      <div
        ref={mountRef}
        className="world"
        aria-label="Playable Axon Override world"
      />
      {prototypeOpen && (
        <ArchivedPrototype onExit={closePrototype} onComplete={completePrototype} />
      )}
      {phase !== "play" && (
        <section className="boot-screen">
          <div className="boot-terminal">
            <div className="term-top">
              <span>AXON_OVERRIDE // BOOT</span>
              <i />
            </div>
            <div className="axon-logo">
              AO<span>_</span>
            </div>
            <div className="boot-lines">
              {boot.slice(0, bootLine + 1).map((x, i) => (
                <p key={x} className={i === bootLine ? "current" : ""}>
                  {x}
                </p>
              ))}
            </div>
            {phase === "ready" && (
              <button onClick={enter}>
                ENTER WORLD <b>↗</b>
              </button>
            )}
            <small>BUILD 0.02 / PROGRESSION TEST</small>
          </div>
        </section>
      )}
      <header className="hud">
        <div>
          <b>
            AXON
            <br />
            OVERRIDE
          </b>
          <span>PLAYABLE SYSTEMS PORTFOLIO</span>
        </div>
        <div className="zone">
          <small>CURRENT SECTOR</small>
          {zone}
        </div>
        <div className="signal">
          SIGNAL <i /> ONLINE
        </div>
      </header>
      {phase === "play" && (
        <div className="audio-controls" aria-label="Audio controls">
          <button
            aria-label={audioMuted ? "Unmute audio" : "Mute audio"}
            aria-pressed={audioMuted}
            onClick={() => {
              const next = !audioMuted;
              setAudioMuted(next);
              localStorage.setItem("axon-audio-muted-v1", next ? "1" : "0");
              audioRef.current?.setVolume(audioVolume, next);
              if (!next) audioRef.current?.ui();
            }}
          >
            {audioMuted ? "AUDIO OFF" : "AUDIO ON"}
          </button>
          <input
            aria-label="Audio volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={audioVolume}
            onChange={(event) => {
              const next = Number(event.currentTarget.value);
              setAudioVolume(next);
              localStorage.setItem("axon-audio-volume-v1", String(next));
              audioRef.current?.setVolume(next, audioMuted);
            }}
          />
        </div>
      )}
      {phase === "play" && showIntro && abilities.length === 0 && (
        <section className="system-modal intro-modal">
          <span>FIELD BRIEFING // MODIFICATIONS</span>
          <h2>Restore the shell.</h2>
          <p>
            Three CMOS batteries are broadcasting nearby. Recover them to
            restore Overclock, Actuator, and Optical Array functions.
          </p>
          <div className="briefing-list">
            <b>01</b>
            <span>
              Search the main signal buses.
              <small>Pickups activate in sequence.</small>
            </span>
          </div>
          <button onClick={() => setShowIntro(false)}>
            BEGIN SEARCH <b>↗</b>
          </button>
        </section>
      )}
      {unlockCard && (
        <section className="system-modal unlock-modal">
          <span>MODIFICATION INSTALLED</span>
          <h2>
            {unlockCard === "sprint"
              ? "OVERCLOCK"
              : unlockCard === "jump"
                ? "ACTUATOR"
                : "OPTICAL ARRAY"}
          </h2>
          <p>
            {unlockCard === "sprint"
              ? "Movement governor released. Hold Shift while moving to sprint; the camera pulls back under acceleration."
              : unlockCard === "jump"
                ? "Vertical actuator restored. Press Space to jump; hold Shift for a higher powered jump."
                : "Machine-spectrum vision restored. A network initialization sequence will reveal every machine signature."}
          </p>
          <button
            onClick={() => {
              if (unlockCard === "scan") runtime.current?.activateNetwork();
              setUnlockCard(null);
            }}
          >
            ACKNOWLEDGE
          </button>
        </section>
      )}
      {showCoreReward && (
        <section className="system-modal core-reward-modal">
          <span>CMOS ARRAY // 10 OF 10</span>
          <h2>PRISM CORE UNLOCKED</h2>
          <p>
            Full-board restoration complete. Prism lighting has been routed to
            the robot shell and 1,000 systems-trial points were awarded.
          </p>
          <button onClick={() => setShowCoreReward(false)}>
            ACTIVATE PRISM CORE
          </button>
        </section>
      )}
      <aside className="objective">
        <span>FIELD DIRECTIVE // CMOS</span>
        <b>
          {abilities.length < 3
            ? `Restore subsystem ${abilities.length + 1}/3`
            : "Investigate the machines."}
        </b>
        <p>{systemNotice}</p>
        <div>
          {(["sprint", "jump", "scan"] as Ability[]).map((id) => (
            <i key={id} className={abilities.includes(id) ? "near" : ""} />
          ))}
        </div>
      </aside>
      {abilities.includes("scan") && nearest && !scanning && (
        <button
          className="interact"
          onClick={() => runtime.current?.investigate(nearest)}
        >
          <kbd>E</kbd>
          <span>
            SCAN
            <br />
            <b>{scanSites.find((site) => site.id === nearest)?.name}</b>
          </span>
        </button>
      )}
      {scanning && (
        <div className="scan-status">
          OPTICAL SWEEP // {scanning.toUpperCase()}
        </div>
      )}
      {panel === "profile" && (
        <section
          className="machine-panel interactive-panel profile-panel"
          style={{ "--machine": profileSite.color } as React.CSSProperties}
        >
          <button className="close" onClick={() => setPanel(null)}>
            ×
          </button>
          <span>HOLOGRAM // IDENTITY RECORD</span>
          <h2>DANIEL SILVA</h2>
          <p>Creative developer // gameplay systems // interactive software</p>
          <div className="profile-tabs">
            {["PERSONAL", "GAME DEV", "TOOLKIT"].map((label, index) => (
              <button
                key={label}
                className={profileTab === index ? "active" : ""}
                onClick={() => setProfileTab(index)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="profile-gallery">
            {profileTab === 2 ? (
              <div className="toolkit-grid" aria-label="Development technologies">
                {[
                  ["U", "UNITY"], ["C#", "C SHARP"],
                  ["JS", "JAVASCRIPT"], ["TS", "TYPESCRIPT"],
                  ["PY", "PYTHON"], ["JV", "JAVA"],
                  ["R", "REACT"], ["3", "THREE.JS"],
                ].map(([icon, label]) => (
                  <div className="toolkit-cell" key={label}>
                    <b aria-hidden="true">{icon}</b>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <img
                src={profileTab === 1 ? "/game-project-atlas.png" : "/daniel-silva-profile.png"}
                alt={profileTab === 1 ? "Game development project gallery" : "Daniel Silva"}
              />
            )}
            <article>
              <small>
                {[
                  "PERSONAL PROFILE",
                  "SELECTED GAME DEVELOPMENT",
                  "DEVELOPMENT TOOLKIT",
                ][profileTab]}
              </small>
              <h3>
                {[
                  "Systems-minded creative developer",
                  "Gameplay built through experimentation",
                  "Code, engines, and interaction design",
                ][profileTab]}
              </h3>
              <p>
                {[
                  "I build interactive experiences where engineering, visual design, and player feedback reinforce one another. Axon Override turns that approach into a world you can explore.",
                  "My game-development work focuses on Unity prototypes, responsive character systems, environmental interaction, puzzle mechanics, and learning through playable iteration.",
                  "Unity, C#, JavaScript, TypeScript, Python, Java, React, Three.js, systems design, rapid prototyping, debugging, and experience-focused UI.",
                ][profileTab]}
              </p>
              {profileTab === 1 && (
                <a
                  className="itch-link"
                  href="https://dtsprogramming.itch.io"
                  target="_blank"
                  rel="noreferrer"
                >
                  OPEN ITCH.IO PROFILE <span aria-hidden="true">↗</span>
                </a>
              )}
              {profileTab === 2 && (
                <>
                  <p className="codex-credit">
                    THIS SITE WAS CREATED IN COLLABORATION WITH CHATGPT CODEX.
                  </p>
                  <a
                    className="itch-link"
                    href="https://github.com/dtsprogramming"
                    target="_blank"
                    rel="noreferrer"
                  >
                    SEE BUILD HERE <span aria-hidden="true">&#8599;</span>
                  </a>
                </>
              )}
            </article>
          </div>
        </section>
      )}
      {active && (
        <section
          className={`machine-panel interactive-panel machine-${active.id}`}
          style={{ "--machine": active.color } as React.CSSProperties}
        >
          <button
            className="close"
            onClick={() => {
              setPanel(null);
              setChallengeNotice(null);
            }}
          >
            ×
          </button>
          <span>MACHINE // {active.id.toUpperCase()}</span>
          <h2>{active.name}</h2>
          <p>{active.role}</p>
          {active.id === "archive" && (
            <div className="machine-activity">
              <div className="activity-tabs">
                {["PROFILE", "METHOD", "NOW"].map((label, i) => (
                  <button
                    key={label}
                    className={archiveTab === i ? "active" : ""}
                    onClick={() => setArchiveTab(i)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <article className="gallery-card">
                <small>
                  {
                    [
                      "ABOUT THE BUILDER",
                      "DESIGN PHILOSOPHY",
                      "CURRENT SIGNAL",
                    ][archiveTab]
                  }
                </small>
                <h3>
                  {
                    [
                      "Systems-minded creator",
                      "Code should become experience",
                      "Building Axon Override",
                    ][archiveTab]
                  }
                </h3>
                <p>
                  {
                    [
                      "I build interactive software where technical systems, visual design, and player experience reinforce one another.",
                      "The strongest portfolio is something visitors can understand by using—not only by reading.",
                      "This world is an evolving playable archive of projects, experiments, and engineering decisions.",
                    ][archiveTab]
                  }
                </p>
              </article>
              {true ? (
                <div className="archive-practice">
                  <small>UNITY // PROGRAMMING KNOWLEDGE CHECK</small>
                  <p>{archivePractice[archivePrompt].question}</p>
                  <div className="answer-grid">
                    {archiveOrder.map((answerIndex) => (
                      <button
                        key={archivePractice[archivePrompt].answers[answerIndex]}
                        className={archiveAnswer === answerIndex ? "selected" : ""}
                        onClick={() => setArchiveAnswer(answerIndex)}
                      >
                        {archivePractice[archivePrompt].answers[answerIndex]}
                      </button>
                    ))}
                  </div>
                  <button
                    className="activity-action"
                    disabled={archiveAnswer === null}
                    onClick={() => {
                      const correct =
                        archiveAnswer === archivePractice[archivePrompt].correct;
                      setChallengeNotice(
                        correct
                          ? completedMachines.includes("archive")
                            ? "ARCHIVE PRACTICE CLEARED // SCORE +100"
                            : "KNOWLEDGE CHECK VERIFIED"
                          : "REVIEW THE SYSTEM SIGNAL",
                      );
                      if (correct) {
                        if (completedMachines.includes("archive")) addPracticeScore();
                        else completeMachine("archive");
                        setArchivePrompt((archivePrompt + 1) % archivePractice.length);
                        setArchiveOrder(shuffle([0, 1, 2]));
                        setArchiveAnswer(null);
                      }
                    }}
                  >
                    {completedMachines.includes("archive")
                      ? "SUBMIT PRACTICE RESPONSE"
                      : "VERIFY KNOWLEDGE CHECK"}
                  </button>
                </div>
              ) : (
                <button
                  className="activity-action"
                  onClick={() => completeMachine("archive")}
                >
                  SYNC MEMORY ARCHIVE
                </button>
              )}
            </div>
          )}
          {active.id === "forge" && (
            <div className="machine-activity">
              <div className="code-challenge">
                <div className="code-heading">
                  <small>TRACE THE LOOP OUTPUT</small>
                  <div className="language-tabs">
                    {(["C#", "Python", "JavaScript", "Java"] as ForgeLanguage[]).map(
                      (language) => (
                        <button
                          key={language}
                          className={loopLanguage === language ? "active" : ""}
                          onClick={() => {
                            setLoopLanguage(language);
                            setLoopResult(null);
                            setChallengeNotice(null);
                          }}
                        >
                          {language}
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <pre><code>{forgeProgram(loopLanguage, loopMode, loopLimit)}</code></pre>
                <p>What value leaves the forge?</p>
                {loopStep >= 0 && (
                  <div className="execution-output">
                    <small>PSEUDO EXECUTION // LIVE</small>
                    <code>
                      i = {loopMode === "product" ? loopStep + 1 : loopStep} |
                      signal = {loopExpression}
                      {loopStep === loopLimit - 1
                        ? ` == ${loopAnswer}`
                        : ""}
                    </code>
                  </div>
                )}
              </div>
              <div className="answer-grid">
                {loopChoices.map((answer) => (
                  <button
                    key={answer}
                    className={loopResult === String(answer) ? "selected" : ""}
                    onClick={() => {
                      setLoopResult(String(answer));
                      setChallengeNotice(
                        answer === loopAnswer
                          ? "TRACE VERIFIED"
                          : "OUTPUT MISMATCH",
                      );
                    }}
                  >
                    {answer}
                  </button>
                ))}
              </div>
              <button
                className="activity-action"
                disabled={loopResult !== String(loopAnswer)}
                onClick={() => {
                  if (completedMachines.includes("forge")) {
                    addPracticeScore();
                    setChallengeNotice("PRACTICE CLEARED // SCORE +100");
                    generateForgePractice();
                  } else completeMachine("forge");
                }}
              >
                {completedMachines.includes("forge")
                  ? "SUBMIT PRACTICE TRACE"
                  : "COMPILE SEQUENCE"}
              </button>
            </div>
          )}
          {active.id === "relay" && (
            <div className="machine-activity">
              <p className="activity-copy">
                Convert decimal <b>{relayTarget}</b> to an eight-bit binary
                signal. Current value: <b>{relayValue}</b>
              </p>
              <div className="relay-nodes">
                {relayNodes.map((on, i) => (
                  <div className="relay-bit" key={relayBitValues[i]}>
                    <b>{relayBitValues[i]}</b>
                    <button
                      className={on ? "on" : ""}
                      onClick={() =>
                        setRelayNodes((v) =>
                          v.map((x, n) => (n === i ? !x : x)),
                        )
                      }
                    >
                      <i />
                      {on ? "1" : "0"}
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="activity-action"
                onClick={() => {
                  const valid = relayValue === relayTarget;
                  setChallengeNotice(
                    valid ? "CARRIER LOCKED" : "PATTERN REJECTED",
                  );
                  if (valid) {
                    if (completedMachines.includes("relay")) {
                      addPracticeScore();
                      setChallengeNotice("BINARY PRACTICE CLEARED // SCORE +100");
                      setRelayTarget(Math.floor(Math.random() * 128) + 1);
                      setRelayNodes(Array(8).fill(false));
                    } else completeMachine("relay");
                  }
                }}
              >
                {completedMachines.includes("relay")
                  ? "SUBMIT PRACTICE SIGNAL"
                  : "TRANSMIT PATTERN"}
              </button>
            </div>
          )}
          {active.id === "nexus" && (
            <div className="machine-activity">
              {completedMachines.includes("nexus") ? (
                <div className="final-trophy">
                  <div>♛</div>
                  <span>SYSTEMS TRIAL SCORE</span>
                  <b>{practiceScore.toLocaleString()}</b>
                  <small>Practice stations remain online across the board.</small>
                </div>
              ) : (
                <>
                  <div className="nexus-charge">
                    <span>NETWORK MODULES</span>
                    <b>
                      {completedMachines.filter((id) => id !== "nexus").length}/3
                    </b>
                    <div>
                      <i
                        style={{
                          width: `${Math.min(100, (completedMachines.filter((id) => id !== "nexus").length / 3) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="activity-copy">
                    Synchronize Loop Forge, Signal Relay, and Memory Archive to
                    stabilize the Power Nexus.
                  </p>
                  <button
                    className="activity-action"
                    disabled={
                      completedMachines.filter((id) => id !== "nexus").length < 3
                    }
                    onClick={() => completeMachine("nexus")}
                  >
                    POWER LOWER-CORE LINK
                  </button>
                </>
              )}
            </div>
          )}
          {challengeNotice && (
            <div className="challenge-notice">{challengeNotice}</div>
          )}
          <div className="panel-grid">
            <article>
              <small>STATUS</small>
              <b>
                {completedMachines.includes(active.id)
                  ? "SYNCHRONIZED"
                  : "AVAILABLE"}
              </b>
            </article>
            <article>
              <small>CORE REWARD</small>
              <b>CMOS +1</b>
            </article>
          </div>
        </section>
      )}
      <div className="battery-counter">
        <span>{coreReward ? "PRISM CORE ONLINE" : "CMOS BATTERIES"}</span>
        <b>{Math.min(10, abilities.length + powerPieces)}/10</b>
      </div>
      <div className="mobile-controls">
        <div className="move-controls">
          <div
            className="joystick move-stick"
            aria-label="Movement joystick"
            onPointerDown={(e) => {
              stickPointer.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
              moveStick(e);
            }}
            onPointerMove={moveStick}
            onPointerUp={stopStick}
            onPointerCancel={stopStick}
          >
            <i
              style={{
                transform: `translate(${stick.x * 33}px,${stick.y * 33}px)`,
              }}
            />
          </div>
        </div>
        <div className="right-controls">
          {abilities.includes("sprint") && (
            <button
              className={`boost-toggle ${boostToggled ? "active" : ""}`}
              aria-label="Toggle boost"
              aria-pressed={boostToggled}
              onClick={() => {
                const next = !boostToggled;
                setBoostToggled(next);
                runtime.current?.boost(next);
              }}
            >
              BOOST {boostToggled ? "ON" : "OFF"}
            </button>
          )}
          <button
            className="jump-button"
            aria-label="Jump"
            onPointerDown={() => runtime.current?.jump()}
          >
            ↑<small>JUMP</small>
          </button>
          <div
            className="joystick look-stick"
            aria-label="Camera joystick"
            onPointerDown={(e) => {
              lookPointer.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
              moveLookStick(e);
            }}
            onPointerMove={moveLookStick}
            onPointerUp={stopLookStick}
            onPointerCancel={stopLookStick}
          >
            <i
              style={{
                transform: `translate(${lookStick.x * 28}px,${lookStick.y * 28}px)`,
              }}
            />
            <small>CAMERA</small>
          </div>
        </div>
      </div>
    </main>
  );
}
