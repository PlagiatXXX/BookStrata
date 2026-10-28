import { useEffect, useRef } from "react";

const EMBERS = [
  { left: "12%", top: "24%" },
  { left: "27%", top: "62%" },
  { left: "48%", top: "16%" },
  { left: "68%", top: "49%" },
  { left: "84%", top: "32%" },
];

export function HalloweenAtmosphere() {
  const atmosphereRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const themeRoot = atmosphereRef.current?.closest(".theme-container--halloween");
    if (!(themeRoot instanceof HTMLElement)) return;

    const motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight * 0.35;
    let currentX = targetX;
    let currentY = targetY;
    let frameCount = 0;
    let animationFrameId: number | null = null;

    const writeTorchPosition = (x: number, y: number) => {
      themeRoot.style.setProperty("--halloween-torch-x", `${x}px`);
      themeRoot.style.setProperty("--halloween-torch-y", `${y}px`);
    };

    const setTorchPosition = (x: number, y: number) => {
      targetX = x;
      targetY = y;
      if (motionPreference?.matches) {
        currentX = x;
        currentY = y;
        writeTorchPosition(x, y);
      }
    };

    writeTorchPosition(currentX, currentY);

    const animateTorch = () => {
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      frameCount += 1;

      const flickerX = Math.sin(frameCount * 0.08) * 2.2 + Math.cos(frameCount * 0.15) * 1.5;
      const flickerY = Math.cos(frameCount * 0.09) * 2.5 + Math.sin(frameCount * 0.12) * 1.2;
      writeTorchPosition(currentX + flickerX, currentY + flickerY);
      animationFrameId = window.requestAnimationFrame(animateTorch);
    };

    if (!motionPreference?.matches) {
      animationFrameId = window.requestAnimationFrame(animateTorch);
    }

    const handlePointerMove = (event: PointerEvent) => {
      setTorchPosition(event.clientX, event.clientY);
    };
    const handleFocusIn = (event: FocusEvent) => {
      const focusedElement = event.target;
      if (!(focusedElement instanceof HTMLElement)) return;
      const bounds = focusedElement.getBoundingClientRect();
      setTorchPosition(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    themeRoot.addEventListener("focusin", handleFocusIn);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      themeRoot.removeEventListener("focusin", handleFocusIn);
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div ref={atmosphereRef} className="halloween-atmosphere" aria-hidden="true">
      <div className="halloween-night-mask" />
      <div className="halloween-torch-glow" />
      <div className="halloween-torch-vignette" />
      {EMBERS.map((ember, index) => (
        <span
          key={`${ember.left}-${ember.top}`}
          className="halloween-ember"
          style={{
            left: ember.left,
            top: ember.top,
            animationDelay: `${index * -0.8}s`,
          }}
        />
      ))}
      <svg className="halloween-ghost halloween-ghost--left" viewBox="0 0 100 120">
        <path d="M50 8C31 8 20 25 20 53v25c0 12-8 20-5 27 3 6 11-2 17 2 7 4 13-4 20 0 6 4 12-4 19 0 6 3 12-3 13-8 1-5-4-12-4-21V53C80 25 69 8 50 8Z" />
        <circle cx="40" cy="47" r="4" />
        <circle cx="60" cy="47" r="4" />
        <ellipse cx="50" cy="63" rx="3" ry="5" />
      </svg>
      <svg className="halloween-ghost halloween-ghost--right" viewBox="0 0 100 120">
        <path d="M50 10C30 10 20 30 20 60c0 25-10 35-5 45 3 7 13-3 20 3 7 5 13-4 20 0 7 4 13-4 20 1 7 4 14-2 13-8-2-12-8-21-8-41 0-30-10-50-30-50Z" />
        <circle cx="40" cy="48" r="4" />
        <circle cx="60" cy="48" r="4" />
        <ellipse cx="50" cy="65" rx="3.5" ry="5" />
      </svg>
      <svg className="halloween-cobweb" viewBox="0 0 100 100">
        <path d="M100 0 0 100M100 20 20 100M100 45 45 100M100 70 70 100M100 0C70 40 40 70 0 100M100 15C80 45 45 80 15 100M100 35C85 60 60 85 35 100M100 0v100H0" />
      </svg>
      <svg className="halloween-bat halloween-bat--right" viewBox="0 0 64 48">
        <path d="M32 20C36 12 45 4 58 12c-6 8-4 16 4 22-12-2-18 8-24 4-3-2-5-12-6-14-1 2-3 12-6 14-6 4-12-6-24-4 8-6 10-14 4-22 13-8 22 0 26 8Z" />
      </svg>
    </div>
  );
}
