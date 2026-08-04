import * as THREE from "three";
import type { Ability } from "./types";
import type { SceneFactories } from "./createSceneFactories";
import { landmarks } from "./worldData";

/**
 * Builds the three ability batteries and per-machine CMOS reward stations.
 * Save-state sets determine which models are visible when the world mounts.
 */
export function createCollectibles(
  scene: THREE.Scene,
  unlockedAbilities: Set<Ability>,
  completedMachines: Set<string>,
  collectedRewards: Set<string>,
  { createBatteryModel }: Pick<SceneFactories, "createBatteryModel">,
) {
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
    group.visible = !unlockedAbilities.has(data.ability);
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
      completedMachines.has(landmark.id) &&
      !collectedRewards.has(landmark.id);
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

  return { batteryData, batteryMeshes, machineRewardStations };
}

