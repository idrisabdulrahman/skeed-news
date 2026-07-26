"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { BiasMeter } from "@/components/BiasMeter";
import { Card } from "@/components/Card";

export default function DesignSystemPage() {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Bias Meter state
  const [biasLeft, setBiasLeft] = useState(28);
  const [biasCenter, setBiasCenter] = useState(44);
  const [biasRight, setBiasRight] = useState(28);

  // Active Chip State
  const [activeChip, setActiveChip] = useState("World");

  // Toast notifier for color copy
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Apply theme to HTML tag
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [theme]);

  // Copy Color Hex
  const copyToClipboard = (hex: string, name: string) => {
    navigator.clipboard.writeText(hex);
    setToastMessage(`Copied ${name} (${hex}) to clipboard!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Quick helper to normalize bias total to 100%
  const adjustBias = (type: "left" | "center" | "right", value: number) => {
    if (type === "left") {
      setBiasLeft(value);
      const remaining = 100 - value;
      // split remainder proportionally
      const rRatio = biasRight / (biasCenter + biasRight || 1);
      const newRight = Math.round(remaining * rRatio);
      setBiasRight(newRight);
      setBiasCenter(remaining - newRight);
    } else if (type === "center") {
      setBiasCenter(value);
      const remaining = 100 - value;
      const lRatio = biasLeft / (biasLeft + biasRight || 1);
      const newLeft = Math.round(remaining * lRatio);
      setBiasLeft(newLeft);
      setBiasRight(remaining - newLeft);
    } else if (type === "right") {
      setBiasRight(value);
      const remaining = 100 - value;
      const lRatio = biasLeft / (biasLeft + biasCenter || 1);
      const newLeft = Math.round(remaining * lRatio);
      setBiasLeft(newLeft);
      setBiasCenter(remaining - newLeft);
    }
  };

  // Color Tokens Data based on current mode
  const isDark = theme === "dark";
  const colors = {
    primary: [
      { name: "ACCENT", hex: isDark ? "#E8B54B" : "#EBB54B", bg: isDark ? "bg-[#E8B54B]" : "bg-[#EBB54B]", text: "text-[#0A0B0A]" },
      { name: "TEXT PRIMARY", hex: isDark ? "#E6E8E6" : "#14171A", bg: isDark ? "bg-[#E6E8E6]" : "bg-[#14171A]", text: isDark ? "text-[#0A0B0A]" : "text-white" },
      { name: "SURFACE", hex: isDark ? "#14171A" : "#F6F7F8", bg: isDark ? "bg-[#14171A]" : "bg-[#F6F7F8]", text: isDark ? "text-white" : "text-[#14171A]" },
      { name: "BACKGROUND", hex: isDark ? "#0A0B0A" : "#FFFFFF", bg: isDark ? "bg-[#0A0B0A]" : "bg-[#FFFFFF]", text: isDark ? "text-white" : "text-[#14171A]", border: "border border-border-strong" },
    ],
    semantic: [
      { name: "BREAKING", hex: "#E53935", bg: "bg-[#E53935]", text: "text-white" },
      { name: "SUCCESS", hex: "#22C55E", bg: "bg-[#22C55E]", text: "text-white" },
      { name: "INFO", hex: "#3B82F6", bg: "bg-[#3B82F6]", text: "text-white" },
      { name: "TRENDING", hex: "#A855F7", bg: "bg-[#A855F7]", text: "text-white" },
      { name: "WARNING", hex: "#F59E0B", bg: "bg-[#F59E0B]", text: "text-white" },
    ],
    neutrals: [
      { name: "TEXT SECONDARY", hex: isDark ? "#A0A6A3" : "#434846", bg: isDark ? "bg-[#A0A6A3]" : "bg-[#434846]", text: isDark ? "text-black" : "text-white" },
      { name: "TEXT TERTIARY", hex: isDark ? "#6A7270" : "#6A7270", bg: "bg-[#6A7270]", text: "text-white" },
      { name: "TEXT QUATERNARY", hex: isDark ? "#434846" : "#A0A6A3", bg: isDark ? "bg-[#434846]" : "bg-[#A0A6A3]", text: isDark ? "text-white" : "text-black" },
      { name: "BORDER STRONG", hex: isDark ? "#262C31" : "#E6E8E6", bg: isDark ? "bg-[#262C31]" : "bg-[#E6E8E6]", text: isDark ? "text-white" : "text-black" },
      { name: "BORDER SUBTLE", hex: isDark ? "rgba(255,255,255,0.06)" : "#ECEFF1", bg: isDark ? "bg-white/10" : "bg-[#ECEFF1]", text: isDark ? "text-white" : "text-black" },
    ],
  };

  return (
    <div className="min-h-screen bg-bg-app text-text-primary py-12 px-6 lg:px-8 font-sans transition-colors duration-200 selection:bg-accent-app selection:text-[#0A0B0A]">
      {/* Floating Theme Controller */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 p-2 bg-surface-app border border-border-strong rounded-brand-full shadow-brand-lg backdrop-blur-md">
        <button
          onClick={() => setTheme("light")}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
            theme === "light"
              ? "bg-accent-app text-[#0A0B0A]"
              : "text-text-tertiary hover:text-text-primary"
          }`}
          title="Switch to Light Theme"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
            theme === "dark"
              ? "bg-accent-app text-[#0A0B0A]"
              : "text-text-tertiary hover:text-text-primary"
          }`}
          title="Switch to Dark Theme"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
        </button>
      </div>

      {/* Copy notification toast */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-accent-app text-[#0A0B0A] rounded-brand-md shadow-brand-lg font-sans text-body-small font-semibold border border-accent-app animate-fade-in transition-all duration-300">
          {toastMessage}
        </div>
      )}

      {/* Main Container */}
      <div className="brand-container flex flex-col gap-8">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-6 border-b border-border-strong gap-4">
          <div>
            <h1 className="text-h2 font-medium tracking-tight text-text-primary">App Design System</h1>
            <p className="text-body-medium text-text-secondary mt-1">
              Establishing brand design values, typography guidelines, and component patterns.
            </p>
          </div>
          <div className="font-mono text-caption text-text-tertiary flex gap-4">
            <span>Version: v1.0</span>
            <span>Mode: {theme.toUpperCase()}</span>
          </div>
        </div>

        {/* 1. BRAND CARD */}
        <div className="relative overflow-hidden rounded-brand-lg border border-border-strong bg-surface-app p-8 min-h-[300px] flex flex-col justify-between">
          {/* Animated Background Mesh */}
          <div className="absolute inset-0 opacity-15 dark:opacity-30 pointer-events-none transition-all">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-accent-app blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-breaking blur-3xl"></div>
            {/* Grid overlay */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(var(--border-strong) 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
              }}
            ></div>
          </div>

          <div className="relative flex justify-between items-start">
            <span className="font-mono text-caption text-text-tertiary uppercase tracking-wider">BRAND</span>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-brand-full bg-[#E53935]/15 text-[#E53935] font-mono text-caption font-bold border border-[#E53935]/25">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E53935] animate-pulse"></span>
                Breaking
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-brand-full bg-[#22C55E]/15 text-[#22C55E] font-mono text-caption font-bold border border-[#22C55E]/25">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span>
                Live Updates
              </span>
            </div>
          </div>

          <div className="relative my-8 max-w-xl">
            <div className="flex items-center gap-3 mb-4">
              {/* Logo icon */}
              <div className="flex items-center justify-center w-12 h-12 rounded-brand-md bg-accent-app text-[#0A0B0A]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                  <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-sans font-bold text-3xl tracking-tight text-text-primary">
                SKEEM <span className="text-accent-app font-medium block md:inline">NEWS</span>
              </span>
            </div>
            <p className="text-h4 font-medium text-text-secondary leading-relaxed">
              Real stories. Real fast. Stay informed. Stay ahead.
            </p>
          </div>

          <div className="relative font-mono text-caption text-text-tertiary">
            <span>Skeem News Platform © 2026</span>
          </div>
        </div>

        {/* 2. TYPOGRAPHY AND COLORS GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Typography Card */}
          <div className="rounded-brand-lg border border-border-strong bg-surface-app p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6 border-b border-border-strong pb-3">
                <h3 className="font-mono text-caption font-bold text-text-tertiary uppercase tracking-wider">TYPOGRAPHY</h3>
                <span className="text-caption font-mono text-text-quaternary">Geist / JetBrains Mono</span>
              </div>

              <div className="flex flex-col gap-6">
                {/* H1 */}
                <div className="border-b border-border-subtle pb-4">
                  <div className="flex justify-between text-caption font-mono text-text-tertiary mb-1">
                    <span>H1 Headlines / Hero</span>
                    <span>86.4px / 90.72px</span>
                  </div>
                  <h1 className="text-h1 font-medium tracking-tight truncate">Header H1</h1>
                </div>

                {/* H2 */}
                <div className="border-b border-border-subtle pb-4">
                  <div className="flex justify-between text-caption font-mono text-text-tertiary mb-1">
                    <span>H2 Section Title</span>
                    <span>44px / 46.2px</span>
                  </div>
                  <h2 className="text-h2 font-medium tracking-tight">Section H2</h2>
                </div>

                {/* H3 */}
                <div className="border-b border-border-subtle pb-4">
                  <div className="flex justify-between text-caption font-mono text-text-tertiary mb-1">
                    <span>H3 Card / Module Title</span>
                    <span>20px / 26px</span>
                  </div>
                  <h3 className="text-h3 font-semibold">Card Title H3</h3>
                </div>

                {/* H4 & Body Large */}
                <div className="border-b border-border-subtle pb-4">
                  <div className="flex justify-between text-caption font-mono text-text-tertiary mb-1">
                    <span>H4 / Body Large</span>
                    <span>17px / 26.35px</span>
                  </div>
                  <p className="text-body-large">Body Large: Important summary content and intro statements.</p>
                </div>

                {/* Body Medium */}
                <div className="border-b border-border-subtle pb-4">
                  <div className="flex justify-between text-caption font-mono text-text-tertiary mb-1">
                    <span>Body Medium</span>
                    <span>17px / 26.35px</span>
                  </div>
                  <p className="text-body-medium text-text-secondary">Body Medium: General reading text. Standard article paragraphs with normal layout settings.</p>
                </div>

                {/* Body Small */}
                <div className="border-b border-border-subtle pb-4">
                  <div className="flex justify-between text-caption font-mono text-text-tertiary mb-1">
                    <span>Body Small</span>
                    <span>13px / 18.85px</span>
                  </div>
                  <p className="text-body-small text-text-secondary">Body Small: Supporting and summary texts. Secondary block details.</p>
                </div>

                {/* Caption */}
                <div className="border-b border-border-subtle pb-4">
                  <div className="flex justify-between text-caption font-mono text-text-tertiary mb-1">
                    <span>Caption</span>
                    <span>11px / 14.5px</span>
                  </div>
                  <span className="text-caption text-text-tertiary uppercase tracking-wider block">CAPTION: METADATA AND TAGS</span>
                </div>

                {/* Code Inline */}
                <div>
                  <div className="flex justify-between text-caption font-mono text-text-tertiary mb-1">
                    <span>Code / Inline</span>
                    <span>9px / 9.9px</span>
                  </div>
                  <code className="text-code-inline font-mono bg-border-subtle px-1.5 py-0.5 rounded-brand-sm text-text-primary">
                    const theme = &quot;dark&quot;;
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Colors Card */}
          <div className="rounded-brand-lg border border-border-strong bg-surface-app p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6 border-b border-border-strong pb-3">
                <h3 className="font-mono text-caption font-bold text-text-tertiary uppercase tracking-wider">COLORS</h3>
                <span className="text-caption font-mono text-text-quaternary">Click a swatch to copy hex code</span>
              </div>

              {/* Primary Group */}
              <div className="mb-6">
                <span className="font-mono text-caption text-text-tertiary block mb-3 uppercase tracking-wider">PRIMARY</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {colors.primary.map((col) => (
                    <div
                      key={col.name}
                      onClick={() => copyToClipboard(col.hex, col.name)}
                      className="cursor-pointer group flex flex-col gap-2 rounded-brand-md p-2 bg-bg-app border border-border-subtle hover:border-accent-app transition-all duration-200"
                    >
                      <div className={`w-full aspect-square rounded-brand-sm ${col.bg} ${col.border || ""} transition-transform duration-200 group-hover:scale-[1.02]`} />
                      <div>
                        <span className="font-sans font-semibold text-caption text-text-primary truncate block">{col.name}</span>
                        <span className="font-mono text-[10px] text-text-tertiary block mt-0.5 uppercase">{col.hex}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Semantic Group */}
              <div className="mb-6">
                <span className="font-mono text-caption text-text-tertiary block mb-3 uppercase tracking-wider">SEMANTIC</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {colors.semantic.map((col) => (
                    <div
                      key={col.name}
                      onClick={() => copyToClipboard(col.hex, col.name)}
                      className="cursor-pointer group flex flex-col gap-2 rounded-brand-md p-2 bg-bg-app border border-border-subtle hover:border-accent-app transition-all duration-200"
                    >
                      <div className={`w-full aspect-square rounded-brand-sm ${col.bg} transition-transform duration-200 group-hover:scale-[1.02]`} />
                      <div>
                        <span className="font-sans font-semibold text-caption text-text-primary truncate block">{col.name}</span>
                        <span className="font-mono text-[10px] text-text-tertiary block mt-0.5 uppercase">{col.hex}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Neutrals Group */}
              <div>
                <span className="font-mono text-caption text-text-tertiary block mb-3 uppercase tracking-wider">NEUTRALS</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {colors.neutrals.map((col) => (
                    <div
                      key={col.name}
                      onClick={() => copyToClipboard(col.hex, col.name)}
                      className="cursor-pointer group flex flex-col gap-2 rounded-brand-md p-2 bg-bg-app border border-border-subtle hover:border-accent-app transition-all duration-200"
                    >
                      <div className={`w-full aspect-square rounded-brand-sm ${col.bg} transition-transform duration-200 group-hover:scale-[1.02]`} />
                      <div>
                        <span className="font-sans font-semibold text-caption text-text-primary truncate block">{col.name}</span>
                        <span className="font-mono text-[10px] text-text-tertiary block mt-0.5 uppercase">{col.hex}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. UI ELEMENTS Showcase */}
        <div className="rounded-brand-lg border border-border-strong bg-surface-app p-6">
          <div className="flex justify-between items-center mb-6 border-b border-border-strong pb-3">
            <h3 className="font-mono text-caption font-bold text-text-tertiary uppercase tracking-wider">UI ELEMENTS</h3>
            <span className="text-caption font-mono text-text-quaternary">Interactive Component Showcase</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left side: Buttons & Chips */}
            <div className="flex flex-col gap-8">
              {/* BUTTONS TABLE */}
              <div>
                <span className="font-mono text-caption text-text-tertiary block mb-4 uppercase tracking-wider">BUTTONS</span>
                
                {/* Button States Matrix */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-strong font-mono text-caption text-text-tertiary">
                        <th className="py-2.5 font-medium">TYPE</th>
                        <th className="py-2.5 font-medium">DEFAULT</th>
                        <th className="py-2.5 font-medium">HOVER</th>
                        <th className="py-2.5 font-medium">OUTLINE</th>
                        <th className="py-2.5 font-medium">DISABLED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle font-sans text-body-small">
                      {/* Primary Buttons */}
                      <tr>
                        <td className="py-4 font-semibold">Primary</td>
                        <td className="py-4 pr-2">
                          <Button variant="primary">Button</Button>
                        </td>
                        <td className="py-4 pr-2">
                          {/* Force Hover look by rendering Outline Primary */}
                          <Button variant="primary" isOutline>Button</Button>
                        </td>
                        <td className="py-4 pr-2">
                          <Button variant="primary" isOutline>Button</Button>
                        </td>
                        <td className="py-4 pr-2">
                          <Button variant="primary" disabled>Button</Button>
                        </td>
                      </tr>

                      {/* Secondary Buttons */}
                      <tr>
                        <td className="py-4 font-semibold">Secondary</td>
                        <td className="py-4 pr-2">
                          <Button variant="secondary">Button</Button>
                        </td>
                        <td className="py-4 pr-2">
                          {/* Force Hover look by rendering Outline Secondary */}
                          <Button variant="secondary" isOutline>Button</Button>
                        </td>
                        <td className="py-4 pr-2">
                          <Button variant="secondary" isOutline>Button</Button>
                        </td>
                        <td className="py-4 pr-2">
                          <Button variant="secondary" disabled>Button</Button>
                        </td>
                      </tr>

                      {/* Text Buttons */}
                      <tr>
                        <td className="py-4 font-semibold">Text</td>
                        <td className="py-4 pr-2">
                          <Button variant="text">Button</Button>
                        </td>
                        <td className="py-4 pr-2">
                          {/* Hover text look */}
                          <Button variant="text" className="bg-surface-app">Button</Button>
                        </td>
                        <td className="py-4 pr-2">
                          <Button variant="text" isOutline>Button</Button>
                        </td>
                        <td className="py-4 pr-2">
                          <Button variant="text" disabled>Button</Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CHIP / CATEGORY */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-caption text-text-tertiary uppercase tracking-wider">CHIP / CATEGORY</span>
                  <span className="text-caption font-mono text-text-tertiary">Active: {activeChip}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Chip
                    label="World"
                    active={activeChip === "World"}
                    onClick={() => setActiveChip("World")}
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-.91-8.01-2.468M20.002 9.26a10.778 10.778 0 01-1.397 5.378M3.998 9.26a10.778 10.778 0 001.397 5.378m13.208-1.077a8.997 8.997 0 00-1.519-5.112M6.41 13.561a8.997 8.997 0 011.519-5.112" />
                      </svg>
                    }
                  />
                  <Chip
                    label="Politics"
                    active={activeChip === "Politics"}
                    onClick={() => setActiveChip("Politics")}
                  />
                  <Chip
                    label="Business"
                    active={activeChip === "Business"}
                    onClick={() => setActiveChip("Business")}
                  />
                  <Chip
                    label="More"
                    active={activeChip === "More"}
                    onClick={() => setActiveChip("More")}
                  />
                </div>
              </div>

              {/* BIAS METER (INTERACTIVE) */}
              <div>
                <span className="font-mono text-caption text-text-tertiary block mb-4 uppercase tracking-wider">BIAS METER</span>
                <BiasMeter left={biasLeft} center={biasCenter} right={biasRight} className="mb-4" />

                {/* Interactive Sliders */}
                <div className="flex flex-col gap-3 p-4 border border-border-subtle bg-bg-app rounded-brand-md">
                  <span className="text-caption font-semibold text-text-secondary uppercase">Adjust Proportions:</span>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-caption">
                      <span className="text-[#E53935] font-semibold">Left</span>
                      <span className="font-mono">{biasLeft}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={biasLeft}
                      onChange={(e) => adjustBias("left", parseInt(e.target.value))}
                      className="w-full accent-[#E53935] cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-caption">
                      <span className="text-text-primary font-semibold">Center</span>
                      <span className="font-mono">{biasCenter}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={biasCenter}
                      onChange={(e) => adjustBias("center", parseInt(e.target.value))}
                      className="w-full accent-text-tertiary cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-caption">
                      <span className="text-[#3B82F6] font-semibold">Right</span>
                      <span className="font-mono">{biasRight}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={biasRight}
                      onChange={(e) => adjustBias("right", parseInt(e.target.value))}
                      className="w-full accent-[#3B82F6] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Card Example */}
            <div className="flex flex-col gap-4">
              <span className="font-mono text-caption text-text-tertiary block uppercase tracking-wider">CARD EXAMPLE</span>
              <Card
                title="Global markets rally as inflation data cools expectations"
                description="Markets surge after key inflation report shows signs of slowdown, boosting investor confidence."
              />
            </div>
          </div>
        </div>

        {/* 4. ICONS PANEL */}
        <div className="rounded-brand-lg border border-border-strong bg-surface-app p-6">
          <div className="flex justify-between items-center mb-6 border-b border-border-strong pb-3">
            <h3 className="font-mono text-caption font-bold text-text-tertiary uppercase tracking-wider">ICONS</h3>
            <span className="text-caption font-mono text-text-quaternary">Line style • 2px stroke • Rounded caps & joins</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-9 gap-6 text-center text-text-primary">
            {/* Hamburger */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </div>
            {/* Search */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            {/* Bookmark */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
            </div>
            {/* Home */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            {/* Clock */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {/* Flame */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
              </svg>
            </div>
            {/* Share */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            {/* External */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </div>
            {/* Calendar */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            {/* Graph */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            {/* Video */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            </div>
            {/* Code */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            {/* User */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            {/* Bell */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            {/* Sliders */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3v-3m6-1.5V3.75m0 11.25a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3v-3m6-7.5V3.75m0 6a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3v-3" />
              </svg>
            </div>
            {/* Check */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {/* Tag */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.44 1.44 0 002.036 0l4.318-4.318a1.44 1.44 0 000-2.036L11.16 3.659A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
            {/* Ellipsis */}
            <div className="flex flex-col items-center gap-2 p-3 bg-bg-app border border-border-subtle rounded-brand-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 5. SYSTEMS MATRIX GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {/* Spacing System */}
          <div className="rounded-brand-lg border border-border-strong bg-surface-app p-6 flex flex-col justify-between">
            <div>
              <span className="font-mono text-caption text-text-tertiary block mb-4 uppercase tracking-wider">SPACING SYSTEM</span>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-body-small">
                  <span>4px (Base Unit)</span>
                  <div className="w-1 h-4 bg-accent-app rounded-brand-sm" />
                </div>
                <div className="flex items-center justify-between text-body-small">
                  <span>8px</span>
                  <div className="w-2 h-4 bg-accent-app rounded-brand-sm" />
                </div>
                <div className="flex items-center justify-between text-body-small">
                  <span>16px</span>
                  <div className="w-4 h-4 bg-accent-app rounded-brand-sm" />
                </div>
                <div className="flex items-center justify-between text-body-small">
                  <span>24px</span>
                  <div className="w-6 h-4 bg-accent-app rounded-brand-sm" />
                </div>
                <div className="flex items-center justify-between text-body-small">
                  <span>32px</span>
                  <div className="w-8 h-4 bg-accent-app rounded-brand-sm" />
                </div>
                <div className="flex items-center justify-between text-body-small">
                  <span>40px</span>
                  <div className="w-10 h-4 bg-accent-app rounded-brand-sm" />
                </div>
                <div className="flex items-center justify-between text-body-small">
                  <span>48px</span>
                  <div className="w-12 h-4 bg-accent-app rounded-brand-sm" />
                </div>
                <div className="flex items-center justify-between text-body-small">
                  <span>64px</span>
                  <div className="w-16 h-4 bg-accent-app rounded-brand-sm" />
                </div>
              </div>
            </div>
            <p className="text-caption text-text-tertiary font-mono mt-4">
              Consistent scale based on 4px base unit.
            </p>
          </div>

          {/* Grid System */}
          <div className="rounded-brand-lg border border-border-strong bg-surface-app p-6 flex flex-col justify-between">
            <div>
              <span className="font-mono text-caption text-text-tertiary block mb-4 uppercase tracking-wider">GRID SYSTEM</span>
              <div className="grid grid-cols-12 gap-1 h-20 bg-bg-app border border-border-subtle p-2 rounded-brand-sm">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-accent-app/10 border border-accent-app/20 rounded-brand-sm" />
                ))}
              </div>
            </div>
            <div className="font-mono text-caption text-text-tertiary mt-4 flex flex-col gap-1">
              <span>Container: 1280px</span>
              <span>Columns: 12</span>
              <span>Gutter: 24px</span>
              <span>Margin: 24px</span>
            </div>
          </div>

          {/* Shadows */}
          <div className="rounded-brand-lg border border-border-strong bg-surface-app p-6 flex flex-col justify-between">
            <div>
              <span className="font-mono text-caption text-text-tertiary block mb-4 uppercase tracking-wider">SHADOWS</span>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center p-3 bg-bg-app border border-border-subtle rounded-brand-sm shadow-brand-sm text-body-small">
                  <span>Small</span>
                  <span className="font-mono text-caption text-text-tertiary">sm</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-bg-app border border-border-subtle rounded-brand-sm shadow-brand-md text-body-small">
                  <span>Medium</span>
                  <span className="font-mono text-caption text-text-tertiary">md</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-bg-app border border-border-subtle rounded-brand-sm shadow-brand-lg text-body-small">
                  <span>Large</span>
                  <span className="font-mono text-caption text-text-tertiary">lg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Border Radius */}
          <div className="rounded-brand-lg border border-border-strong bg-surface-app p-6 flex flex-col justify-between">
            <div>
              <span className="font-mono text-caption text-text-tertiary block mb-4 uppercase tracking-wider">BORDER RADIUS</span>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-body-small">
                  <span>Small (4px)</span>
                  <div className="w-12 h-6 border border-border-strong bg-bg-app rounded-brand-sm" />
                </div>
                <div className="flex items-center justify-between text-body-small">
                  <span>Medium (8px)</span>
                  <div className="w-12 h-6 border border-border-strong bg-bg-app rounded-brand-md" />
                </div>
                <div className="flex items-center justify-between text-body-small">
                  <span>Large (12px)</span>
                  <div className="w-12 h-6 border border-border-strong bg-bg-app rounded-brand-lg" />
                </div>
                <div className="flex items-center justify-between text-body-small">
                  <span>Full (9999px)</span>
                  <div className="w-12 h-6 border border-border-strong bg-bg-app rounded-brand-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex flex-col md:flex-row justify-between items-center border-t border-border-strong pt-6 pb-12 gap-6 text-caption font-mono text-text-tertiary">
          <div className="flex items-center gap-2">
            {/* Mini logo */}
            <div className="flex items-center justify-center w-6 h-6 rounded-brand-sm bg-accent-app text-[#0A0B0A]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-sans font-bold text-text-primary text-body-small">SKEEM NEWS</span>
          </div>

          <div className="flex items-center gap-6">
            <span>Design System v1.0</span>
            <span>May 18, 2025</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hover:text-text-primary cursor-pointer transition-colors">Home</span>
            <span className="hover:text-text-primary cursor-pointer transition-colors">Categories</span>
            <span className="hover:text-text-primary cursor-pointer transition-colors">About</span>
            <span className="hover:text-text-primary cursor-pointer transition-colors">Contact</span>
            <Button variant="primary" className="ml-2 font-mono text-caption flex items-center gap-2 !h-[36px]">
              Stay Informed
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
