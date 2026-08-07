"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gamepad2, Cpu, GitPullRequest, Sparkles } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/play", label: "Play Game", icon: Gamepad2 },
    { href: "/algorithms", label: "Algorithm Explainer", icon: Cpu },
    { href: "/contribute", label: "Contributor Hub", icon: GitPullRequest },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/play" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center font-black text-black group-hover:scale-105 transition-transform shadow-md shadow-yellow-400/20">
            C
          </div>
          <span className="font-mono font-extrabold text-lg tracking-wider text-white">
            RE-PACMAN <span className="text-xs text-indigo-400 font-normal">WEB</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (pathname === "/" && link.href === "/play");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-mono font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
