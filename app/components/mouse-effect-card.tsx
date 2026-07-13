"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";

type MouseEffectCardProps = {
  children: ReactNode;
  className?: string;
  dotSize?: number;
  dotSpacing?: number;
  repulsionRadius?: number;
  repulsionStrength?: number;
};

type Dot = {
  id: string;
  x: number;
  y: number;
  opacity: number;
};

function useReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      mediaQuery.addEventListener("change", onStoreChange);
      return () => mediaQuery.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

function useElementSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ height: 0, width: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setSize({ height: rect.height, width: rect.width });
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    requestAnimationFrame(updateSize);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function buildDots(width: number, height: number, spacing: number) {
  const dots: Dot[] = [];
  const cols = Math.ceil(width / spacing);
  const rows = Math.ceil(height / spacing);
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let row = 0; row <= rows; row += 1) {
    for (let col = 0; col <= cols; col += 1) {
      const x = col * spacing;
      const y = row * spacing;
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const edgeFactor = Math.max(0.18, 1 - distance / maxDistance);
      const patternOpacity = [0.26, 0.38, 0.5][(row + col) % 3] ?? 0.32;

      dots.push({
        id: `${row}-${col}`,
        opacity: patternOpacity * edgeFactor,
        x,
        y,
      });
    }
  }

  return dots;
}

export function MouseEffectCard({
  children,
  className = "",
  dotSize = 2,
  dotSpacing = 18,
  repulsionRadius = 82,
  repulsionStrength = 16,
}: MouseEffectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const size = useElementSize(cardRef);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);

  const dots = useMemo(
    () => buildDots(size.width, size.height, dotSpacing),
    [dotSpacing, size.height, size.width]
  );

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-[32px] border border-white/10 bg-[#07090d] shadow-[0_34px_110px_-72px_rgba(153,69,255,0.75)] ${className}`}
      onPointerLeave={() => setMouse(null)}
      onPointerMove={(event) => {
        if (reducedMotion || !cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        setMouse({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        {dots.map((dot) => {
          let translateX = 0;
          let translateY = 0;
          let opacityBoost = 0;

          if (mouse && !reducedMotion) {
            const dx = dot.x - mouse.x;
            const dy = dot.y - mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < repulsionRadius) {
              const force =
                (1 - distance / repulsionRadius) * repulsionStrength;
              const angle = Math.atan2(dy, dx);
              translateX = Math.cos(angle) * force;
              translateY = Math.sin(angle) * force;
              opacityBoost = (1 - distance / repulsionRadius) * 0.45;
            }
          }

          return (
            <span
              aria-hidden="true"
              key={dot.id}
              className="absolute rounded-full bg-white/45 motion-safe:transition-[opacity,transform] motion-safe:duration-150 motion-safe:ease-out"
              style={
                {
                  height: dotSize,
                  left: dot.x,
                  opacity: Math.min(dot.opacity + opacityBoost, 0.85),
                  top: dot.y,
                  transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
                  width: dotSize,
                } satisfies CSSProperties
              }
            />
          );
        })}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
