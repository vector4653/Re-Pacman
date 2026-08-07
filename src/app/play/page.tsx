"use client";

import React, { useState } from "react";
import GameEngine from "@/components/GameEngine";
import { ArrowLeftRight, Cpu, HelpCircle, Gamepad2, Info } from "lucide-react";

export default function PlayPage() {
  const [selectedMaze, setSelectedMaze] = useState<number>(0);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-8 w-full flex-1 flex flex-col items-center">
        {/* Page Title & Intro */}
        <div className="text-center mb-8 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono mb-3">
            <Gamepad2 className="w-3.5 h-3.5" /> HTML5 Canvas 60-FPS Web Engine
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl font-mono mb-3">
            Re-Pacman Play Arcade
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Control Pac-Man using Arrow Keys or WASD. Monitor real-time ghost targeting, waypoint graph nodes, and AI state transitions with the debug toolbar above the canvas.
          </p>
        </div>

        {/* Game Canvas Container */}
        <div className="w-full flex justify-center mb-10">
          <GameEngine initialMazeIndex={selectedMaze} />
        </div>

        {/* Controls & Debug Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3 text-indigo-400 font-mono font-bold text-sm">
              <ArrowLeftRight className="w-4 h-4" /> Keyboard Controls
            </div>
            <ul className="text-xs text-slate-400 space-y-2 font-mono">
              <li className="flex justify-between">
                <span>Move Up / Down</span>
                <span className="text-slate-200">↑ / ↓ or W / S</span>
              </li>
              <li className="flex justify-between">
                <span>Move Left / Right</span>
                <span className="text-slate-200">← / → or A / D</span>
              </li>
              <li className="flex justify-between">
                <span>Pause / Resume</span>
                <span className="text-slate-200">Space / P</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3 text-emerald-400 font-mono font-bold text-sm">
              <Cpu className="w-4 h-4" /> Debug Overlay Toggles
            </div>
            <ul className="text-xs text-slate-400 space-y-2">
              <li>
                <strong className="text-slate-200 font-mono">Targets:</strong> Draws real-time dashed lines and target tiles for Blinky, Pinky, Inky, and Clyde.
              </li>
              <li>
                <strong className="text-slate-200 font-mono">Graph:</strong> Overlays the node waypoint graph converted from the 2D matrix.
              </li>
            </ul>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3 text-amber-400 font-mono font-bold text-sm">
              <Info className="w-4 h-4" /> Game Rules & Mechanics
            </div>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li>• Dots: +10 pts | Power Pellets: +50 pts</li>
              <li>• Power Pellets turn ghosts into vulnerable FREIGHT mode (Blue).</li>
              <li>• Re-Pacman features nerfed ghost speed (62 px/s) and extended scatter durations for balanced gameplay.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
