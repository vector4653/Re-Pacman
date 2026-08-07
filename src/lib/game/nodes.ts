export const TILEWIDTH = 16;
export const TILEHEIGHT = 16;
export const NROWS = 36;
export const NCOLS = 28;
export const SCREENWIDTH = NCOLS * TILEWIDTH; // 448
export const SCREENHEIGHT = NROWS * TILEHEIGHT; // 576

// Directions
export const STOP = 0;
export const UP = 1;
export const DOWN = -1;
export const LEFT = 2;
export const RIGHT = -2;
export const PORTAL = 3;

// Entity / Object Types
export const PACMAN = 0;
export const PELLET = 1;
export const POWERPELLET = 2;
export const GHOST = 3;
export const BLINKY = 4;
export const PINKY = 5;
export const INKY = 6;
export const CLYDE = 7;
export const FRUIT = 8;

// AI Modes
export const SCATTER = 0;
export const CHASE = 1;
export const FREIGHT = 2;
export const SPAWN = 3;

// Colors
export const COLOR_BLACK = "#000000";
export const COLOR_YELLOW = "#FFFF00";
export const COLOR_WHITE = "#FFFFFF";
export const COLOR_RED = "#FF0000";
export const COLOR_PINK = "#FF6496";
export const COLOR_TEAL = "#64FFFF";
export const COLOR_ORANGE = "#E6BE28";
export const COLOR_GREEN = "#00FF00";
export const COLOR_BLUE = "#0000FF";

