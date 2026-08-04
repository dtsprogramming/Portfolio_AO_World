/** Shared gameplay vocabulary used by the world runtime and interface panels. */
export type Ability = "sprint" | "jump" | "scan";
export type ForgeLanguage = "C#" | "Python" | "JavaScript" | "Java";
export type ForgeMode = "sum" | "product" | "evens";

/** Imperative controls exposed by the Three.js world to desktop and touch UI. */
export type WorldRuntime = {
  axis: (x: number, y: number) => void;
  look: (x: number, y: number) => void;
  boost: (active: boolean) => void;
  jump: () => void;
  firePulse: () => void;
  investigate: (id: string) => void;
  activateNetwork: () => void;
  spawnMachineBattery: (id: string) => void;
  activateCoreReward: () => void;
};
