import {
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import type { PointerEvent } from "react";

export function useHeroParallax() {
  const reduced = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 85, damping: 24, mass: 0.6 });
  const y = useSpring(pointerY, { stiffness: 85, damping: 24, mass: 0.6 });
  const reverseX = useTransform(x, (value) => value * -0.55);
  const reverseY = useTransform(y, (value) => value * -0.55);
  const reset = () => {
    pointerX.set(0);
    pointerY.set(0);
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    if (reduced || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    // MotionValues update transforms directly, without React renders or layout reads per element.
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 24);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 20);
  };
  return { x, y, reverseX, reverseY, reduced: !!reduced, move, reset };
}
