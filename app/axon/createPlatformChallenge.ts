import * as THREE from "three";
import type { SceneFactories } from "./createSceneFactories";

/**
 * Builds the south light bridge and alternating static/moving platform route,
 * then places its persistent CMOS reward on the goal platform.
 */
export function createPlatformChallenge(
  scene: THREE.Scene,
  groundSurfaces: THREE.Object3D[],
  pieceCollected: boolean,
  { makeBox, deckMat, addTopBorder, createBatteryModel }: Pick<
    SceneFactories,
    "makeBox" | "deckMat" | "addTopBorder" | "createBatteryModel"
  >,
) {
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
  powerPiece.visible = !pieceCollected;

  return { movingPlatforms, movingBases, goalPlatform, powerPiece };
}

