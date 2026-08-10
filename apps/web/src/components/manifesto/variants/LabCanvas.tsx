"use client";

import { useEffect, useRef } from "react";

const COLORS = {
  primary: [139, 156, 255] as const,
  secondary: [196, 181, 253] as const,
  warm: [251, 191, 138] as const,
  peach: [255, 184, 168] as const,
  blush: [255, 196, 212] as const,
};

function rgba([r, g, b]: readonly [number, number, number], a: number) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function LabCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let raf = 0;

    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.3 + Math.random() * 1.4,
      speed: 0.00012 + Math.random() * 0.0003,
      phase: Math.random() * Math.PI * 2,
      tint: [COLORS.primary, COLORS.secondary, COLORS.warm][Math.floor(Math.random() * 3)],
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const drawAuroraWave = (
      yOffset: number,
      amplitude: number,
      wavelength: number,
      color: readonly [number, number, number],
      opacity: number,
    ) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const baseY = h * (0.35 + yOffset);

      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) {
        const y =
          baseY +
          Math.sin(x * wavelength + frame * 0.016) * amplitude +
          Math.sin(x * wavelength * 0.5 + frame * 0.011 + yOffset * 10) * amplitude * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, baseY - amplitude * 2, 0, h);
      grad.addColorStop(0, rgba(color, opacity));
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fill();
    };

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const pulse = Math.sin(frame * 0.02) * 0.5 + 0.5;

      const bgCx = w * (0.48 + Math.sin(frame * 0.004) * 0.04);
      const bgCy = h * (0.38 + Math.cos(frame * 0.003) * 0.03);
      const bg = ctx.createRadialGradient(bgCx, bgCy, 0, w * 0.5, h * 0.5, w * 0.7);
      bg.addColorStop(0, rgba(COLORS.secondary, 0.06 + pulse * 0.03));
      bg.addColorStop(0.5, rgba(COLORS.primary, 0.03));
      bg.addColorStop(1, "transparent");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      drawAuroraWave(0, 55, 0.004, COLORS.primary, 0.07 + pulse * 0.03);
      drawAuroraWave(0.12, 40, 0.0055, COLORS.secondary, 0.06);
      drawAuroraWave(0.22, 30, 0.0035, COLORS.warm, 0.05);

      for (let i = 0; i < 8; i++) {
        const bx = w * (0.15 + i * 0.1) + Math.sin(frame * 0.01 + i) * 30;
        const by = h * (0.3 + (i % 3) * 0.12) + Math.cos(frame * 0.008 + i * 2) * 20;
        const br = 60 + i * 15 + pulse * 20;
        const bokeh = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        bokeh.addColorStop(0, rgba(i % 3 === 0 ? COLORS.peach : i % 3 === 1 ? COLORS.blush : COLORS.primary, 0.06));
        bokeh.addColorStop(1, "transparent");
        ctx.fillStyle = bokeh;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = rgba(COLORS.primary, 0.04);
      ctx.lineWidth = 1;
      const gridY = h * 0.72 + Math.sin(frame * 0.006) * 6;
      for (let i = 0; i < 20; i++) {
        const x = (i / 19) * w;
        const sway = Math.sin(frame * 0.008 + i * 0.4) * 8;
        ctx.beginPath();
        ctx.moveTo(x, gridY + sway);
        ctx.lineTo(w * 0.5 + (x - w * 0.5) * 0.3, h);
        ctx.stroke();
      }

      for (const p of particles) {
        p.phase += p.speed * 60;
        const px = (p.x + Math.sin(p.phase) * 0.015) * w;
        const py = (p.y + Math.cos(p.phase * 0.6) * 0.015) * h;
        ctx.fillStyle = rgba(p.tint, 0.1 + Math.sin(p.phase) * 0.06);
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      frame++;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className="lab-canvas" aria-hidden />;
}