export class Vector2 {
  x: number;
  y: number;
  thresh = 0.000001;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  sub(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  neg(): Vector2 {
    return new Vector2(-this.x, -this.y);
  }

  mul(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  div(scalar: number): Vector2 {
    if (scalar !== 0) {
      return new Vector2(this.x / scalar, this.y / scalar);
    }
    return new Vector2(this.x, this.y);
  }

  equals(other: Vector2): boolean {
    return Math.abs(this.x - other.x) < this.thresh && Math.abs(this.y - other.y) < this.thresh;
  }

  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  magnitude(): number {
    return Math.sqrt(this.magnitudeSquared());
  }

  copy(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  asTuple(): [number, number] {
    return [this.x, this.y];
  }

  asInt(): [number, number] {
    return [Math.floor(this.x), Math.floor(this.y)];
  }
}

export interface Neighbors {
  [UP]: Node | null;
  [DOWN]: Node | null;
  [LEFT]: Node | null;
  [RIGHT]: Node | null;
  [PORTAL]: Node | null;
}

export interface Access {
  [UP]: number[];
  [DOWN]: number[];
  [LEFT]: number[];
  [RIGHT]: number[];
}

export class Node {
  position: Vector2;
  neighbors: Neighbors;
  access: Access;

  constructor(x: number, y: number) {
    this.position = new Vector2(x, y);
    this.neighbors = {
      [UP]: null,
      [DOWN]: null,
      [LEFT]: null,
      [RIGHT]: null,
      [PORTAL]: null,
    };
    const allEntities = [PACMAN, BLINKY, PINKY, INKY, CLYDE, FRUIT];
    this.access = {
      [UP]: [...allEntities],
      [DOWN]: [...allEntities],
      [LEFT]: [...allEntities],
      [RIGHT]: [...allEntities],
    };
  }

  denyAccess(direction: number, entityName: number): void {
    const idx = this.access[direction as keyof Access]?.indexOf(entityName);
    if (idx !== undefined && idx !== -1) {
      this.access[direction as keyof Access].splice(idx, 1);
    }
  }

  allowAccess(direction: number, entityName: number): void {
    const arr = this.access[direction as keyof Access];
    if (arr && !arr.includes(entityName)) {
      arr.push(entityName);
    }
  }
}

export class NodeGroup {
  nodesLUT: Map<string, Node> = new Map();
  nodeSymbols = ["+", "P", "n"];
  pathSymbols = [".", "-", "|", "p"];
  homekey: string | null = null;

  constructor(mazeDataText: string, isMaze2 = false) {
    const data = mazeDataText
      .trim()
      .split("\n")
      .map((line) => line.trim().split(/\s+/));

    this.createNodeTable(data);
    this.connectHorizontally(data);
    this.connectVertically(data);

    if (isMaze2) {
      this.setPortalPair([0, 4], [27, 4]);
      this.setPortalPair([0, 26], [27, 26]);
      this.createHomeNodes(11.5, 14);
      this.connectHomeNodes(this.homekey!, [9, 14], LEFT);
      this.connectHomeNodes(this.homekey!, [18, 14], RIGHT);
    } else {
      this.setPortalPair([0, 17], [27, 17]);
      this.createHomeNodes(11.5, 14);
      this.connectHomeNodes(this.homekey!, [12, 14], LEFT);
      this.connectHomeNodes(this.homekey!, [15, 14], RIGHT);
    }
  }

  constructKey(x: number, y: number): string {
    return `${x * TILEWIDTH},${y * TILEHEIGHT}`;
  }

  getNode(x: number, y: number): Node | undefined {
    return this.nodesLUT.get(this.constructKey(x, y));
  }

  createNodeTable(data: string[][], xoffset = 0, yoffset = 0): void {
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        if (this.nodeSymbols.includes(data[r][c])) {
          const key = this.constructKey(c + xoffset, r + yoffset);
          const node = new Node((c + xoffset) * TILEWIDTH, (r + yoffset) * TILEHEIGHT);
          this.nodesLUT.set(key, node);
        }
      }
    }
  }

  connectHorizontally(data: string[][], xoffset = 0, yoffset = 0): void {
    for (let r = 0; r < data.length; r++) {
      let key: string | null = null;
      for (let c = 0; c < data[r].length; c++) {
        const val = data[r][c];
        if (this.nodeSymbols.includes(val)) {
          if (key === null) {
            key = this.constructKey(c + xoffset, r + yoffset);
          } else {
            const otherkey = this.constructKey(c + xoffset, r + yoffset);
            const n1 = this.nodesLUT.get(key);
            const n2 = this.nodesLUT.get(otherkey);
            if (n1 && n2) {
              n1.neighbors[RIGHT] = n2;
              n2.neighbors[LEFT] = n1;
            }
            key = otherkey;
          }
        } else if (!this.pathSymbols.includes(val)) {
          key = null;
        }
      }
    }
  }

  connectVertically(data: string[][], xoffset = 0, yoffset = 0): void {
    const rows = data.length;
    const cols = data[0].length;
    for (let c = 0; c < cols; c++) {
      let key: string | null = null;
      for (let r = 0; r < rows; r++) {
        const val = data[r][c];
        if (this.nodeSymbols.includes(val)) {
          if (key === null) {
            key = this.constructKey(c + xoffset, r + yoffset);
          } else {
            const otherkey = this.constructKey(c + xoffset, r + yoffset);
            const n1 = this.nodesLUT.get(key);
            const n2 = this.nodesLUT.get(otherkey);
            if (n1 && n2) {
              n1.neighbors[DOWN] = n2;
              n2.neighbors[UP] = n1;
            }
            key = otherkey;
          }
        } else if (!this.pathSymbols.includes(val)) {
          key = null;
        }
      }
    }
  }

  setPortalPair(pair1: [number, number], pair2: [number, number]): void {
    const k1 = this.constructKey(...pair1);
    const k2 = this.constructKey(...pair2);
    const n1 = this.nodesLUT.get(k1);
    const n2 = this.nodesLUT.get(k2);
    if (n1 && n2) {
      n1.neighbors[PORTAL] = n2;
      n2.neighbors[PORTAL] = n1;
    }
  }

  createHomeNodes(xoffset: number, yoffset: number): string {
    const homedata = [
      ["X", "X", "+", "X", "X"],
      ["X", "X", ".", "X", "X"],
      ["+", "X", ".", "X", "+"],
      ["+", ".", "+", ".", "+"],
      ["+", "X", "X", "X", "+"],
    ];
    this.createNodeTable(homedata, xoffset, yoffset);
    this.connectHorizontally(homedata, xoffset, yoffset);
    this.connectVertically(homedata, xoffset, yoffset);
    this.homekey = this.constructKey(xoffset + 2, yoffset);
    return this.homekey;
  }

  connectHomeNodes(homekey: string, otherkeyTuple: [number, number], direction: number): void {
    const otherkey = this.constructKey(...otherkeyTuple);
    const nHome = this.nodesLUT.get(homekey);
    const nOther = this.nodesLUT.get(otherkey);
    if (nHome && nOther) {
      nHome.neighbors[direction as keyof Neighbors] = nOther;
      const opp = direction * -1;
      nOther.neighbors[opp as keyof Neighbors] = nHome;
    }
  }
}
