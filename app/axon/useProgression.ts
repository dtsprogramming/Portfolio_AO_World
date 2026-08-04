import { useEffect, useRef, useState } from "react";
import type { Ability } from "./types";

/**
 * Owns collectible progression, machine completion, score, and local save
 * restoration. Mutable mirrors let the animation loop read current unlocks
 * without forcing the Three.js world to rebuild after every pickup.
 */
export function useProgression() {
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
  const [practiceScore, setPracticeScore] = useState(0);

  useEffect(() => {
    // Restore after hydration so server and first client render remain identical.
    let cancelled = false;
    try {
      const saved = JSON.parse(
        localStorage.getItem("axon-progress-v1") || "[]",
      ) as Ability[];
      const valid = saved.filter((item): item is Ability =>
        ["sprint", "jump", "scan"].includes(item),
      );
      const completed = JSON.parse(
        localStorage.getItem("axon-machines-v1") || "[]",
      ) as string[];
      const collectedRewards = JSON.parse(
        localStorage.getItem("axon-machine-batteries-v1") || "[]",
      ) as string[];
      const extraPieces = [
        "axon-transistor-cmos-v1",
        "axon-platform-cmos-v1",
        "axon-maze-cmos-v1",
      ].filter((key) => localStorage.getItem(key) === "1").length;

      abilitiesRef.current = new Set(valid);
      completedMachinesRef.current = new Set(completed);
      collectedMachineRewardsRef.current = new Set(collectedRewards);
      queueMicrotask(() => {
        if (cancelled) return;
        setAbilities(valid);
        setCompletedMachines(completed);
        setCollectedMachineRewards(collectedRewards);
        setPowerPieces(collectedRewards.length + extraPieces);
        setCoreReward(localStorage.getItem("axon-core-reward-v1") === "1");
        setPracticeScore(
          Number(localStorage.getItem("axon-practice-score-v1")) || 0,
        );
        setShowIntro(valid.length === 0);
        setSystemNotice(
          valid.includes("scan")
            ? "Optical Array online. Machine signatures revealed."
            : valid.includes("jump")
              ? "Locate CMOS-03 above the capacitor bank."
              : valid.includes("sprint")
                ? "Locate CMOS-02 along the western bus."
                : "Locate CMOS-01 on the main signal bus.",
        );
      });
    } catch {
      // Invalid local saves fall back to a clean progression state.
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    abilities,
    abilitiesRef,
    setAbilities,
    powerPieces,
    setPowerPieces,
    coreReward,
    setCoreReward,
    showCoreReward,
    setShowCoreReward,
    systemNotice,
    setSystemNotice,
    showIntro,
    setShowIntro,
    unlockCard,
    setUnlockCard,
    completedMachines,
    completedMachinesRef,
    setCompletedMachines,
    collectedMachineRewardsRef,
    setCollectedMachineRewards,
    practiceScore,
    setPracticeScore,
  };
}
