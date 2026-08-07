import {
  Node,
  Vector2,
  STOP,
  UP,
  DOWN,
  LEFT,
  RIGHT,
  PORTAL,
  TILEWIDTH,
  TILEHEIGHT,
  PACMAN,
  BLINKY,
  PINKY,
  INKY,
  CLYDE,
  SCATTER,
  CHASE,
  FREIGHT,
  SPAWN,
  COLOR_YELLOW,
  COLOR_RED,
  COLOR_PINK,
  COLOR_TEAL,
  COLOR_ORANGE,
  COLOR_BLUE,
  COLOR_WHITE,
  NCOLS,
  NROWS,
} from "./nodes";

export class ModeController {
  timer = 0;
  time: number | null = null;
  mainModeTimer = 0;
  mainModeTime = 9;
  mainMode = SCATTER;
  current = SCATTER;
  entity: Ghost;

  constructor(entity: Ghost) {
    this.entity = entity;
  }

  update(dt: number): void {
    this.mainModeTimer += dt;
    if (this.mainModeTimer >= this.mainModeTime) {
      if (this.mainMode === SCATTER) {
        this.mainMode = CHASE;
        this.mainModeTime = 15;
      } else if (this.mainMode === CHASE) {
        this.mainMode = SCATTER;
        this.mainModeTime = 9;
      }
      this.mainModeTimer = 0;
    }

    if (this.current === FREIGHT) {
      if (this.time !== null) {
        this.timer += dt;
        if (this.timer >= this.time) {
          this.time = null;
          this.entity.normalMode();
          this.current = this.mainMode;
        }
      }
    } else if (this.current === SCATTER || this.current === CHASE) {
      this.current = this.mainMode;
    }

    if (this.current === SPAWN) {
      if (this.entity.node === this.entity.spawnNode) {
        this.entity.normalMode();
        this.current = this.mainMode;
      }
    }
  }

  setFreightMode(): void {
    if (this.current === SCATTER || this.current === CHASE) {
      this.timer = 0;
      this.time = 7;
      this.current = FREIGHT;
    } else if (this.current === FREIGHT) {
      this.timer = 0;
    }
  }

  setSpawnMode(): void {
    if (this.current === FREIGHT) {
      this.current = SPAWN;
    }
  }
}

export class Entity {
  name: number = PACMAN;
  position: Vector2 = new Vector2();
  direction: number = STOP;
  speed: number = 100;
  radius: number = 10;
  collideRadius: number = 5;
  color: string = COLOR_WHITE;
  visible: boolean = true;
  disablePortal: boolean = false;
  goal: Vector2 = new Vector2();
  node: Node;
  target: Node;

  directions: Record<number, Vector2> = {
    [UP]: new Vector2(0, -1),
    [DOWN]: new Vector2(0, 1),
    [LEFT]: new Vector2(-1, 0),
    [RIGHT]: new Vector2(1, 0),
    [STOP]: new Vector2(0, 0),
  };

  constructor(node: Node) {
    this.node = node;
    this.target = node;
    this.setPosition();
  }

