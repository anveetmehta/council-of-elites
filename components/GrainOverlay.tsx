/**
 * GrainOverlay — SVG fractal noise texture layer.
 * Mounted once at root; pointer-events: none so it never interferes.
 * Dark-mode opacity is lower (0.04) with normal blend so it feels like
 * studio-quality film grain rather than noise.
 */
export function GrainOverlay() {
  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[9998] h-full w-full opacity-[0.055] mix-blend-overlay dark:opacity-[0.04] dark:mix-blend-normal"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <filter id="grain-noise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.68"
          numOctaves="4"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-noise)" />
    </svg>
  );
}
