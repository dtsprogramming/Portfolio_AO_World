import * as THREE from "three";
import type { SceneFactories } from "./createSceneFactories";

export type CollisionSolid = {
  x: number;
  z: number;
  hx: number;
  hz: number;
  top: number;
};

/**
 * Creates traversable decks and ramps while registering their collision bounds
 * and raycast surfaces for the single player-physics runtime.
 */
export function createTraversalFactories(
  scene: THREE.Scene,
  groundSurfaces: THREE.Object3D[],
  { makeBox, deckMat, addTopBorder }: Pick<
    SceneFactories,
    "makeBox" | "deckMat" | "addTopBorder"
  >,
) {
  // Fabricated decks and traversable ramps
  const componentSolids: CollisionSolid[] = [];
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

  return { componentSolids, addDeck };
}
