"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  TILEWIDTH,
  TILEHEIGHT,
  SCREENWIDTH,
  SCREENHEIGHT,
  NodeGroup,
  Node,
  Vector2,
  UP,
  DOWN,
  LEFT,
  RIGHT,
  SCATTER,
  CHASE,
  FREIGHT,
  SPAWN,
  COLOR_YELLOW,
  COLOR_RED,
  COLOR_PINK,
  COLOR_TEAL,
  COLOR_ORANGE,
  COLOR_WHITE,
  COLOR_BLUE,
} from "@/lib/game/nodes";
import { MAZE1_DATA, MAZE2_DATA } from "@/lib/game/mazes";
import { Pacman, Blinky, Pinky, Inky, Clyde, Pellet, PowerPellet, Ghost } from "@/lib/game/entities";
import { Play, Pause, RotateCcw, Eye, ShieldAlert, Zap, Trophy, Volume2, VolumeX } from "lucide-react";
import confetti from "canvas-confetti";

export interface GameEngineProps {
  initialMazeIndex?: number;
}

export default function GameEngine({ initialMazeIndex = 0 }: GameEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Game control state
  const [mazeIndex, setMazeIndex] = useState(initialMazeIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Debug toggles
  const [showTargets, setShowTargets] = useState(true);
  const [showGraph, setShowGraph] = useState(false);
  const [showModeOverlay, setShowModeOverlay] = useState(true);

  // References for live loop
  const gameStateRef = useRef<{
    nodeGroup: NodeGroup;
    pacman: Pacman;
    blinky: Blinky;
    pinky: Pinky;
    inky: Inky;
    clyde: Clyde;
    ghosts: Ghost[];
    pellets: Pellet[];
    powerPellets: PowerPellet[];
    spritesheet: HTMLImageElement | null;
    mspacmanSheet: HTMLImageElement | null;
  } | null>(null);

  // Initialize Game Instance
  const initGame = (mazeIdx: number) => {
    const mazeData = mazeIdx === 0 ? MAZE1_DATA : MAZE2_DATA;
    const isMaze2 = mazeIdx === 1;
    const nodeGroup = new NodeGroup(mazeData, isMaze2);

    const fallbackNode = nodeGroup.nodesLUT.values().next().value!;
    const pacStartNode = (isMaze2 ? nodeGroup.getNode(16, 26) : nodeGroup.getNode(15, 26)) || fallbackNode;

    const homeNodeKey = nodeGroup.homekey;
    const homeNode = (homeNodeKey ? nodeGroup.nodesLUT.get(homeNodeKey) : pacStartNode) || fallbackNode;

    const pacman = new Pacman(pacStartNode);
    const blinky = new Blinky(homeNode, pacman);
    const pinky = new Pinky(homeNode, pacman);
    const inky = new Inky(homeNode, pacman, blinky);
    const clyde = new Clyde(homeNode, pacman);

    const ghosts = [blinky, pinky, inky, clyde];
    ghosts.forEach((g) => {
      if (homeNode) g.spawnNode = homeNode;
    });

    // Parse pellets from raw grid
    const pellets: Pellet[] = [];
    const powerPellets: PowerPellet[] = [];
    const grid = mazeData.trim().split("\n").map((line) => line.trim().split(/\s+/));

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const char = grid[r][c];
        if (char === "." || char === "+") {
          pellets.push(new Pellet(r, c));
        } else if (char === "P" || char === "p") {
          const pp = new PowerPellet(r, c);
          pellets.push(pp);
          powerPellets.push(pp);
        }
      }
    }

    // Load sprite sheets
    const spritesheet = new Image();
    spritesheet.src = "/spritesheet.png";

    const mspacmanSheet = new Image();
    mspacmanSheet.src = "/spritesheet_mspacman.png";

    gameStateRef.current = {
      nodeGroup,
      pacman,
      blinky,
      pinky,
      inky,
      clyde,
      ghosts,
      pellets,
      powerPellets,
      spritesheet,
      mspacmanSheet,
    };

    setScore(0);
    setLives(3);
    setGameOver(false);
    setVictory(false);
  };

  useEffect(() => {
    initGame(mazeIndex);
  }, [mazeIndex]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStateRef.current) return;
      const { pacman } = gameStateRef.current;

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        pacman.userBufferedDirection = UP;
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        pacman.userBufferedDirection = DOWN;
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        pacman.userBufferedDirection = LEFT;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        pacman.userBufferedDirection = RIGHT;
      } else if (e.key === " " || e.key === "p" || e.key === "P") {
        setIsPaused((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Main 60FPS Game Loop Hook
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const renderLoop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      if (canvas && ctx && gameStateRef.current) {
        const { nodeGroup, pacman, blinky, pinky, inky, clyde, ghosts, pellets, powerPellets } = gameStateRef.current;

        // Clear canvas frame
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, SCREENWIDTH, SCREENHEIGHT);

        if (!isPaused && !gameOver && !victory) {
          // Update Pacman and entities
          pacman.update(dt);
          ghosts.forEach((g) => g.update(dt));
          powerPellets.forEach((pp) => pp.update(dt));

          // Check Pellet Collision
          for (let i = pellets.length - 1; i >= 0; i--) {
            const p = pellets[i];
            if (p.visible) {
              const pCenter = p.position.add(new Vector2(TILEWIDTH / 2, TILEHEIGHT / 2));
              const distSq = pacman.position.sub(pCenter).magnitudeSquared();
              if (distSq < (pacman.collideRadius + p.collideRadius) ** 2) {
                p.visible = false;
                pellets.splice(i, 1);
                setScore((prev) => prev + p.points);

                if (p.name === 2) {
                  // PowerPellet trigger freight mode
                  ghosts.forEach((g) => g.startFreight());
                }
              }
            }
          }

          // Check Level Victory
          if (pellets.length === 0) {
            setVictory(true);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          }

          // Check Ghost Collision
          ghosts.forEach((g) => {
            const distSq = pacman.position.sub(g.position).magnitudeSquared();
            if (distSq < (pacman.radius + g.radius) ** 2) {
              if (g.mode.current === FREIGHT) {
                g.startSpawn();
                setScore((prev) => prev + g.points);
              } else if (g.mode.current !== SPAWN) {
                // Pacman Dies
                setLives((prevLives) => {
                  if (prevLives <= 1) {
                    setGameOver(true);
                    return 0;
                  }
                  // Respawn Pacman & Ghosts
                  const fallbackNode = nodeGroup.nodesLUT.values().next().value!;
                  const startNode = nodeGroup.getNode(15, 26) || fallbackNode;
                  pacman.reset(startNode);
                  ghosts.forEach((ghost) => ghost.reset(nodeGroup.getNode(15, 14) || fallbackNode));
                  return prevLives - 1;
                });
              }
            }
          });
        }

        // --- RENDER GAME SCENE ---

        // 1. Render Graph Debug Overlay
        if (showGraph) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 2;
          nodeGroup.nodesLUT.forEach((node) => {
            Object.values(node.neighbors).forEach((neighbor) => {
              if (neighbor) {
                ctx.beginPath();
                ctx.moveTo(node.position.x + 8, node.position.y + 8);
                ctx.lineTo(neighbor.position.x + 8, neighbor.position.y + 8);
                ctx.stroke();
              }
            });
            ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
            ctx.beginPath();
            ctx.arc(node.position.x + 8, node.position.y + 8, 3, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // 2. Render Maze Walls & Borders
        ctx.strokeStyle = "#1919A6";
        ctx.lineWidth = 3;
        nodeGroup.nodesLUT.forEach((node) => {
          Object.entries(node.neighbors).forEach(([dirStr, neighbor]) => {
            if (!neighbor) {
              const dir = parseInt(dirStr);
              ctx.beginPath();
              if (dir === UP) {
                ctx.moveTo(node.position.x, node.position.y);
                ctx.lineTo(node.position.x + TILEWIDTH, node.position.y);
              } else if (dir === DOWN) {
                ctx.moveTo(node.position.x, node.position.y + TILEHEIGHT);
                ctx.lineTo(node.position.x + TILEWIDTH, node.position.y + TILEHEIGHT);
              } else if (dir === LEFT) {
                ctx.moveTo(node.position.x, node.position.y);
                ctx.lineTo(node.position.x, node.position.y + TILEHEIGHT);
              } else if (dir === RIGHT) {
                ctx.moveTo(node.position.x + TILEWIDTH, node.position.y);
                ctx.lineTo(node.position.x + TILEWIDTH, node.position.y + TILEHEIGHT);
              }
              ctx.stroke();
            }
          });
        });

        // 3. Render Pellets & Power Pellets
        pellets.forEach((p) => {
          if (p.visible) {
            ctx.fillStyle = "#FFB8AE";
            ctx.beginPath();
            const cx = p.position.x + TILEWIDTH / 2;
            const cy = p.position.y + TILEHEIGHT / 2;
            ctx.arc(cx, cy, p.radius, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // 4. Render Pacman
        ctx.fillStyle = COLOR_YELLOW;
        ctx.beginPath();
        const pacX = pacman.position.x + TILEWIDTH / 2;
        const pacY = pacman.position.y + TILEHEIGHT / 2;
        ctx.arc(pacX, pacY, 9, 0, Math.PI * 2);
        ctx.fill();

        // Eye vector indicator for direction
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(pacX + (pacman.directions[pacman.direction]?.x || 0) * 4, pacY + (pacman.directions[pacman.direction]?.y || 0) * 4 - 3, 2, 0, Math.PI * 2);
        ctx.fill();

        // 5. Render Ghosts & Ghost Target Overlay
        ghosts.forEach((g) => {
          if (!g.visible) return;
          const gX = g.position.x + TILEWIDTH / 2;
          const gY = g.position.y + TILEHEIGHT / 2;

          // Body
          ctx.fillStyle = g.mode.current === FREIGHT ? COLOR_BLUE : g.color;
          ctx.beginPath();
          ctx.arc(gX, gY - 2, 8, Math.PI, 0, false);
          ctx.lineTo(gX + 8, gY + 6);
          ctx.lineTo(gX - 8, gY + 6);
          ctx.fill();

          // Eyes
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(gX - 3, gY - 2, 3, 0, Math.PI * 2);
          ctx.arc(gX + 3, gY - 2, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#0000FF";
          ctx.beginPath();
          ctx.arc(gX - 3 + (g.directions[g.direction]?.x || 0) * 1.5, gY - 2 + (g.directions[g.direction]?.y || 0) * 1.5, 1.5, 0, Math.PI * 2);
          ctx.arc(gX + 3 + (g.directions[g.direction]?.x || 0) * 1.5, gY - 2 + (g.directions[g.direction]?.y || 0) * 1.5, 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Target Tile Overlay
          if (showTargets && g.mode.current !== FREIGHT) {
            ctx.strokeStyle = g.color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(gX, gY);
            ctx.lineTo(g.goal.x + 8, g.goal.y + 8);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = g.color;
            ctx.fillRect(g.goal.x + 4, g.goal.y + 4, 8, 8);
          }
        });
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, gameOver, victory, showTargets, showGraph]);

  const getModeLabel = () => {
    if (!gameStateRef.current) return "SCATTER";
    const mode = gameStateRef.current.blinky.mode.current;
    if (mode === SCATTER) return "SCATTER";
    if (mode === CHASE) return "CHASE";
    if (mode === FREIGHT) return "FREIGHT";
    return "SPAWN";
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-800">
      {/* Top Controls & Debug Header */}
      <div className="w-full max-w-[448px] mb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">SCORE</span>
            <span className="text-xl font-bold font-mono text-yellow-400">{score.toString().padStart(6, "0")}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">AI MODE</span>
            <span
              className={`text-sm font-extrabold px-2.5 py-0.5 rounded uppercase font-mono ${
                getModeLabel() === "CHASE"
                  ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                  : getModeLabel() === "FREIGHT"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              }`}
            >
              {getModeLabel()}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">LIVES</span>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: lives }).map((_, i) => (
                <div key={i} className="w-3.5 h-3.5 bg-yellow-400 rounded-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Debug Toggles Toolbar */}
        <div className="flex items-center justify-between gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 text-xs font-mono">
          <button
            onClick={() => setShowTargets(!showTargets)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              showTargets ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Targets
          </button>

          <button
            onClick={() => setShowGraph(!showGraph)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              showGraph ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Graph
          </button>

          <button
            onClick={() => setMazeIndex(mazeIndex === 0 ? 1 : 0)}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
          >
            <Zap className="w-3.5 h-3.5" /> Maze {mazeIndex + 1}
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Canvas Wrapper */}
      <div className="relative border-4 border-indigo-900/60 rounded-lg overflow-hidden shadow-2xl bg-black">
        <canvas ref={canvasRef} width={SCREENWIDTH} height={SCREENHEIGHT} className="block" />

        {/* Game Over Modal */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <h2 className="text-3xl font-black text-red-500 mb-2 font-mono tracking-widest">GAME OVER</h2>
            <p className="text-slate-400 text-sm mb-6 font-mono">Final Score: {score}</p>
            <button
              onClick={() => initGame(mazeIndex)}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-red-600/30"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}

        {/* Victory Modal */}
        {victory && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <Trophy className="w-12 h-12 text-yellow-400 mb-2 animate-bounce" />
            <h2 className="text-3xl font-black text-yellow-400 mb-2 font-mono tracking-widest">VICTORY!</h2>
            <p className="text-slate-300 text-sm mb-6 font-mono">Cleared Level {level} with {score} points!</p>
            <button
              onClick={() => {
                setLevel((prev) => prev + 1);
                initGame(mazeIndex);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all shadow-lg shadow-yellow-500/30"
            >
              Next Level
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
