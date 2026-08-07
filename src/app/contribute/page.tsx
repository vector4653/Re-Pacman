"use client";

import React from "react";
import { Code2, GitPullRequest, FileText, ArrowRight, GitBranch, BookOpen, Layers, Terminal } from "lucide-react";

export default function ContributePage() {
  const codeMappings = [
    { python: "constants.py", typescript: "src/lib/game/nodes.ts", desc: "Tile dimensions, directions, entity constants, color definitions." },
    { python: "vector.py", typescript: "src/lib/game/nodes.ts", desc: "Vector2 2D math, magnitude, vector addition/subtraction." },
    { python: "nodes.py", typescript: "src/lib/game/nodes.ts", desc: "Node and NodeGroup graph conversion from raw maze ASCII." },
    { python: "entity.py", typescript: "src/lib/game/entities.ts", desc: "Base Entity movement, overshoot detection, valid directions." },
    { python: "pacman.py", typescript: "src/lib/game/entities.ts", desc: "Pacman user direction buffering & collision detection." },
    { python: "ghosts.py", typescript: "src/lib/game/entities.ts", desc: "Blinky, Pinky, Inky, Clyde AI target tile calculation." },
    { python: "modes.py", typescript: "src/lib/game/entities.ts", desc: "ModeController finite state machine timer switching." },
    { python: "pellets.py", typescript: "src/lib/game/entities.ts", desc: "Pellet and PowerPellet score / freight mode triggers." },
    { python: "run.py / pygame loop", typescript: "src/components/GameEngine.tsx", desc: "60-FPS HTML5 Canvas rendering loop, debug overlays, React state." },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col px-4 py-8">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-3">
            <GitPullRequest className="w-3.5 h-3.5" /> Open Source Onboarding & Architecture Hub
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl font-mono mb-3">
            Contribute to Re-Pacman Web
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Whether you want to add custom maze layouts, engineer new Ghost AI targeting behaviors, or enhance the web visualizer, welcome aboard!
          </p>
        </div>

        {/* Architecture Mapping Table */}
        <div className="mb-14">
          <h2 className="text-2xl font-bold font-mono text-white mb-6 flex items-center gap-3">
            <Layers className="w-6 h-6 text-indigo-400" /> Codebase Architecture Mapping
          </h2>
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-900/60 backdrop-blur-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase">
                <tr>
                  <th className="py-3.5 px-6">Original Python File</th>
                  <th className="py-3.5 px-6">TypeScript Web Module</th>
                  <th className="py-3.5 px-6">Responsibility & Architecture Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-xs">
                {codeMappings.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6 text-indigo-400 font-bold">{item.python}</td>
                    <td className="py-4 px-6 text-emerald-400 font-bold">{item.typescript}</td>
                    <td className="py-4 px-6 font-sans text-slate-400">{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Onboarding Step-by-Step Guides */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-14">
          {/* Guide 1: Custom Mazes */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold font-mono text-white mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" /> Adding Custom Mazes
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 font-sans leading-relaxed">
              <li>
                Create a 28x36 ASCII grid inside <code className="text-indigo-400 font-mono">src/lib/game/mazes.ts</code>.
              </li>
              <li>
                Use <code className="text-indigo-400 font-mono">+</code> for intersection nodes, <code className="text-indigo-400 font-mono">.</code> for pellets, and <code className="text-indigo-400 font-mono">P</code> for power pellets.
              </li>
              <li>
                Instantiate <code className="text-indigo-400 font-mono">NodeGroup(yourMazeData)</code> in <code className="text-indigo-400 font-mono">GameEngine.tsx</code>.
              </li>
            </ol>
          </div>

          {/* Guide 2: Local Development */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold font-mono text-white mb-3 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" /> Local Setup & Development
            </h3>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
              <div><span className="text-slate-500"># Clone the repository</span></div>
              <div>git clone https://github.com/your-username/Re-Pacman.git</div>
              <div className="pt-1"><span className="text-slate-500"># Install dependencies</span></div>
              <div>npm install</div>
              <div className="pt-1"><span className="text-slate-500"># Start local Next.js dev server</span></div>
              <div>npm run dev</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 py-8 border-t border-slate-800">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-600/25 text-sm font-mono"
          >
            <GitBranch className="w-4 h-4" /> Open GitHub Repository
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition-all text-sm font-mono border border-slate-700"
          >
            <GitPullRequest className="w-4 h-4 text-emerald-400" /> Submit a Pull Request
          </a>
        </div>
      </div>
    </main>
  );
}
