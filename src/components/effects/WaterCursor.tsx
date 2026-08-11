import { useEffect, useRef } from "react";

/**
 * Water ripple cursor effect.
 * A transparent full-screen overlay that runs a height-field water simulation.
 * Moving the pointer drops energy into the field, producing expanding ripples
 * with light refraction-style shading. Purely decorative, pointer-events: none.
 */
export function WaterCursor({
  scale = 4,
  damping = 0.955,
  strength = 320,
}: {
  /** simulation downscale factor (higher = faster, softer ripples) */
  scale?: number;
  /** wave energy retention per frame, 0-1 */
  damping?: number;
  /** drop intensity on pointer move */
  strength?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let current: Float32Array = new Float32Array(0);
    let previous: Float32Array = new Float32Array(0);
    let image: ImageData | null = null;
    let raf = 0;

    // Ripple tint pulled from the design tokens so it matches the theme.
    const styles = getComputedStyle(document.documentElement);
    const isDark = document.documentElement.classList.contains("dark");
    const tint = isDark ? [150, 200, 255] : [40, 110, 220];
    void styles;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      cols = Math.max(4, Math.floor(width / scale));
      rows = Math.max(4, Math.floor(height / scale));
      canvas.width = cols;
      canvas.height = rows;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      current = new Float32Array(cols * rows);
      previous = new Float32Array(cols * rows);
      image = ctx.createImageData(cols, rows);
    };

    const drop = (px: number, py: number, power: number) => {
      const x = Math.floor(px / scale);
      const y = Math.floor(py / scale);
      const r = 2;
      for (let j = -r; j <= r; j++) {
        for (let i = -r; i <= r; i++) {
          const cx = x + i;
          const cy = y + j;
          if (cx < 1 || cy < 1 || cx >= cols - 1 || cy >= rows - 1) continue;
          const falloff = 1 - Math.min(1, Math.hypot(i, j) / (r + 1));
          previous[cy * cols + cx] -= power * falloff;
        }
      }
    };

    let lastX = -1;
    let lastY = -1;
    const onPointerMove = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const speed = lastX < 0 ? 0 : Math.min(1, Math.hypot(x - lastX, y - lastY) / 40);
      lastX = x;
      lastY = y;
      drop(x, y, strength * (0.35 + speed));
    };
    const onPointerDown = (e: PointerEvent) => drop(e.clientX, e.clientY, strength * 2.4);

    const step = () => {
      raf = requestAnimationFrame(step);
      if (!image) return;

      for (let y = 1; y < rows - 1; y++) {
        const row = y * cols;
        for (let x = 1; x < cols - 1; x++) {
          const i = row + x;
          const value =
            (previous[i - 1] + previous[i + 1] + previous[i - cols] + previous[i + cols]) / 2 -
            current[i];
          current[i] = value * damping;
        }
      }

      const data = image.data;
      for (let y = 1; y < rows - 1; y++) {
        const row = y * cols;
        for (let x = 1; x < cols - 1; x++) {
          const i = row + x;
          const h = current[i];
          // Simple normal from neighbours -> specular-ish highlight.
          const dx = current[i - 1] - current[i + 1];
          const dy = current[i - cols] - current[i + cols];
          const light = Math.min(1, Math.abs(dx + dy) / 60);
          const alpha = Math.min(1, (Math.abs(h) / 40 + light) * 0.9);
          const p = i * 4;
          const shade = 0.55 + light * 0.45;
          data[p] = tint[0] * shade;
          data[p + 1] = tint[1] * shade;
          data[p + 2] = tint[2] * shade;
          data[p + 3] = alpha * 190;
        }
      }
      ctx.putImageData(image, 0, 0);

      const swap = current;
      current = previous;
      previous = swap;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [scale, damping, strength]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] h-full w-full mix-blend-screen"
    />
  );
}

export default WaterCursor;
