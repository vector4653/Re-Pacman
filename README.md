# Re-Pacman ✅

**Re-Pacman** is a Python reimplementation and extension of the classic Pac-Man game. This version contails several modifications and enhancements compared to a traditional Pac-Man clone, most notably:

- A **greedy chase algorithm** used by ghosts to move toward their goals (minimizes distance to goal at each decision step).
- The ability to **play as a ghost** (Blinky is player-controlled by default) while Pac-Man is controlled by a greedy algorithm.
- Improvements to Pac-Man's Algorithm with prioritized pellet collection, BFS-based pellet search, fleeing behavior from nearby ghosts, and anti-oscillation logic.

---

## 🚀 Features

- **Greedy ghost:-** All ghosts choose the direction that reduces squared distance to their goal (fast, simple chase behavior).
- Playable ghost: control **Blinky** using the arrow keys and attempt to catch the Pac-Man before he clears the map.
- Enhanced Pac-Man Algorithm:
  - Power pellet prioritization
  - Attack Ghosts when frightened.
  - BFS-based nearest pellet search
  - Safety-aware path selection when ghosts are nearby
  - Anti-oscillation (prevents frequent rapid reversals)
- Standard Pac-Man features of Source Code: pellets, power pellets (frighten ghosts), fruits, multi-level mazes, and lives/score tracking.

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

- Arrow keys — control **Blinky** (the red ghost; the player-controlled entity).
- Space — pause/unpause the game.
- Close window — quit.

> Gameplay notes: Pac-Man is controlled by an Algorithm (so you are effectively playing as a ghost trying to catch him). Power pellets will frighten ghosts (they enter FREIGHT mode); when ghosts are frightened you can be eaten for points. Go back to the center to turn into a ghost again

---

## 🧠 Implementation details

- The greedy chase algorithm is implemented in `projectfiles/entity.py` in the `goalDirection` method. For each valid direction, the ghost evaluates the squared distance from the potential next node to its `goal` and chooses the direction minimizing that distance.

- Pac-Man Algorithm is implemented in `projectfiles/pacman.py` and includes:
  - `pacmanDirection` — MAIN decision method prioritizing frightened ghosts, power pellets, and regular pellets.
  - BFS-based nearest-pellet search and safety-aware path selection to balance pellet collection and avoiding nearby ghosts.
  - `shouldFleeFromGhost` logic to reverse direction if a ghost is dangerously close ahead (with a small cooldown to avoid oscillation).

- Blinky (in `projectfiles/ghosts.py`) is overridden to accept keyboard input while still participating in normal game mode transitions.

---

## 📁 Project structure (selected files)

- `projectfiles/run.py` — mail game controller and entry point
- `projectfiles/pacman.py` — Pac-Man AIland behavior
- `projectfiles/ghosts.py` — Ghost classes and player-control override for Blinky
- `projectfiles/entity.py` — Base entity behaviors, including `goalDirection` (greedy algorithm)
- `projectfiles/pellets.py` — Pellet management
- `projectfiles/nodes.py` — Maze node graph and connectivity
- `projectfiles/mazedata.py` & `*.txt` — Maze definitions and layout files
- `projectfiles/sprites.py` — Sprite/graphics helpers

---

## 📚 Source Code Attribution

The original source code for this project was taken from **[pacmancode.com](https://pacmancode.com)**, a comprehensive tutorial series on building a Pac-Man game in Python using Pygame. This project extends and modifies that foundation with additional features such as playable ghost mode and enhanced Greedy algorithms.


