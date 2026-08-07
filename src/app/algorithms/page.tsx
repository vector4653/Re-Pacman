"use client";

import React, { useRef, useEffect, useState } from "react";
import { Vector2, TILEWIDTH, TILEHEIGHT, NCOLS, NROWS, COLOR_RED, COLOR_PINK, COLOR_TEAL, COLOR_ORANGE, COLOR_YELLOW, COLOR_BLUE } from "@/lib/game/nodes";
import { Cpu, Target, GitGraph, Clock, Sparkles } from "lucide-react";

export default function AlgorithmExplainer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pacmanPos, setPacmanPos] = useState<Vector2>(new Vector2(224, 288)); // Center
  const [pacmanDir, setPacmanDir] = useState<Vector2>(new Vector2(-1, 0)); // Facing Left
  const [selectedGhost, setSelectedGhost] = useState<"blinky" | "pinky" | "inky" | "clyde">("blinky");

  // Blinky Pos
  const blinkyPos = new Vector2(100, 150);

  // Target Tile Calculations
  const getBlinkyTarget = () => pacmanPos.copy();
  const getPinkyTarget = () => pacmanPos.add(pacmanDir.mul(TILEWIDTH * 4));
  const getInkyTarget = () => {
    const vec1 = pacmanPos.add(pacmanDir.mul(TILEWIDTH * 2));
    const vec2 = vec1.sub(blinkyPos).mul(2);
    return blinkyPos.add(vec2);
  };
  const getClydeTarget = () => {
    const distSq = pacmanPos.sub(new Vector2(300, 350)).magnitudeSquared();
    if (distSq <= (TILEWIDTH * 8) ** 2) {
      return new Vector2(0, TILEHEIGHT * NROWS);
    }
    return pacmanPos.add(pacmanDir.mul(TILEWIDTH * 4));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid Lines
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += TILEWIDTH * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += TILEHEIGHT * 2) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw Interactive Pacman
    ctx.fillStyle = COLOR_YELLOW;
    ctx.beginPath();
    ctx.arc(pacmanPos.x, pacmanPos.y, 12, 0, Math.PI * 2);
    ctx.fill();

    // Draw Direction Vector Arrow
    ctx.strokeStyle = COLOR_YELLOW;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pacmanPos.x, pacmanPos.y);
    ctx.lineTo(pacmanPos.x + pacmanDir.x * 30, pacmanPos.y + pacmanDir.y * 30);
    ctx.stroke();

    // Render Targets
    const targets = {
      blinky: { target: getBlinkyTarget(), color: COLOR_RED, label: "Blinky Target" },
      pinky: { target: getPinkyTarget(), color: COLOR_PINK, label: "Pinky Target" },
      inky: { target: getInkyTarget(), color: COLOR_TEAL, label: "Inky Target" },
      clyde: { target: getClydeTarget(), color: COLOR_ORANGE, label: "Clyde Target" },
    };

    // Draw Blinky Fixed Position for Inky double-vector calculation
    ctx.fillStyle = COLOR_RED;
    ctx.beginPath();
    ctx.arc(blinkyPos.x, blinkyPos.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "10px monospace";
    ctx.fillText("Blinky Anchor", blinkyPos.x - 30, blinkyPos.y - 15);

    Object.entries(targets).forEach(([ghostKey, item]) => {
      const isSelected = selectedGhost === ghostKey;
      ctx.strokeStyle = item.color;
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.setLineDash(isSelected ? [4, 4] : [2, 2]);
      ctx.beginPath();
      ctx.moveTo(pacmanPos.x, pacmanPos.y);
      ctx.lineTo(item.target.x, item.target.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = item.color;
      ctx.fillRect(item.target.x - 6, item.target.y - 6, 12, 12);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = isSelected ? "bold 12px monospace" : "10px monospace";
      ctx.fillText(item.label, item.target.x + 10, item.target.y + 4);
    });
  }, [pacmanPos, pacmanDir, selectedGhost]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPacmanPos(new Vector2(x, y));
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col px-4 py-8">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono mb-3">
            <Cpu className="w-3.5 h-3.5" /> Interactive Computer Science & Pathfinding Visualizer
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl font-mono mb-3">
            Pac-Man AI Algorithm Explainer
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Explore the mathematics and pathfinding algorithms governing Blinky, Pinky, Inky, and Clyde. Drag or click on the playground to see target tiles dynamically recalculate in real-time.
          </p>
        </div>

        {/* Interactive Playground Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" /> Interactive Target Tile Playground
              </h2>
              <span className="text-xs text-slate-400 font-mono">Click canvas to reposition Pac-Man</span>
            </div>

            <canvas
              ref={canvasRef}
              width={560}
              height={400}
              onClick={handleCanvasClick}
              className="border-2 border-slate-800 rounded-lg cursor-crosshair bg-slate-950 max-w-full"
            />

            {/* Direction Selector */}
            <div className="mt-4 flex items-center gap-3 font-mono text-xs">
              <span className="text-slate-400">Set Pac-Man Facing Direction:</span>
              {[
                { label: "LEFT", vec: new Vector2(-1, 0) },
                { label: "RIGHT", vec: new Vector2(1, 0) },
                { label: "UP", vec: new Vector2(0, -1) },
                { label: "DOWN", vec: new Vector2(0, 1) },
              ].map((d) => (
                <button
                  key={d.label}
                  onClick={() => setPacmanDir(d.vec)}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    pacmanDir.equals(d.vec) ? "bg-indigo-600 text-white font-bold" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ghost Selector Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold font-mono text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" /> Ghost Targeting Breakdown
              </h3>

              <div className="space-y-3 mb-6">
                {[
                  { id: "blinky", name: "Blinky (Red)", desc: "Direct Chase: Directly targets Pac-Man's exact tile position.", color: "text-red-400" },
                  { id: "pinky", name: "Pinky (Pink)", desc: "Ambush Vector: Targets 4 tiles ahead of Pac-Man's current direction vector.", color: "text-pink-400" },
                  { id: "inky", name: "Inky (Teal)", desc: "Double Vector Math: Takes tile 2 ahead of Pac-Man, doubles vector from Blinky.", color: "text-teal-400" },
                  { id: "clyde", name: "Clyde (Orange)", desc: "Proximity Switch: Chases Pac-Man when >8 tiles away; retreats to corner when closer.", color: "text-amber-400" },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGhost(g.id as any)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedGhost === g.id
                        ? "bg-slate-800 border-indigo-500 shadow-md"
                        : "bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className={`font-mono font-bold text-sm ${g.color}`}>{g.name}</div>
                    <div className="text-xs text-slate-400 mt-1">{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 font-mono">
              <strong className="text-white">Python Mapping:</strong> Implemented in <code className="text-indigo-400">ghosts.py</code> under <code className="text-indigo-400">Ghost.chase()</code> overrides.
            </div>
          </div>
        </div>

        {/* Deep Dive Algorithm Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Graph Pathfinding */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-indigo-400 font-mono font-bold text-lg mb-3">
              <GitGraph className="w-6 h-6" /> Node Graph Conversion (nodes.py)
            </div>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              The 2D tile matrix (<code className="text-indigo-400">maze1.txt</code>) is converted into a directed graph structure. Tile intersections (<code className="text-indigo-400">+</code>, <code className="text-indigo-400">P</code>, <code className="text-indigo-400">n</code>) become decision nodes, while path tiles connect them as edges. Ghosts only make direction decisions at these discrete node decision points.
            </p>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
              <span className="text-slate-500">// TypeScript Node Structure</span><br />
              interface Node &#123;<br />
              &nbsp;&nbsp;position: Vector2;<br />
              &nbsp;&nbsp;neighbors: &#123; UP, DOWN, LEFT, RIGHT, PORTAL &#125;;<br />
              &nbsp;&nbsp;access: Map&lt;Direction, EntityType[]&gt;;<br />
              &#125;
            </div>
          </div>

          {/* State Machines */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-emerald-400 font-mono font-bold text-lg mb-3">
              <Clock className="w-6 h-6" /> Mode Controller Timers (modes.py)
            </div>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              Ghosts alternate between global modes via a finite state machine:
            </p>
            <ul className="space-y-2 text-xs font-mono text-slate-300">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <strong>SCATTER (9s):</strong> Retreat to designated corner targets.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <strong>CHASE (15s):</strong> Execute targeted pursuit algorithms.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <strong>FREIGHT (7s):</strong> Triggered by Power Pellets; random movements.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