  setPosition(): void {
    this.position = this.node.position.copy();
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  validDirection(direction: number): boolean {
    if (direction !== STOP) {
      if (this.node.access[direction as keyof typeof this.node.access]?.includes(this.name)) {
        if (this.node.neighbors[direction as keyof typeof this.node.neighbors] !== null) {
          return true;
        }
      }
    }
    return false;
  }

  getNewTarget(direction: number): Node {
    if (this.validDirection(direction)) {
      return this.node.neighbors[direction as keyof typeof this.node.neighbors]!;
    }
    return this.node;
  }

  overshotTarget(): boolean {
    if (this.target && this.target !== this.node) {
      const vec1 = this.target.position.sub(this.node.position);
      const vec2 = this.position.sub(this.node.position);
      return vec2.magnitudeSquared() >= vec1.magnitudeSquared();
    }
    return false;
  }

  reverseDirection(): void {
    this.direction = this.direction * -1;
    const temp = this.node;
    this.node = this.target;
    this.target = temp;
  }

  validDirections(): number[] {
    const valid: number[] = [];
    const dirs = [UP, DOWN, LEFT, RIGHT];
    for (const d of dirs) {
      if (this.validDirection(d)) {
        if (d !== this.direction * -1) {
          valid.push(d);
        }
      }
    }
    if (valid.length === 0) {
      valid.push(this.direction * -1);
    }
    return valid;
  }

  goalDirection(directions: number[]): number {
    let bestDir = directions[0];
    let minDistance = Infinity;

    for (const d of directions) {
      const nextNode = this.node.neighbors[d as keyof typeof this.node.neighbors];
      if (nextNode) {
        const dist = nextNode.position.sub(this.goal).magnitudeSquared();
        if (dist < minDistance) {
          minDistance = dist;
          bestDir = d;
        }
      }
    }
    return bestDir;
  }

  randomDirection(directions: number[]): number {
    const idx = Math.floor(Math.random() * directions.length);
    return directions[idx];
  }

  update(dt: number): void {
    const dirVec = this.directions[this.direction] || new Vector2();
    this.position = this.position.add(dirVec.mul(this.speed * dt));

    if (this.overshotTarget()) {
      this.node = this.target;

      if (!this.disablePortal && this.node.neighbors[PORTAL] !== null) {
        this.node = this.node.neighbors[PORTAL]!;
      }

      const availableDirs = this.validDirections();
      const nextDir = this.chooseDirection(availableDirs);

      this.target = this.getNewTarget(nextDir);
      if (this.target !== this.node) {
        this.direction = nextDir;
      } else {
        this.target = this.getNewTarget(this.direction);
      }

      if (this.target === this.node) {
        this.direction = STOP;
      }
      this.setPosition();
    }
  }

  chooseDirection(directions: number[]): number {
    return this.goalDirection(directions);
  }
}

export class Pacman extends Entity {
  alive = true;
  userBufferedDirection: number = LEFT;

  constructor(node: Node) {
    super(node);
    this.name = PACMAN;
    this.color = COLOR_YELLOW;
    this.direction = LEFT;
    this.target = this.getNewTarget(LEFT);
  }

  reset(node: Node): void {
    this.node = node;
    this.target = node;
    this.setPosition();
    this.direction = LEFT;
    this.userBufferedDirection = LEFT;
    this.alive = true;
  }

  chooseDirection(directions: number[]): number {
    if (this.validDirection(this.userBufferedDirection)) {
      return this.userBufferedDirection;
    }
    if (this.validDirection(this.direction)) {
      return this.direction;
    }
    return directions[0] || STOP;
  }

  update(dt: number): void {
    if (!this.alive) return;
    if (this.validDirection(this.userBufferedDirection)) {
      if (this.userBufferedDirection === this.direction * -1) {
        this.reverseDirection();
      }
    }
    super.update(dt);
  }
}

export class Ghost extends Entity {
  points = 200;
  pacman: Pacman;
  mode: ModeController;
  blinky?: Ghost;
  homeNode: Node;
  spawnNode: Node;

  constructor(node: Node, pacman: Pacman, blinky?: Ghost) {
    super(node);
    this.name = BLINKY;
    this.pacman = pacman;
    this.blinky = blinky;
    this.homeNode = node;
    this.spawnNode = node;
    this.mode = new ModeController(this);
    this.setSpeed(62);
  }

  reset(node: Node): void {
    this.node = node;
    this.target = node;
    this.setPosition();
    this.points = 200;
    this.setSpeed(62);
    this.mode.current = SCATTER;
  }

  scatter(): void {
    this.goal = new Vector2(0, 0);
  }

  chase(): void {
    this.goal = this.pacman.position.copy();
  }

  spawn(): void {
    if (this.spawnNode) {
      this.goal = this.spawnNode.position.copy();
    }
  }

