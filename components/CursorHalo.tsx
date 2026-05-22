/**
 * CursorHalo — spring-interpolated accent halo that follows the cursor.
 * Uses Council's purple accent. Auto-disables on touch/small-screen devices.
 * Mount once at the root layout; it's pointer-events: none, z-[1].
 */
"use client";

import { useEffect, useRef, useState } from "react";

export function CursorHalo() {
  const haloRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(hover: none)").matches) return;
    setEnabled(true);

    let raf = 0;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let cx = tx;
    let cy = ty;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };

    const tick = () => {
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      if (haloRef.current)
        haloRef.current.style.transform = `translate(${cx - 64}px, ${cy - 64}px)`;
      if (ringRef.current)
        ringRef.current.style.transform = `translate(${tx - 16}px, ${ty - 16}px)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Soft glow blob — uses Council's accent purple */}
      <div
        ref={haloRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[1] h-[128px] w-[128px] rounded-full bg-accent/[0.12] blur-[20px] will-change-transform"
        style={{ animation: "halo-pulse 3s ease-in-out infinite" }}
      />
      {/* Crisp ring that tracks exactly */}
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[2] h-8 w-8 rounded-full border border-accent/35 will-change-transform transition-opacity"
      />
    </>
  );
}
