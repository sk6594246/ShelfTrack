import { useEffect, useState } from 'react';

type Props = {
  active: boolean;
  onDone?: () => void;
  durationMs?: number;
};

const COLORS = ['#34d399', '#4f46e5', '#fbbf24', '#fb7185', '#2dd4bf', '#a78bfa'];

/**
 * Short emerald-forward confetti flash for Post / Create success (feature 110).
 */
export function ConfettiBurst({ active, onDone, durationMs = 1200 }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) return;
    setShow(true);
    const t = window.setTimeout(() => {
      setShow(false);
      onDone?.();
    }, durationMs);
    return () => window.clearTimeout(t);
  }, [active, durationMs, onDone]);

  if (!show) return null;

  const pieces = Array.from({ length: 28 }, (_, i) => {
    const left = 8 + ((i * 37) % 84);
    const delay = (i % 7) * 0.04;
    const size = 6 + (i % 5);
    const rot = (i * 47) % 360;
    const color = COLORS[i % COLORS.length];
    return { left, delay, size, rot, color, i };
  });

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[90] overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-emerald-500/10" />
      {pieces.map((p) => (
        <span
          key={p.i}
          className="st-confetti absolute top-[-12px] rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.4,
            background: p.color,
            transform: `rotate(${p.rot}deg)`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Fire a one-shot confetti via custom event */
export function fireConfetti() {
  window.dispatchEvent(new Event('st-confetti'));
}

export function ConfettiHost() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((n) => n + 1);
    window.addEventListener('st-confetti', on);
    return () => window.removeEventListener('st-confetti', on);
  }, []);
  return <ConfettiBurst active={tick > 0} key={tick} />;
}
