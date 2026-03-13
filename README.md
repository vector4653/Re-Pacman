# Re-Pacman

Re-Pacman is a Python + Pygame Pac-Man project based on the PacmanCode tutorial codebase, extended with AI-focused gameplay behavior and pathfinding logic.

## Overview

This project keeps the classic Pac-Man loop (pellets, power pellets, ghosts, fruit, levels, lives, score) while adding custom decision systems for movement and target selection.

Key additions include:

- Greedy goal-based ghost movement.
- Pac-Man AI that prioritizes opportunities (frightened ghosts and power pellets) while reacting to nearby danger.
- Hybrid pellet targeting using sorting and path distance checks.
- Maze connectivity validation at level load.

## Requirements

- Python 3.8+
- `pygame`

Install dependency:

```bash
python -m pip install pygame
```

## Run

From the repository root:

```bash
python projectfiles/run.py
```

## Controls

- `Space`: Pause / unpause
- Close the game window: Quit

## How the AI Works

- Ghost movement is driven by goal-directed greedy selection in `projectfiles/entity.py` (`goalDirection`).
  Each candidate direction is scored by squared distance to the current goal, and the minimum is selected.

- Pac-Man behavior in `projectfiles/pacman.py` includes:
  - Prioritizing frightened ghosts when safe.
  - Prioritizing power pellets under threat.
  - Flee logic with cooldown to reduce oscillation.
  - Pellet targeting via distance-aware ordering and path checks.

- Maze validation runs during game startup in `projectfiles/run.py` by checking pellet reachability from Pac-Man's start node.

## Concepts Used in This Project

This project applies several core Computer Science and game-development concepts:

- Graph modeling:
  The maze is represented as a node graph (`NodeGroup`) with adjacency links for movement in four directions.

- Graph traversal (BFS):
  Breadth-first search style traversals are used for distance and reachability logic in Pac-Man decision making.

- Backtracking / DFS validation:
  A recursive backtracking-based connectivity validator checks whether pellet nodes are reachable from the start.

- Greedy heuristics:
  Ghost movement uses greedy local choice (pick the direction minimizing squared distance to the current goal).

- Dynamic programming (memoization):
  Path-distance subproblems are cached in entity logic to avoid recomputing repeated shortest-path estimates.

- Multi-source danger mapping:
  Pac-Man AI builds a danger-distance map from multiple ghost positions to evaluate safe routes.

- Heuristic decision scoring:
  Direction choice combines safety constraints, target distance, and reversal penalties for practical real-time behavior.

- Finite state machine (FSM):
  Ghost behavior modes (`SCATTER`, `CHASE`, `FREIGHT`, `SPAWN`) are managed through timed state transitions.

- Collision detection:
  Circle-radius overlap checks are used for pellet, fruit, and ghost interactions.

- Event-driven game loop:
  The game uses a frame update loop with input handling, entity updates, rendering, and pause/state events.

- Object-oriented design:
  Shared behavior is encapsulated in base classes (`Entity`, `Ghost`), then specialized via inheritance.

- Performance-minded engineering:
  Cached node lookup and bounded caches are used to keep AI calculations responsive during gameplay.

## Project Structure

- `projectfiles/run.py`: Game controller and main loop
- `projectfiles/pacman.py`: Pac-Man movement and AI decisions
- `projectfiles/ghosts.py`: Ghost definitions, updates, and mode behavior
- `projectfiles/entity.py`: Shared movement logic and goal-direction selection
- `projectfiles/nodes.py`: Graph nodes, connectivity, and maze traversal support
- `projectfiles/pellets.py`: Pellet and power-pellet management
- `projectfiles/mazedata.py`: Maze metadata and level setup helpers
- `projectfiles/fruit.py`: Fruit spawn and scoring logic
- `projectfiles/constants.py`: Global constants and game enums

## Notes

- The game starts paused/ready and advances through levels automatically as pellets are cleared.
- The default life count is set in `projectfiles/run.py`.

## Attribution

Original baseline implementation source:

- PacmanCode tutorial project: https://pacmancode.com

This repository builds on that baseline with additional AI and gameplay adjustments.


