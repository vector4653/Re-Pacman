# Re-Pacman ✅

**Re-Pacman** is a Python reimplementation and extension of the classic Pac-Man game. This version focuses on AI-driven Pac-Man behavior and tuned ghost movement, including:

- A **greedy goal-directed algorithm** used by ghosts to move toward their mode targets (minimizes distance to goal at each decision step).
- A Pac-Man AI that prioritizes frightened ghosts and power pellets, balances safety vs. progress, and avoids oscillation.
- Hybrid pathing that combines BFS distance checks, merge-sorted pellet targeting, and late-game cluster targeting.

---

## 🚀 Features

- **Greedy ghost AI:** All ghosts pick the direction that minimizes squared distance to their current goal.
- **Pac-Man AI enhancements:**
  - Prioritizes frightened ghosts, then power pellets, then regular pellets.
  - Safety-aware routing when dangerous ghosts are nearby.
  - Flee behavior with a cooldown to prevent oscillation.
  - Hybrid pellet targeting: merge-sorted nearest pellets, BFS distance checks, and late-game densest-region targeting.
- Standard Pac-Man features: pellets, power pellets (frighten ghosts), fruits, multi-level mazes, and lives/score tracking.

---

## 🔧 Requirements

- Python 3.7+
- pygame (install with pip)

Suggested install:

```bash
python -m pip install pygame
```


---

## ▶️ How to run

From the repository root, run:

```bash
python projectfiles/run.py
```

The game window will open and start on the first level. Press the window close button or quit the window to exit.

---

## 🎮 Controls

- Space — pause/unpause the game.
- Close window — quit.

---

## 🧠 Implementation details

- The greedy goal selection lives in `projectfiles/entity.py` in `goalDirection`. For each valid direction, the ghost evaluates the squared distance from the next node to its `goal` and chooses the minimum.

- Pac-Man AI is implemented in `projectfiles/pacman.py` and includes:
  - `pacmanDirection` as the main decision method with frightened-ghost chasing, power-pellet priority, and safety-aware routing.
  - Merge sort for pellet distance ordering (`mergeSort`, `getSortedPelletsByDistance`) to target nearby pellets efficiently.
  - Hybrid targeting with BFS distance checks and late-game densest-region centroid logic.
  - `shouldFleeFromGhost` to reverse when a dangerous ghost is ahead, with a cooldown to prevent rapid oscillation.

- Ghost modes and speed tuning are in `projectfiles/ghosts.py` and `projectfiles/modes.py` (scatter/chase/freight/spawn). Ghost speeds are reduced relative to Pac-Man for a more forgiving play pace.

---

## 📁 Project structure (selected files)

- `projectfiles/run.py` — main game controller and entry point
- `projectfiles/pacman.py` — Pac-Man AI behavior
- `projectfiles/ghosts.py` — Ghost classes, modes, and speed tuning
- `projectfiles/entity.py` — Base entity behaviors, including `goalDirection` (greedy algorithm)
- `projectfiles/pellets.py` — Pellet management
- `projectfiles/nodes.py` — Maze node graph and connectivity
- `projectfiles/mazedata.py` & `*.txt` — Maze definitions and layout files
- `projectfiles/sprites.py` — Sprite/graphics helpers

---

## 📚 Source Code Attribution

The original source code for this project was taken from **[pacmancode.com](https://pacmancode.com)**, a comprehensive tutorial series on building a Pac-Man game in Python using Pygame. This project extends and modifies that foundation with additional AI behavior and gameplay tuning.