  startSpawn(): void {
    this.mode.setSpawnMode();
    if (this.mode.current === SPAWN) {
      this.setSpeed(120);
      this.spawn();
    }
  }

  startFreight(): void {
    this.mode.setFreightMode();
    if (this.mode.current === FREIGHT) {
      this.setSpeed(40);
    }
  }

  normalMode(): void {
    this.setSpeed(62);
    this.homeNode.denyAccess(DOWN, this.name);
  }

  update(dt: number): void {
    this.mode.update(dt);
    if (this.mode.current === SCATTER) {
      this.scatter();
    } else if (this.mode.current === CHASE) {
      this.chase();
    } else if (this.mode.current === SPAWN) {
      this.spawn();
    }
    super.update(dt);
  }

  chooseDirection(directions: number[]): number {
    if (this.mode.current === FREIGHT) {
      return this.randomDirection(directions);
    }
    return this.goalDirection(directions);
  }
}

export class Blinky extends Ghost {
  constructor(node: Node, pacman: Pacman) {
    super(node, pacman);
    this.name = BLINKY;
    this.color = COLOR_RED;
  }

  scatter(): void {
    this.goal = new Vector2(TILEWIDTH * NCOLS, 0);
  }

  chase(): void {
    this.goal = this.pacman.position.copy();
  }
}

export class Pinky extends Ghost {
  constructor(node: Node, pacman: Pacman) {
    super(node, pacman);
    this.name = PINKY;
    this.color = COLOR_PINK;
  }

  scatter(): void {
    this.goal = new Vector2(0, 0);
  }

  chase(): void {
    const dir = this.pacman.directions[this.pacman.direction] || new Vector2();
    this.goal = this.pacman.position.add(dir.mul(TILEWIDTH * 4));
  }
}

export class Inky extends Ghost {
  constructor(node: Node, pacman: Pacman, blinky: Ghost) {
    super(node, pacman, blinky);
    this.name = INKY;
    this.color = COLOR_TEAL;
  }

  scatter(): void {
    this.goal = new Vector2(TILEWIDTH * NCOLS, TILEHEIGHT * NROWS);
  }

  chase(): void {
    const dir = this.pacman.directions[this.pacman.direction] || new Vector2();
    const vec1 = this.pacman.position.add(dir.mul(TILEWIDTH * 2));
    const blinkyPos = this.blinky ? this.blinky.position : this.pacman.position;
    const vec2 = vec1.sub(blinkyPos).mul(2);
    this.goal = blinkyPos.add(vec2);
  }
}

export class Clyde extends Ghost {
  constructor(node: Node, pacman: Pacman) {
    super(node, pacman);
    this.name = CLYDE;
    this.color = COLOR_ORANGE;
  }

  scatter(): void {
    this.goal = new Vector2(0, TILEHEIGHT * NROWS);
  }

  chase(): void {
    const d = this.pacman.position.sub(this.position);
    if (d.magnitudeSquared() <= (TILEWIDTH * 8) ** 2) {
      this.scatter();
    } else {
      const dir = this.pacman.directions[this.pacman.direction] || new Vector2();
      this.goal = this.pacman.position.add(dir.mul(TILEWIDTH * 4));
    }
  }
}

export class Pellet {
  name = 1; // PELLET
  position: Vector2;
  radius: number;
  collideRadius: number;
  points = 10;
  visible = true;

  constructor(row: number, col: number) {
    this.position = new Vector2(col * TILEWIDTH, row * TILEHEIGHT);
    this.radius = 2;
    this.collideRadius = 2;
  }
}

export class PowerPellet extends Pellet {
  flashTime = 0.2;
  timer = 0;

  constructor(row: number, col: number) {
    super(row, col);
    this.name = 2; // POWERPELLET
    this.radius = 6;
    this.collideRadius = 6;
    this.points = 50;
  }

  update(dt: number): void {
    this.timer += dt;
    if (this.timer >= this.flashTime) {
      this.visible = !this.visible;
      this.timer = 0;
    }
  }
}
