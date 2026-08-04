"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AudioControls } from "./axon/AudioControls";
import { ArchivedPrototype } from "./axon/ArchivedPrototype";
import { BootScreen } from "./axon/BootScreen";
import { MobileControls } from "./axon/MobileControls";
import { MachinePanel } from "./axon/MachinePanel";
import { ProfilePanel } from "./axon/ProfilePanel";
import { WorldHud } from "./axon/WorldHud";
import { useProgression } from "./axon/useProgression";
import { useAxonWorld } from "./axon/useAxonWorld";
import type { Ability, ForgeLanguage, ForgeMode } from "./axon/types";
import { createAxonAudio, type AxonAudio } from "./axon/audio";
import {
  forgeResult,
  landmarks,
  scanSites,
} from "./axon/worldData";


const shuffle = <T,>(items: T[]) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const bootSequence = [
  "WAKE SIGNAL ........ OK",
  "MOUNTING WORLD ...... OK",
  "CALIBRATING SHELL ... OK",
  "AXON LINK ........... READY",
];



/**
 * Coordinates progression state and the Three.js mainboard runtime. Visual UI
 * shells live in app/axon so this component can focus on world orchestration.
 */
export function AxonExperience() {
  const audioRef = useRef<AxonAudio>(null);
  const [phase, setPhase] = useState<"boot" | "ready" | "reveal" | "play">(
    "boot",
  );
  const [bootLine, setBootLine] = useState(0);
  const [nearest, setNearest] = useState<string | null>(null);
  const [zone, setZone] = useState("CENTRAL BASIN");
  const [panel, setPanel] = useState<string | null>(null);
  const [scanning, setScanning] = useState<string | null>(null);
  const {
    abilities, abilitiesRef, setAbilities,
    powerPieces, setPowerPieces,
    coreReward, setCoreReward,
    showCoreReward, setShowCoreReward,
    systemNotice, setSystemNotice,
    showIntro, setShowIntro,
    unlockCard, setUnlockCard,
    completedMachines, completedMachinesRef, setCompletedMachines,
    collectedMachineRewardsRef, setCollectedMachineRewards,
    practiceScore, setPracticeScore,
  } = useProgression();
  const [archiveTab, setArchiveTab] = useState(0);
  const [loopResult, setLoopResult] = useState<string | null>(null);
  const [loopLanguage, setLoopLanguage] =
    useState<ForgeLanguage>("JavaScript");
  const [loopMode, setLoopMode] = useState<ForgeMode>("sum");
  const [loopLimit, setLoopLimit] = useState(4);
  const [loopStep, setLoopStep] = useState(-1);
  const [loopChoices, setLoopChoices] = useState(() => shuffle([4, 6, 10]));
  const [relayNodes, setRelayNodes] = useState(() => Array(8).fill(false));
  const [relayTarget, setRelayTarget] = useState(37);
  const [archivePrompt, setArchivePrompt] = useState(0);
  const [archiveAnswer, setArchiveAnswer] = useState<number | null>(null);
  const [archiveOrder, setArchiveOrder] = useState([0, 1, 2]);
  const [profileTab, setProfileTab] = useState(0);
  const [prototypeOpen, setPrototypeOpen] = useState(false);
  const prototypeOpenRef = useRef(false);
  const [audioVolume, setAudioVolume] = useState(0.5);
  const [audioMuted, setAudioMuted] = useState(false);
  const [challengeNotice, setChallengeNotice] = useState<string | null>(null);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const stickPointer = useRef<number | null>(null);
  const [boostToggled, setBoostToggled] = useState(false);
  const [lookStick, setLookStick] = useState({ x: 0, y: 0 });
  const lookPointer = useRef<number | null>(null);
  const [prismCutscene, setPrismCutscene] = useState(false);
  const startPrismCutscene = useCallback(() => setPrismCutscene(true), []);
  const finishPrismCutscene = useCallback(
    () => {
      setPrismCutscene(false);
      setShowCoreReward(true);
    },
    [setShowCoreReward],
  );
  const { mountRef, runtime, galleryHud } = useAxonWorld({
    audioRef,
    abilitiesRef,
    completedMachinesRef,
    collectedMachineRewardsRef,
    prototypeOpenRef,
    setAbilities,
    setCollectedMachineRewards,
    setNearest,
    setPanel,
    setPowerPieces,
    setPrototypeOpen,
    setScanning,
    setSystemNotice,
    setUnlockCard,
    setZone,
    setChallengeNotice,
    setRelayTarget,
    setRelayNodes,
    setLoopMode,
    setLoopLimit,
    setLoopChoices,
    setLoopResult,
    setLoopStep,
    setArchivePrompt,
    setArchiveAnswer,
    setArchiveOrder,
    onCoreRewardStart: startPrismCutscene,
    onCoreRewardComplete: finishPrismCutscene,
  });
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
  }, [setPracticeScore]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const savedVolumeRaw = localStorage.getItem("axon-audio-volume-v1");
      const savedVolume = Number(savedVolumeRaw);
      const savedMuted = localStorage.getItem("axon-audio-muted-v1") === "1";
      if (
        savedVolumeRaw !== null &&
        Number.isFinite(savedVolume) &&
        savedVolume >= 0 &&
        savedVolume <= 1
      )
        setAudioVolume(savedVolume);
      setAudioMuted(savedMuted);
    });
    return () => {
      cancelAnimationFrame(frame);
      audioRef.current?.destroy();
    };
  }, []);
  useEffect(() => {
    if (!challengeNotice) return;
    if (/INCORRECT|MISMATCH|FAILED|INVALID/.test(challengeNotice))
      audioRef.current?.error();
    else if (/PRACTICE CLEARED/.test(challengeNotice))
      audioRef.current?.success();
  }, [challengeNotice]);
  useEffect(() => {
    if (phase !== "boot") return;
    const t = setInterval(
      () =>
        setBootLine((v) => {
          if (v >= bootSequence.length - 1) {
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
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setLoopStep(loopResult === null ? -1 : 0),
    );
    if (loopResult === null) {
      return () => cancelAnimationFrame(frame);
    }
    const timer = setInterval(
      () => setLoopStep((step) => (step >= loopLimit - 1 ? step : step + 1)),
      480,
    );
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, [loopResult, loopLimit]);
  useEffect(() => {
    if (abilities.length + powerPieces < 10 || coreReward) return;
    const frame = requestAnimationFrame(() => {
      setCoreReward(true);
      localStorage.setItem("axon-core-reward-v1", "1");
      setPracticeScore((current) => {
        const next = current + 1000;
        localStorage.setItem("axon-practice-score-v1", String(next));
        return next;
      });
      runtime.current?.activateCoreReward();
    });
    return () => cancelAnimationFrame(frame);
  }, [abilities.length, powerPieces, coreReward, runtime, setCoreReward, setPracticeScore]);

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
    <main className={`experience phase-${phase}${prismCutscene ? " prism-cutscene" : ""}${galleryHud.active ? " gallery-mode" : ""}`}>
      <div
        ref={mountRef}
        className="world"
        aria-label="Playable Axon Override world"
      />
      {prototypeOpen && (
        <ArchivedPrototype onExit={closePrototype} onComplete={completePrototype} />
      )}
      <BootScreen phase={phase} lines={bootSequence} visibleLine={bootLine} onEnter={enter} />
      <WorldHud zone={zone} />
      {phase === "play" && (
        <AudioControls
          muted={audioMuted}
          volume={audioVolume}
          onToggleMuted={() => {
            const next = !audioMuted;
            setAudioMuted(next);
            localStorage.setItem("axon-audio-muted-v1", next ? "1" : "0");
            audioRef.current?.setVolume(audioVolume, next);
            if (!next) audioRef.current?.ui();
          }}
          onVolumeChange={(next) => {
            setAudioVolume(next);
            localStorage.setItem("axon-audio-volume-v1", String(next));
            audioRef.current?.setVolume(next, audioMuted);
          }}
        />
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
            the robot shell, the Eye Pulse laser is now online, and 1,000
            systems-trial points were awarded. Scan the southeast Pulse Range
            to test it.
          </p>
          <button onClick={() => setShowCoreReward(false)}>
            EYE PULSE ONLINE // ACKNOWLEDGE
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
      <ProfilePanel
        open={panel === "profile"}
        activeTab={profileTab}
        onTabChange={setProfileTab}
        onClose={() => setPanel(null)}
      />
      <MachinePanel
        active={active}
        archiveTab={archiveTab} setArchiveTab={setArchiveTab}
        archivePrompt={archivePrompt} setArchivePrompt={setArchivePrompt}
        archiveOrder={archiveOrder} setArchiveOrder={setArchiveOrder}
        archiveAnswer={archiveAnswer} setArchiveAnswer={setArchiveAnswer}
        completedMachines={completedMachines}
        challengeNotice={challengeNotice} setChallengeNotice={setChallengeNotice}
        loopLanguage={loopLanguage} setLoopLanguage={setLoopLanguage}
        loopMode={loopMode} loopLimit={loopLimit} loopStep={loopStep}
        loopExpression={loopExpression} loopAnswer={loopAnswer}
        loopChoices={loopChoices} loopResult={loopResult} setLoopResult={setLoopResult}
        relayTarget={relayTarget} setRelayTarget={setRelayTarget}
        relayValue={relayValue} relayNodes={relayNodes} setRelayNodes={setRelayNodes}
        relayBitValues={relayBitValues} practiceScore={practiceScore}
        collectedCount={abilities.length + powerPieces}
        shuffle={shuffle} addPracticeScore={addPracticeScore}
        completeMachine={completeMachine} generateForgePractice={generateForgePractice}
        onClose={() => setPanel(null)}
      />
      <div className="battery-counter">
        <span>{coreReward ? "PRISM CORE ONLINE" : "CMOS BATTERIES"}</span>
        <b>{Math.min(10, abilities.length + powerPieces)}/10</b>
      </div>
      {galleryHud.active && (
        <section className="gallery-hud" aria-live="polite">
          <span>PRISM PULSE RANGE // LIVE</span>
          <div><b>{galleryHud.time}</b><small>SECONDS</small></div>
          <div><b>{galleryHud.score.toLocaleString()}</b><small>SCORE</small></div>
          <div><b>{galleryHud.best.toLocaleString()}</b><small>BEST</small></div>
          <p>MOVE RETICLE // CLICK, TAP, SPACE, OR F TO FIRE</p>
        </section>
      )}
      <MobileControls
        abilities={abilities}
        pulseUnlocked={coreReward}
        boostToggled={boostToggled}
        movePointerRef={stickPointer}
        lookPointerRef={lookPointer}
        moveStick={stick}
        lookStick={lookStick}
        onMoveStart={moveStick}
        onMove={moveStick}
        onMoveEnd={stopStick}
        onLookStart={moveLookStick}
        onLook={moveLookStick}
        onLookEnd={stopLookStick}
        onToggleBoost={() => {
          const next = !boostToggled;
          setBoostToggled(next);
          runtime.current?.boost(next);
        }}
        onJump={() => runtime.current?.jump()}
        onPulse={() => runtime.current?.firePulse()}
      />
    </main>
  );
}
