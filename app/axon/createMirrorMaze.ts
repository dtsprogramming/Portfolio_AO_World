import * as THREE from "three";
import type { SceneFactories } from "./createSceneFactories";
import type { CollisionSolid } from "./createTraversalFactories";

/**
 * Builds the deterministic southwest mirror maze, objective signage, CMOS
 * reward, and nearby chipset cover while registering every collision wall.
 */
export function createMirrorMaze(
  scene: THREE.Scene,
  groundSurfaces: THREE.Object3D[],
  componentSolids: CollisionSolid[],
  vias: THREE.Material,
  skyGlow: THREE.Material,
  mazeBatteryCollected: boolean,
  { makeBox, dark, copper, addTopBorder, createBatteryModel }: Pick<
    SceneFactories,
    "makeBox" | "dark" | "copper" | "addTopBorder" | "createBatteryModel"
  >,
) {
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
    const neighbors = ([
      [column, row - 1, 0, 2],
      [column + 1, row, 1, 3],
      [column, row + 1, 2, 0],
      [column - 1, row, 3, 1],
    ] as [number, number, number, number][]).filter(
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

  return { mazeBattery, mazeOriginX, mazeOriginZ, mazeCols, mazeRows, mazeCell };
}
