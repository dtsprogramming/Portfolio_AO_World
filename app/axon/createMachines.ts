import * as THREE from "three";
import type { SceneFactories } from "./createSceneFactories";
import type { CollisionSolid } from "./createTraversalFactories";
import { landmarks } from "./worldData";

/**
 * Builds every interactive machine with powered faces, proximity rings, local
 * lights, and collision bounds. Network animation handles are returned.
 */
export function createMachines(
  scene: THREE.Scene,
  componentSolids: CollisionSolid[],
  scanAlreadyOnline: boolean,
  { makeBox, dark }: Pick<SceneFactories, "makeBox" | "dark">,
) {
  const machineRings: THREE.Mesh[] = [],
    machineGlowMats: THREE.MeshStandardMaterial[] = [],
    machineLights: THREE.PointLight[] = [];
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

  return { machineRings, machineGlowMats, machineLights };
}
